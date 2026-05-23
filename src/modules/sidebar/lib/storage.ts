import type { SidebarViewId } from "../types";

export const SIDEBAR_DEFAULT_WIDTHS: Record<SidebarViewId, number> = {
  explorer: 260,
  "source-control": 520,
};
export const SIDEBAR_MIN_WIDTH = 220;
export const SIDEBAR_MAX_WIDTH = 900;
export const SIDEBAR_WIDTH_STORAGE_KEY_PREFIX = "terax.sidebar.width";
export const SIDEBAR_VIEW_STORAGE_KEY = "terax.sidebar.view";
export const LEGACY_SIDEBAR_WIDTH_KEY = "terax.sidebar.width";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function clampSidebarWidth(width: number): number {
  return Math.min(
    SIDEBAR_MAX_WIDTH,
    Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)),
  );
}

export function sidebarWidthKey(view: SidebarViewId): string {
  const suffix = view === "source-control" ? "source-control" : "files";
  return `${SIDEBAR_WIDTH_STORAGE_KEY_PREFIX}.${suffix}`;
}

/**
 * Resolve a per-view width. Falls back to the pre-per-view key when present,
 * migrating it to the explorer slot so the upgrade does not silently drop a
 * preference the user had already saved.
 */
export function readSidebarWidth(
  view: SidebarViewId,
  storage: StorageLike,
): number {
  const stored = storage.getItem(sidebarWidthKey(view));
  const parsed = stored ? Number.parseInt(stored, 10) : NaN;
  if (Number.isFinite(parsed)) return clampSidebarWidth(parsed);
  const legacy = storage.getItem(LEGACY_SIDEBAR_WIDTH_KEY);
  const legacyParsed = legacy ? Number.parseInt(legacy, 10) : NaN;
  if (Number.isFinite(legacyParsed)) {
    const width = clampSidebarWidth(legacyParsed);
    if (view === "explorer") {
      storage.setItem(sidebarWidthKey(view), String(width));
      storage.removeItem(LEGACY_SIDEBAR_WIDTH_KEY);
      return width;
    }
  }
  return SIDEBAR_DEFAULT_WIDTHS[view];
}

export function readSidebarView(storage: StorageLike): SidebarViewId {
  const stored = storage.getItem(SIDEBAR_VIEW_STORAGE_KEY);
  if (stored === "explorer" || stored === "source-control") return stored;
  return "explorer";
}
