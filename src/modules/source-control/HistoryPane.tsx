import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  native,
  type GitCommitFileChange,
  type GitLogEntry,
} from "@/lib/native";
import { fileIconUrl } from "@/modules/explorer/lib/iconResolver";
import {
  commitWebUrl,
  hostLabel,
  parseRemoteWebUrl,
  type RemoteWebInfo,
} from "./lib/remoteWebUrl";
import {
  Copy01Icon,
  LinkSquare02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { relativeFromSecs, statusTone } from "./lib/format";
import { basename, dirname } from "./lib/uiHelpers";

const PAGE_SIZE = 30;
const ROW_HEIGHT = 52;
const NEAR_BOTTOM_PX = 240;
const FILES_CACHE_LIMIT = 16;
const HISTORY_RATIO_STORAGE_KEY = "terax.sc.history.ratio";

type CommitFileDiffOpenInput = {
  repoRoot: string;
  sha: string;
  shortSha: string;
  subject: string;
  path: string;
  originalPath: string | null;
};

type LoadStatus = "idle" | "initial" | "more" | "error";

type FilesEntry =
  | { state: "loading" }
  | { state: "loaded"; files: GitCommitFileChange[] }
  | { state: "error"; error: string };

type Props = {
  repoRoot: string | null;
  onOpenCommitFile: (input: CommitFileDiffOpenInput) => void;
};

function normalizeError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Unknown error";
}

