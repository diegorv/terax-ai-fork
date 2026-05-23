# 01 — Sidebar top toggle + per-view width persistence

**Type:** AFK

## What to build

Replace the bottom `SidebarRail` with a segmented control at the top of the sidebar that toggles between `Files` (FileExplorer) and `Source Control` (existing `SourceControlPanel` for now). Persist sidebar width independently per view so switching never collapses or stretches the wrong content.

End-to-end behavior:

- Top of sidebar shows two-segment control: `[Files | Source Control]`.
- Selecting a segment swaps the content underneath and resizes the panel to the width remembered for that view.
- Resizing the sidebar updates only the active view's persisted width.
- The old `SidebarRail` at the bottom is removed.

Storage keys: `terax.sidebar.width.files`, `terax.sidebar.width.source-control`. Reasonable defaults: Files = current default, Source Control = ~520px.

## Acceptance criteria

- [ ] Segmented control rendered at top of sidebar, replaces `SidebarRail`.
- [ ] Clicking each segment swaps the rendered view.
- [ ] Switching views resizes sidebar to the persisted width for that view.
- [ ] Manual resize persists only to the active view's key.
- [ ] First-run defaults applied; no crash if storage missing.
- [ ] Keyboard command `pane.source` still toggles to Source Control view.
- [ ] `SourceControlPanel` continues to render and function unchanged inside the new container.

## Blocked by

None — can start immediately.
