# 01 — HistoryPane reload on branch switch

Status: ready-for-agent

## What to build

When the user switches branches via the source-control branch picker, the History tab must reload its commit list to reflect the newly checked-out branch. Today, only the Changes pane refreshes after checkout; the History pane keeps showing the previous branch's commits until the panel is fully remounted.

The fix is end-to-end: branch checkout completes → some signal reaches HistoryPane → HistoryPane re-runs its initial load against the new HEAD. The signal can be a prop (refresh tick, branch name change), a shared context, or an event subscription — pick whichever fits the existing source-control wiring.

## Acceptance criteria

- [ ] Switching branches via the BranchPicker triggers HistoryPane to refetch commits
- [ ] The newly displayed commit list reflects the checked-out branch's HEAD (verify manually with two branches that have diverging history)
- [ ] No double-fetch on the initial mount (refresh only fires on actual branch change, not on every render)
- [ ] In-flight commit detail loads (file changes for a clicked commit) are not corrupted by the refresh — either cancelled or allowed to settle
- [ ] Test (vitest) covers: HistoryPane reloads when its branch-identifying prop/signal changes

## Blocked by

None - can start immediately
