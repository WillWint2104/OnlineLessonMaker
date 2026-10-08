# Reusable learner Widget Contract V1

**ADOPTED — Widget Contract V1**, version 1.0, protected and human-approved. Governs NEW substantial learner widgets. This is a small lifecycle/data contract, not a runtime framework or a requirement to migrate existing Mathematics/Evidence components.

## Data and identity
- Stable namespaced widget type and stable authored instance ID; document config schema version and required/optional fields in the component directory.
- Authored configuration is JSON-safe teaching/content data. Keep learner response, view state, DOM handles and library instances out of it.
- Host owns canonical response identity (lesson/activity/question/widget instance). Widget edits go through the host adapter's change callback; one state is shared by compact and expanded views.
- Host supplies initial state and assets. Widgets may use local ephemeral view state, but must state its lifetime. No independent storage, remote backend, automatic marking or cross-lesson leakage by default.
- Preserve unknown supported fields on authoring/export round-trip. New optional fields have compatible defaults. Breaking schema/contract changes require a new version and explicit migration/adaptation review; never silently reinterpret an existing lesson.

## Lifecycle boundary
Provide a documented mount adapter with equivalent semantics to:
`mount({root, instanceId, config, state, onChange, assets, theme}) -> {reset, resize, dispose}`.
These are interface expectations; implementation may use existing app patterns. No global registry is implemented here.
- Validate config/assets before mounting; invalid/missing content shows a useful learner-safe fallback and preserves surrounding navigation. Never silently fabricate evidence or geography.
- Reset is an explicit host action returning the documented initial response; navigation/re-render/Expand does not silently reset. Keep authored givens distinct from a learner attempt.
- Resize adapts to available container size; it does not mutate authored content or learner response. Compact/expanded is optional, opens the same response and returns focus/state to its opener.
- Dispose removes listeners/observers/timers/library instances and owned overlays. It is safe on repeat; asynchronous callbacks cannot update a disposed instance.
- Callback ownership, update order and any error semantics must be described/tested by the component. Host authoring, publication and release policy remain host responsibilities.

## Presentation, accessibility and assets
- Namespace component selectors/events; no unscoped global styles, unrelated DOM queries or document-wide keyboard capture. Consume host theme values through a component-local adapter; any proposed shared token is integration-reviewed. Inspect existing tokens rather than inventing a global token set.
- Theme hooks are cosmetic. They cannot change semantics, navigation, pedagogy, assessment or accessible behaviour.
- Responsive compact/expanded surfaces must remain usable at assigned desktop/tablet/mobile widths and native 200%. No whole-page overflow; justified content scrolling stays bounded.
- Meaningful names, visible focus, keyboard equivalents, focus containment/return for overlays and reduced-motion support where relevant. No requirement for a pointer-only response.
- Structured asset references include source/provenance/rights and alternative text where needed. Resolve via host asset policy, retain stable IDs/revisions and report external/offline dependencies honestly. Publication must package required local assets.
- Escape/validate authored text, URLs and imported data according to existing host policy; do not add arbitrary code execution or bypass answer-release filtering.

## Integration and reuse
Builder delivers isolated source, config/state documentation, focused tests, runnable fixture and adapter needs. Integration alone wires type registration, shared schema, authoring/export/reopen and cross-widget behaviour. Isolated tests are not production acceptance.

Learner component may later be imported by HGL Studio from the SAME source. Studio owns its presenter/recording controls; they must not enter the learner component. No divergent Studio fork by default.

Changes to this protected contract need a bounded explicit task, integration review/regression and human decision for behaviour/product architecture. Contract adoption does not authorise feature launch or foundation merge.

