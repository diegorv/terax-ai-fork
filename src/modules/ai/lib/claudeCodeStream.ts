import { createUIMessageStream, type UIMessage } from "ai";
import type { ClaudeCodeStream } from "./claudeCode";
import type { AgentUsageDelta } from "./agent";

type BuildArgs = {
  stream: ClaudeCodeStream;
  saveSessionId: (sessionId: string) => void;
  onUsage?: (delta: AgentUsageDelta) => void;
  onFinishMeta?: (info: { hitStepCap: boolean; finishReason: string }) => void;
  onStep?: (step: string | null) => void;
};

/** Per-content-block tracker so we can map Anthropic stream-event semantics
 *  onto the AI SDK UIMessageChunk vocabulary one chunk at a time. */
type BlockState =
  | { kind: "text"; id: string; started: boolean; ended: boolean }
  | {
      kind: "tool";
      toolCallId: string;
      /** Translated Terax-style name (e.g. `bash_run`) emitted to the UI. */
      toolName: string;
      /** Original Claude Code tool name (e.g. `Bash`) — kept so we can
       *  remap input keys at finalization. */
      rawToolName: string;
      inputBuf: string;
      announced: boolean;
      finalized: boolean;
    };

// Claude Code CLI uses PascalCase tool names and Anthropic-style input keys
// (`file_path`, `subagent_type`, etc). Terax's renderer keys icons, labels,
// and per-tool summaries off its own snake_case names + key conventions. The
// adapter normalizes both so all the existing tool UI (icons, summaries,
// previews, output renderers) works for claude-code turns with no per-tool
// branching in the renderer.
const CC_TOOL_NAME_MAP: Record<string, string> = {
  Bash: "bash_run",
  BashOutput: "bash_logs",
  KillBash: "bash_kill",
  Read: "read_file",
  Edit: "edit",
  MultiEdit: "multi_edit",
  Write: "write_file",
  NotebookEdit: "edit",
  Grep: "grep",
  Glob: "glob",
  LS: "list_directory",
  TodoWrite: "todo_write",
  Task: "run_subagent",
};

function translateToolName(name: string): string {
  return CC_TOOL_NAME_MAP[name] ?? name;
}

function translateToolInput(rawName: string, input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const src = input as Record<string, unknown>;
  switch (rawName) {
    case "Read":
    case "Edit":
    case "MultiEdit":
    case "Write":
    case "NotebookEdit":
      return { ...src, path: src.path ?? src.file_path };
    case "Task":
      return {
        ...src,
        agent: src.agent ?? src.subagent_type,
        task: src.task ?? src.prompt,
      };
    case "BashOutput":
    case "KillBash":
      return { ...src, id: src.id ?? src.bash_id ?? src.shell_id };
    default:
      return src;
  }
}

/**
 * Adapts a Claude Code CLI stream into the AI SDK's `toUIMessageStream` shape
 * so the existing chat transport can consume it. Maps:
 *   - text deltas → text-start/-delta/-end
 *   - tool_use blocks → tool-input-start/-delta/-available (dynamic: true)
 *   - tool_result user messages → tool-output-available
 *   - message boundaries inside a single CLI invocation → start-step/finish-step
 */
