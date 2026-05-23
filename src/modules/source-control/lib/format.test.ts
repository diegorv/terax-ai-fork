import { describe, expect, it } from "vitest";
import {
  relativeFromMs,
  relativeFromSecs,
  repoBasename,
  statusTone,
} from "./format";

describe("repoBasename", () => {
  it("returns the last path segment for posix paths", () => {
    expect(repoBasename("/users/me/dev/myrepo")).toBe("myrepo");
  });

  it("returns the last path segment for windows paths", () => {
    expect(repoBasename("C:\\Users\\me\\dev\\myrepo")).toBe("myrepo");
  });

  it("strips trailing slashes", () => {
    expect(repoBasename("/users/me/myrepo/")).toBe("myrepo");
    expect(repoBasename("/users/me/myrepo///")).toBe("myrepo");
  });

  it("returns the input when there are no separators", () => {
    expect(repoBasename("repo")).toBe("repo");
  });

  it("uses a placeholder for null/empty input", () => {
    expect(repoBasename(null)).toBe("No repo");
    expect(repoBasename(undefined)).toBe("No repo");
    expect(repoBasename("")).toBe("No repo");
  });
});

describe("relativeFromMs", () => {
  const NOW = 1_700_000_000_000;

  it("returns 'Never' for null / 0", () => {
    expect(relativeFromMs(null, NOW)).toBe("Never");
    expect(relativeFromMs(0, NOW)).toBe("Never");
  });

  it("formats seconds < 60", () => {
    expect(relativeFromMs(NOW - 5_000, NOW)).toBe("5s ago");
  });

  it("formats minutes < 60", () => {
    expect(relativeFromMs(NOW - 7 * 60_000, NOW)).toBe("7m ago");
  });

  it("formats hours < 24", () => {
    expect(relativeFromMs(NOW - 3 * 3_600_000, NOW)).toBe("3h ago");
  });

  it("formats days", () => {
    expect(relativeFromMs(NOW - 5 * 86_400_000, NOW)).toBe("5d ago");
  });

  it("clamps negative deltas to 0", () => {
    expect(relativeFromMs(NOW + 60_000, NOW)).toBe("0s ago");
  });
});

describe("relativeFromSecs", () => {
  const NOW = 1_700_000_000_000;
  const SECS = (ms: number) => Math.round(ms / 1000);

  it("returns empty for 0", () => {
    expect(relativeFromSecs(0, NOW)).toBe("");
  });

  it("formats seconds, minutes, hours <48, days <14", () => {
    expect(relativeFromSecs(SECS(NOW - 10_000), NOW)).toBe("10s ago");
    expect(relativeFromSecs(SECS(NOW - 5 * 60_000), NOW)).toBe("5m ago");
    expect(relativeFromSecs(SECS(NOW - 5 * 3_600_000), NOW)).toBe("5h ago");
    expect(relativeFromSecs(SECS(NOW - 36 * 3_600_000), NOW)).toBe("36h ago");
    expect(relativeFromSecs(SECS(NOW - 5 * 86_400_000), NOW)).toBe("5d ago");
  });

  it("falls back to an absolute date past the 14-day cutoff", () => {
    const out = relativeFromSecs(SECS(NOW - 30 * 86_400_000), NOW);
    expect(out).not.toMatch(/ago$/);
    // Locale-dependent, but should contain a 4-digit year.
    expect(out).toMatch(/\d{4}/);
  });
});

describe("statusTone", () => {
  it("maps known git status codes to distinct classes", () => {
    expect(statusTone("A")).toMatch(/emerald/);
    expect(statusTone("M")).toMatch(/amber/);
    expect(statusTone("D")).toMatch(/rose/);
    expect(statusTone("R")).toMatch(/sky/);
    expect(statusTone("C")).toMatch(/sky/);
  });

  it("uppercases the input before matching", () => {
    expect(statusTone("a")).toBe(statusTone("A"));
  });

  it("falls back to muted for unknown codes", () => {
    expect(statusTone("?")).toMatch(/muted/);
    expect(statusTone("")).toMatch(/muted/);
  });
});