function absoluteTime(secs: number): string {
  if (!secs) return "";
  return new Date(secs * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function readHistoryRatio(): number {
  try {
    const stored = window.localStorage.getItem(HISTORY_RATIO_STORAGE_KEY);
    const parsed = stored ? Number.parseFloat(stored) : NaN;
    if (Number.isFinite(parsed) && parsed > 10 && parsed < 90) return parsed;
  } catch {
    /* ignore */
  }
  return 55;
}

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/25 px-0.5 text-foreground">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export const HistoryPane = memo(function HistoryPane({
  repoRoot,
  onOpenCommitFile,
}: Props) {
  const [commits, setCommits] = useState<GitLogEntry[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [endReached, setEndReached] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());
  const activeSearch = deferredSearch.length >= 2 ? deferredSearch : "";
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [remoteWeb, setRemoteWeb] = useState<RemoteWebInfo | null>(null);
  const [filesTick, setFilesTick] = useState(0);
  const initialRatio = useRef(readHistoryRatio());

  const requestIdRef = useRef(0);
  const inflightMoreRef = useRef(false);
  const filesCacheRef = useRef(new Map<string, FilesEntry>());
  const filesInflightRef = useRef(new Set<string>());
  const scrollRef = useRef<HTMLDivElement>(null);
  const bumpFiles = useCallback(() => setFilesTick((n) => n + 1), []);

  const filtered = useMemo(() => {
    const q = activeSearch.toLowerCase();
    if (!q) return commits;
    return commits.filter((c) => {
      const subject = c.subject.toLowerCase();
      const author = c.author.toLowerCase();
      const email = c.authorEmail.toLowerCase();
      return (
        subject.includes(q) ||
        author.includes(q) ||
        email.includes(q) ||
        c.shortSha.includes(q)
      );
    });
  }, [commits, activeSearch]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: (index) => filtered[index]?.sha ?? index,
  });

  const fetchFiles = useCallback(
    async (sha: string) => {
      if (!repoRoot) return;
      if (filesInflightRef.current.has(sha)) return;
      const cache = filesCacheRef.current;
      const existing = cache.get(sha);
      if (existing && existing.state !== "error") return;
      filesInflightRef.current.add(sha);
      cache.set(sha, { state: "loading" });
      bumpFiles();
      try {
        const files = await native.gitCommitFiles(repoRoot, sha);
        cache.set(sha, { state: "loaded", files });
        while (cache.size > FILES_CACHE_LIMIT) {
          const oldest = cache.keys().next().value;
          if (oldest === undefined || oldest === sha) break;
          cache.delete(oldest);
        }
        bumpFiles();
      } catch (err) {
        cache.set(sha, { state: "error", error: normalizeError(err) });
        bumpFiles();
      } finally {
        filesInflightRef.current.delete(sha);
      }
    },
    [repoRoot, bumpFiles],
  );

  const loadInitial = useCallback(async () => {
    if (!repoRoot) return;
    const requestId = ++requestIdRef.current;
    setLoadStatus("initial");
    setError(null);
    setEndReached(false);
    try {
      const entries = await native.gitLog(repoRoot, { limit: PAGE_SIZE });
      if (requestId !== requestIdRef.current) return;
      setCommits(entries);
      setLoadStatus("idle");
      if (entries.length < PAGE_SIZE) setEndReached(true);
      const headSha = entries[0]?.sha ?? null;
      setSelectedSha(headSha);
      if (headSha) void fetchFiles(headSha);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(normalizeError(err));
      setLoadStatus("error");
    }
  }, [repoRoot, fetchFiles]);

  const loadMore = useCallback(async () => {
    if (!repoRoot) return;
    if (inflightMoreRef.current || endReached) return;
    if (loadStatus !== "idle") return;
    const last = commits[commits.length - 1];
    if (!last) return;
    inflightMoreRef.current = true;
    setLoadStatus("more");
    try {
      const entries = await native.gitLog(repoRoot, {
        limit: PAGE_SIZE,
        beforeSha: last.sha,
      });
      setCommits((prev) => {
        const seen = new Set(prev.map((c) => c.sha));
        const merged = [...prev];
        for (const e of entries) if (!seen.has(e.sha)) merged.push(e);
        return merged;
      });
      if (entries.length < PAGE_SIZE) setEndReached(true);
      setLoadStatus("idle");
    } catch (err) {
      setError(normalizeError(err));
      setLoadStatus("error");
    } finally {
      inflightMoreRef.current = false;
    }
  }, [commits, endReached, loadStatus, repoRoot]);

  useEffect(() => {
    filesInflightRef.current.clear();
    filesCacheRef.current.clear();
    setCommits([]);
    setSelectedSha(null);
    bumpFiles();
    void loadInitial();
  }, [loadInitial, bumpFiles]);

  useEffect(() => {
    if (!repoRoot) {
      setRemoteWeb(null);
      return;
    }
    let cancelled = false;
    native
      .gitRemoteUrl(repoRoot)
      .then((url) => {
        if (cancelled) return;
        setRemoteWeb(parseRemoteWebUrl(url));
      })
      .catch(() => {
        if (cancelled) return;
        setRemoteWeb(null);
      });
    return () => {
      cancelled = true;
    };
  }, [repoRoot]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (activeSearch) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining < NEAR_BOTTOM_PX) void loadMore();
  }, [activeSearch, loadMore]);

  useEffect(() => {
    if (loadStatus !== "idle") return;
    if (endReached || activeSearch || commits.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable > NEAR_BOTTOM_PX) return;
    const id = window.setTimeout(() => {
      void loadMore();
    }, 0);
    return () => window.clearTimeout(id);
  }, [commits.length, activeSearch, endReached, loadMore, loadStatus]);

  const handleSelectCommit = useCallback(
    (sha: string) => {
      setSelectedSha(sha);
      void fetchFiles(sha);
    },
    [fetchFiles],
  );

  const persistRatio = useCallback((layout: Record<string, number>) => {
    const ratio = layout["history-list"];
    if (typeof ratio !== "number") return;
    try {
      window.localStorage.setItem(HISTORY_RATIO_STORAGE_KEY, String(ratio));
    } catch {
      /* ignore */
    }
  }, []);

  const selectedCommit = useMemo(
    () => (selectedSha ? commits.find((c) => c.sha === selectedSha) : null),
    [commits, selectedSha],
  );

  const selectedFilesEntry = useMemo(() => {
    if (!selectedSha) return null;
    return filesCacheRef.current.get(selectedSha) ?? null;
    // include filesTick to invalidate
  }, [selectedSha, filesTick]);

  const copyToClipboard = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* noop */
    }
  }, []);

  const handleFileOpen = useCallback(
    (commit: GitLogEntry, file: GitCommitFileChange) => {
      if (!repoRoot) return;
      onOpenCommitFile({
        repoRoot,
        sha: commit.sha,
        shortSha: commit.shortSha,
        subject: commit.subject,
        path: file.path,
        originalPath: file.originalPath,
      });
    },
    [onOpenCommitFile, repoRoot],
  );

  if (!repoRoot) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[11px] text-muted-foreground">
        No repository selected.
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-h-0 flex-1"
      onLayoutChanged={persistRatio}
    >
      <ResizablePanel
        id="history-list"
        defaultSize={initialRatio.current}
        minSize={20}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="relative shrink-0 border-b border-border/40 px-2 py-2">
            <HugeiconsIcon
              icon={Search01Icon}
              size={12}
              strokeWidth={1.85}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70"
            />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Filter commits…"
              className="h-7 pl-7 text-[11.5px]"
            />
          </div>
          {loadStatus === "initial" && commits.length === 0 ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <Spinner className="size-3" /> Loading commits…
            </div>
          ) : loadStatus === "error" && commits.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="text-[12.5px] font-medium">
                Could not load history
              </div>
              <div className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
                {error ?? "Unknown error"}
              </div>
              <Button size="sm" onClick={() => void loadInitial()}>
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-[11px] text-muted-foreground">
              {activeSearch ? "No commits match your filter." : "No commits."}
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
            >
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                  width: "100%",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const commit = filtered[virtualRow.index];
                  if (!commit) return null;
                  const active = selectedSha === commit.sha;
                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: virtualRow.size,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <CommitRow
                        commit={commit}
                        active={active}
                        query={activeSearch}
                        onClick={handleSelectCommit}
                      />
                    </div>
                  );
                })}
              </div>
              {loadStatus === "more" ? (
                <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-muted-foreground">
                  <Spinner className="size-3" /> Loading more…
                </div>
              ) : null}
              {endReached && !activeSearch ? (
                <div className="py-3 text-center text-[10.5px] text-muted-foreground/65">
                  End of history
                </div>
              ) : null}
              {loadStatus === "error" && commits.length > 0 ? (
                <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-destructive">
                  {error ?? "Failed to load more"}
                  <Button
                    size="xs"
                    variant="ghost"
                    className="h-6 cursor-pointer text-[11px]"
                    onClick={() => void loadMore()}
                  >
                    Retry
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id="history-detail"
        defaultSize={100 - initialRatio.current}
        minSize={20}
      >
        {selectedCommit ? (
          <CommitDetail
            commit={selectedCommit}
            filesEntry={selectedFilesEntry}
            remoteWeb={remoteWeb}
            onCopySha={copyToClipboard}
            onOpenFile={handleFileOpen}
            onRetryFiles={() => void fetchFiles(selectedCommit.sha)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            Select a commit to see details.
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
});

type CommitRowProps = {
  commit: GitLogEntry;
  active: boolean;
  query: string;
  onClick: (sha: string) => void;
};

const CommitRow = memo(function CommitRow({
  commit,
  active,
  query,
  onClick,
}: CommitRowProps) {
  const date = relativeFromSecs(commit.timestampSecs);
  return (
    <button
      type="button"
      onClick={() => onClick(commit.sha)}
      className={cn(
        "flex h-full w-full cursor-pointer flex-col justify-center gap-0.5 border-l-2 px-3 text-left transition-colors",
        active
          ? "border-l-primary/70 bg-accent/45"
          : "border-l-transparent hover:bg-accent/25",
      )}
    >
      <span
        className={cn(
          "truncate text-[12px] leading-tight",
          active
            ? "font-semibold text-foreground"
            : "font-medium text-foreground/95",
        )}
      >
        {commit.subject ? (
          highlight(commit.subject, query)
        ) : (
          <span className="text-muted-foreground">(no subject)</span>
        )}
      </span>
      <span className="truncate text-[10.5px] leading-tight text-muted-foreground/85">
        {commit.author ? highlight(commit.author, query) : "Unknown"}
        <span className="mx-1 text-muted-foreground/45">·</span>
        <span className="tabular-nums">{date}</span>
      </span>
    </button>
  );
});

type CommitDetailProps = {
  commit: GitLogEntry;
  filesEntry: FilesEntry | null;
  remoteWeb: RemoteWebInfo | null;
  onCopySha: (value: string) => Promise<void> | void;
  onOpenFile: (
    commit: GitLogEntry,
    file: GitCommitFileChange,
  ) => Promise<void> | void;
  onRetryFiles: () => void;
};

function CommitDetail({
  commit,
  filesEntry,
  remoteWeb,
  onCopySha,
  onOpenFile,
  onRetryFiles,
}: CommitDetailProps) {
  const absolute = absoluteTime(commit.timestampSecs);
  const webUrl = remoteWeb ? commitWebUrl(remoteWeb, commit.sha) : null;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1100);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/45 p-3">
        <div className="flex items-start gap-2">
          <span className="mt-px shrink-0 rounded bg-muted/65 px-1.5 py-0.5 font-mono text-[10.5px] leading-none tabular-nums text-muted-foreground">
            {commit.shortSha}
          </span>
          <div className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug text-foreground">
            {commit.subject || (
              <span className="text-muted-foreground">(no subject)</span>
            )}
          </div>
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <span className="truncate">{commit.author || "Unknown"}</span>
          {commit.authorEmail ? (
            <>
              <span className="text-muted-foreground/45">·</span>
              <span className="truncate text-muted-foreground/85">
                {commit.authorEmail}
              </span>
            </>
          ) : null}
          <span className="text-muted-foreground/45">·</span>
          <span className="shrink-0 tabular-nums">{absolute}</span>
        </div>
        <div className="mt-2.5 flex items-center gap-1">
          <Button
            size="xs"
            variant="ghost"
            className="h-6 cursor-pointer gap-1.5 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              void onCopySha(commit.sha);
              setCopied(true);
            }}
          >
            <HugeiconsIcon icon={Copy01Icon} size={11} strokeWidth={1.9} />
            {copied ? "Copied" : "Copy SHA"}
          </Button>
          {webUrl ? (
            <Button
              size="xs"
              variant="ghost"
              className="h-6 cursor-pointer gap-1.5 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => void openUrl(webUrl).catch(console.error)}
            >
              <HugeiconsIcon
                icon={LinkSquare02Icon}
                size={11}
                strokeWidth={1.9}
              />
              {hostLabel(remoteWeb!)}
            </Button>
          ) : null}
        </div>
      </div>
      <CommitFiles
        commit={commit}
        filesEntry={filesEntry}
        onOpenFile={onOpenFile}
        onRetry={onRetryFiles}
      />
    </div>
  );
}

