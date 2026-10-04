# Publication and dependency consequences

The authoring application remains one self-contained HTML file with inline CSS/classic JavaScript. There is no production build step, new backend, persistence or map dependency. The approved viewer dependency is stored as an inert local base64 template in that file; a small adapter decodes and initializes it when Inspect is first used. Native inline images do not initialize the vendor. The decoded runtime script removes itself from the DOM, so later publication does not duplicate it.

This trades transfer size in the authoring file for independence from server/CDN fetches. It is lazy initialization, not lazy transport of the author's complete HTML file. Publication removes the inert payload when the exported lesson has no inspectable source. Viewer-bearing independent lessons retain it and the full licence notice. Exact raw/gzip measurements are in `MEASUREMENTS.json`; the canonical vendor is 352,735 bytes (87,653 gzip bytes), base64 transport adds encoding overhead.

| Source | Authoring / local player | Independent single-file learner export |
| --- | --- | --- |
| Imported JPEG/PNG | Native inline + full supplied image inspection | Embedded original image + inspection; no viewer network dependency |
| Remote ordinary image | Browser/CORS/network required; embed on publish | Existing export embeds it; failure blocks publication for configured evidence rather than silently clearing the source |
| Local relative image | HTTP server recommended for asset fetch during export | Existing export embeds the image; no companion asset needed |
| Local tiled pyramid + preview | Serve the tiles over HTTP; selective local requests | Metadata retained; embedded preview inspection explicitly disclosed, no promise of tile availability |
| Missing source | Source description/provenance remain; failed Inspect disabled | Same accessible fallback; no manufactured resolution |

The local pyramid fixture genuinely requests generated PNG tiles through a loopback server. It is not an institutional remote Image API test. Independent export intentionally uses its preview; changing publication to generate companion tile ZIPs is a later review decision. There is no silent replacement of the lesson publication architecture.

Local use: `node scripts/serve-player.mjs`, then the root authoring app at `http://127.0.0.1:8099/lesson-studio.html`. Default server port is documented by the existing server script. A package includes opening instructions and local assets at expected paths. Ordinary independent published HTML can be opened directly with file://.

OpenSeadragon source: [official 6.1.1 npm archive](https://registry.npmjs.org/openseadragon/-/openseadragon-6.1.1.tgz). Full BSD-3-Clause notice and SHA-256 receipt live in `assets/vendor/openseadragon/`. API references: [ordinary image source](https://openseadragon.github.io/examples/tilesource-image/), [resize/image-size behaviour](https://openseadragon.github.io/docs/OpenSeadragon.html), [viewport keyboard primitives](https://openseadragon.github.io/docs/OpenSeadragon.Viewport.html).

The existing application already requires its inline-script policy. Deployment environments with stricter CSP must allow the bundled initializer consistently with that policy; no new external script host is introduced. Physical school-device/AT/network testing remains outstanding. No external videos or remote optional integrations are claimed to work offline.
