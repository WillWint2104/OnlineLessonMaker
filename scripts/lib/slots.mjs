/* ── THE SLOT CONTRACT, AND THE ONE THING THAT JUDGES IT ──────────────────────────────────────────

   "What pattern is this?" and "is the media actually inhabiting its slot?" are different questions.
   This module owns the second one, for BOTH atlases — the composition atlas and the slot-fit atlas —
   so a verdict can never differ between them, and the overlay you look at can never differ from the
   control that fails the build. The overlay computes nothing; it is handed finished text.

   THE CHAIN, and it runs one way only:

       pattern chooses an approved subdesign
         → the subdesign's slot determines the footprint (slotSpan, slotAnchor)
         → the media proves it can inhabit that footprint
         → the inspector verifies the relationship that was actually painted.

   NOTHING COMPUTED HERE MAY REACH LAYOUT. There is no occupancy fraction, no comparison of prose
   heights, no step counting, and no threshold at which a composition is declared unbalanced. Every
   verdict is categorical, and where a number is reported it is reported for a human to rule on. A
   graph being mathematically undistorted is not enough for a layout to pass, and a layout passing
   here is not a claim that it looks good — that judgement lives in the approved catalogue. */

export const TOLPX = 1.5;                 /* a slot edge and a painted edge agreeing to the pixel */
export const TOLASPECT = 0.02;            /* 2% — below a perceptible stretch, above rounding */
export const MEDIA_SLOTS = new Set(['media', 'interactive']);
export const ANCHORS = ['center', 'start', 'end', 'paired', 'full'];
export const MEDIA_ANCHORS = ['center', 'start', 'end'];

/* ── WHERE A SLOT SITS IN ITS ROW, read back off the areas the subdesign declares ────────────────
   The subdesign DECLARES its slotAnchor and this derives it independently; a control holds the two
   to each other, so neither the prose nor the grid can drift without the build saying so. */
export function anchorFromAreas(areas, name) {
  for (const row of areas) {
    const tk = row.trim().split(/\s+/);
    if (!tk.includes(name)) continue;
    if (tk.some((x) => x !== '.' && x !== name)) return 'paired';
    const lead = tk.indexOf(name);
    const trail = tk.length - 1 - tk.lastIndexOf(name);
    if (!lead && !trail) return 'full';
    if (lead === trail) return 'center';
    if (!lead) return 'end';          /* free columns AFTER it */
    if (!trail) return 'start';       /* free columns BEFORE it */
    return 'asymmetric';              /* dots on both sides, unequal — no anchor describes this */
  }
  return null;
}

/* the spans a pattern actually approves at a surface, DERIVED FROM ITS SUBDESIGNS */
export const approvedSpans = (p, surface) => [...new Set(p.subdesigns
  .filter((d) => d.surface === surface && d.slotSpan).map((d) => d.slotSpan))].sort((a, b) => a - b);

/* ── MEASURED IN THE PAGE ─────────────────────────────────────────────────────────────────────────
   Runs inside the browser with no closure over anything, so it can be handed straight to
   page.evaluate. It reads THE RENDERED DOM and nothing else: not the renderer's bookkeeping, not
   what a resolver believed it did. That is the point — control 8 exists to catch the two
   disagreeing, and it cannot catch it if both read the same notebook. */
