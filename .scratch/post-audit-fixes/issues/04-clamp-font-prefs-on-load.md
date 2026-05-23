# 04 — Clamp font sizes + letter spacing on prefs load

Status: ready-for-agent

## What to build

The preferences loader in `src/modules/settings/store.ts` clamps several values on load (font weight via `clampFontWeight`, scrollback via `clampScrollback`) but does not clamp:

- `terminalFontSize` (read at the `terminalFontSize:` field of the loader)
- `terminalLetterSpacing`
- `editorFontSize`

The setters for all three already clamp on write. If a user manually edits the prefs file, imports settings from another install, or migrates from a build with different bounds, an out-of-range value reaches the renderer (terminal/editor) unchecked. The renderer's downstream `Math.max(4, …)` is a different floor (post-zoom render guard, not the user-pref minimum).

End-to-end fix: factor the three clamp expressions out of the setters into reusable functions and apply them in the loader, matching the existing pattern for font weight and scrollback.

## Acceptance criteria

- [ ] Loader clamps `terminalFontSize` to `[TERMINAL_FONT_SIZE_MIN, TERMINAL_FONT_SIZE_MAX]` with `NaN`/non-finite → default
- [ ] Loader clamps `editorFontSize` to `[EDITOR_FONT_SIZE_MIN, EDITOR_FONT_SIZE_MAX]` with `NaN`/non-finite → default
- [ ] Loader clamps `terminalLetterSpacing` to `[-10, 10]` (rounded) with `NaN`/non-finite → 0
- [ ] Setters reuse the same clamp functions (no logic duplication)
- [ ] Test (vitest) covers: loader normalizes out-of-bounds, `NaN`, and negative values for each of the three fields

## Blocked by

None - can start immediately
