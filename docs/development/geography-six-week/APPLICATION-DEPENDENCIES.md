# Application dependency matrix and minimum reusable library

Provisional requirements across 33 periods; no implementation authority. **Already available** means identifiable behaviour, not verified fitness for all new lessons. **Requiring adaptation** means plausible reuse needing data/configuration/accessibility/authoring/export scope. **New reusable component** means no accepted generic implementation was identified; it is an investigation candidate. **Deferred** grants no build scope. No committed vendor or new data framework is selected.

Counts measure direct lesson references, not learning value or development effort. Common C01/C02 are counted once per lesson. Optional references must not become essential requirements automatically. C11 is a cross-unit design proposal, C12 has no essential lesson requirement.

| Capability | Classification | Need / optional lesson count | Priority | Existing evidence and limits | Research responsibility |
| --- | --- | --- | --- | --- | --- |
| C01 — Explanations, notes and model examples | already available | 33 / 0 | P0 | GeoLearn text/imageText and guidedResponse in examples/geolearn-sample.json. Audit authoring and release policy before new lesson acceptance. | GEO-001 |
| C02 — Responses, understanding checks and controlled learner model release | already available | 33 / 0 | P0 | knowledgeCheck/sourceAnalysis/guidedResponse exist. Reuse host response identity and release rules; no new store. | GEO-001 |
| C03 — Geographic evidence and source investigation | requiring adaptation | 28 / 1 | P0 | Existing ev* single-source image viewer/sourceMetadata and sourceAnalysis. Audit geographic source bundles and accessible alternatives; no duplicate viewer. | GEO-EVIDENCE-001 |
| C04 — Question-owned maps and thematic layers | new reusable component | 0 / 22 | P1 conditional | Infographic/map links and a historical map bundle are not an accepted generic map widget. Compare static maps with bounded interactive needs. | GEO-MAP-001 |
| C05 — Graphs, statistics and accessible tables | requiring adaptation | 29 / 0 | P0 | Existing infographic and hard-coded chart interactives; common data/provenance/units/table configuration and authoring/export need design. | GEO-EVIDENCE-001 |
| C06 — Population-pyramid reading and comparison | requiring adaptation | 3 / 0 | P1 | interactives/indigenous-population-pyramid.html labels approximate 2016 Census values. Audit/reconfigure; not current generic data or a construction tool. | GEO-EVIDENCE-001 |
| C07 — Migration-flow visualisation | new reusable component | 0 / 3 | P1 conditional | Existing refugee charts are not a reusable origin-destination map. Test static flow maps plus tables before proposing interaction. | GEO-MAP-001 with Evidence data audit |
| C08 — Spatial-change and imagery comparison | new reusable component | 0 / 1 | P2 optional | Single-source inspection exists; georeferenced comparison is not established. Dated side-by-side images can meet initial teaching needs. | GEO-MAP-001 with Evidence source audit |
| C09 — Learner map/graph construction | new reusable component | 3 / 0 | P1 for full online construction | No accepted generic Geography construction workflow identified. Frozen Mathematics graph source cannot be reassigned without separate integration authority. | GEO-001 specifies; Map/Evidence divide scope |
| C10 — Classification, causal reasoning and comparison questions | requiring adaptation | 30 / 0 | P0 | Use existing choice/written response configurations first. A drag/sort/cause-map interaction is an unapproved candidate, never a pointer-only requirement. | GEO-001 |
| C11 — Isolated classroom, worksheet and relief consumer | deferred | 0 / 0 | design research only | Future JSON-informed consumer, not a learner-player mode. No presenter/print/export implementation or new consumer contract is authorised. | GEO-001 design proposal; later separate integration task |
| C12 — Full GIS, live simulations, 3D and unrestricted layers | deferred | 0 / 0 | outside minimum library | No essential requirement identified in the provisional 33-period plan. No vendor/platform commitment. | none |

## Exact lesson dependencies