export function measureMedia() {
  const vis = (el) => el.getClientRects().length > 0;
  const unitScale = (svg) => {
    const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
    const rect = svg.getBoundingClientRect();
    const labs = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
    const val = (t) => parseFloat(t.textContent.replace('−', '-'));
    const per = (a, at) => {
      const z = labs.filter((t) => t.getAttribute('text-anchor') === a)
        .map((t) => ({ v: val(t), px: +t.getAttribute(at) })).filter((o) => isFinite(o.v));
      if (z.length < 2) return null;
      z.sort((i, j) => i.v - j.v);
      const dd = z[z.length - 1].v - z[0].v;
      return dd ? Math.abs((z[z.length - 1].px - z[0].px) / dd) : null;
    };
    const ux = per('middle', 'x'), uy = per('end', 'y');
    if (!ux || !uy) return null;
    const x = ux * rect.width / vb[2], y = uy * rect.height / vb[3];
    return { x: +x.toFixed(2), y: +y.toFixed(2), ratio: +(x / y).toFixed(3) };
  };
  return [].slice.call(document.querySelectorAll('[data-media-slot]')).filter(vis).map((el) => {
    const r = el.getBoundingClientRect(), own = el.closest('[data-pattern]');
    const kids = [].slice.call(el.children).filter((c) => vis(c) && !c.classList.contains('cp-lab'));
    /* WHAT IS PAINTED, found by looking, not by trusting a class name: the object itself where the
       renderer marked one, else the widest thing the slot actually put on screen. */
    const obj = el.querySelector('[data-media-object]') || el.querySelector('[data-mx-part="figure"]')
      || kids.reduce((a, c) => !a || c.getBoundingClientRect().width > a.getBoundingClientRect().width ? c : a, null);
    const pr = obj ? obj.getBoundingClientRect() : null;
    const svg = el.querySelector('.tp-fig-svg');
    const img = el.querySelector('img'), vid = el.querySelector('video');
    /* the object's INTRINSIC shape, so a stretch can be caught rather than assumed away */
    let natural = null;
    if (img && img.naturalWidth) natural = img.naturalHeight / img.naturalWidth;
    else if (vid && vid.videoWidth) natural = vid.videoHeight / vid.videoWidth;
    /* THE INTRINSIC-SHAPE QUESTION IS ASKED OF THE OBJECT, NOT OF WHATEVER WRAPS IT. Under `fill`
       the thing that must consume the region is the outermost painted object — the figure surface,
       when one is on — so `paintedW` is measured there and the width controls are right to use it.
       Its HEIGHT, though, includes the surface's own declared chrome and its caption, so comparing
       that box's ratio against a raster's intrinsic ratio reports a stretch that is not happening.
       Found when the six-class vocabulary first sent an IMAGE through a surface-enabled blueprint:
       a 1.778:1 image inside a 564px surface measured 0.688 against an intrinsic 0.5625 and three
       blueprints failed H5 for chrome they were supposed to own. So the raster's own box is reported
       separately and the stretch test uses it. */
    const inner = img || vid;
    const ir = inner ? inner.getBoundingClientRect() : null;
    const cs = obj ? getComputedStyle(obj) : null;
    return {
      pattern: own && own.getAttribute('data-pattern'),
      subdesign: own && own.getAttribute('data-subdesign'),
      inst: own ? +own.getAttribute('data-inst') : 0,
      name: el.getAttribute('data-slot'),
      cols: el.getAttribute('data-cols'), span: +el.getAttribute('data-span'),
      fit: el.getAttribute('data-fit'),
      slotAnchor: el.getAttribute('data-slot-anchor'),
      mediaAnchor: el.getAttribute('data-media-anchor'),
      anchorResolved: el.hasAttribute('data-anchor-resolved'),
      fixture: el.getAttribute('data-fixture'),
      kind: el.getAttribute('data-media-kind')
        || (svg ? 'plane' : img ? 'image' : vid ? 'video' : obj ? obj.tagName.toLowerCase() : 'nothing'),
      slotW: +r.width.toFixed(2), slotH: Math.round(r.height),
      paintedW: pr ? +pr.width.toFixed(2) : null, paintedH: pr ? +pr.height.toFixed(2) : null,
      freeL: pr ? +(pr.left - r.left).toFixed(2) : null,
      freeR: pr ? +(r.right - pr.right).toFixed(2) : null,
      objectFit: cs ? cs.objectFit : null,
      natural: natural == null ? null : +natural.toFixed(4),
      naturalW: ir ? +ir.width.toFixed(2) : null, naturalH: ir ? +ir.height.toFixed(2) : null,
      scale: svg ? unitScale(svg) : null,
    };
  });
}

/* ── THE VERDICT ──────────────────────────────────────────────────────────────────────────────────
   `x` is what the DOM said. `fix` is what the catalogue promised. Everything below compares the two
   and answers yes or no. */
