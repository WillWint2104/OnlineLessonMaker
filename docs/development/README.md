# Agentic development foundation — final correction review

Baseline: production main `aae1b1a891d495e31e879bcbd6a79404f576fe57`; PRs #169/#170 merged. **General Mathematics architecture frozen.** Setup-only: no feature builders launched, no new learner features, no migration, merge or deployment.

Read in order:
1. [Repository audit and ownership](OWNERSHIP.md) and [machine-readable ownership](ownership.json).
2. [Widget Contract V1](WIDGET-CONTRACT-V1.md).
3. [Operating model / roles / review / worktrees](OPERATING-MODEL.md).
4. [Task template](TASK-TEMPLATE.md), [backlog](backlog.json) and [state/priority rules](BACKLOG.md).
5. [History architecture](tasks/HIST-001.md), [Source Viewer](tasks/SOURCE-001.md), [Map Engine](tasks/MAP-001.md).
6. [Deferred streams](DEFERRED-STREAMS.md).
7. Root/scoped AGENTS.md guidance and the review package verification receipt.

Widget Contract V1, ownership boundaries and capacity limits are adopted following human review. Final correction/merge approval is pending; feature activation requires a separate explicit launch after FOUND-001 merges. History, Source and Map Stage A may then run concurrently toward one combined human checkpoint. Source/Map Stage A is audit/research/proposal only; Stage B is gated on human-approved History Stage A and reconciled bounded V1 scope. Nothing automatically launches or advances from backlog edits.

Validate coordination data using `node scripts/verify-development-foundation.mjs`. It checks references, state/capacity, dependency cycles and disjoint allowed ownership. It is a read-only checker, not an agent launcher, runtime registry or project-management system. Branch protection/CODEOWNERS enforcement is not added in this setup.

Older README/HANDOFF sections mention Present and superseded Mathematics milestones; the new root instructions and direct task scope govern new development. This setup does not remove existing controls or rewrite historical receipts.

