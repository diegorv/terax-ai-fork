# 07 — Pull badge inside Fetch segment + Refresh button in tabs bar

**Type:** AFK

## What to build

Reorganize the secondary remote actions (Pull, Refresh) that live in the existing `SourceControlPanel` header into their new homes inside the Source Control surface (slice #03):

- Pull becomes a conditional badge button rendered **inside** the Fetch segment of the tripartite header. Appears only when `behind > 0` and not diverged. Shows the count (e.g. `Pull 3`). Disabled while a remote action is in flight.
- Refresh becomes a small icon button in the **tabs bar** (right side, next to the `[Changes | History]` tabs). Spins on click; disabled during in-flight remote actions.
- Fetch keeps its primary segment role (button + "last fetched" timestamp). Diverged branches still show the existing diverged banner inside Changes Col 2.

End-to-end behavior:

- When `behind > 0` and not diverged: Pull pill appears inside Fetch segment with the count; clicking runs the pull action.
- When `behind == 0` or upstream missing or diverged: Pull pill not rendered.
- Refresh icon in the tabs bar refreshes source control status; same behavior as today.
- Tooltips reflect the existing disabled-reason logic (no upstream, diverged, fetching, etc).

## Acceptance criteria

- [ ] Pull pill renders inside Fetch segment only when `behind > 0` and not diverged.
- [ ] Pull pill shows the behind count and triggers the existing pull action.
- [ ] Refresh icon renders at the right end of the tabs bar.
- [ ] Refresh triggers the existing refresh flow and animates while running.
- [ ] Disabled tooltips match existing logic (diverged, no upstream, in-flight action).
- [ ] No duplicate Pull / Refresh controls elsewhere in the surface.

## Blocked by

- #03 — Source Control Surface shell