export function slotFit(x, ctx) {
  const { surface, pattern, spanPx, fixture } = ctx;
  const o = { ok: true, verdict: '', actions: [], notes: [], unclaimed: null };
  const spans = approvedSpans(pattern, surface).map((n) => `${n} = ${spanPx(surface, n)}px`).join(' · ')
    || 'none declared';
  const fail = (verdict, actions) => { o.ok = false; o.verdict = verdict; o.actions = actions; return o; };

  if (x.paintedW == null) return fail('the slot is painted and holds nothing',
    ['fill it, or give the pattern an approved subdesign without it']);
  o.unclaimed = +(x.slotW - x.paintedW).toFixed(2);

  /* CONTROL · THE OBJECT MAY NOT EXCEED ITS SLOT, under either fit. An object wider than the track
     that was reserved for it has escaped the grid, and the grid is the only thing holding the page
     together. */
  if (o.unclaimed < -TOLPX) return fail(
    `the object is painted ${x.paintedW}px inside a ${x.slotW}px slot — ${Math.abs(o.unclaimed)}px WIDER than its slot`,
    ['paint it at the slot width', `use an approved span that fits it (approved at ${surface}: ${spans})`]);

  /* CONTROL · THE OBJECT MAY NOT BE DISTORTED TO SATISFY A SLOT. A plane answers with equal unit
     scale; a raster or a clip answers with its intrinsic shape. Squeezing either to make a
     composition work is the failure this whole architecture exists to prevent. */
  if (x.scale && Math.abs(x.scale.ratio - 1) > 0.01) return fail(
    `the plane is painted at ${x.scale.x}px per x-unit and ${x.scale.y}px per y-unit — one x-unit and one `
    + `y-unit are not the same length, so the mathematics is distorted`,
    ['let the height follow from the domain; there is no height ceiling and the page scrolls']);
  /* the raster's OWN box where one was reported, else the painted object — see measureMedia */
  const nw = x.naturalW != null ? x.naturalW : x.paintedW, nh = x.naturalH != null ? x.naturalH : x.paintedH;
  if (x.natural != null && nw > 0) {
    const painted = nh / nw;
    if (Math.abs(painted - x.natural) / x.natural > TOLASPECT) return fail(
      `the object's intrinsic shape is ${x.natural} and it is painted at ${+painted.toFixed(4)} `
      + `(${nw}x${nh}) — stretched to fit`,
      ['give the object width and let its height follow', 'never set both width and height on a raster or a clip']);
  }

  if (x.fit === 'fill') {
    /* CONTROL · A FILL OBJECT CONSUMES ITS SLOT, AND NO WIDTH INSIDE IT IS ANONYMOUS. */
    if (o.unclaimed > TOLPX) return fail(
      `a \`fill\` object painted ${x.paintedW}px inside a ${x.slotW}px slot`,
      ['paint the object at the slot width — under `slotFit: fill` the slot gives the width and the object takes it',
       `approve a narrower span for this aspect class (approved at ${surface}: ${spans})`,
       'declare the slot `slotFit: contain` with an explicit anchor, if being smaller is a design decision']);
    o.verdict = 'the object consumes the slot width';
  } else if (x.fit === 'contain') {
    /* CONTROL · A CONTAINED OBJECT IS PAINTED AT ITS AUTHORED PRESENTATION WIDTH, CAPPED BY THE
       SLOT. Never at the raster's own pixel width: a 900x1200 photograph is not a request. */
    if (fixture && fixture.presentationWidth) {
      const want = Math.min(fixture.presentationWidth, x.slotW);
      if (Math.abs(x.paintedW - want) > TOLPX) return fail(
        `a \`contain\` object painted ${x.paintedW}px where its authored presentation width capped by the `
        + `slot is ${want}px (authored ${fixture.presentationWidth}px, slot ${x.slotW}px)`,
        ['paint it at min(authored presentation width, slot width)',
         'change the authored presentation width if the object should be bigger',
         'raw raster pixel dimensions are never a presentation size']);
    }
    /* CONTROL · THE PLACEMENT COMES FROM A DECLARED ANCHOR, NOT FROM WHATEVER CSS DID. An object
       that happens to sit left because block layout put it there is indistinguishable, in a
       screenshot, from one deliberately placed left. The renderer must say which. */
    if (!x.anchorResolved || !MEDIA_ANCHORS.includes(x.mediaAnchor)) return fail(
      `a \`contain\` object with no resolved anchor (declared \`${x.mediaAnchor || 'nothing'}\`)`
      + ` — it is wherever CSS left it`,
      ['declare `mediaAnchor: center` on the slot, which is the default a contained object should have',
       'declare `start` or `end` with an `anchorReason`, if the asymmetry is a design decision']);
    /* SYMMETRY IS ASKED FIRST. The first version asked "is it against the left edge?" before "is it
       even?", so a 380px object centred in a 382px slot — 1px either side — was read as `start` and
       failed. Evenness is what centring means; how much room there happens to be is not. */
    const gap = Math.abs(x.freeL - x.freeR);
    const placed = o.unclaimed <= TOLPX || gap <= TOLPX ? 'center'
      : x.freeL <= TOLPX ? 'start' : x.freeR <= TOLPX ? 'end' : 'nowhere';
    if (placed !== x.mediaAnchor && !(o.unclaimed <= TOLPX)) return fail(
      `a \`contain\` object declared \`${x.mediaAnchor}\` is painted ${x.freeL}px from its slot's left edge `
      + `and ${x.freeR}px from its right, which reads as \`${placed}\``,
      [`place it as \`${x.mediaAnchor}\` declares, or declare the anchor it actually has`]);
    o.verdict = o.unclaimed <= TOLPX
      ? 'contained, and at this width it reaches both edges'
      : `contained and ${x.mediaAnchor} — ${x.freeL}px and ${x.freeR}px, and the slot owns both`;
    /* REPORTED, NEVER JUDGED, AND WITH NO THRESHOLD. The maintainer's ask was real: a contained
       object that is consistently small is evidence the PATTERN wants a smaller span. Comparing it
       to a tuned fraction would be the resolver this architecture refuses, so it is printed and
       compared to nothing. A human reads the run and rules. */
    o.notes.push(`occupies ${Math.round(100 * x.paintedW / x.slotW)}% of its slot — reported, not judged`);
  } else {
    return fail(`a media slot with no declared fit (\`${x.fit}\`)`,
      ['declare `slotFit: fill` or `slotFit: contain` on the slot in patterns.json']);
  }
  return o;
}

