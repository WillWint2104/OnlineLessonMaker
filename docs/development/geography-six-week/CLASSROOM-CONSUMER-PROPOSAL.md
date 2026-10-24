# Isolated classroom consumer — design proposal only

Online learner delivery remains the principal product. This proposal investigates a second consumer of approved lesson content and completed widgets; it does not authorise another learner engine or presentation features in the existing player. C11 implementation remains deferred until separate human architecture/integration approval.

## Proposed content flow

Approved authored lesson JSON and asset/source metadata feed separate consumers: the existing online learner host, and a proposed classroom adapter. The adapter may select explanation, worked examples, sources, questions and model content for a teaching sequence, but must preserve source/question IDs and provenance. It must not mutate the canonical lesson, learner responses or unknown supported authored fields. This is a conceptual mapping to investigate, not a new shared schema or Widget Contract version.

Completed widgets should reuse the same component source and documented lifecycle contract through a separately scoped host adapter. Classroom reveal/selection state is consumer-owned and transient. It is not learner state and must never be written into authored JSON or an online learner session. Host-specific integration, widget availability and existing publication policy must be audited before promising JSON compatibility.

| Delivery requirement | Proposed experience | Isolation / acceptance requirement |
| --- | --- | --- |
| Projector explanation and demonstration | Readable explanation/source/question frames, with an optional approved widget demonstration | Separate consumer surface; no new presenter buttons, keyboard capture or projection modes in lesson-studio.html |
| Whole-class investigation | Teacher operates a bounded map/statistics/source task and records class reasoning | Reuse approved widget source with isolated state; do not claim that a shared class response is an individual learner attempt |
| Structured notes and book work | Concise note prompts, diagrams/data sources and numbered exercises | Content stays aligned with online intentions; no requirement for students to copy a whole projected page |
| Controlled answer reveal | Questions shown before worked/model content at the intended teaching point | Separate teacher-facing reveal policy and teacher materials; do not weaken the online host's answer-release/filtering rules |
| Printable worksheets | Source/question pages with space for map/graph construction and written responses | Learner handout excludes unreleased model answers; teacher key is a separately identified output; source rights and printable alternatives verified |
| Relief teacher | Self-contained lesson script, expected timings, vocabulary, model/check guidance and fallback instructions | No specialist application knowledge or account required for the fallback; packets are still to be authored and tested |
| No student devices | Projected/shared evidence plus individual book responses, or printed source pack alone | Paper construction genuinely assesses the skill but is not proof that a digital construction component works |

## Options to compare before architecture approval

| Option | Benefit | Constraint / unresolved scope |
| --- | --- | --- |
| A: lesson-informed teacher, source and learner print packs | Provides structured book/relief delivery without waiting for a new interactive classroom runtime | Even an automated render/export pipeline is new integration work; source rights, pagination, answer separation and content mapping need approval. Manual authored packs are an interim delivery option, not an implemented exporter |
| B: separate interactive classroom runtime | Reuses completed widgets for demonstrations and whole-class inquiry, with classroom-only view/reveal state | Requires separately scoped host/lifecycle/accessibility/answer-policy architecture. No choice of framework, navigation model or new contract is made here; a duplicate player or widget fork is not acceptable |

Provisional recommendation for review: specify the content/answer separation and teacher/book/relief packs alongside the two online pilots first. Use pilot evidence to decide whether Option B adds enough value to justify a separate architecture task. Do not delay online lesson production for a general presentation system. Existing learner content may be demonstrated manually now; that does not certify a classroom consumer or expand legacy presentation controls.

## Validation proposal

Use Y9-07 and Y10-02 to compare an independent online learner journey with teacher-led, book-work and relief sequences. Check that explanations, units, source periods, questions and expected reasoning agree; controlled reveal and teacher keys must not leak into learner handouts or change online policy. Validate keyboard/focus/state/reset/resize/disposal for reused widgets under their approved contract and isolation from the learner host.

Test readable projection, accessible text/table alternatives, grayscale print, page breaks, map keys and label legibility, source attribution/rights, missing-asset fallbacks and explicit offline/network limits. A remote video or map link is not an offline teaching resource. A relief teacher should be able to follow the proposed script without authoring tools or editing JSON. No projection, print, physical-device or relief-teacher acceptance is claimed in this proposal.

Any implementation needs a separate approved task specifying exact source paths, integration owner, compatibility/answer-policy tests and human design checkpoint. No runtime, shared schema/registry, export, CI, deployment or existing player control is modified by the present planning amendment.
