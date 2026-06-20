# Lesson Studio

A single‑file web app for authoring and delivering interactive secondary‑school lessons
(NSW Ancient History / History / Geography). No backend, no build step, no database — the
whole app is `lesson-studio.html`.

> **New here? Read [`HANDOFF.md`](./HANDOFF.md)** — architecture, data model, dev rules,
> deployment and the school‑firewall plan.

## Quick start

- **Run it:** open `lesson-studio.html` in a modern browser (Edge/Chrome/Firefox/Safari ≥15.4).
- **Author:** switch to **Edit**, click any text to change it, set images/links, add cards.
- **Present:** **Present** = full‑screen board mode; click to advance, ← / → to navigate.
- **Publish a lesson:** **Export** downloads a standalone study‑mode `.html`. Put it in
  `/lessons/`, commit, and Cloudflare Pages serves it to students.

## How changes ship

```
PR  →  CodeRabbit review  →  CI (scripts/validate.mjs) green  →  auto-merge  →  Cloudflare Pages deploy
```

- `.coderabbit.yaml` configures the review.
- `.github/workflows/validate.yml` checks the lesson JSON parses and the engine script is
  valid JS, and flags firewall/storage guardrails.
- `.github/workflows/automerge.yml` turns on GitHub auto‑merge for clean PRs.
- Cloudflare Pages (Git integration) deploys `main`.

## Repo settings to enable once

1. **Settings → General → Pull Requests → "Allow auto‑merge".**
2. **Settings → Branches → protect `main`:** require the **validate** status check; require
   branches up to date. (Optionally require 1 approving review and let CodeRabbit approve.)
3. **Cloudflare → Pages → Connect to Git** → this repo (preset None, output dir `/`).

See `HANDOFF.md` §7–§8 for the full deployment and firewall notes.