| Capability | Directly needed lesson IDs | Optional enhancement lesson IDs |
| --- | --- | --- |
| C01 | Y9-01, Y9-02, Y9-03, Y9-04, Y9-05, Y9-06, Y9-07, Y9-08, Y9-09, Y9-10, Y9-11, Y9-12, Y9-13, Y9-14, Y9-15, Y10-01, Y10-02, Y10-03, Y10-04, Y10-05, Y10-06, Y10-07, Y10-08, Y10-09, Y10-10, Y10-11, Y10-12, Y10-13, Y10-14, Y10-15, Y10-16, Y10-17, Y10-18 | none |
| C02 | Y9-01, Y9-02, Y9-03, Y9-04, Y9-05, Y9-06, Y9-07, Y9-08, Y9-09, Y9-10, Y9-11, Y9-12, Y9-13, Y9-14, Y9-15, Y10-01, Y10-02, Y10-03, Y10-04, Y10-05, Y10-06, Y10-07, Y10-08, Y10-09, Y10-10, Y10-11, Y10-12, Y10-13, Y10-14, Y10-15, Y10-16, Y10-17, Y10-18 | none |
| C03 | Y9-01, Y9-02, Y9-03, Y9-04, Y9-05, Y9-06, Y9-08, Y9-09, Y9-10, Y9-12, Y9-13, Y9-14, Y9-15, Y10-01, Y10-02, Y10-06, Y10-07, Y10-08, Y10-09, Y10-10, Y10-11, Y10-12, Y10-13, Y10-14, Y10-15, Y10-16, Y10-17, Y10-18 | Y10-04 |
| C04 | none | Y9-01, Y9-02, Y9-03, Y9-05, Y9-06, Y9-07, Y9-08, Y9-09, Y9-10, Y9-11, Y9-12, Y9-13, Y9-14, Y9-15, Y10-02, Y10-03, Y10-08, Y10-09, Y10-10, Y10-11, Y10-13, Y10-17 |
| C05 | Y9-01, Y9-02, Y9-04, Y9-05, Y9-06, Y9-07, Y9-09, Y9-10, Y9-11, Y9-12, Y9-13, Y9-15, Y10-01, Y10-02, Y10-03, Y10-04, Y10-05, Y10-06, Y10-07, Y10-08, Y10-09, Y10-10, Y10-11, Y10-13, Y10-14, Y10-15, Y10-16, Y10-17, Y10-18 | none |
| C06 | Y10-04, Y10-05, Y10-06 | none |
| C07 | none | Y9-05, Y9-07, Y9-08 |
| C08 | none | Y9-03 |
| C09 | Y9-14, Y10-03, Y10-05 | none |
| C10 | Y9-01, Y9-02, Y9-03, Y9-04, Y9-05, Y9-06, Y9-07, Y9-08, Y9-09, Y9-10, Y9-11, Y9-12, Y9-13, Y9-14, Y9-15, Y10-01, Y10-02, Y10-06, Y10-07, Y10-08, Y10-09, Y10-10, Y10-11, Y10-12, Y10-13, Y10-14, Y10-15, Y10-16, Y10-17, Y10-18 | none |
| C11 | none | none |
| C12 | none | none |

## Minimum viable library and priorities

Start with C01/C02 and the smallest C03/C05/C10 adaptations justified by the two pilots. They support most teaching through verified static maps, charts, tables, images and written responses. C06 is a bounded population-reading adaptation, not a simulator. C09 is essential for the three designated full digital construction lessons: Y9-14, Y10-03, Y10-05. Separate map/graph construction, feedback and marking needs before building it. Static evidence does not satisfy a construction objective.

Research C04/C07 against the importance and breadth of actual spatial tasks. Compare static routes and bounded shared map/flow scope; choose no architecture here. C08 can wait while dated paired images meet comparison objectives. C11 implementation and C12 remain deferred. Do not build one app per lesson or delay source-based lesson production for a general map engine. Priorities are provisional until whole-scope coverage review and pilot review establish essential versus optional interactions.

