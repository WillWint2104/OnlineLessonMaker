# Lightweight backlog

backlog.json is the coordination record. No agent/service watches or dispatches it automatically. Seeded feature tasks have no branch/worktree/PR and are inactive.

States: QUEUED (eligible only after dependencies/scope approval), ACTIVE (exclusive builder ownership), BLOCKED (named dependency), STAGED-REVIEW (human/product checkpoint), INTEGRATION (accepted component undergoing central wiring), MERGE-CANDIDATE (exact-head reviewed/tested), MERGED (actual merge receipt), DEFERRED (future production need).

For this review FOUND-001 is STAGED-REVIEW. The three planned cards are BLOCKED on setup approval; SOURCE/MAP also depend on HIST-001 Stage A approved scoping. A scope milestone can satisfy a dependency without waiting for the entire History implementation to merge. Record the exact approved checkpoint and evidence; no implicit dependency satisfaction.

Coordinator selects the lowest numerical priority among tasks with all accepted dependencies, explicit implementation authority, disjoint owned paths and capacity available. Equal priority: unblock the most production-critical downstream work, then older task ID. If two projects await design review, dispatch stops. Current highest-priority action is HUMAN REVIEW of FOUND-001; there is no dispatchable feature task.

Allowed paths are proposed boundaries, not automatic authority. A task's protected patterns always prevail unless an explicit integration task grants a narrow exception. Update status only from actual evidence; BLOCKED needs blocker text, active/integration tasks need real branch/worktree/owner, STAGED-REVIEW waitingForHuman is counted by distinct project. PRs remain draft until approval; staged review may exist without a PR.

