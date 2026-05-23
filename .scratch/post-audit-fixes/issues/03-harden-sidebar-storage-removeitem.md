# 03 — Harden sidebar storage migration against removeItem failure

Status: ready-for-agent

## What to build

The sidebar width migration reads a legacy `terax.sidebar.width` key, writes it to the per-view key, then removes the legacy key. If `removeItem` throws (rare: storage corruption, locked storage, browser quirks), the exception escapes `readSidebarWidth`. The caller's try/catch then falls back to `MEMORY_STORAGE`, which returns the default width for the current session — even though the migrated value was already persisted by the prior `setItem`. Next session recovers, but the user sees a default-width flash on the session where migration ran.

End-to-end fix: the migration block in `storage.ts` should treat the `removeItem` step as best-effort and still return the migrated width if `setItem` succeeded. Don't let cleanup failure mask a successful write.

## Acceptance criteria

- [ ] `readSidebarWidth` returns the migrated width even if `removeItem` throws
- [ ] If `setItem` throws (true migration failure), the function still falls back to the default (current behavior preserved)
- [ ] Migration remains idempotent — re-running after a partial failure does not corrupt state
- [ ] Test (vitest) covers: a fake `StorageLike` whose `removeItem` throws still produces the migrated width

## Blocked by

None - can start immediately
