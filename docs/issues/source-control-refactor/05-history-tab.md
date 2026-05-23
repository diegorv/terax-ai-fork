# 05 — History tab content (commit list + detail pane)

**Type:** AFK

## What to build

Replace the History tab placeholder from slice #03 with a real 2-column history UI inspired by GitHub Desktop, living entirely inside the Source Control sidebar surface.

End-to-end behavior:

- History tab Col 1:
  - Inline search input at the top (filter by subject / author / email / shortSha — same matching logic as the current `GitHistoryPane`).
  - 2-line commit rows. Line 1: subject (bold, truncated). Line 2: author + relative date (small muted).
  - No graph rail.
  - Virtualized list with paged loading on scroll near bottom (same paging strategy as today).
  - Empty / loading / error states.
- History tab Col 2:
  - On tab activation, auto-select the latest commit (HEAD of loaded list). Never blank when commits exist.
  - Selected commit detail (pinned, not a popover): shortSha + subject + author + email + absolute time + actions row (Copy SHA, Open on remote when available) + scrollable file list with status/+/− indicators.
  - Clicking a file in the detail opens a commit-file diff workspace tab via the existing `onOpenCommitFile` / `openCommitFileDiffTab` flow.
- Selected commit state persists across switching to Changes tab and back.

Reuse `CommitRow`-derived rendering (adapted to 2-line, no rail) and `CommitDetail` / `CommitFiles` from the current `GitHistoryPane`. The current `GitHistoryPane` and `GraphRail` are still in the tree at this point — they are removed in slice #06.

## Acceptance criteria

- [ ] History tab Col 1 renders 2-line commit rows; no graph rail.
- [ ] Inline search input filters the list (subject / author / email / shortSha).
- [ ] Paged loading triggers near the bottom of the list.
- [ ] Loading / error / empty states render.
- [ ] On entering History tab, latest commit auto-selected.
- [ ] Col 2 shows pinned commit detail (sha, subject, meta, actions, file list).
- [ ] Copy SHA works; Open-on-remote button appears only when remote URL parsed.
- [ ] Clicking a file in detail opens a commit-file diff workspace tab.
- [ ] Selected commit and scroll position survive switching to Changes and back.

## Blocked by

- #03 — Source Control Surface shell
