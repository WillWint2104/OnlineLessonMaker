# Shared single-source contract

Reuse the existing image part/block: `src`, `alt`, `id` and `sourceMetadata`. Add only `evidence`. Unconfigured images keep the existing renderer. No subject/topic-name condition selects the viewer. Pair placement is outside this one-source capability.

```json
{
  "kind": "image",
  "id": "source-a",
  "src": "data:image/jpeg;base64,…",
  "alt": "Describe the whole source for non-visual access.",
  "sourceMetadata": {
    "title": "Do your bit on the Food Front",
    "date": "1943",
    "institution": "Australian War Memorial",
    "accession": "ARTV02452",
    "creator": "Department of Commerce and Agriculture; individual artist unknown",
    "rights": "Copyright expired — public domain",
    "url": "https://www.awm.gov.au/collection/C98007"
  },
  "evidence": { "inspect": true, "task": "Identify evidence for the poster's intended audience." }
}
```

Essential citation uses title/date/institution/accession directly. Expanded provenance uses creator, originatingBody, collection, rights, url, attribution and notes. Unknown metadata stays in the JSON unchanged. Display does not rewrite source records or infer a creator. `meta.sourceCatalogue` remains the lesson's reference catalogue; source-instance `sourceMetadata` is the existing rendered/editor-owned record. This phase does not migrate it to a new catalogue architecture.

Enabling source inspection generates an ID only if it is missing. Uploading a JPEG/PNG embeds its original bytes and records decoded width/height in source metadata. Existing ID/metadata are retained. Editing or disabling inspection does not discard imported provenance or alter unrelated fields. The ordinary asset and alt text retain their existing inspector controls.

The optional advanced local-pyramid representation is renderer-neutral:

```json
"evidence": {
  "inspect": true,
  "task": "Inspect the source before explaining the visible pattern.",
  "pyramid": {
    "width": 3200, "height": 1800, "tileSize": 512,
    "format": "png", "baseUrl": "assets/source-tiles/"
  }
}
```

Local pyramid layout is `baseUrl/{level}/{x}_{y}.{format}`, no overlap, levels 0 through ceil(log2(max(width,height))). A preview in `src` is always retained. This is an advanced local resource representation, not an OpenSeadragon options bag. Arbitrary server URLs, IIIF manifests, georeferences and projections are not accepted here. Ordinary source creation does not need this field or JSON editing. The phase deliberately does not add a pyramid-authoring pipeline.

Inline rendering uses a native image with intrinsic aspect, constrained maximum size and contain. Inspection privately creates/disposes the OpenSeadragon viewer. Lesson JSON never stores its viewport, modal dimensions, CSS or options. Task/provenance drawer changes preserve source view; closing leaves lesson/activity and existing response state intact. Dialog owns Escape/Tab/arrows and returns to the live opener. Runtime and view state are transient, with no local/session storage.

Later annotation contract can reference stable source ID, source revision/original dimensions and image-coordinate regions. No annotation or IIIF Presentation model was added. A future Image API adapter can normalize a service into this inspection boundary without changing the lesson's pedagogical identity.