export function buildClaudeCodeUIStream(args: BuildArgs) {
  return {
    toUIMessageStream<UI_MESSAGE extends UIMessage>(options?: {
      originalMessages?: UI_MESSAGE[];
    }) {
      return createUIMessageStream<UI_MESSAGE>({
        originalMessages: options?.originalMessages,
        execute: async ({ writer }) => {
          const blocks = new Map<number, BlockState>();
          // toolCallId → original Claude Code tool name. Persists across the
          // tool_use → tool_result round-trip so handleUserToolResults can
          // make tool-specific decisions (e.g. don't treat Bash exit≠0 as a
          // hard tool error).
          const toolCallNames = new Map<string, string>();
          let stepActive = false;
          let finishReason: string = "stop";

          // Anthropic usage objects arrive in three places: `message_start.usage`
          // (input only), each `message_delta.usage` (cumulative output), CC's
          // own `assistant` event (per-step totals), and the final `result`
          // (turn totals). Forwarding from all of them keeps the context
          // indicator live during streaming instead of only updating at the
          // end of the turn.
          const forwardUsage = (rawUsage: unknown): void => {
            if (!args.onUsage || !rawUsage || typeof rawUsage !== "object")
              return;
            const u = rawUsage as {
              input_tokens?: number;
              output_tokens?: number;
              cache_read_input_tokens?: number;
            };
            const inputTokens = u.input_tokens ?? 0;
            const outputTokens = u.output_tokens ?? 0;
            const cached = u.cache_read_input_tokens ?? 0;
            if (inputTokens === 0 && outputTokens === 0) return;
            args.onUsage({
              inputTokens,
              outputTokens,
              cachedInputTokens: cached,
              lastInputTokens: inputTokens,
              lastCachedTokens: cached,
            });
          };

          const openStep = () => {
            if (stepActive) return;
            stepActive = true;
            writer.write({ type: "start-step" });
          };

          const closeStep = () => {
            if (!stepActive) return;
            // Drain any half-open blocks so the UI doesn't render a stuck
            // "writing" indicator past the step boundary.
            for (const block of blocks.values()) {
              if (block.kind === "text" && block.started && !block.ended) {
                writer.write({ type: "text-end", id: block.id });
                block.ended = true;
              } else if (block.kind === "tool" && !block.finalized) {
                writer.write({
                  type: "tool-input-available",
                  toolCallId: block.toolCallId,
                  toolName: block.toolName,
                  input: translateToolInput(
                    block.rawToolName,
                    safeParseJson(block.inputBuf),
                  ),
                  dynamic: true,
                });
                block.finalized = true;
              }
            }
            blocks.clear();
            writer.write({ type: "finish-step" });
            stepActive = false;
          };

          writer.write({ type: "start" });

          try {
            for await (const evt of args.stream.events) {
              maybeCaptureSessionId(evt, args.saveSessionId);

              switch (evt.type) {
                case "stream_event":
                  handleStreamEvent(
                    evt,
                    blocks,
                    toolCallNames,
                    writer,
                    openStep,
                    args.onStep,
                    forwardUsage,
                  );
                  break;

                case "assistant": {
                  // Fallback for partial-message-less CLIs: drain content
                  // blocks that the stream_event branch never announced.
                  openStep();
                  drainAssistantFallback(
                    evt,
                    blocks,
                    toolCallNames,
                    writer,
                    args.onStep,
                  );
                  const msg = (evt as { message?: { usage?: unknown } }).message;
                  if (msg?.usage) forwardUsage(msg.usage);
                  break;
                }

                case "user":
                  // tool_result blocks live on user-role messages per Anthropic
                  // protocol — surface them as tool-output chunks.
                  handleUserToolResults(evt, toolCallNames, writer, args.onStep);
                  break;

                case "result": {
                  const r = evt as {
                    usage?: unknown;
                    is_error?: boolean;
                    subtype?: string;
                  };
                  if (r.usage) forwardUsage(r.usage);
                  if (r.is_error) finishReason = "error";
                  else if (r.subtype === "max_turns") finishReason = "length";
                  break;
                }

                case "stderr":
                  // eslint-disable-next-line no-console
                  console.debug(
                    "[claude-code stderr]",
                    (evt as { line: string }).line,
                  );
                  break;

                default:
                  break;
              }
            }

            closeStep();
            writer.write({
              type: "finish",
              finishReason: finishReason as never,
            });
            args.onStep?.(null);
            args.onFinishMeta?.({ hitStepCap: false, finishReason });
          } catch (err) {
            closeStep();
            writer.write({
              type: "error",
              errorText: err instanceof Error ? err.message : String(err),
            });
            args.onStep?.(null);
          }
        },
      });
    },
  };
}

// ── stream_event dispatch ──────────────────────────────────────────────────

type StreamEventWriter = Parameters<
  Parameters<typeof createUIMessageStream>[0]["execute"]
>[0]["writer"];

