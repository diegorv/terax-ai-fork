import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Download01Icon,
  FolderCloudIcon,
  FolderGitTwoIcon,
  GitBranchIcon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChangesPane } from "./ChangesPane";
import { HistoryPane } from "./HistoryPane";
import { SOURCE_CONTROL_TOOLTIP_CLASS } from "./lib/uiHelpers";
import type { SourceControlSummary } from "./useSourceControl";
import { useSourceControlPanel } from "./useSourceControlPanel";

type SurfaceTab = "changes" | "history";

const TAB_STORAGE_KEY = "terax.sc.tab";

function readActiveTab(): SurfaceTab {
  try {
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (stored === "changes" || stored === "history") return stored;
  } catch {
    /* ignore */
  }
  return "changes";
}

function repoBasename(repoRoot: string | null | undefined): string {
  if (!repoRoot) return "No repo";
  const cleaned = repoRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const idx = cleaned.lastIndexOf("/");
  return idx >= 0 ? cleaned.slice(idx + 1) : cleaned;
}

function relativeFetched(timestampMs: number | null): string {
  if (!timestampMs) return "Never";
  const diff = Math.max(0, Date.now() - timestampMs);
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

type Props = {
  open: boolean;
  sourceControl: SourceControlSummary;
  onOpenDiff: (input: {
    path: string;
    repoRoot: string;
    mode: "+" | "-";
    originalPath: string | null;
    title?: string;
  }) => void;
};

export const SourceControlSurface = memo(function SourceControlSurface({
  open,
  sourceControl,
  onOpenDiff,
}: Props) {
  const scm = useSourceControlPanel(open, sourceControl, onOpenDiff);
  const [activeTab, setActiveTab] = useState<SurfaceTab>(readActiveTab);
  const [refreshAnimating, setRefreshAnimating] = useState(false);
  const refreshAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (refreshAnimationRef.current)
        window.clearTimeout(refreshAnimationRef.current);
    };
  }, []);

  const isRefreshing = scm.panelState === "loading";

  const repoLabel = useMemo(
    () => repoBasename(scm.repo?.repoRoot),
    [scm.repo?.repoRoot],
  );

  const branchLabel = useMemo(() => {
    if (!scm.status) return "—";
    return scm.status.isDetached ? "detached" : scm.status.branch;
  }, [scm.status]);

  const fetchedLabel = useMemo(
    () => relativeFetched(sourceControl.lastFetchedAt),
    [sourceControl.lastFetchedAt],
  );

  const hasUpstream = !!scm.status?.upstream;
  const isDiverged =
    !!scm.status && scm.status.ahead > 0 && scm.status.behind > 0;
  const fetchBusy = sourceControl.busyAction === "fetch";
  const pullBusy = sourceControl.busyAction === "pull";
  const canFetch = hasUpstream && !scm.actionBusy && !sourceControl.busyAction;
  const canPull =
    hasUpstream &&
    !!scm.status &&
    scm.status.behind > 0 &&
    !isDiverged &&
    !scm.actionBusy &&
    !sourceControl.busyAction;

  const pushHint = scm.pushHint ?? "Push is unavailable right now.";
  const pushDisabledReason = scm.actionBusy
    ? "Wait for the current Git action to finish."
    : pushHint;

  const handleFetch = useCallback(() => {
    void sourceControl.runRemoteAction("fetch");
  }, [sourceControl]);

  const handlePull = useCallback(() => {
    void sourceControl.runRemoteAction("pull");
  }, [sourceControl]);

  const handleRefresh = useCallback(() => {
    setRefreshAnimating(true);
    if (refreshAnimationRef.current)
      window.clearTimeout(refreshAnimationRef.current);
    void scm.refresh().finally(() => {
      refreshAnimationRef.current = window.setTimeout(() => {
        setRefreshAnimating(false);
        refreshAnimationRef.current = null;
      }, 450);
    });
  }, [scm]);

  if (!open) return null;

  return (
    <TooltipProvider delayDuration={800} skipDelayDuration={300}>
      <aside className="flex h-full min-w-0 flex-col bg-card/80 backdrop-blur [contain:layout_style]">
        <header
          className="grid shrink-0 items-stretch border-b border-border/50"
          style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
        >
          <Segment
            icon={
              <HugeiconsIcon
                icon={FolderGitTwoIcon}
                size={13}
                strokeWidth={1.85}
                className="text-muted-foreground"
              />
            }
            caption="Current repository"
            label={repoLabel}
          />
          <Segment
            icon={
              <HugeiconsIcon
                icon={GitBranchIcon}
                size={13}
                strokeWidth={1.85}
                className="text-muted-foreground"
              />
            }
            caption="Current branch"
            label={branchLabel}
            trailing={
              scm.status &&
              (scm.status.ahead > 0 || scm.status.behind > 0) ? (
                <span className="ml-1 inline-flex shrink-0 items-center gap-0.5 text-[9.5px] font-semibold tabular-nums text-muted-foreground">
                  {scm.status.ahead > 0 ? (
                    <span className="inline-flex items-center gap-0.5">
                      <HugeiconsIcon
                        icon={ArrowUp01Icon}
                        size={9}
                        strokeWidth={2.2}
                      />
                      {scm.status.ahead}
                    </span>
                  ) : null}
                  {scm.status.behind > 0 ? (
                    <span className="inline-flex items-center gap-0.5">
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        size={9}
                        strokeWidth={2.2}
                      />
                      {scm.status.behind}
                    </span>
                  ) : null}
                </span>
              ) : null
            }
          />
          <Segment
            icon={
              fetchBusy ? (
                <Spinner className="size-3" />
              ) : (
                <HugeiconsIcon
                  icon={FolderCloudIcon}
                  size={13}
                  strokeWidth={1.85}
                  className="text-muted-foreground"
                />
              )
            }
            caption={fetchBusy ? "Fetching…" : "Fetch origin"}
            label={fetchedLabel}
            onClick={canFetch ? handleFetch : undefined}
            disabled={!canFetch}
          />
        </header>

        <div className="flex shrink-0 items-stretch border-b border-border/50 bg-card/55">
          <TabButton
            active={activeTab === "changes"}
            onClick={() => setActiveTab("changes")}
            count={scm.fileEntries.length}
          >
            Changes
          </TabButton>
          <TabButton
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            History
          </TabButton>
          <div className="ml-auto flex items-center gap-0.5 px-1.5">
            <IconActionButton
              label={
                pullBusy
                  ? "Pulling…"
                  : isDiverged
                    ? "Branch diverged — resolve in terminal"
                    : !hasUpstream
                      ? "No upstream configured"
                      : (scm.status?.behind ?? 0) === 0
                        ? "Already up to date"
                        : `Pull ${scm.status?.behind ?? 0} commits (fast-forward)`
              }
              disabled={!canPull}
              onClick={handlePull}
            >
              {pullBusy ? (
                <Spinner className="size-3" />
              ) : (
                <HugeiconsIcon
                  icon={Download01Icon}
                  size={13}
                  strokeWidth={1.9}
                />
              )}
            </IconActionButton>
            <IconActionButton
              label="Refresh source control"
              disabled={isRefreshing || !!scm.actionBusy}
              onClick={handleRefresh}
            >
              {isRefreshing ? (
                <Spinner className="size-3.5" />
              ) : (
                <HugeiconsIcon
                  icon={Refresh01Icon}
                  size={13}
                  strokeWidth={1.9}
                  className={cn(refreshAnimating && "animate-spin")}
                />
              )}
            </IconActionButton>
          </div>
        </div>

        {scm.panelState === "loading" ? (
          <PanelCenter title="Loading repository" />
        ) : scm.panelState === "no-repo" ? (
          <PanelCenter
            title="No repository"
            body="The active workspace is not inside a Git repository."
          />
        ) : scm.panelState === "error" ? (
          <PanelCenter
            title="Source control error"
            body={scm.statusError ?? "Unknown source control error"}
            action={
              <Button size="sm" onClick={() => void scm.refresh()}>
                Retry
              </Button>
            }
          />
        ) : scm.panelState === "ready" && scm.status ? (
          activeTab === "changes" ? (
            <ChangesPane
              scm={scm}
              repoLabel={repoLabel}
              pushHint={pushHint}
              pushDisabledReason={pushDisabledReason}
            />
          ) : (
            <HistoryPane repoRoot={scm.repo?.repoRoot ?? null} />
          )
        ) : null}
      </aside>
    </TooltipProvider>
  );
});

function Segment({
  icon,
  caption,
  label,
  trailing,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  caption: string;
  label: string;
  trailing?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const Tag: "button" | "div" = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      className={cn(
        "flex min-w-0 items-center gap-2 border-r border-border/40 px-2.5 py-2 text-left last:border-r-0",
        onClick && !disabled
          ? "cursor-pointer transition-colors hover:bg-foreground/[0.04]"
          : "",
        disabled ? "cursor-not-allowed opacity-60" : "",
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          {caption}
        </span>
        <span className="truncate text-[11.5px] font-semibold text-foreground/90">
          {label}
        </span>
      </div>
      {trailing}
    </Tag>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-[2px] after:rounded-full after:bg-primary/80"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span>{children}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-border/60 bg-card px-1 text-[9px] font-semibold leading-none tabular-nums text-muted-foreground/95">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

function IconActionButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-6 cursor-pointer rounded-md p-3 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className={cn(SOURCE_CONTROL_TOOLTIP_CLASS, "text-[10.5px]")}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function PanelCenter({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="text-sm font-medium">{title}</div>
      {body ? (
        <div className="max-w-64 text-[11px] leading-relaxed text-muted-foreground">
          {body}
        </div>
      ) : null}
      {action}
    </div>
  );
}
