import { Channel, invoke } from "@tauri-apps/api/core";

/** Raw stream-json event coming off the local `claude` CLI. */
export type ClaudeCodeEvent =
  | { type: "system"; subtype?: string; session_id?: string; [k: string]: unknown }
  | { type: "user"; [k: string]: unknown }
  | { type: "assistant"; [k: string]: unknown }
  | { type: "result"; [k: string]: unknown }
  | { type: "stream_event"; [k: string]: unknown }
  | { type: "stderr"; line: string }
  | { type: "raw"; line: string }
  | { type: string; [k: string]: unknown };

export type ClaudeCodeEnd = {
  exit_code: number | null;
  error: string | null;
};

export type ClaudeCodeCheck = {
  installed: boolean;
  version: string | null;
  path: string | null;
};

/** Maps a Terax model id (claude-code-*) to the `--model` flag value. */
export function mapClaudeCodeModel(modelId: string): string {
  switch (modelId) {
    case "claude-code-opus-4-7":
      return "opus";
    case "claude-code-sonnet-4-6":
      return "sonnet";
    case "claude-code-haiku-4-5":
      return "haiku";
    default:
      return modelId; // allow caller to pass a raw CLI alias / full id.
  }
}

export async function checkClaudeCode(): Promise<ClaudeCodeCheck> {
  return invoke<ClaudeCodeCheck>("claude_code_check");
}

export type RunClaudeCodeOptions = {
  prompt: string;
  modelId: string;
  sessionId?: string | null;
  cwd?: string | null;
  systemPromptAppend?: string | null;
  /** Forwards to `--permission-mode` (e.g. "acceptEdits", "plan"). */
  permissionMode?: string | null;
  abortSignal?: AbortSignal;
};

export type ClaudeCodeStream = {
  /** Captured from the first `system` event; populated after the first yield. */
  sessionId: string | null;
  events: AsyncIterable<ClaudeCodeEvent>;
  /** Resolves with the final exit signal once the CLI process exits. */
  done: Promise<ClaudeCodeEnd>;
  cancel: () => Promise<void>;
};

export async function runClaudeCodeStream(
  opts: RunClaudeCodeOptions,
): Promise<ClaudeCodeStream> {
  const onEvent = new Channel<ClaudeCodeEvent>();
  const onEnd = new Channel<ClaudeCodeEnd>();

  const queue: ClaudeCodeEvent[] = [];
  let waiter: ((v: IteratorResult<ClaudeCodeEvent>) => void) | null = null;
  let finished = false;
  let endValue: ClaudeCodeEnd | null = null;
  let resolveEnd: (v: ClaudeCodeEnd) => void = () => {};
  const donePromise = new Promise<ClaudeCodeEnd>((resolve) => {
    resolveEnd = resolve;
  });

  const stream: ClaudeCodeStream = {
    sessionId: null,
    events: {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<ClaudeCodeEvent>> {
            if (queue.length > 0) {
              return Promise.resolve({ value: queue.shift()!, done: false });
            }
            if (finished) return Promise.resolve({ value: undefined, done: true });
            return new Promise((resolve) => {
              waiter = resolve;
            });
          },
        };
      },
    },
    done: donePromise,
    cancel: async () => {
      if (handle != null) await invoke("claude_code_cancel", { handle });
    },
  };

  onEvent.onmessage = (evt) => {
    if (
      stream.sessionId === null &&
      typeof evt === "object" &&
      evt !== null &&
      "session_id" in evt &&
      typeof (evt as { session_id?: unknown }).session_id === "string"
    ) {
      stream.sessionId = (evt as { session_id: string }).session_id;
    }
    if (waiter) {
      const w = waiter;
      waiter = null;
      w({ value: evt, done: false });
    } else {
      queue.push(evt);
    }
  };

  onEnd.onmessage = (end) => {
    finished = true;
    endValue = end;
    resolveEnd(end);
    if (waiter) {
      const w = waiter;
      waiter = null;
      w({ value: undefined, done: true });
    }
    if (handle != null) {
      void invoke("claude_code_close", { handle }).catch(() => {});
    }
  };

  const handle = await invoke<number>("claude_code_send", {
    args: {
      session_id: opts.sessionId ?? null,
      prompt: opts.prompt,
      model: mapClaudeCodeModel(opts.modelId),
      cwd: opts.cwd ?? null,
      system_prompt_append: opts.systemPromptAppend ?? null,
      permission_mode: opts.permissionMode ?? null,
    },
    onEvent,
    onEnd,
  });

  if (opts.abortSignal) {
    if (opts.abortSignal.aborted) {
      await stream.cancel();
    } else {
      opts.abortSignal.addEventListener("abort", () => {
        void stream.cancel();
      });
    }
  }

  void endValue; // tsc: declared but only set via channel closure
  return stream;
}