function handleStreamEvent(
  evt: unknown,
  blocks: Map<number, BlockState>,
  toolCallNames: Map<string, string>,
  writer: StreamEventWriter,
  openStep: () => void,
  onStep: ((s: string | null) => void) | undefined,
  forwardUsage: (usage: unknown) => void,
): void {
  const inner = (
    evt as { event?: { type?: string; index?: number; [k: string]: unknown } }
  ).event;
  if (!inner || typeof inner.type !== "string") return;

  switch (inner.type) {
    case "message_start": {
      // Reset block state per assistant message; close any prior step so
      // multi-turn agent runs render as discrete steps.
      blocks.clear();
      openStep();
      const startUsage = (inner as { message?: { usage?: unknown } }).message
        ?.usage;
      if (startUsage) forwardUsage(startUsage);
      return;
    }
    case "content_block_start": {
      const idx = (inner.index ?? 0) as number;
      const block = (inner as { content_block?: ContentBlock }).content_block;
      if (!block) return;
      openStep();
      if (block.type === "text") {
        const id = `cc-text-${idx}-${shortId()}`;
        blocks.set(idx, { kind: "text", id, started: false, ended: false });
      } else if (block.type === "tool_use") {
        const toolCallId =
          (block.id as string | undefined) ?? `cc-tool-${idx}-${shortId()}`;
        const rawToolName =
          typeof block.name === "string" && block.name.length > 0
            ? block.name
            : "tool";
        const toolName = translateToolName(rawToolName);
        blocks.set(idx, {
          kind: "tool",
          toolCallId,
          toolName,
          rawToolName,
          inputBuf: "",
          announced: false,
          finalized: false,
        });
        toolCallNames.set(toolCallId, rawToolName);
        writer.write({
          type: "tool-input-start",
          toolCallId,
          toolName,
          dynamic: true,
        });
        onStep?.(`Using ${toolName}`);
      }
      return;
    }
    case "content_block_delta": {
      const idx = (inner.index ?? 0) as number;
      const state = blocks.get(idx);
      if (!state) return;
      const delta = (inner as { delta?: ContentBlockDelta }).delta;
      if (!delta) return;
      if (state.kind === "text" && delta.type === "text_delta" && typeof delta.text === "string") {
        if (!state.started) {
          writer.write({ type: "text-start", id: state.id });
          state.started = true;
        }
        writer.write({ type: "text-delta", id: state.id, delta: delta.text });
        onStep?.("Writing");
      } else if (
        state.kind === "tool" &&
        delta.type === "input_json_delta" &&
        typeof delta.partial_json === "string"
      ) {
        state.inputBuf += delta.partial_json;
        writer.write({
          type: "tool-input-delta",
          toolCallId: state.toolCallId,
          inputTextDelta: delta.partial_json,
        });
      }
      return;
    }
    case "content_block_stop": {
      const idx = (inner.index ?? 0) as number;
      const state = blocks.get(idx);
      if (!state) return;
      if (state.kind === "text" && state.started && !state.ended) {
        writer.write({ type: "text-end", id: state.id });
        state.ended = true;
      } else if (state.kind === "tool" && !state.finalized) {
        writer.write({
          type: "tool-input-available",
          toolCallId: state.toolCallId,
          toolName: state.toolName,
          input: translateToolInput(
            state.rawToolName,
            safeParseJson(state.inputBuf),
          ),
          dynamic: true,
        });
        state.finalized = true;
      }
      return;
    }
    case "message_delta": {
      // Cumulative output token count piggybacks on the same envelope as
      // stop_reason updates — keep the indicator moving while text streams.
      const deltaUsage = (inner as { usage?: unknown }).usage;
      if (deltaUsage) forwardUsage(deltaUsage);
      return;
    }
    case "message_stop":
    case "ping":
      return;
    default:
      return;
  }
}

