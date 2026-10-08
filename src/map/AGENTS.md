# Map/spatial scope

Inherit root AGENTS.md; this file adds only area-specific rules.

Owned: src/map/**; assigned tests/widgets/map/** and docs/review/<task>/**.

Protected: lesson-studio.html, shared schema/registry/contracts, neighbouring component directories, existing publications, CI and generated/vendor files unless explicitly assigned to integration.

Bound V1 to the approved real lesson; authoritative locations/boundaries/data, provenance and uncertainty. Do not invent geography. 3D/campaigns/terrain are deferred unless explicitly scoped.

New substantial widgets follow [Widget Contract V1](../../docs/development/WIDGET-CONTRACT-V1.md). Include focused config/state/reset/resize/disposal/keyboard/error tests where relevant, a runnable fixture and honest responsive/publishing evidence. Integration owns central wiring and combined regression. CodeRabbit remains required for a stable PR; stop at product/contract/architecture decisions and assigned staged review, not routine fixes. Preserve legacy config/IDs/unknown fields and host answer policy.