/* ── WHAT THE OVERLAY PRINTS, AND WHAT A FAILURE PRINTS ───────────────────────────────────────────
   The same lines from the same numbers, so the picture and the build cannot say different things. */
export function inspectorLines(x, ctx, fit) {
  const { surface, grid, colW, spanPx, fixture, vocab } = ctx;
  const g = grid.surfaces[surface];
  const aspect = x.paintedW ? +(x.paintedH / x.paintedW).toFixed(4) : null;
  const L = [
    ['PATTERN', x.pattern],
    ['APPROVED SUBDESIGN', `${x.subdesign} · approved for ${surface}`],
    ['MASTER GRID', `${surface} · ${g.columns} col · ${g.width}px · column ${colW(surface).toFixed(2)}px · gutter ${g.gutter}px`],
    ['MEDIA SLOT', `${x.name} · columns ${x.cols} of ${g.columns} · slotSpan ${x.span} = ${spanPx(surface, x.span)}px `
      + `· realised ${x.slotW}px`],
    ['PAINTED MEDIA', x.paintedW == null ? 'nothing'
      : `${x.kind}${fixture ? ` · ${fixture.id}` : ''} · ${x.paintedW} × ${+x.paintedH.toFixed(1)}px`],
    ['SLOT FIT', `${x.fit} — ${vocab && vocab.mediaFit && vocab.mediaFit[x.fit] ? vocab.mediaFit[x.fit].means : 'undeclared'}`],
    ['ANCHOR', `slot ${x.slotAnchor || '—'} in the grid`
      + (x.fit === 'contain' ? ` · object ${x.mediaAnchor || '—'} in the slot`
        + (x.anchorResolved ? ' (resolved by the renderer)' : ' ✗ NOT RESOLVED — wherever CSS left it') : '')],
    ['SHAPE PRESERVED', x.scale
      ? `${x.scale.x}px per x-unit · ${x.scale.y}px per y-unit · ratio ${x.scale.ratio}`
        + (Math.abs(x.scale.ratio - 1) <= 0.01 ? ' ✓ equal unit scale' : ' ✗ DISTORTED')
      : x.natural != null
        ? `intrinsic ${x.natural} · painted ${aspect}`
          + (Math.abs(aspect - x.natural) / x.natural <= TOLASPECT ? ' ✓ undistorted' : ' ✗ STRETCHED')
        : `painted aspect ${aspect} · nothing intrinsic to compare`],
    ['UNCLAIMED INTERNAL WIDTH', `${fit.unclaimed == null ? '—' : fit.unclaimed + 'px'}`
      + (!fit.ok ? ' ✗ SLOT RESIDUE'
        : fit.unclaimed > TOLPX ? ` ✓ owned by the slot (${x.freeL}px / ${x.freeR}px, ${x.mediaAnchor})` : ' ✓ none')],
  ];
  L.push([fit.ok ? 'VERDICT' : 'DIAGNOSIS', fit.verdict]);
  for (const n of fit.notes) L.push(['SIGNAL', n]);
  if (!fit.ok) fit.actions.forEach((a, i) => L.push([i ? '' : 'LEGAL ACTIONS', '· ' + a]));
  return L;
}

/* ── DRAWN IN THE PAGE ────────────────────────────────────────────────────────────────────────────
   It receives finished text and rectangles to outline. It computes no verdict of its own, and
   nothing it draws is read back by anything. */
