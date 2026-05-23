import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { native, type GitBranch } from "@/lib/native";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle01Icon,
  GitBranchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Props = {
  repoRoot: string | null;
  currentBranch: string | null;
  isDetached: boolean;
  ahead: number;
  behind: number;
  busy: boolean;
  onCheckedOut: () => Promise<void> | void;
  trigger?: (open: boolean) => ReactNode;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; branches: GitBranch[] }
  | { kind: "error"; message: string };

function normalizeError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Unknown error";
}

export const BranchPicker = memo(function BranchPicker({
  repoRoot,
  currentBranch,
  isDetached,
  ahead,
  behind,
  busy,
  onCheckedOut,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    if (!repoRoot) return;
    setState({ kind: "loading" });
    try {
      const branches = await native.gitListBranches(repoRoot);
      setState({ kind: "loaded", branches });
    } catch (error) {
      setState({ kind: "error", message: normalizeError(error) });
    }
  }, [repoRoot]);

  useEffect(() => {
    if (!open) return;
    void loadBranches();
  }, [open, loadBranches]);

  const handleCheckout = useCallback(
    async (branch: GitBranch) => {
      if (!repoRoot || branch.isCurrent) return;
      setCheckoutBusy(branch.name);
      setActionError(null);
      try {
        await native.gitCheckout(repoRoot, branch.name);
        setOpen(false);
        await onCheckedOut();
      } catch (error) {
        setActionError(normalizeError(error));
      } finally {
        setCheckoutBusy(null);
      }
    },
    [repoRoot, onCheckedOut],
  );

  const sortedBranches = useMemo(() => {
    if (state.kind !== "loaded") return [];
    const list = state.branches.slice();
    list.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [state]);

  const disabled = !repoRoot || busy;
  const branchLabel = isDetached
    ? "detached"
    : (currentBranch ?? "—");

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled && next) return;
        setOpen(next);
        if (!next) setActionError(null);
      }}
    >
      <PopoverTrigger asChild>
        {trigger ? (
          (trigger(open) as React.ReactElement)
        ) : (
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex min-w-0 items-center gap-2 border-r border-border/40 px-2.5 py-2 text-left transition-colors",
              !disabled && "cursor-pointer hover:bg-foreground/[0.04]",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <HugeiconsIcon
              icon={GitBranchIcon}
              size={13}
              strokeWidth={1.85}
              className="shrink-0 text-muted-foreground"
            />
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                Current branch
              </span>
              <span className="truncate text-[11.5px] font-semibold text-foreground/90">
                {branchLabel}
              </span>
            </div>
            {ahead > 0 || behind > 0 ? (
              <span className="ml-1 inline-flex shrink-0 items-center gap-0.5 text-[9.5px] font-semibold tabular-nums text-muted-foreground">
                {ahead > 0 ? (
                  <span className="inline-flex items-center gap-0.5">
                    <HugeiconsIcon
                      icon={ArrowUp01Icon}
                      size={9}
                      strokeWidth={2.2}
                    />
                    {ahead}
                  </span>
                ) : null}
                {behind > 0 ? (
                  <span className="inline-flex items-center gap-0.5">
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={9}
                      strokeWidth={2.2}
                    />
                    {behind}
                  </span>
                ) : null}
              </span>
            ) : null}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        className="w-72 max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <div className="border-b border-border/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/85">
          Switch branch
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {state.kind === "loading" ? (
            <div className="flex items-center gap-2 px-3 py-3 text-[11px] text-muted-foreground">
              <Spinner className="size-3" />
              Loading branches…
            </div>
          ) : state.kind === "error" ? (
            <div className="px-3 py-3 text-[11px] text-destructive">
              {state.message}
            </div>
          ) : sortedBranches.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-muted-foreground">
              No local branches.
            </div>
          ) : (
            sortedBranches.map((branch) => {
              const isBusy = checkoutBusy === branch.name;
              return (
                <button
                  key={branch.name}
                  type="button"
                  disabled={branch.isCurrent || checkoutBusy !== null}
                  onClick={() => void handleCheckout(branch)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] transition-colors",
                    branch.isCurrent
                      ? "cursor-default text-foreground"
                      : "cursor-pointer text-foreground/85 hover:bg-accent/40 hover:text-foreground",
                    checkoutBusy && !isBusy && "opacity-60",
                  )}
                >
                  <span className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground">
                    {branch.isCurrent ? (
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        size={11}
                        strokeWidth={2}
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono">
                    {branch.name}
                  </span>
                  {branch.upstream ? (
                    <span className="ml-auto shrink-0 truncate text-[10px] text-muted-foreground/65">
                      {branch.upstream}
                    </span>
                  ) : null}
                  {isBusy ? <Spinner className="size-3" /> : null}
                </button>
              );
            })
          )}
        </div>
        {actionError ? (
          <div className="border-t border-border/45 px-3 py-2 text-[10.5px] leading-snug text-destructive">
            {actionError}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
});
