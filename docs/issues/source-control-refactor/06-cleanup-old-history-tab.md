# 06 — Cleanup: remove old `git-history` workspace tab kind + GraphRail + related plumbing

**Type:** AFK

## What to build

With History fully reimplemented inside the Source Control sidebar surface (slice #05), remove the now-redundant standalone history feature and its plumbing.

End-to-end behavior:

- The `git-history` workspace tab kind is deleted. No way to open a "git history" tab from anywhere in the app.
- The "Commit Graph" entry button at the top of the old `SourceControlPanel` is removed.
- The `onNewGitGraph` Header prop and any keyboard / menu paths that opened a history tab are removed.
- The Header's search-input wiring that proxied through `gitHistoryHandle` is removed.
- `GitHistoryStack`, `GitHistoryPane`, `GraphRail`, `lib/graph.ts`, and any history-only assets used solely by the old tab are deleted. Code reused inside slice #05 (commit row rendering, detail, file row) lives in the new `source-control` module by that point — move/copy as needed before deletion.
- No regression: app builds, all keyboard shortcuts still resolve, no dangling imports, no orphaned types.

## Acceptance criteria

- [ ] No `git-history` kind in the tabs union or anywhere in `useTabs`.
- [ ] No references to `GitHistoryStack`, `GitHistoryPane`, `GraphRail` in `src/`.
- [ ] `onNewGitGraph` removed from Header props and call sites.
- [ ] Header history-search wiring (`gitHistoryHandle`) removed.
- [ ] "Commit Graph" button removed from the old source control panel (or from any remaining UI).
- [ ] `lib/graph.ts` and unused graph helpers deleted.
- [ ] TypeScript builds clean; ESLint clean.
- [ ] App boots; History inside SC sidebar still works (slice #05 unaffected).

## Blocked by

- #05 — History tab content
