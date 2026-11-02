# C4C-1 review scope

This first bounded PR adds canonical calculus and finite-operator notation to the existing TPMath parser and MathML renderer. Read [the syntax contract and split](CONTRACT.md) and [source/testing notes](../../../src/mathematics/notation/README.md).

The private fixture is `tests/widgets/mathematics-notation/lesson.json`. It covers an original polynomial integral worked example, definite/indefinite integrals, a removable-discontinuity limit, a finite sum, a product, a second derivative, one-sided limits and mathematical choice options. It is not an authorised new lesson publication.

The focused verifier produces actual application screenshots at 1536, 1280 and genuine native desktop 200%, editable valid/invalid draft JSON, learner HTML exports and a machine-readable receipt. It exercises existing C1 solutions, Answer Hub, C4A choice policies and Type editing without injecting a replacement renderer or styling. Independent global and existing choice-group policies are checked separately. Existing generic question policy semantics are preserved.

Review ZIPs and galleries use unique incrementing names outside tracked source. Final delivery must include the exact implementation head, actual focused and full-regression receipts, protected-source/publication checks, CI and CodeRabbit status. Development screenshots alone do not establish exact-head acceptance.

Matrices, determinants, column vectors, accents, piecewise functions and interval-validator work are documented follow-up scope. They remain unsupported where the current canonical parser lacks them. This PR neither launches that follow-up nor authorises merge, deployment or publication.
