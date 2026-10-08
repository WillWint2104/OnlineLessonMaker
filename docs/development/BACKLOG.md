# Lightweight backlog

backlog.json is the coordination record. No agent/service watches or dispatches it automatically. Seeded feature tasks have no branch/worktree/PR and are inactive.

States: QUEUED (eligible only after dependencies/scope approval), ACTIVE (exclusive builder ownership), BLOCKED (named dependency), STAGED-REVIEW (human/product checkpoint), INTEGRATION (accepted component undergoing central wiring), MERGE-CANDIDATE (exact-head reviewed/tested), MERGED (actual merge receipt), DEFERRED (future production need).

For final correction review FOUND-001 remains STAGED-REVIEW at Stage D; this does not claim merge-candidate checks have already completed. Contract/ownership/capacity adoption is approved. All three planned cards remain BLOCKED on foundation merge and explicit launch (History also needs a concrete lesson brief). They may run Stage A concurrently. Source/Map Stage A owns proposal/evidence paths only; stageBAllowedPaths records future boundaries and grants no current ownership. approvedCheckpoints records actual human decisions such as HIST-001:A; implementationGate.scopeReconciledWith must reference that same approved History checkpoint before Source/Map enter B/C/D. No implicit Stage A → implementation advancement.

The initial three Stage A tasks share project humanities-stage-a for one combined human decision and review package. This grouping is valid only while they form that joint checkpoint; later independent implementation/review projects must be identified separately. Do not relabel unrelated reviews to evade the two-project limit.

Coordinator selects the lowest numerical priority among tasks with all accepted dependencies, explicit implementation authority, disjoint owned paths and capacity available. Equal priority: unblock the most production-critical downstream work, then older task ID. If two projects await design review, dispatch stops. Current highest-priority action is HUMAN REVIEW of FOUND-001; there is no dispatchable feature task.

Allowed/protected paths support exact repository-relative paths and terminal directory /** patterns only. Other wildcard forms are rejected. Boundaries do not grant activation authority. Protected patterns prevail unless an explicit integration task grants a narrow exception. A recorded worktree reserves paths through ACTIVE, STAGED-REVIEW, INTEGRATION, MERGE-CANDIDATE, BLOCKED and DEFERRED. Only MERGED or an explicitly released task (ownershipReleased with branch/worktree cleared after preserving work) frees ownership. Update status only from evidence; BLOCKED needs blocker text, active/integration tasks need real branch/worktree/owner. waitingForHuman is counted by distinct project. PRs remain draft until approval.

