# 02 — Native git branch list + checkout commands

**Type:** AFK

## What to build

Add two new native (Tauri/Rust) commands plus their TypeScript bindings to support the upcoming branch picker:

- List local branches for a given repo root, marking the current one.
- Check out a given local branch.

End-to-end behavior:

- TS callers can `native.gitListBranches(repoRoot)` and receive a typed array of local branches with `name`, `isCurrent`, and optional `upstream`.
- TS callers can `native.gitCheckout(repoRoot, branchName)` to switch HEAD. The promise resolves on success and rejects with a human-readable error string on conflict / dirty tree / unknown branch.

No UI is changed by this slice. Verifiable via a small test or scratch call.

## Acceptance criteria

- [ ] New Rust commands implemented under `src-tauri/src/modules/git/`.
- [ ] Commands registered in the Tauri command list.
- [ ] `GitBranch` type added to `src/lib/native.ts` (fields: `name: string`, `isCurrent: boolean`, `upstream: string | null`).
- [ ] `native.gitListBranches(repoRoot)` returns local branches, current branch flagged.
- [ ] `native.gitCheckout(repoRoot, branch)` switches HEAD; surfaces clear error on dirty tree / unknown branch / conflict.
- [ ] Errors normalized to strings, not raw Rust panics.
- [ ] Smoke-tested against the working tree (manual is OK).

## Blocked by

None — can start immediately.