function CommitFiles({
  commit,
  filesEntry,
  onOpenFile,
  onRetry,
}: {
  commit: GitLogEntry;
  filesEntry: FilesEntry | null;
  onOpenFile: (
    commit: GitLogEntry,
    file: GitCommitFileChange,
  ) => Promise<void> | void;
  onRetry: () => void;
}) {
  if (!filesEntry || filesEntry.state === "loading") {
    return (
      <div className="flex items-center gap-2 px-3 py-3 text-[11px] text-muted-foreground">
        <Spinner className="size-3" /> Loading files…
      </div>
    );
  }
  if (filesEntry.state === "error") {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-3 text-[11px] text-destructive">
        <span className="truncate">{filesEntry.error}</span>
        <Button
          size="xs"
          variant="ghost"
          className="h-6 cursor-pointer text-[11px]"
          onClick={onRetry}
        >
          Retry
        </Button>
      </div>
    );
  }
  if (filesEntry.files.length === 0) {
    return (
      <div className="px-3 py-3 text-[11px] text-muted-foreground">
        No file changes.
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/85">
        <span>Files</span>
        <span className="rounded-sm bg-muted/55 px-1 py-px text-[9.5px] tabular-nums text-muted-foreground/85 normal-case tracking-normal">
          {filesEntry.files.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
        <ul className="space-y-px px-1.5 pb-2">
          {filesEntry.files.map((file) => (
            <li key={file.path}>
              <FileRow
                file={file}
                onOpen={() => void onOpenFile(commit, file)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const FileRow = memo(function FileRow({
  file,
  onOpen,
}: {
  file: GitCommitFileChange;
  onOpen: () => void;
}) {
  const fileName = basename(file.path);
  const dir = dirname(file.path);
  const iconUrl = fileIconUrl(fileName);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-1.5 text-left transition-colors hover:bg-accent/40"
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" className="size-3.5 shrink-0" />
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5 leading-none">
        <span className="truncate text-[11.5px] font-medium leading-tight">
          {fileName}
        </span>
        {dir ? (
          <span className="min-w-0 flex-1 truncate text-[10px] leading-tight text-muted-foreground/80">
            {dir}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1 text-[10px] tabular-nums">
        {file.isBinary ? (
          <span className="text-muted-foreground/70">binary</span>
        ) : (
          <>
            {file.added > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                +{file.added}
              </span>
            ) : null}
            {file.removed > 0 ? (
              <span className="text-rose-600 dark:text-rose-400">
                −{file.removed}
              </span>
            ) : null}
          </>
        )}
      </div>
      <span
        className={cn(
          "inline-flex w-4 shrink-0 justify-center text-[9.5px] font-bold leading-none tabular-nums",
          statusTone(file.status),
        )}
        title={file.statusLabel}
      >
        {file.status.toUpperCase()}
      </span>
    </button>
  );
});