function drainAssistantFallback(
  evt: unknown,
  blocks: Map<number, BlockState>,
  toolCallNames: Map<string, string>,
  writer: StreamEventWriter,
  onStep: ((s: string | null) => void) | undefined,
): void {
  if (typeof evt !== "object" || evt === null) return;
  const content = (evt as { message?: { content?: unknown } }).message?.content;
  if (!Array.isArray(content)) return;

  for (let idx = 0; idx < content.length; idx++) {
    const block = content[idx] as ContentBlock;
    if (block.type === "text" && typeof block.text === "string") {
      if (blocks.has(idx)) continue; // already streamed via stream_event
      const id = `cc-text-${idx}-${shortId()}`;
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: block.text });
      writer.write({ type: "text-end", id });
    } else if (block.type === "tool_use") {
      const existing = blocks.get(idx);
      if (existing?.kind === "tool" && existing.finalized) continue;
      const toolCallId =
        (block.id as string | undefined) ?? `cc-tool-${idx}-${shortId()}`;
      const rawToolName =
        typeof block.name === "string" && block.name.length > 0
          ? block.name
          : "tool";
      const toolName = translateToolName(rawToolName);
      writer.write({
        type: "tool-input-available",
        toolCallId,
        toolName,
        input: translateToolInput(rawToolName, block.input ?? {}),
        dynamic: true,
      });
      onStep?.(`Used ${toolName}`);
      blocks.set(idx, {
        kind: "tool",
        toolCallId,
        toolName,
        rawToolName,
        inputBuf: "",
        announced: true,
        finalized: true,
      });
      toolCallNames.set(toolCallId, rawToolName);
    }
  }
}

function handleUserToolResults(
  evt: unknown,
  toolCallNames: Map<string, string>,
  writer: StreamEventWriter,
  onStep: ((s: string | null) => void) | undefined,
): void {
  if (typeof evt !== "object" || evt === null) return;
  const content = (evt as { message?: { content?: unknown } }).message?.content;
  if (!Array.isArray(content)) return;
  for (const block of content as ContentBlock[]) {
    if (block.type !== "tool_result") continue;
    const rawCallId = (block as { tool_use_id?: unknown }).tool_use_id;
    const toolCallId = typeof rawCallId === "string" ? rawCallId : null;
    if (!toolCallId) continue;
    const output = normalizeToolResultContent(
      (block as { content?: unknown }).content,
    );
    const isError = Boolean((block as { is_error?: boolean }).is_error);
    const rawName = toolCallNames.get(toolCallId);
    // Claude Code's Bash tool sets is_error: true on any non-zero exit code
    // (e.g. `pnpm audit` reporting vulns). The command still executed and
    // produced useful output; treating that as a failed tool call paints
    // the row red and routes the body into the Error pane. Surface Bash
    // output as a normal result — the exit code is embedded in the text.
    const suppressError = isError && rawName === "Bash";
    if (isError && !suppressError) {
      writer.write({
        type: "tool-output-error",
        toolCallId,
        errorText: stringifyOutput(output),
        dynamic: true,
      });
    } else {
      writer.write({
        type: "tool-output-available",
        toolCallId,
        output,
        dynamic: true,
      });
    }
    onStep?.(null);
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

type ContentBlock =
  | { type: "text"; text?: string }
  | { type: "tool_use"; id?: string; name?: string; input?: unknown }
  | {
      type: "tool_result";
      tool_use_id?: string;
      content?: unknown;
      is_error?: boolean;
    }
  | { type: string; [k: string]: unknown };

type ContentBlockDelta =
  | { type: "text_delta"; text?: string }
  | { type: "input_json_delta"; partial_json?: string }
  | { type: string; [k: string]: unknown };

function maybeCaptureSessionId(
  evt: unknown,
  save: (sid: string) => void,
): void {
  if (typeof evt !== "object" || evt === null) return;
  const sid = (evt as { session_id?: unknown }).session_id;
  if (typeof sid === "string" && sid.length > 0) save(sid);
}

function safeParseJson(raw: string): unknown {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { _raw: raw };
  }
}

function normalizeToolResultContent(content: unknown): unknown {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    // Anthropic tool_result content can be an array of {type:"text",text} parts.
    const text = content
      .map((b) => {
        if (typeof b === "string") return b;
        if (b && typeof b === "object" && (b as { type?: string }).type === "text") {
          return (b as { text?: string }).text ?? "";
        }
        return "";
      })
      .join("");
    return text || content;
  }
  return content ?? "";
}

function stringifyOutput(out: unknown): string {
  if (typeof out === "string") return out;
  try {
    return JSON.stringify(out);
  } catch {
    return String(out);
  }
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}
