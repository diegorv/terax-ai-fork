import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ProviderInfo } from "@/modules/ai/config";
import {
  checkClaudeCode,
  type ClaudeCodeCheck,
} from "@/modules/ai/lib/claudeCode";
import {
  ArrowUpRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { ProviderIcon } from "./ProviderIcon";

type Props = {
  provider: ProviderInfo;
  check: ClaudeCodeCheck | null;
  onCheck: (check: ClaudeCodeCheck) => void;
  onRemove?: () => void;
};

export function ClaudeCodeProviderCard({
  provider,
  check,
  onCheck,
  onRemove,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const next = await checkClaudeCode();
      onCheck(next);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (check === null) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const installed = check?.installed === true;
  const loading = check === null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <ProviderIcon provider={provider.id} size={15} />
        <span className="text-[12.5px] font-medium">{provider.label}</span>
        {installed ? (
          <Badge
            variant="outline"
            className="ml-1 h-4 gap-1 border-border/60 bg-muted/40 px-1.5 text-[10px] font-normal text-muted-foreground"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={9}
              strokeWidth={2}
            />
            Detected
          </Badge>
        ) : null}
        <button
          type="button"
          onClick={() => void openUrl(provider.consoleUrl)}
          className="ml-auto inline-flex items-center gap-0.5 text-[10.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Install docs
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={11} strokeWidth={1.75} />
        </button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => void refresh()}
          disabled={refreshing}
          title="Re-check CLI"
          className="size-7 text-muted-foreground hover:text-foreground"
        >
          {refreshing ? (
            <Spinner className="size-3" />
          ) : (
            <HugeiconsIcon icon={RefreshIcon} size={12} strokeWidth={1.75} />
          )}
        </Button>
        {onRemove ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={onRemove}
            title="Remove provider"
            className="size-7 text-muted-foreground hover:text-destructive"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
          </Button>
        ) : null}
      </div>

      <span className="text-[10.5px] leading-relaxed text-muted-foreground">
        Routes turns through the local <code className="font-mono">claude</code>{" "}
        CLI in stream-json mode. Conversations consume your Claude Pro / Max
        subscription quota — no API key needed.
      </span>

      <div className="mt-0.5 flex flex-col gap-1.5">
        {loading ? (
          <Row label="CLI">
            <span className="text-[11px] text-muted-foreground">
              Checking…
            </span>
          </Row>
        ) : installed ? (
          <>
            <Row label="CLI">
              <span className="font-mono text-[11px] text-foreground">
                {check.version ?? "installed"}
              </span>
            </Row>
            {check.path ? (
              <Row label="Path">
                <span className="truncate font-mono text-[10.5px] text-muted-foreground">
                  {check.path}
                </span>
              </Row>
            ) : null}
          </>
        ) : (
          <Row label="CLI">
            <span className="text-[11px] text-destructive">
              Not found on PATH
            </span>
          </Row>
        )}

        {installed ? (
          <p className="rounded-md bg-muted/30 px-2 py-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
            If your first turn errors with an auth message, run{" "}
            <code className="font-mono">claude</code> once in your terminal to
            complete the OAuth login, then retry here.
          </p>
        ) : (
          <p className="rounded-md bg-muted/30 px-2 py-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
            Install the <code className="font-mono">claude</code> CLI and make
            sure it's on the PATH visible to this app. After installing, click
            the refresh icon above.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[11px] tracking-tight text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  );
}
