# Source Control Refactor — issue set

GH-Desktop-style source control inside the sidebar. See [`/Users/diegorv/Dev/open-source-projects/apps/desktop`](https://github.com/desktop/desktop) for visual reference.

## Layout target

```
┌─ Sidebar (resizable, width per-view) ──────────────┐
│ [ Files | Source Control ]   ← segmented top      │
├────────────────────────────────────────────────────┤
│ (Files: FileExplorer, intacto)                    │
│   OR                                               │
│ (SC):                                              │
│ ┌── Header tripartite ──────────────────────────┐  │
│ │ [Repo] [Branch ▾] [Fetch · 7m]   (Pull pill?) │  │
│ └───────────────────────────────────────────────┘  │
│ ┌── Tab bar ───────────────────── [↻ refresh] ─┐  │
│ │ [Changes (n)] [History]                       │  │
│ └───────────────────────────────────────────────┘  │
│ ┌── col1 ──────┐│┌── col2 ──────────────────────┐ │
│ │ files OR     ││ composer+actions OR commit    │ │
│ │ commits      ││ detail (meta + files)         │ │
│ └──────────────┘└───────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

## Dependency graph

```
01  02
 │   │
 ▼   ▼
 03 ──┬──> 04
      ├──> 05 ──> 06
      └──> 07
```

## Slices

| # | Title | Type | Blocked by |
|---|---|---|---|
| [01](01-sidebar-top-toggle.md) | Sidebar top toggle + per-view width persistence | AFK | — |
| [02](02-native-branch-ops.md) | Native git branch list + checkout commands | AFK | — |
| [03](03-sc-surface-shell.md) | SC Surface shell: 2-col split, tripartite header, Changes/History tabs (Changes wired) | AFK | #01 |
| [04](04-branch-picker.md) | Branch picker popover wired to checkout | AFK | #02, #03 |
| [05](05-history-tab.md) | History tab content (commit list + detail pane) | AFK | #03 |
| [06](06-cleanup-old-history-tab.md) | Cleanup: remove `git-history` workspace tab kind + GraphRail + plumbing | AFK | #05 |
| [07](07-pull-badge-and-refresh-placement.md) | Pull badge inside Fetch + Refresh in tabs bar | AFK | #03 |

## Key decisions (from grilling)

- Sidebar toggle is **exclusive** (Files OR SC), not parallel panes.
- SC lives **inside the sidebar** (not a workspace tab kind).
- 2-column internal layout; diff continues to open as a workspace tab.
- No `git-history` workspace tab kind after #06.
- Graph rail dropped.
- Branch picker = minimal: list local + checkout. Requires new backend (#02).
- Width persisted per view; inner column ratio persisted per tab.
- History auto-selects HEAD on entry.
