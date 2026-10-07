// Generated from the immutable HGL reference; see AUDIT.md.
const GR_HGL=(()=>{
const _GP_FNS = {
  sin:  Math.sin,  cos:  Math.cos,  tan:  Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  log:  Math.log10 || (x => Math.log(x) / Math.LN10),
  ln:   Math.log,
  sqrt: Math.sqrt, cbrt: Math.cbrt || (x => Math.sign(x) * Math.pow(Math.abs(x), 1/3)),
  abs:  Math.abs,  exp:  Math.exp,
  floor:Math.floor,ceil: Math.ceil, round:Math.round,
  sign: Math.sign || (x => x > 0 ? 1 : x < 0 ? -1 : 0)
};

const _GP_CONSTS = { pi: Math.PI, e: Math.E };

const _GP_PREC = { '+':1, '-':1, '*':2, '/':2, 'u-':3, '^':4 };
const _GP_RIGHT_ASSOC = { '^': true, 'u-': true };

/** Unicode→ASCII aliases applied BEFORE whitespace strip + tokenize.
 *  Students paste expressions from PDFs where '-' is rendered as the
 *  Unicode minus (U+2212), '×' / '·' show up instead of '*', etc.
 *  Normalizing these up front turns opaque "unexpected character"
 *  tokenizer errors into working parses. Superscript digits map to
 *  '^2' / '^3' so x² → x^2 follows the same path as the keyboard form.
 *  π stays here as a Unicode alias for the ASCII 'pi' constant — the
 *  tokenizer's identifier branch then resolves it via _GP_CONSTS.
 *  Pre-tokenize string replace is chosen (over extra branches) because
 *  most aliases are single chars mapping to ASCII chars the tokenizer
 *  already handles — the transform is a one-line declarative table. */
const _GP_UNICODE_ALIASES = [
  ['−', '-'],   // U+2212 minus
  ['×', '*'],   // U+00D7 multiplication sign
  ['·', '*'],   // U+00B7 middle dot
  ['÷', '/'],   // U+00F7 division sign
  ['²', '^2'],  // U+00B2 superscript 2
  ['³', '^3'],  // U+00B3 superscript 3
  /* π (U+03C0) is NOT aliased to the string 'pi' — that would make
   * "2πx" normalize to "2pix", and the tokenizer's identifier
   * regex would greedily grab "pix" as one unknown identifier (same
   * case as a teacher typing the ambiguous "pix" directly). Instead
   * π gets a dedicated tokenizer branch that emits a num token with
   * Math.PI, forming a token boundary that lets implicit-mult
   * injection see π as a distinct value. So "2πx" → num(2), num(π),
   * var(x) with implicit '*' between each = 2*pi*x, while "pix"
   * still correctly rejects as unknown. */
];

const _GP_SVG_NS="http://www.w3.org/2000/svg",_GP_MAX_GRID_LINES=200;
function _gpUnicodeNormalize(src){
  let out = String(src || '');
  for(const [from, to] of _GP_UNICODE_ALIASES){
    if(out.indexOf(from) !== -1) out = out.split(from).join(to);
  }
  return out;
}
function _gpTokenize(src){
  const tokens = [];
  const s = _gpUnicodeNormalize(src).replace(/\s+/g, '');
  if(!s) return tokens;
  /* Peek the last emitted token and inject an implicit '*' if the
   * incoming token starts an adjacency. Safe to call before emitting
   * any num/var/fn/'(' — rule degenerates to a no-op at the start of
   * the expression or after an op/',' /'(' /fn. */
  const maybeImplicitMult = () => {
    const prev = tokens[tokens.length - 1];
    if(!prev) return;
    if(prev.type !== 'num' && prev.type !== 'var' && prev.type !== ')') return;
    tokens.push({ type: 'op', value: '*' });
  };
  let i = 0;
  while(i < s.length){
    const c = s[i];
    // Unicode π — dedicated branch so it forms a token boundary
    // (see _GP_UNICODE_ALIASES note above for why it isn't a string
    // alias).
    if(c === 'π'){
      maybeImplicitMult();
      tokens.push({ type: 'num', value: Math.PI });
      i++;
      continue;
    }
    // Number (handles 1, 2.5, .5, 1e-3, 2E+4)
    if(/[0-9.]/.test(c)){
      const m = s.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
      if(!m) throw new Error('malformed number at ' + i);
      maybeImplicitMult();
      tokens.push({ type: 'num', value: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    // Identifier (variable / function / constant)
    if(/[A-Za-z_]/.test(c)){
      const m = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      const id = m[0];
      i += id.length;
      if(id === 'x' || id === 'X'){
        maybeImplicitMult();
        tokens.push({ type: 'var', value: 'x' });
      } else if(_GP_CONSTS.hasOwnProperty(id)){
        // Constants tokenize as num — the implicit-mult check still
        // runs because prev=num and new=num IS a real adjacency when
        // the "new num" is a const expansion (e.g. 3pi → 3*pi).
        maybeImplicitMult();
        tokens.push({ type: 'num', value: _GP_CONSTS[id] });
      } else if(_GP_FNS.hasOwnProperty(id)){
        maybeImplicitMult();
        tokens.push({ type: 'fn', value: id });
      } else {
        throw new Error('unknown identifier "' + id + '"');
      }
      continue;
    }
    if(c === '('){
      maybeImplicitMult();
      tokens.push({ type: '(', value: '(' });
      i++; continue;
    }
    if(c === ')' || c === ','){
      tokens.push({ type: c, value: c });
      i++; continue;
    }
    if('+-*/^'.indexOf(c) !== -1){
      // Decide unary vs. binary minus by looking at the previous
      // token. Unary minus is allowed at start, after an operator,
      // after a left paren, or after a comma.
      const prev = tokens[tokens.length - 1];
      const prevIsValue = prev && (prev.type === 'num' || prev.type === 'var' || prev.type === ')');
      if(c === '-' && !prevIsValue){
        tokens.push({ type: 'op', value: 'u-' });
      } else {
        tokens.push({ type: 'op', value: c });
      }
      i++; continue;
    }
    throw new Error('unexpected character "' + c + '" at ' + i);
  }
  return tokens;
}
function _gpToRPN(tokens){
  const out = [], stack = [];
  for(const t of tokens){
    if(t.type === 'num' || t.type === 'var'){
      out.push(t);
    } else if(t.type === 'fn'){
      stack.push(t);
    } else if(t.type === ','){
      while(stack.length && stack[stack.length - 1].type !== '('){
        out.push(stack.pop());
      }
      if(!stack.length) throw new Error('misplaced comma');
    } else if(t.type === 'op'){
      // Prefix unary minus binds tighter than any binary operator
      // it MIGHT appear between — `x^-2` must compile as
      // `x ^ (-2)`, not `(x ^) -2`. If we let the default
      // precedence-compare loop run, `u-` (prec 3) would pop a
      // previously-pushed `^` (prec 4) from the stack because
      // `4 > 3` triggers the "pop higher precedence" branch —
      // even though `u-` is PREFIX and has no left operand for
      // `^` to bind to. Short-circuit: always push `u-` without
      // popping. The matching pop happens at end-of-expression or
      // at a closing paren, when `u-` (right-associative) is
      // drained correctly.
      if(t.value === 'u-'){
        stack.push(t);
        continue;
      }
      while(stack.length){
        const top = stack[stack.length - 1];
        if(top.type !== 'op' && top.type !== 'fn') break;
        const topP = top.type === 'fn' ? 5 : _GP_PREC[top.value];
        const curP = _GP_PREC[t.value];
        const curRight = !!_GP_RIGHT_ASSOC[t.value];
        if(topP > curP || (topP === curP && !curRight)) out.push(stack.pop());
        else break;
      }
      stack.push(t);
    } else if(t.type === '('){
      stack.push(t);
    } else if(t.type === ')'){
      while(stack.length && stack[stack.length - 1].type !== '('){
        out.push(stack.pop());
      }
      if(!stack.length) throw new Error('unbalanced parentheses');
      stack.pop();  // discard the '('
      if(stack.length && stack[stack.length - 1].type === 'fn'){
        out.push(stack.pop());
      }
    }
  }
  while(stack.length){
    const top = stack.pop();
    if(top.type === '(' || top.type === ')') throw new Error('unbalanced parentheses');
    out.push(top);
  }
  return out;
}
function _gpEvalRPN(rpn, x){
  const stack = [];
  for(const t of rpn){
    if(t.type === 'num') stack.push(t.value);
    else if(t.type === 'var') stack.push(x);
    else if(t.type === 'op'){
      if(t.value === 'u-'){ stack.push(-stack.pop()); continue; }
      const b = stack.pop(), a = stack.pop();
      switch(t.value){
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '*': stack.push(a * b); break;
        case '/': stack.push(b === 0 ? NaN : a / b); break;
        case '^': stack.push(Math.pow(a, b)); break;
      }
    } else if(t.type === 'fn'){
      const arg = stack.pop();
      stack.push(_GP_FNS[t.value](arg));
    }
  }
  return stack.length === 1 ? stack[0] : NaN;
}
function _gpValidateRPN(rpn){
  let depth = 0;
  for(const t of rpn){
    if(t.type === 'num' || t.type === 'var'){
      depth += 1;
    } else if(t.type === 'fn'){
      // Unary function: 1 in / 1 out. Most common underflow case
      // is the empty-call "sin()" — tokenizer produces [fn] with no
      // operand before it. Name the function so the teacher knows
      // which call is missing its argument.
      if(depth < 1) throw new Error('function "' + t.value + '" missing argument');
      // depth unchanged
    } else if(t.type === 'op'){
      if(t.value === 'u-'){
        if(depth < 1) throw new Error("unary '-' missing operand");
        // 1 in / 1 out
      } else {
        if(depth < 2) throw new Error("operator '" + t.value + "' missing operand");
        depth -= 1; // 2 in / 1 out
      }
    }
  }
  // depth 0 at end means we never produced a value (shouldn't happen
  // post-tokenize — empty expression is caught upstream in
  // graphCompile). depth > 1 means stray values with no operator
  // connecting them — rarer with implicit-mult enabled, but still
  // possible if a teacher types something like "3 4" that survives.
  if(depth === 0) throw new Error('empty expression');
  if(depth > 1)  throw new Error('extra operand (missing operator?)');
}
function graphCompile(expr){
  try {
    if(/^\s*x\s*=/i.test(expr)){
      throw new Error('Unsupported equation: x=... cannot be plotted. Enter y=... or a bare expression.');
    }
    const tokens = _gpTokenize(expr);
    if(!tokens.length) return { eval: () => NaN, error: 'empty expression' };
    const rpn = _gpToRPN(tokens);
    _gpValidateRPN(rpn);
    return { eval: x => _gpEvalRPN(rpn, x), error: null };
  } catch(e){
    return { eval: () => NaN, error: e.message || String(e) };
  }
}
function _gpEffectiveGridStep(xRange, yRange, authoredStep){
  let s = authoredStep;
  while((xRange / s) > _GP_MAX_GRID_LINES || (yRange / s) > _GP_MAX_GRID_LINES){
    s *= 2;
    if(!Number.isFinite(s) || s <= 0) break;
  }
  return s;
}
function _svgEl(tag, attrs){
  const el = document.createElementNS(_GP_SVG_NS, tag);
  if(attrs) for(const k of Object.keys(attrs)) el.setAttribute(k, attrs[k]);
  return el;
}
function _gpEnsureAxisHeadDefs(svg){
  if(!svg || svg.querySelector('defs.gp-axis-defs')) return;
  const defs = _svgEl('defs', { class: 'gp-axis-defs' });
  const head = (id, refX, refY, points) =>
    '<marker id="' + id + '" viewBox="0 0 8 8" refX="' + refX + '" refY="' + refY + '"'
    + ' markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="0">'
    + '<polygon points="' + points + '" class="gp-axis-head"/></marker>';
  defs.innerHTML =
      head('gp-axis-head-x-right', 8, 4, '0,0 8,4 0,8')   // tip (8,4) — points +x
    + head('gp-axis-head-x-left',  0, 4, '8,0 0,4 8,8')   // tip (0,4) — points -x
    + head('gp-axis-head-y-up',    4, 0, '0,8 4,0 8,8')   // tip (4,0) — top of plot, +y
    + head('gp-axis-head-y-down',  4, 8, '0,0 4,8 8,0');  // tip (4,8) — bottom, -y
  svg.insertBefore(defs, svg.firstChild);
}
function _gpBuildSvg(S, w, h){
  // Defensive guard against degenerate viewports. normalizeGraphPanel-
  // State + the commit-time swap in _gpConfigChange both prevent
  // xMax <= xMin / yMax <= yMin from landing in state, but a direct
  // state mutation (debug console, future write-path that skips the
  // normalizer) could still produce a zero-width range that divides
  // to Infinity / NaN in xToSvg / yToSvg. Bail with an empty SVG
  // rather than minting invalid path coords.
  if(S.xMax <= S.xMin || S.yMax <= S.yMin){
    return _svgEl('svg', {
      class: 'gp-svg',
      viewBox: `0 0 ${w} ${h}`,
      role: 'img',
      'aria-label': 'Graph unavailable: invalid viewport range'
    });
  }
  const pad = 4;  // inner drawable margin so strokes don't clip
  const plotW = w - pad * 2;
  const plotH = h - pad * 2;
  const xToSvg = x => pad + ((x - S.xMin) / (S.xMax - S.xMin)) * plotW;
  const yToSvg = y => pad + plotH - ((y - S.yMin) / (S.yMax - S.yMin)) * plotH;

  const svg = _svgEl('svg', {
    class: 'gp-svg',
    viewBox: `0 0 ${w} ${h}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': 'Function graph'
  });

  // Backdrop
  svg.appendChild(_svgEl('rect', { class: 'gp-bg', x: 0, y: 0, width: w, height: h }));

  // Grid (Round B #6b: per-axis steps). xStep / yStep live in state
  // independently; _gpEffectiveGridStep caps each axis separately so
  // the fine axis can have its step auto-doubled without also
  // coarsening the other. Minor-gridline pass runs at half the
  // effective major step when enabled.
  const xRange = S.xMax - S.xMin;
  const yRange = S.yMax - S.yMin;
  const xStepAuthored = (typeof S.xStep === 'number' && S.xStep > 0) ? S.xStep : S.gridStep;
  const yStepAuthored = (typeof S.yStep === 'number' && S.yStep > 0) ? S.yStep : S.gridStep;
  const effX = _gpEffectiveGridStep(xRange, yRange, xStepAuthored);
  const effY = _gpEffectiveGridStep(xRange, yRange, yStepAuthored);
  if(S.showGrid){
    // Minor gridlines (half-step) first so majors render on top.
    if(S.showMinorGrid){
      const mx = effX / 2, my = effY / 2;
      const mxStart = Math.ceil(S.xMin / mx) * mx;
      for(let x = mxStart; x <= S.xMax + 1e-9; x += mx){
        const sx = xToSvg(x);
        svg.appendChild(_svgEl('line', { class: 'gp-grid gp-grid-minor', x1: sx, y1: pad, x2: sx, y2: h - pad }));
      }
      const myStart = Math.ceil(S.yMin / my) * my;
      for(let y = myStart; y <= S.yMax + 1e-9; y += my){
        const sy = yToSvg(y);
        svg.appendChild(_svgEl('line', { class: 'gp-grid gp-grid-minor', x1: pad, y1: sy, x2: w - pad, y2: sy }));
      }
    }
    const xStart = Math.ceil(S.xMin / effX) * effX;
    for(let x = xStart; x <= S.xMax + 1e-9; x += effX){
      const sx = xToSvg(x);
      svg.appendChild(_svgEl('line', { class: 'gp-grid', x1: sx, y1: pad, x2: sx, y2: h - pad }));
    }
    const yStart = Math.ceil(S.yMin / effY) * effY;
    for(let y = yStart; y <= S.yMax + 1e-9; y += effY){
      const sy = yToSvg(y);
      svg.appendChild(_svgEl('line', { class: 'gp-grid', x1: pad, y1: sy, x2: w - pad, y2: sy }));
    }
  }

  // Axes
  if(S.showAxes){
    /* ARROWHEADS AT BOTH ENDS OF BOTH AXES — the panel's OWN markers.
     *
     * Not the gp-trace-head-* markers. Those are trace-guide furniture: they
     * are stroked in the TRACE colours (.gp-trace-arrow-*-head), and they live
     * in `defs.gp-trace-defs`, which _gpkTraceAnim creates lazily and rebuilds
     * with the trace group — so reusing them would make the coordinate axes'
     * arrowheads appear only once a trace had run and vanish when one was
     * cleared. Axis furniture belongs to the axes.
     *
     * Explicit per-direction markers, NOT orient="auto-start-reverse". That is
     * the same choice the trace heads document a few hundred lines below, for
     * the reason recorded there: auto orientation relies on SVG's tangent
     * computation, which produced inconsistent results on vertical lines. The
     * four directions here are known at emit time, so nothing needs inferring.
     *
     * markerUnits="userSpaceOnUse" so the head keeps its size independent of
     * the 1.2 stroke-width on .gp-axis — the strokeWidth default would scale
     * every head by the axis weight and make them shift if that weight ever
     * changes. */
    _gpEnsureAxisHeadDefs(svg);
    // x-axis only when y=0 is inside the viewport
    if(S.yMin <= 0 && S.yMax >= 0){
      const ay = yToSvg(0);
      /* x1 is the LEFT (negative x) end and x2 the right, so start=left head,
         end=right head. Both point away from the origin. */
      svg.appendChild(_svgEl('line', { class: 'gp-axis', x1: pad, y1: ay, x2: w - pad, y2: ay,
        'marker-start': 'url(#gp-axis-head-x-left)', 'marker-end': 'url(#gp-axis-head-x-right)' }));
    }
    if(S.xMin <= 0 && S.xMax >= 0){
      const ax = xToSvg(0);
      /* SVG y grows DOWNWARD, so y1 = pad is the TOP of the plot, which is
         mathematically POSITIVE y. start therefore takes the up head and end
         the down head — reversing these is the easy mistake here. */
      svg.appendChild(_svgEl('line', { class: 'gp-axis', x1: ax, y1: pad, x2: ax, y2: h - pad,
        'marker-start': 'url(#gp-axis-head-y-up)', 'marker-end': 'url(#gp-axis-head-y-down)' }));
    }
  }

  /* Anchor coords for axis ticks + tick labels. Shared so ticks
   * and labels can never drift apart in the parked-edge case
   * (axis off-screen) — when y=0 is outside the viewport, both
   * x-axis ticks and x-axis labels park along the bottom plot
   * edge; when x=0 is outside the viewport, both y-axis ticks
   * and y-axis labels park along the left plot edge. fix/graph-
   * axis-ticks. */
  const xAxisInView   = S.yMin <= 0 && S.yMax >= 0;
  const yAxisInView   = S.xMin <= 0 && S.xMax >= 0;
  const xAxisAnchorY  = xAxisInView ? yToSvg(0) : (h - pad);
  const yAxisAnchorX  = yAxisInView ? xToSvg(0) : pad;

  /* Major tick marks at every labeled position. Implicit gate
   * on showAxes — no new state flag. Origin is skipped (mirrors
   * the label loop's origin skip; the standalone "0" label
   * already marks the crossing). 5px total length, centered on
   * the anchor row/column. Same effX / effY as grid + labels so
   * ticks line up with everything else. */
  if(S.showAxes){
    const TICK_HALF = 2.5;
    const xStartTick = Math.ceil(S.xMin / effX) * effX;
    for(let x = xStartTick; x <= S.xMax + 1e-9; x += effX){
      if(Math.abs(x) < 1e-9) continue;
      const sx = xToSvg(x);
      svg.appendChild(_svgEl('line', {
        class: 'gp-tick',
        x1: sx, y1: xAxisAnchorY - TICK_HALF,
        x2: sx, y2: xAxisAnchorY + TICK_HALF
      }));
    }
    const yStartTick = Math.ceil(S.yMin / effY) * effY;
    for(let y = yStartTick; y <= S.yMax + 1e-9; y += effY){
      if(Math.abs(y) < 1e-9) continue;
      const sy = yToSvg(y);
      svg.appendChild(_svgEl('line', {
        class: 'gp-tick',
        x1: yAxisAnchorX - TICK_HALF, y1: sy,
        x2: yAxisAnchorX + TICK_HALF, y2: sy
      }));
    }
  }

  // Axis tick labels — share the grid's effective step per-axis so
  // labels and major gridlines always line up. Anchor coords come
  // from the shared xAxisAnchorY / yAxisAnchorX above.
  if(S.showAxisLabels){
    const fmtTick = n => (Math.abs(n) < 1e-9 ? '0' : (Math.round(n * 100) / 100).toString());
    const xStart = Math.ceil(S.xMin / effX) * effX;
    for(let x = xStart; x <= S.xMax + 1e-9; x += effX){
      if(Math.abs(x) < 1e-9) continue;
      const sx = xToSvg(x);
      svg.appendChild(_svgEl('text', {
        class: 'gp-tick-label', x: sx, y: xAxisAnchorY + 11, 'text-anchor': 'middle'
      })).textContent = fmtTick(x);
    }
    const yStart = Math.ceil(S.yMin / effY) * effY;
    for(let y = yStart; y <= S.yMax + 1e-9; y += effY){
      if(Math.abs(y) < 1e-9) continue;
      const sy = yToSvg(y);
      svg.appendChild(_svgEl('text', {
        class: 'gp-tick-label', x: yAxisAnchorX - 4, y: sy + 3, 'text-anchor': 'end'
      })).textContent = fmtTick(y);
    }
    if(xAxisInView && yAxisInView){
      svg.appendChild(_svgEl('text', {
        class: 'gp-tick-label', x: xToSvg(0) - 4, y: yToSvg(0) + 11, 'text-anchor': 'end'
      })).textContent = '0';
    }
  }

  // Function curves
  const samples = Math.max(80, Math.min(800, Math.round(plotW * 1.5)));
  // Asymptote threshold — treat any y-jump bigger than 2× the
  // viewport Y span between adjacent samples as a discontinuity and
  // start a new path segment.
  const jumpThreshold = (S.yMax - S.yMin) * 2;
  const clampY = (S.yMax - S.yMin) * 10; // clamp stray huge y values to avoid pathological path coords
  const yMinClamp = S.yMin - clampY;
  const yMaxClamp = S.yMax + clampY;
  for(const f of S.functions){
    if(!f.visible) continue;
    const compiled = graphCompile(f.expr);
    if(compiled.error) continue;
    // Per-function domain restriction (Round B #6, CR round-5).
    // domainMin/domainMax are optional — if both are set by the
    // user (or by a future preset like piecewise-defined functions),
    // the curve only renders inside that interval. Intersect with
    // the viewport so we don't waste samples outside the plot AND
    // the curve doesn't leak past its own domain boundary.
    const xStart = Math.max(S.xMin, Number.isFinite(f.domainMin) ? f.domainMin : S.xMin);
    const xEnd   = Math.min(S.xMax, Number.isFinite(f.domainMax) ? f.domainMax : S.xMax);
    if(xStart >= xEnd) continue;  // fully outside viewport or empty interval
    let d = '';
    let prevY = null;
    let lastWasMove = true;
    for(let i = 0; i <= samples; i++){
      const x = xStart + (i / samples) * (xEnd - xStart);
      let y = compiled.eval(x);
      const defined = Number.isFinite(y);
      if(defined){
        if(y > yMaxClamp) y = yMaxClamp;
        if(y < yMinClamp) y = yMinClamp;
      }
      if(!defined){
        lastWasMove = true;
        prevY = null;
        continue;
      }
      const jump = prevY !== null && Math.abs(y - prevY) > jumpThreshold;
      if(jump){ lastWasMove = true; }
      const sx = xToSvg(x);
      const sy = yToSvg(y);
      d += (lastWasMove ? 'M' : 'L') + sx.toFixed(2) + ',' + sy.toFixed(2) + ' ';
      lastWasMove = false;
      prevY = y;
    }
    if(d){
      svg.appendChild(_svgEl('path', {
        class: 'gp-curve',
        d: d.trim(),
        stroke: f.color,
        fill: 'none'
      }));
    }
  }

  // Points (Round B #6a: expanded style set — filled / open / square
  // / triangle — and per-point coord labels that respect the global
  // showAllCoords master toggle).
  for(const p of S.points){
    if(p.x < S.xMin || p.x > S.xMax || p.y < S.yMin || p.y > S.yMax) continue;
    const cx = xToSvg(p.x);
    const cy = yToSvg(p.y);
    const style = p.style || 'filled';
    const color = (p.color && _gpIsSafeColor(p.color)) ? p.color : null;
    const fillAttr   = color || 'currentColor';
    const strokeAttr = color || 'currentColor';
    /* feat/graph-point-selection-beta: selection ring rendered
     * BEFORE the point so paint order places it behind. 10px
     * radius leaves a visible gap around the point (r=5 circle
     * + 5px gap; triangle r=6 + 4px gap; 9×9 square + ~4px from
     * corners). pointer-events:none on the ring CSS so clicks
     * on the ring fall through to the point underneath. */
    if(p.id === S.selectedPointId){
      svg.appendChild(_svgEl('circle', {
        class: 'gp-point-selection-ring',
        cx, cy, r: 10
      }));
    }
    if(style === 'square'){
      svg.appendChild(_svgEl('rect', {
        class: 'gp-point gp-point-square',
        x: cx - 4.5, y: cy - 4.5, width: 9, height: 9,
        fill: fillAttr, stroke: strokeAttr,
        'data-gp-pt-id': p.id
      }));
    } else if(style === 'triangle'){
      // Equilateral-ish triangle pointing up; side ≈ 10 px.
      const r = 6;
      const tri = `${cx},${cy - r} ${cx - r * 0.866},${cy + r * 0.5} ${cx + r * 0.866},${cy + r * 0.5}`;
      svg.appendChild(_svgEl('polygon', {
        class: 'gp-point gp-point-triangle',
        points: tri,
        fill: fillAttr, stroke: strokeAttr,
        'data-gp-pt-id': p.id
      }));
    } else {
      const open = style === 'open';
      const circle = _svgEl('circle', {
        class: 'gp-point' + (open ? ' open' : ''),
        cx, cy, r: 5,
        'data-gp-pt-id': p.id
      });
      if(color){
        circle.setAttribute(open ? 'stroke' : 'fill', color);
        if(!open) circle.setAttribute('stroke', 'rgba(0,0,0,.6)');
      }
      svg.appendChild(circle);
    }
    // Coordinate + label rendering. Per-point showCoords overrides
    // the master toggle when explicitly false; otherwise the master
    // controls visibility. The label line shows custom text (if any)
    // followed by the (x, y) pair; empty labels just show coords.
    const showCoords = p.showCoords !== false && S.showAllCoords !== false;
    const labelText = [];
    if(p.label) labelText.push(p.label);
    if(showCoords) labelText.push('(' + _gpFmtNum(p.x) + ', ' + _gpFmtNum(p.y) + ')');
    if(labelText.length){
      const t = _svgEl('text', {
        class: 'gp-point-label', x: cx + 8, y: cy - 6
      });
      t.textContent = labelText.join(' ');
      svg.appendChild(t);
    }
  }

  // Angle arcs (Round B #6g). Renders single/double/triple nested
  // arcs + optional measure label. threePoints mode computes the
  // arc at vertex B sweeping from ray BA to ray BC — handles both
  // obtuse and acute cases by picking the shorter sweep direction.
  if(Array.isArray(S.arcs)){
    for(const arc of S.arcs){
      if(arc.visible === false) continue;
      _gpRenderArc(svg, arc, S, xToSvg, yToSvg);
    }
  }

  // Batch 4E: Coordinate Trace overlay. Rendered AFTER arcs so the
  // cursor + arrows sit on top of any plotted geometry. The trace
  // group is named so subsequent arrow-key moves can update just
  // the trace without rebuilding the whole plot SVG.
  if(S.coordTrace && S.coordTrace.enabled){
    _gpRenderCoordTrace(svg, S, xToSvg, yToSvg, /*animate=*/false);
  }

  return svg;
}
function _gpIsSafeColor(c){
  if(typeof c !== 'string') return false;
  if(c.length > 64) return false;
  if(/^#[0-9a-fA-F]{3,8}$/.test(c)) return true;
  if(/^rgb\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(c)) return true;
  if(/^rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:0|1|0?\.\d+)\s*\)$/i.test(c)) return true;
  if(/^hsl\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/i.test(c)) return true;
  if(/^hsla\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*(?:0|1|0?\.\d+)\s*\)$/i.test(c)) return true;
  if(/^[a-z]{3,24}$/i.test(c)) return true; // css named colors ('red', 'transparent', …)
  return false;
}
function _gpFmtNum(n){
  if(!Number.isFinite(n)) return '—';
  if(Math.abs(n) < 1e-9) return '0';
  const s = (Math.round(n * 100) / 100).toString();
  return s;
}
function _gpPaintStroke(ctx, stroke, targetW, targetH){
  if(!ctx || !stroke) return;
  const pts = Array.isArray(stroke.points) ? stroke.points : [];
  if(pts.length === 0) return;
  const sx = (stroke.w && targetW) ? targetW / stroke.w : 1;
  const sy = (stroke.h && targetH) ? targetH / stroke.h : 1;
  // PR-6 CR-1: stroke thickness must scale with the canvas too, not
  // just the point coordinates. Otherwise a stroke drawn at canvas
  // 400×300 and replayed at 800×600 would have correctly-placed
  // points but lines still rendered at the original line width —
  // visibly half as thick relative to the content. Use min(sx, sy)
  // so a non-uniform axis resize (which shouldn't normally happen
  // since the plot's aspect is locked, but can during transient
  // resize frames) doesn't pathologically fatten the stroke.
  const scale = Math.min(sx, sy);
  const scaled = pts.map(p => [p[0] * sx, p[1] * sy, p[2]]);
  const tool = stroke.tool;
  const color = stroke.color;
  const sz = stroke.size * scale;

  if(tool === 'eraser'){
    // Replay eraser strokes as clearRect patches at each recorded
    // point. Box size uses the scaled thickness so the erased area
    // matches what the teacher originally saw at the recording
    // canvas size — a tiny-canvas eraser tap no longer leaves a
    // giant crater when replayed onto a large canvas.
    for(const p of scaled){
      ctx.clearRect(p[0] - sz*5, p[1] - sz*5, sz*10, sz*10);
    }
    return;
  }

  if(tool === 'dotted' || tool === 'dashed'){
    // Segmented fallback — replay as a sequence of dashed segments
    // between successive points, matching the live pointermove path.
    if(scaled.length < 2) return;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = sz;
    ctx.globalAlpha = 1;
    ctx.setLineDash(tool === 'dotted' ? [sz*0.6, sz*2] : [sz*3, sz*2]);
    ctx.beginPath();
    ctx.moveTo(scaled[0][0], scaled[0][1]);
    for(let i = 1; i < scaled.length; i++){
      ctx.lineTo(scaled[i][0], scaled[i][1]);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Smooth fill-outline tools (pen / highlight / marker / brush).
  const pf = (typeof window !== 'undefined') ? window.perfectFreehand : null;
  ctx.save();
  if(!pf || typeof pf.getStroke !== 'function'){
    // Library missing — polyline fallback (same as live handler).
    ctx.strokeStyle = color;
    ctx.lineWidth = sz;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for(let i = 0; i < scaled.length; i++){
      if(i === 0) ctx.moveTo(scaled[i][0], scaled[i][1]);
      else ctx.lineTo(scaled[i][0], scaled[i][1]);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }
  // Only the four smooth tools actually reach this code path —
  // dotted / dashed returned early above. Dropped the two stale
  // entries per CR.
  const sizeMap = { pen: sz*1.6, highlight: sz*4, marker: sz*2.4, brush: sz*2 };
  const opts = {
    size: sizeMap[tool] || sz * 1.6,
    thinning: tool === 'marker' ? 0.2 : (tool === 'highlight' ? 0.1 : 0.55),
    smoothing: tool === 'brush' ? 0.75 : 0.62,
    streamline: 0.55,
    simulatePressure: true,
    last: true                        // replay is always a final stroke
  };
  const outline = pf.getStroke(scaled, opts);
  if(!outline.length){ ctx.restore(); return; }
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  if(tool === 'highlight'){ ctx.globalAlpha = 0.44; ctx.fillStyle = _gpHexToRgba(color, 0.33); }
  else if(tool === 'marker'){ ctx.globalAlpha = 0.95; }
  else if(tool === 'brush'){ ctx.globalAlpha = 0.85; ctx.shadowBlur = sz * 1.6; ctx.shadowColor = color; }
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for(let i = 1; i < outline.length; i++){ ctx.lineTo(outline[i][0], outline[i][1]); }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function _gpHexToRgba(hex, alpha){
  const h = (hex || '').replace('#','');
  if(!/^[0-9A-Fa-f]{6}$/.test(h)) return 'rgba(0,0,0,' + alpha + ')';
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
return {compile:graphCompile,svg:_gpBuildSvg,paintStroke:_gpPaintStroke};
})();
