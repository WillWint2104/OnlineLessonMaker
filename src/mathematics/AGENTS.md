# Mathematics scope

Inherit root AGENTS.md; this file adds only area-specific rules.

Owned: Only paths explicitly assigned to a CONTENT or bounded widget/capability task; new modules may use src/mathematics/widgets/<task>/**.

Protected: lesson-studio.html, shared schema/registry/contracts, neighbouring component directories, existing publications, CI and generated/vendor files unless explicitly assigned to integration.

General architecture frozen at aae1b1a. visual-system.css, src/graph-response and HGL bundles remain protected. No compulsory V1 migration. Required relevant calculator/graph/plane/structure/content/publication checks depend on scope.

New substantial widgets follow [Widget Contract V1](../../docs/development/WIDGET-CONTRACT-V1.md). Include focused config/state/reset/resize/disposal/keyboard/error tests where relevant, a runnable fixture and honest responsive/publishing evidence. Integration owns central wiring and combined regression. CodeRabbit remains required for a stable PR; stop at product/contract/architecture decisions and assigned staged review, not routine fixes. Preserve legacy config/IDs/unknown fields and host answer policy.

