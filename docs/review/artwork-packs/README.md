# Global + Mathematics artwork review

Run `node scripts/build-artwork-packs.mjs` and `node scripts/build-mathematics-micro.mjs`, then `node scripts/verify-artwork-packs.mjs` from the repository root. After verification passes on a clean committed head, run `python scripts/package-artwork-packs.py` (or `python3 scripts/package-artwork-packs.py`) to create the uniquely versioned review ZIP, SHA-256 manifest and integrity receipt. `index.html` is generated only from actual Lesson Studio exports and captures. `results.json` records tested HEAD, application hash, checks, native zoom metrics, page errors and capture hashes. A failed run stays visibly failed and is not a valid package candidate.

Six catalogue entries: global/general; mathematics/general; mathematics/algebra/general, signs, factorisation, fractions. The original three procedural families remain byte-identical. No production lesson has been switched to a new pack. See AUDIT.md and ../../artwork-packs.md for source audit and the contract.

Each workflow/*.html is an actual self-contained learner publication. Matching *.json files were downloaded/reopened through the normal authoring UI. Import one into the included lesson-studio.html to edit it. custom-override.json/html demonstrates the existing explicit image precedence, contain treatment and focal metadata. The fractions lesson is a review fixture, not a new standalone production publication. The global example removes the Mathematics-only micro composition rather than bypassing validation.

Captures show all three roles at 1536, 1024, 390 and genuine native 200%. Artwork is scrolled into view where necessary. Additional captures show the inspector previews, custom override, return to pack and authored unknown-topic fallback. These are baseline procedural assets, not a new illustration style. Visual suitability still requires human acceptance.

The ZIP includes source, the editable application and its local assets, these exports/captures, catalogue documentation and actual verification receipts. Open index.html directly, or serve the extracted root with `python -m http.server 8099` and browse to `/docs/review/artwork-packs/index.html`. Procedural images require no network. External video playback is blocked during verification and is not claimed to work offline.

STOP for visual approval. No merge, deployment, other-subject pack or next milestone is authorised by this delivery.
