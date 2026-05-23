# 04 — Branch picker popover wired to checkout

**Type:** AFK

## What to build

Turn the static `Branch` segment in the tripartite header into a clickable button that opens a popover listing local branches with checkout action.

End-to-end behavior:

- Clicking the `Branch` segment opens a popover anchored under it.
- Popover lists local branches from `native.gitListBranches`. Current branch is visually marked and not actionable.
- Clicking a non-current branch calls `native.gitCheckout`. On success: popover closes, sidebar refreshes status, header updates to the new branch.
- On error (dirty tree, conflict, etc): shows the error inline in the popover and stays open; surface's existing feedback channel may also display it.
- Loading state shown while branches load.
- No create, delete, rename, or remote-branch operations in this slice.

## Acceptance criteria

- [ ] Branch segment is clickable and opens a popover.
- [ ] Popover fetches local branches on open and shows current branch flagged.
- [ ] Clicking a non-current branch checks it out via native command.
- [ ] On successful checkout: popover closes, status refreshes, header reflects new branch.
- [ ] On error: human-readable error displayed in-popover; no crash.
- [ ] Loading state visible while branches load.
- [ ] Empty / error states handled.

## Blocked by

- #02 — Native git branch list + checkout commands
- #03 — Source Control Surface shell
