# 02 — Serialize concurrent stage/unstage mutations

Status: ready-for-agent

## What to build

The `runMutation` helper in the source-control panel only guards against concurrent remote actions (fetch/pull/push) by checking `summary.busyAction`. It does not check `localActionBusy`, so rapid clicks on stage/unstage/discard buttons can fire overlapping IPC calls. The optimistic update of the first mutation can be reverted by a stale reconcile from the second, and the underlying git operations can collide on the index lock.

End-to-end fix: the mutation guard must consider both remote and local busy state, OR mutations must queue serially. Pick the approach (reject vs queue) that matches existing UX expectations — if buttons should debounce visibly, reject; if every click should eventually apply, queue.

## Acceptance criteria

- [ ] Clicking stage on file A and stage on file B in rapid succession no longer triggers two concurrent IPC calls
- [ ] Optimistic state is not corrupted by overlapping mutations (final UI matches `git status` after settle)
- [ ] The chosen behavior (reject-while-busy or queue) is consistent across all mutation entry points (stage, unstage, stageAll, unstageAll, discard, discardAll, commit)
- [ ] Test (vitest) covers: second mutation fired while first is in flight does not duplicate or interleave

## Blocked by

None - can start immediately
