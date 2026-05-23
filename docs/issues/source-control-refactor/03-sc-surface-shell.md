# 03 — Source Control Surface shell (Changes wired, History placeholder)

**Type:** AFK

## What to build

Introduce a new `SourceControlSurface` that becomes the content of the Source Control sidebar view. It owns the GH-Desktop-style structure: tripartite header, internal Changes/History tabs, and a resizable 2-column split. This slice fully wires the **Changes** tab end-to-end; History is a placeholder.

End-to-end behavior:

- Header (top of surface) shows three horizontal segments, always: `Repository` (current workspace, static badge), `Branch` (current branch, badge — no popover yet), `Fetch` (button + "last fetched" timestamp; existing fetch action wired).
- Below the header: tab bar `[Changes | History]`. Active tab persisted to localStorage. Default: Changes.
- Below the tab bar: 2-column resizable split with a `ResizableHandle`. Column ratio persisted per tab. Min 180px per column.
- Changes tab:
  - Col 1: existing file-list UI from `SourceControlPanel` (rows, stage checkboxes, discard, status accent — visual unchanged).
  - Col 2: commit message composer + Commit / Push buttons + staged-count line + push status + diverged banner + feedback toast (all moved from the bottom of the current panel into a dedicated column).
- History tab: placeholder ("History coming soon") — wired in slice #05.
- Clicking a file in Col 1 still opens the diff as a workspace tab (existing `openGitDiffTab`).

The surface replaces `SourceControlPanel` as the content of the Source Control sidebar view (from slice #01). The existing `useSourceControl` hook keeps living in `App.tsx` and is passed in.

## Acceptance criteria

- [ ] New `SourceControlSurface` component mounted as the Source Control sidebar view's content.
- [ ] Tripartite header renders 3 horizontal segments; truncates gracefully under narrow widths.
- [ ] Tab bar renders `[Changes | History]`; active tab persisted.
- [ ] 2-column split with persisted resize per tab; min 180px each column.
- [ ] Changes Col 1: existing file rows, stage checkbox, discard, status accent, header check-all — all working.
- [ ] Changes Col 2: composer + Commit + Push + staged-count + push status + diverged banner + feedback — all working.
- [ ] Clicking a file opens a diff workspace tab (unchanged behavior).
- [ ] Commit composer state survives switching to History tab and back.
- [ ] History tab shows a placeholder.
- [ ] Fetch segment runs existing fetch action and shows last-fetched timestamp.

## Blocked by

- #01 — Sidebar top toggle + per-view width persistence
