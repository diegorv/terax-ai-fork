import { describe, expect, it } from "vitest";
import {
  EDITOR_FONT_SIZE_DEFAULT,
  EDITOR_FONT_SIZE_MAX,
  EDITOR_FONT_SIZE_MIN,
  TERMINAL_FONT_SIZE_DEFAULT,
  TERMINAL_FONT_SIZE_MAX,
  TERMINAL_FONT_SIZE_MIN,
  clampEditorFontSize,
  clampTerminalFontSize,
  clampTerminalLetterSpacing,
} from "./store";

describe("clampTerminalFontSize", () => {
  it("returns the default for NaN / non-finite input", () => {
    expect(clampTerminalFontSize(Number.NaN)).toBe(TERMINAL_FONT_SIZE_DEFAULT);
    expect(clampTerminalFontSize(Number.POSITIVE_INFINITY)).toBe(
      TERMINAL_FONT_SIZE_DEFAULT,
    );
  });

  it("rounds + clamps to [MIN, MAX]", () => {
    expect(clampTerminalFontSize(0)).toBe(TERMINAL_FONT_SIZE_MIN);
    expect(clampTerminalFontSize(-12)).toBe(TERMINAL_FONT_SIZE_MIN);
    expect(clampTerminalFontSize(9999)).toBe(TERMINAL_FONT_SIZE_MAX);
    expect(clampTerminalFontSize(14.6)).toBe(15);
  });
});

describe("clampEditorFontSize", () => {
  it("returns the default for NaN / non-finite input", () => {
    expect(clampEditorFontSize(Number.NaN)).toBe(EDITOR_FONT_SIZE_DEFAULT);
  });

  it("rounds + clamps to [MIN, MAX]", () => {
    expect(clampEditorFontSize(0)).toBe(EDITOR_FONT_SIZE_MIN);
    expect(clampEditorFontSize(1000)).toBe(EDITOR_FONT_SIZE_MAX);
    expect(clampEditorFontSize(13.2)).toBe(13);
  });
});

describe("clampTerminalLetterSpacing", () => {
  it("returns 0 for NaN / non-finite input", () => {
    expect(clampTerminalLetterSpacing(Number.NaN)).toBe(0);
    expect(clampTerminalLetterSpacing(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it("rounds + clamps to [-10, 10]", () => {
    expect(clampTerminalLetterSpacing(-50)).toBe(-10);
    expect(clampTerminalLetterSpacing(50)).toBe(10);
    expect(clampTerminalLetterSpacing(3.4)).toBe(3);
    expect(clampTerminalLetterSpacing(-3.6)).toBe(-4);
  });
});
