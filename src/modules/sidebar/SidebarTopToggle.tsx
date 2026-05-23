import { cn } from "@/lib/utils";
import { FolderGitTwoIcon, FolderTreeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SidebarViewId } from "./types";

export const SIDEBAR_TOP_TOGGLE_HEIGHT = 36;

type ToggleItem = {
  id: SidebarViewId;
  label: string;
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  badge?: number;
};

type Props = {
  activeView: SidebarViewId;
  onSelectView: (view: SidebarViewId) => void;
  changedCount: number;
};

export function SidebarTopToggle({
  activeView,
  onSelectView,
  changedCount,
}: Props) {
  const items: ToggleItem[] = [
    { id: "explorer", label: "Files", icon: FolderTreeIcon },
    {
      id: "source-control",
      label: "Source Control",
      icon: FolderGitTwoIcon,
      badge: changedCount,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Sidebar view"
      style={{ height: SIDEBAR_TOP_TOGGLE_HEIGHT }}
      className="flex shrink-0 items-stretch gap-1 border-b border-border/60 bg-card/85 px-1.5 py-1 backdrop-blur"
    >
      {items.map((item) => {
        const isActive = item.id === activeView;
        const showBadge = !!item.badge && item.badge > 0;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={item.label}
            onClick={() => onSelectView(item.id)}
            className={cn(
              "group relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md text-[11px] font-medium outline-none transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-primary/40",
              isActive
                ? "bg-foreground/[0.07] text-foreground dark:bg-foreground/[0.09]"
                : "text-muted-foreground hover:bg-foreground/[0.045] hover:text-foreground",
            )}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={14}
              strokeWidth={isActive ? 2 : 1.75}
              className="shrink-0 transition-[stroke-width] duration-150"
            />
            <span>{item.label}</span>
            {showBadge ? (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-border/60 bg-card px-1 text-[9px] font-semibold leading-none tabular-nums text-muted-foreground/95">
                {item.badge! > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
