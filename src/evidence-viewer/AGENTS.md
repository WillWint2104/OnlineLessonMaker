# Source/Evidence Viewer scope

Inherit root AGENTS.md; this file adds only area-specific rules.

Owned: src/evidence-viewer/**; assigned tests/widgets/evidence-viewer/** and docs/review/<task>/**.

Protected: lesson-studio.html, shared schema/registry/contracts, neighbouring component directories, existing publications, CI and generated/vendor files unless explicitly assigned to integration.

Audit existing inline ev* implementation, vendored OpenSeadragon and docs/review/evidence-viewer contract/publication before proposing extraction. No rejected design reuse. Scope V1 from approved History need; provenance/rights and useful failure states are mandatory.

New substantial widgets follow [ADOPTED Widget Contract V1](../../docs/development/WIDGET-CONTRACT-V1.md). Include focused config/state/reset/resize/disposal/keyboard/error tests where relevant, a runnable fixture and honest responsive/publishing evidence. Integration owns central wiring and combined regression. CodeRabbit remains required for a stable PR; stop at product/contract/architecture decisions and assigned staged review, not routine fixes. Preserve legacy config/IDs/unknown fields and host answer policy.


Stage A may run alongside History after foundation merge and an explicit launch, owning only its proposal/evidence directory. Stage B requires human approval of HIST-001 Stage A and reconciliation of this stream’s V1 scope with that approved lesson need. No implementation or vendor integration in Stage A.
