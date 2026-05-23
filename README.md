<div align="center">
  <img src="public/logo.png" width="144" height="144" alt="TeraxFork" />
  <h1>TeraxFork</h1>

  <p><strong>Personal fork of <a href="https://github.com/crynta/terax-ai">crynta/terax-ai</a> for experimenting with my own ideas of what an AI-native terminal should be.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/status-experimental-orange" alt="status" />
    <img src="https://img.shields.io/badge/fork-personal--PoC-yellow" alt="fork" />
    <img src="https://img.shields.io/badge/license-Apache--2.0-green" alt="license" />
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey" alt="platform" />
  </p>
</div>

---

> [!WARNING]
> **This is a personal fork, not a maintained product.**
>
> - :rotating_light: **Not recommended for use yet.** Things will break, change, or disappear without notice.
> - :hammer_and_wrench: This fork is a **proof of concept** for ideas I want to try out around what I consider the perfect terminal for AI workflows.
> - :bust_in_silhouette: Built **for personal use**. I do not plan to open pull requests against the upstream project (no bandwidth for upstream review cycles).
> - :sparkles: I think the original project is **fantastic** and you should use that instead: **https://github.com/crynta/terax-ai**
> - :speech_balloon: Issues / PRs here are welcome but may sit unattended. No support is provided.

---

> :books: **Looking for the project description, features, screenshots, AI setup, or platform notes?**
> See [**README-UPSTREAM.md**](./README-UPSTREAM.md) — a snapshot of the original [`crynta/terax-ai`](https://github.com/crynta/terax-ai) README. This file only documents what is specific to the fork.

## Build from source

**Prerequisites**
- Rust (stable) — https://rustup.rs
- Node 20+ and [pnpm](https://pnpm.io)
- Platform-specific Tauri prerequisites — https://tauri.app/start/prerequisites/

**Run**
```bash
pnpm install
pnpm tauri dev          # development
pnpm tauri build        # production bundle
```

**Checks**
```bash
pnpm exec tsc --noEmit          # frontend type-check
cd src-tauri && cargo clippy    # Rust lint
```

## Syncing with upstream

This fork tracks [`crynta/terax-ai`](https://github.com/crynta/terax-ai) via a dedicated mirror branch so my changes on `main` can be kept up to date with the original project.

- **`main`** — my fork, with personal changes on top of upstream.
- **`upstream-main`** — a pristine mirror of `crynta/terax-ai@main`. Never receives local commits; only fast-forwards from upstream.

To refresh the mirror and then bring upstream changes into `main`:

```bash
./scripts/update-upstream.sh          # fetch upstream, fast-forward upstream-main, push to origin
git checkout main
git merge upstream-main               # or: git rebase upstream-main
git push origin main
```

The script adds the `upstream` remote on first run if it's missing, and refuses to sync if `upstream-main` has diverged from upstream (so the mirror cannot silently drift). Pass `--tags` to also push upstream tags to the fork.
