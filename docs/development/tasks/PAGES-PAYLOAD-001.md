# PAGES-PAYLOAD-001 — Safe Pages staging (draft review)

Authority: user attachment 51f963a6-6df8-41ce-84a6-69e679441b07, 5 November 2026. One single-agent release-infrastructure task; no new feature stream. Base: `6959de55b482402b7e46c62786d1475b03421791`.

Branch: `codex/integration-pages-safe-payload`. Exclusive writable worktree: `review-delivery/worktrees/pages-safe-payload`. Allowed paths: `.github/workflows/deploy-pages.yml`, `.github/workflows/pages-payload.yml`, `scripts/stage-pages.mjs`, `tests/deployment/pages-payload.test.mjs`, `tests/deployment/verify-staged-site.mjs`, this release/task note. All runtime, lessons, assets, historical evidence, Mathematics, G03, RF01 and GeoScape remain protected. No governance launch/checkpoint arrays change.

## Proposed release boundary

The helper copies the committed checkout inventory into a fresh directory outside the checkout. It excludes `docs/review/**` (case variants included), `.git` and `.github`. Untracked/ignored files are not publication inputs. Every remaining tracked path is retained, including `index.html`, `lesson-studio.html`, `lessons/**`, `assets/**`, `interactives/**`, and `docs/lessons/**`. The latter includes existing published teacher-resource links and must not be lost to an application-only allowlist.

No original review file is moved, deleted or altered. Public GitHub source/history remains public: Pages exclusion is not confidentiality or authentication. Historical Pages URLs beneath `/OnlineLessonMaker/docs/review/` will intentionally return 404 after a separately approved deployment. Current public application, lesson, interactive, asset and `docs/lessons/` URLs remain unchanged.

Staging refuses existing outputs, inside-checkout destinations, dirty tracked source, links/submodules, hard-linked aliases, ambiguous paths and case collisions. An independent post-copy walk checks the exact inventory and all SHA-256 values. The manifest stays outside both checkout and website. Failed staging or archive checks stop the workflow before deployment; stale output is rejected rather than deleted or reused.

## Proposed trigger safeguard — requires human review before merge

The old `push: main` trigger could release unapproved content after a human-token merge, even though historical bot-token merges suppress push workflows. This draft proposes **manual dispatch on main only**, checking out the immutable event SHA. Keep the same Pages permissions, concurrency group, environment, upload action and deploy action. No workflow is dispatched by this task.

The read-only PR preflight workflow uploads a distinctly named test artifact and receipts; it has no Pages deployment step or write permissions. Both workflows use the same staging helper and actual-archive verifier. Review and approve the trigger change with this draft before any merge; production deployment needs separate approval of its resulting main SHA.

## Verification

Run `node --test tests/deployment/pages-payload.test.mjs`. Stage with `node scripts/stage-pages.mjs --output <fresh-external-directory> --manifest <external-json>` from a clean committed checkout. Create the same tar used by `actions/upload-pages-artifact@v3`, or use its actual `$RUNNER_TEMP/artifact.tar` in CI. Run `node tests/deployment/verify-staged-site.mjs --stage <directory> --manifest <json> --artifact <tar> --report <external-json>`.

The verifier inventories/hashes every tar file after inspecting links/paths, then loads representative application, published learner, interactive and `docs/lessons/` routes through a stage-only local server at `/OnlineLessonMaker/`. It confirms excluded review URLs return 404. Production runs use `--artifact-only` without installing browser dependencies; the read-only preflight exercises the browser checks.

Stop: one DRAFT PR, auto-merge disabled; exact-head CI/CodeRabbit or independent review; human approval. No merge, deployment, publication, Y9-02 or other implementation.
