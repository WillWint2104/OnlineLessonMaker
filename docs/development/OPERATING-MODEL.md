# Coordination, review and worktrees

## Roles and capacity
Coordinator reads production needs/dependencies, selects the highest-priority eligible task, assigns exclusive paths, checks review capacity and records task/branch/worktree/PR. It prevents duplicate ownership and identifies integration candidates; it is not the primary implementer of every stream. Backlog is a record, not permission to dispatch.

Builder audits current code, reads scopes, implements only an approved bounded task, supplies tests/fixture/evidence, self-reviews and stops at its task's product checkpoint. No opportunistic refactors.

Independent reviewer, when authorised for a substantial component, checks correctness, contract, accessibility, state/reset, edge cases, coupling, tests and regression risk. It does not invent a new product direction. It supplements CodeRabbit.

Integration/QA owns central wiring and shared gates: registry/schema, existing corpus, publishing and authoring round-trip, responsive/accessibility, state/reset, browser behaviour and cross-widget conflicts. Use one integration checkout per integration task; do not modify builders' checkouts. Integrate reviewed commits into the integration branch, then run the combined applicable checks. Maintain provenance from each component head to the integrated head.

Limits: **3 active feature builders; 2 distinct projects waiting for human design review**. Integration/QA is separate. Independent review uses available capacity and never displaces the integration lane with a fourth builder. A free slot does not authorise new work when design review is saturated. Raising the limit requires explicit operating-policy approval, not merely having a free agent.

## Checkpoints and pipeline
A: architecture/runnable foundation. B: core interaction. C: realistic lesson fixture/visual treatment. D: merge candidate. Task cards choose meaningful stops; not every task stops at all four.

Stop for product judgement: ambiguous learner UX, material pedagogy, new interaction model, core architecture/contract change, unresolved accuracy or major identity choice. Continue routine bugs, tests, accessibility/responsive fixes and approved designs without repeated approval requests.

Builder → focused checks → self-review → optional authorised independent review → stable DRAFT PR → CodeRabbit → actionable fixes/affected checks → integration/regression → required human review → exact-head merge candidate. CodeRabbit must cover the final head, with unresolved threads zero and CI/mergeability clean. Do not request another review for every minor commit; re-review after meaningful changes or missing exact-head coverage.

**Ready-for-review triggers auto-merge in this repository.** Keep PRs draft and auto-merge disabled through staged review. After explicit merge approval, check exact head, tests and CodeRabbit again, then follow squash policy, sync main, deploy existing Pages workflow and live-verify files. Never merge a stale receipt. A setup approval does not automatically approve a future feature merge.

## Worktree operations
One task, one branch, one writable checkout. Branch format: `codex/<stream>-<TASK-ID>-<short-name>`. Record absolute checkout, starting SHA and owner in backlog before activation. Confirm existing worktrees/dirty files first.

Example commands, **not executed for future tasks**:
```powershell
git fetch origin main
git worktree list --porcelain
git worktree add -b codex/history-HIST-001-lesson-foundation '../OnlineLessonMaker-HIST-001' origin/main
git -C '../OnlineLessonMaker-HIST-001' status --short
git -C '../OnlineLessonMaker-HIST-001' rev-parse HEAD
```
The Codex app alternative is list_artifacts → reuse a suitable task-owned worktree, or create_worktree(ref verified main) → use returned workspace → attach if registration failed. Archive managed worktrees with archive_worktree for recoverable snapshots; do not shell-remove app-managed checkouts.

For a manually created checkout, retire only after merge/abandonment is explicitly recorded and all needed uncommitted/untracked/ignored evidence is preserved:
```powershell
git -C '../OnlineLessonMaker-HIST-001' status --short
git worktree remove '../OnlineLessonMaker-HIST-001'
git worktree list
```
Use exact verified paths; no --force, recursive deletion or automatic branch deletion. Main stays available for integration/production, not shared mutable builder state. Setup currently uses its own branch in the existing checkout; there are no independent builders.

## Human decisions for this setup
Approve/adjust the proposed contract and ownership; approve the History-first scope dependency and capacity limits. Choose a concrete Year 12 Ancient History production brief before HIST-001 is activated. SOURCE/MAP implementation scope waits for that approved lesson need. No choice of map vendor, GIS dataset, source-analysis UX or complete History layout is made here.

