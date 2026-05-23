import { beforeEach, describe, expect, it } from "vitest";
import {
  LEGACY_SIDEBAR_WIDTH_KEY,
  SIDEBAR_DEFAULT_WIDTHS,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_VIEW_STORAGE_KEY,
  clampSidebarWidth,
  readSidebarView,
  readSidebarWidth,
  sidebarWidthKey,
  type StorageLike,
} from "./storage";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  inspect: () => Record<string, string>;
} {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) ?? null) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
    inspect: () => Object.fromEntries(map.entries()),
  };
}

describe("clampSidebarWidth", () => {
  it("rounds + clamps within bounds", () => {
    expect(clampSidebarWidth(0)).toBe(SIDEBAR_MIN_WIDTH);
    expect(clampSidebarWidth(SIDEBAR_MIN_WIDTH - 50)).toBe(SIDEBAR_MIN_WIDTH);
    expect(clampSidebarWidth(SIDEBAR_MAX_WIDTH + 500)).toBe(SIDEBAR_MAX_WIDTH);
    expect(clampSidebarWidth(300.7)).toBe(301);
  });
});

describe("sidebarWidthKey", () => {
  it("uses 'files' suffix for the explorer view", () => {
    expect(sidebarWidthKey("explorer")).toBe("terax.sidebar.width.files");
  });

  it("uses 'source-control' suffix for the source control view", () => {
    expect(sidebarWidthKey("source-control")).toBe(
      "terax.sidebar.width.source-control",
    );
  });

  it("differs from the legacy key", () => {
    expect(sidebarWidthKey("explorer")).not.toBe(LEGACY_SIDEBAR_WIDTH_KEY);
  });
});

describe("readSidebarWidth", () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("returns the default when nothing is stored", () => {
    expect(readSidebarWidth("explorer", storage)).toBe(
      SIDEBAR_DEFAULT_WIDTHS.explorer,
    );
    expect(readSidebarWidth("source-control", storage)).toBe(
      SIDEBAR_DEFAULT_WIDTHS["source-control"],
    );
  });

  it("returns and clamps a stored per-view width", () => {
    storage = memoryStorage({
      "terax.sidebar.width.files": "320",
      "terax.sidebar.width.source-control": "9999",
    });
    expect(readSidebarWidth("explorer", storage)).toBe(320);
    expect(readSidebarWidth("source-control", storage)).toBe(SIDEBAR_MAX_WIDTH);
  });

  it("migrates the legacy key into the explorer slot once", () => {
    storage = memoryStorage({ "terax.sidebar.width": "350" });
    expect(readSidebarWidth("explorer", storage)).toBe(350);
    const snapshot = storage.inspect();
    expect(snapshot["terax.sidebar.width.files"]).toBe("350");
    expect(snapshot["terax.sidebar.width"]).toBeUndefined();
  });

  it("does not migrate the legacy key into the source-control slot", () => {
    storage = memoryStorage({ "terax.sidebar.width": "350" });
    expect(readSidebarWidth("source-control", storage)).toBe(
      SIDEBAR_DEFAULT_WIDTHS["source-control"],
    );
    // Legacy key untouched (only the explorer read consumes it).
    expect(storage.inspect()["terax.sidebar.width"]).toBe("350");
  });

  it("ignores malformed stored values and falls back to default", () => {
    storage = memoryStorage({ "terax.sidebar.width.files": "garbage" });
    expect(readSidebarWidth("explorer", storage)).toBe(
      SIDEBAR_DEFAULT_WIDTHS.explorer,
    );
  });
});

describe("readSidebarView", () => {
  it("returns the stored view when valid", () => {
    expect(
      readSidebarView(
        memoryStorage({ [SIDEBAR_VIEW_STORAGE_KEY]: "source-control" }),
      ),
    ).toBe("source-control");
    expect(
      readSidebarView(memoryStorage({ [SIDEBAR_VIEW_STORAGE_KEY]: "explorer" })),
    ).toBe("explorer");
  });

  it("falls back to explorer when missing or invalid", () => {
    expect(readSidebarView(memoryStorage())).toBe("explorer");
    expect(
      readSidebarView(
        memoryStorage({ [SIDEBAR_VIEW_STORAGE_KEY]: "garbage" }),
      ),
    ).toBe("explorer");
  });
});