## Reusable question catalogue

| Family | Exercise form | Existing route / research gap |
| --- | --- | --- |
| Read and identify | Value, unit, category, legend class or source feature | C02 with accessible C03/C05 evidence; no new automatic marking assumed |
| Calculate and compare | Difference, percentage, rate or two-place comparison | C02/C05; verify denominators, answers and rounding before model release |
| Describe spatial patterns | General pattern, supporting places, anomaly and limitation | C02 with static evidence first; C04/C07 only when interaction improves learning |
| Classify and explain | Categories, cause/mechanism/consequence chains, competing influences | C10 using existing choice/written forms first; no drag-only requirement |
| Evaluate | Source purpose/limitations, criteria matrix, qualified judgement | C02/C03/C10 with scaffold and progressively withdrawn support |
| Construct | Keyed plan, choropleth or pyramid, plus explanation of choices | C09; paper route available, full digital route separately approved |
| Inquire | Question, evidence selection, interpretation, recommendation and limitations | C01/C02/C03/C05; curated sources and explicit school return procedure |

Preserve host response identity, unknown authored fields, model-release rules and accessible input. Any new interaction proposal must describe config/state/reset/resize/disposal, keyboard/error behaviour, provenance and integration/export needs under Widget Contract V1. Stage A proposes these; it does not implement them.

## Representation and interaction requirements to investigate

| Representation / question | Lesson examples | Reusable family and meaningful interaction hypothesis | Accessible / initial delivery |
| --- | --- | --- | --- |
| Distribution, settlement and thematic maps | Y9-01–03, Y10-02–03, Y10-10 | C04: compare a question-owned indicator/scale/classification and explain how the pattern changes; avoid aimless map browsing | Dated static map, named-location description and matching table |
| Origin-destination flow maps | Y9-04, Y9-07–08 | C07/C04: select a supplied origin/destination to compare its flow with the data row; explicitly distinguish stocks/flows and real routes from schematic arrows | Labelled static flow map and table; keyboard/text choice must offer the same comparison |
| Bar/comparison charts and tables | Y9-04, Y9-09, Y10-08, Y10-11 | C05: compare defined groups/regions with visible units, time and denominator; a tooltip alone is not an investigation | Accessible table and labelled chart with written comparison |
| Time series, targets and projections | Y9-11, Y10-11, Y10-13 | C05: distinguish observed/projected/target values and explain assumptions; bounded series selection only if educationally useful | Annotated chart, underlying table and uncertainty note |
| Population pyramids | Y10-04–06 | C06/C05: compare cohorts or two compatible populations; construction remains separate C09 scope | Cohort table, clearly labelled static pyramids and non-colour explanation |
| Indicator relationships / possible scatterplots | Y10-06–09 | C05: test a proposed relationship while exposing date/scale limits; do not imply causation or promise a new scatterplot engine | Paired comparable charts/tables and a qualified written explanation |
| Dated imagery comparison | Y9-03 | C08/C03: align/compare evidence only if a proposed comparison tool improves observation; observation and explanation remain separate | Side-by-side images with dates, extent notes and accessible descriptions |
| Cause/effect and comparison organisers | Y9-02, Y9-06, Y10-07, Y10-16 | C10: expose reasoning and alternative explanations; visual organisation is optional, not a mandatory drag exercise | Numbered written chain or comparison table |
| Map, pyramid and graph construction | Y9-14, Y10-03, Y10-05 | C09: construct a representation from bounded givens and critique it; no unrestricted GIS or automatic-essay marking | Paper/base-map/grid route; complete online construction requires approved digital input and feedback design |

The two pilots should explicitly compare an interactive investigation with its static alternative: Y9-07 tests whether linked flow/table selection improves reasoning; Y10-02 tests whether a bounded indicator/scale comparison improves understanding of national averages. These are design hypotheses to review, not approved controls or implementation. Judge them by the quality of learner explanations, accessibility and state/answer-policy behaviour, not animation or novelty.
