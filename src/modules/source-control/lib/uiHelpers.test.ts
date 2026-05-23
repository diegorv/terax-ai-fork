import { describe, expect, it } from "vitest";
import { basename, checkboxValue, dirname, statusAccent } from "./uiHelpers";

describe("basename", () => {
  it("returns the last path segment", () => {
    expect(basename("foo/bar/baz.txt")).toBe("baz.txt");
    expect(basename("file.ts")).toBe("file.ts");
  });

  it("handles backslash-separated paths", () => {
    expect(basename("foo\\bar\\baz.txt")).toBe("baz.txt");
  });

  it("ignores trailing separators", () => {
    expect(basename("foo/bar/")).toBe("bar");
  });

  it("returns the original for an empty-like path", () => {
    expect(basename("")).toBe("");
    expect(basename("/")).toBe("/");
  });
});

describe("dirname", () => {
  it("returns the parent path", () => {
    expect(dirname("foo/bar/baz.txt")).toBe("foo/bar");
  });

  it("returns empty for a top-level file", () => {
    expect(dirname("file.ts")).toBe("");
  });

  it("normalizes backslashes", () => {
    expect(dirname("foo\\bar\\baz.txt")).toBe("foo/bar");
  });

  it("returns empty for absolute root files", () => {
    expect(dirname("/foo.txt")).toBe("");
  });
});

describe("statusAccent", () => {
  it("maps each known status to a distinct class", () => {
    const classes = new Set(
      ["A", "U", "M", "D", "R"].map((c) => statusAccent(c)),
    );
    expect(classes.size).toBe(5);
  });

  it("falls back to a muted class for unknown codes", () => {
    expect(statusAccent("?")).toMatch(/muted-foreground/);
    expect(statusAccent("")).toMatch(/muted-foreground/);
  });
});

describe("checkboxValue", () => {
  it("converts CheckState to Checkbox prop", () => {
    expect(checkboxValue("checked")).toBe(true);
    expect(checkboxValue("unchecked")).toBe(false);
    expect(checkboxValue("indeterminate")).toBe("indeterminate");
  });
});