export function drawInspector(cards) {
  const page = document.querySelector('.cp-page');
  page.setAttribute('data-inspect', '');
  const st = document.createElement('style');
  st.textContent = `
    .cp-page[data-inspect]{position:relative;}
    .ins-layer{position:absolute;inset:0;pointer-events:none;z-index:50;}
    .ins-slot{position:absolute;outline:2px dashed #2563eb;background:rgba(37,99,235,.045);}
    .ins-paint{position:absolute;outline:2px solid #059669;}
    .ins-paint[data-bad]{outline-color:#dc2626;}
    .ins-res{position:absolute;background:repeating-linear-gradient(45deg,rgba(220,38,38,.30) 0 6px,rgba(220,38,38,.06) 6px 12px);
      outline:1px solid rgba(220,38,38,.55);}
    .ins-res[data-legal]{background:repeating-linear-gradient(45deg,rgba(37,99,235,.16) 0 6px,rgba(37,99,235,.03) 6px 12px);
      outline-color:rgba(37,99,235,.45);}
    .ins-tag{position:absolute;font:600 10px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.04em;
      background:#2563eb;color:#fff;padding:1px 6px;border-radius:0 0 3px 0;white-space:nowrap;}
    .ins-tag[data-bad]{background:#dc2626;}
    .ins-panel{margin:18px 0 0;border:2px solid #111;background:#fff;}
    .ins-card{border-top:1px solid #d4d4d4;padding:10px 14px;font:12px/1.65 ui-monospace,Menlo,monospace;}
    .ins-card:first-child{border-top:0;}
    .ins-card b{display:inline-block;width:206px;vertical-align:top;color:#525252;font-weight:600;}
    .ins-card i{font-style:normal;color:#111;}
    .ins-h{background:#111;color:#fff;padding:6px 14px;font:600 11px/1.6 ui-monospace,Menlo,monospace;letter-spacing:.08em;}
    .ins-card[data-bad] b{color:#dc2626;}`;
  document.head.appendChild(st);

  const layer = document.createElement('div');
  layer.className = 'ins-layer';
  page.appendChild(layer);
  const pr = page.getBoundingClientRect();
  const box = (cls, r, extra) => {
    const el = document.createElement('div');
    el.className = cls;
    el.style.left = (r.left - pr.left) + 'px'; el.style.top = (r.top - pr.top) + 'px';
    el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
    if (extra) for (const k in extra) el.setAttribute(k, extra[k]);
    layer.appendChild(el); return el;
  };
  const slots = [].slice.call(document.querySelectorAll('[data-media-slot]'));
  cards.forEach((c) => {
    const el = slots.filter((q) => {
      const own = q.closest('[data-pattern]');
      return q.getAttribute('data-slot') === c.slot && (own ? +own.getAttribute('data-inst') : 0) === c.inst;
    })[0];
    if (!el || !el.getClientRects().length) return;
    const sr = el.getBoundingClientRect();
    box('ins-slot', sr);
    const obj = el.querySelector('[data-media-object]') || el.querySelector('[data-mx-part="figure"]')
      || [].slice.call(el.children).filter((x) => !x.classList.contains('cp-lab'))[0];
    if (obj) {
      const q = obj.getBoundingClientRect();
      box('ins-paint', q, c.ok ? null : { 'data-bad': '' });
      /* the unclaimed width, drawn where it actually is: blue where the slot owns it (a contained
         object with a declared anchor), red where nobody does. */
      const legal = c.ok ? { 'data-legal': '' } : null;
      if (q.left - sr.left > 1.5) box('ins-res', { left: sr.left, top: q.top, width: q.left - sr.left, height: q.height }, legal);
      if (sr.right - q.right > 1.5) box('ins-res', { left: q.right, top: q.top, width: sr.right - q.right, height: q.height }, legal);
    }
    const tag = document.createElement('div');
    tag.className = 'ins-tag';
    tag.textContent = `${c.slot.toUpperCase()} · ${c.span}col · ${c.fit}`;
    if (!c.ok) tag.setAttribute('data-bad', '');
    tag.style.left = (sr.left - pr.left) + 'px'; tag.style.top = (sr.top - pr.top) + 'px';
    layer.appendChild(tag);
  });

  const panel = document.createElement('div');
  panel.className = 'ins-panel';
  panel.innerHTML = '<div class="ins-h">SLOT INSPECTOR</div>' + cards.map((c) =>
    `<div class="ins-card"${c.ok ? '' : ' data-bad'}>` + c.lines.map(([k, v]) =>
      `<div><b>${k}</b><i>${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</i></div>`).join('') + '</div>').join('');
  page.appendChild(panel);
}
