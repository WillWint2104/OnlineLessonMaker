# Integration/QA scripts scope

Inherit root AGENTS.md; this file adds only area-specific rules.

Owned: Only explicitly assigned scripts; shared builders/exporters/gates are integration-owned.

Protected: lesson-studio.html, shared schema/registry/contracts, neighbouring component directories, existing publications, CI and generated/vendor files unless explicitly assigned to integration.

Do not rebuild central HTML or overwrite canonical exports from a feature checkout. Use dedicated review output env paths. Keep legacy corpus and exact-head/clean-source guarantees. Do not rerun all gates for documentation alone.

New substantial widgets follow [ADOPTED Widget Contract V1](../docs/development/WIDGET-CONTRACT-V1.md). Include focused config/state/reset/resize/disposal/keyboard/error tests where relevant, a runnable fixture and honest responsive/publishing evidence. Integration owns central wiring and combined regression. CodeRabbit remains required for a stable PR; stop at product/contract/architecture decisions and assigned staged review, not routine fixes. Preserve legacy config/IDs/unknown fields and host answer policy.

