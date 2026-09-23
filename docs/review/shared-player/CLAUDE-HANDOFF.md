# Integration handoff

Base: `2189477ef628e002a18323fe1e0ee1234e3b68bb` on
`origin/claude/stage-4-block-wiring`. Main/merge base:
`e328db01524e448a103ac58d73aba60bddd04fdc`. Task branch:
`codex/shared-lesson-player`. PR #153 was verified open at the base; it was not modified.

Implementation commit: `bdd4c3d` (shared player, authoring, schema and reproducible tooling).
The following commit contains review JSON, exports, captures and test summaries. The branch
has no upstream, preventing an accidental push to Claude's development branch.

Use `git log --oneline 2189477..codex/shared-lesson-player` for the incremental commit range
and `git diff --stat 2189477..codex/shared-lesson-player` for the final file list. Do not reset
or replace the development branch. Integrate only after the user's visual review; do not
merge or deploy automatically.

Main app changes are in `lesson-studio.html`: `lpEnabled/lpValidate/lpProjection/lpRender`,
`lpMove/lpNavigate/lpInspector`, the `shared.skill` registration, theme-independent lookup,
and `.lp` styles. `slides` remains the root sequence; each new skill has `activities`.
The same `mxSkillPage` content/renderers supply preview and the exported lesson. `meta.subject`
is metadata, optional `meta.colors.accent` is decoration, and `meta.responseMode` is policy.
Workbook IDs are activity-specific; table row keys are distinct in the new flow. Navigation
state is separate from responses, and neither is treated as assessed mastery.

`lpValidate` rejects unsupported activity fields, unknown parts/compositions and invalid
response policy before JSON import or publication. Missing video slots are retained and
omitted from the learner sequence until supplied. Old skills without `activities` retain
the existing legacy contract; this is a bounded addition, not a document migration.

`scripts/build-player-demos.mjs` derives the two-skill algebra lesson from the existing
reviewed JSON and creates clearly synthetic source-analysis and physics coverage material.
`scripts/verify-shared-player.mjs` exercises authoring, navigation, response modes, color
separation, screenshots, and actual HTML downloads/reopening. `scripts/serve-player.mjs`
serves the local review, and `scripts/verify-player-suite.mjs` coordinates distinct gate logs.

The geometry-semantics harness needed `fileURLToPath` on Windows and file reading before
sending HTTP headers. The responsive-shell gate's old “only mathematics” assertion now
requires exactly mathematics plus the shared skill registration; legacy route assertions
remain intact. No golden screenshot baselines were regenerated.

Reproduction:

```text
npm ci
node scripts/serve-player.mjs
node scripts/verify-player-suite.mjs
```

Open the local app or exported factorising HTML using the links in `README.md` in this
directory. That file indexes the real captures and documents exact UI operations, data
provenance, video locations, publication dependencies, and unsupported authoring fields.
Use `logs/results.json` and per-gate logs for observed local results. No remote CI claim is made.
