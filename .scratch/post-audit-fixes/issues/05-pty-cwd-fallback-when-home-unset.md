# 05 — PTY cwd fallback when $HOME unset / all fallbacks fail

Status: ready-for-agent

## What to build

Two related edge cases in the Rust workspace/shell layer when no usable cwd can be resolved:

1. **`shell_session_open`** falls back to `PathBuf::from("/")` when `dirs::home_dir()` returns `None` (i.e. `$HOME` unset, `getpwuid` fails). The session silently initializes with `initial_cwd = "/"`, and every subsequent command runs from the filesystem root with no user-visible indication.
2. **`apply_common` in `pty/shell_init.rs`** logs a warning and does NOT call `cmd.cwd(...)` when all three fallbacks (explicit cwd, launch snapshot, home dir) yield nothing usable. The spawned PTY then inherits the app process's working directory, which contradicts the fork's stated goal (commit 59d94f6) of always defaulting to `$HOME`.

End-to-end decision required first: what should happen when no valid cwd exists?

- **Option A** — return an error from `shell_session_open` / surface a UI-visible failure
- **Option B** — fall back to a documented safe path (e.g. `std::env::temp_dir()`) and log at `error` (not `warn`)
- **Option C** — keep current behavior but emit a structured event the frontend can surface as a toast

Pick one and apply consistently across both sites.

## Acceptance criteria

- [ ] `shell_session_open` no longer silently uses `/` when `home_dir()` is `None` — the chosen behavior (A/B/C) applies
- [ ] `apply_common` in `pty/shell_init.rs` follows the same policy as `shell_session_open` (no silent process-cwd inheritance)
- [ ] Logging is at `error` level (not `warn`) when the fallback path is reached, with enough context to debug ($HOME state, attempted fallbacks)
- [ ] Test (cargo test) covers: behavior when `home_dir()` returns `None` (mock or feature flag if needed)

## Blocked by

None - can start immediately
