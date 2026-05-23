import { WorkHistoryIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type Props = {
  repoRoot: string | null;
};

export function HistoryPane(_props: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="flex size-9 items-center justify-center rounded-full border border-border/55 text-muted-foreground">
        <HugeiconsIcon icon={WorkHistoryIcon} size={16} strokeWidth={1.6} />
      </div>
      <div className="text-[12.5px] font-medium text-foreground">
        History coming soon
      </div>
      <div className="max-w-64 text-[11px] leading-relaxed text-muted-foreground">
        Commit history will live here as part of the next refactor step.
      </div>
    </div>
  );
}
