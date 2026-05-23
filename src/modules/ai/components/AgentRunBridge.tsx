import { useChat, type UIMessage } from "@ai-sdk/react";
import { useEffect, useMemo } from "react";
import {
  getOrCreateChat,
  useChatStore,
  type AgentRunStatus,
} from "../store/chatStore";

export function AgentRunBridge() {
  const sessionId = useChatStore((s) => s.activeSessionId);
  return <Bridge sessionId={sessionId} />;
}

function Bridge({ sessionId }: { sessionId: string }) {
  const chat = useMemo(() => getOrCreateChat(sessionId), [sessionId]);
  const { status, messages, addToolApprovalResponse } = useChat<UIMessage>({
    chat,
  });
  const patch = useChatStore((s) => s.patchAgentMeta);
  const openMini = useChatStore((s) => s.openMini);
  const setApprovalResponder = useChatStore((s) => s.setApprovalResponder);

  useEffect(() => {
    setApprovalResponder((id, approved) =>
      addToolApprovalResponse({ id, approved }),
    );
    return () => setApprovalResponder(null);
  }, [setApprovalResponder, addToolApprovalResponse]);

  const approvalsPending = useMemo(() => {
    let n = 0;
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const p of m.parts) {
        if ((p as { state?: string }).state === "approval-requested") n++;
      }
    }
    return n;
  }, [messages]);

  useEffect(() => {
    let runStatus: AgentRunStatus;
    if (approvalsPending > 0) runStatus = "awaiting-approval";
    else if (status === "submitted") runStatus = "thinking";
    else if (status === "streaming") runStatus = "streaming";
    else if (status === "error") runStatus = "error";
    else runStatus = "idle";
    patch({
      status: runStatus,
      approvalsPending,
      ...(runStatus === "idle" || runStatus === "error"
        ? { step: null }
        : {}),
      ...(runStatus === "idle" ? { error: null } : {}),
    });
  }, [status, approvalsPending, patch]);

  useEffect(() => {
    if (approvalsPending > 0) openMini();
  }, [approvalsPending, openMini]);

  return null;
}
