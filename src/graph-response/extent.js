/* Presentation-only mathematical extents. Legacy line objects remain segments.
 * This boundary also supports future authored graph stimuli: several objects
 * share a plane, but no reading/intersection UI or marking is introduced. */
function grClipSegment(p,q,a,lo=0,hi=1){
  let dx=q.x-p.x,dy=q.y-p.y;
  const direction=Math.max(Math.abs(dx),Math.abs(dy));if(!direction)return null;
  // Infinite extents use direction only; normalize tiny coordinate differences.
  if(!Number.isFinite(lo)||!Number.isFinite(hi)){dx/=direction;dy/=direction;}
  for(const [v,min,max,d] of [[p.x,a.xMin,a.xMax,dx],[p.y,a.yMin,a.yMax,dy]]){
    if(d===0){if(v<min||v>max)return null;continue;}
    const t1=(min-v)/d,t2=(max-v)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));
    if(lo>hi)return null;
  }
  return [{x:p.x+lo*dx,y:p.y+lo*dy,t:lo},{x:p.x+hi*dx,y:p.y+hi*dy,t:hi}];
}
function grPaintExtents(svg,objects,a,w,h,pixels){
  const ns='http://www.w3.org/2000/svg',scale=w/Math.max(1,pixels.width||w);
  const map=p=>({x:4+(p.x-a.xMin)/(a.xMax-a.xMin)*(w-8),y:4+(a.yMax-p.y)/(a.yMax-a.yMin)*(h-8)});
  const add=(tag,attrs)=>{const node=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,v);svg.append(node);return node;};
  const stroke=(p,q)=>{const u=map(p),v=map(q);add('line',{x1:u.x,y1:u.y,x2:v.x,y2:v.y,class:'gr-object'});};
  const arrow=(at,from)=>{const p=map(at),q=map(from),dx=p.x-q.x,dy=p.y-q.y,length=Math.hypot(dx,dy);if(length<1e-8)return;const ux=dx/length,uy=dy/length,size=8*scale,half=3.5*scale;add('polygon',{points:`${p.x},${p.y} ${p.x-size*ux-half*uy},${p.y-size*uy+half*ux} ${p.x-size*ux+half*uy},${p.y-size*uy-half*ux}`,class:'gr-continuation','data-gr-continuation':''});};
  const endpoint=(p,open)=>{if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<a.xMin||p.x>a.xMax||p.y<a.yMin||p.y>a.yMax)return;const s=map(p);add('circle',{cx:s.x,cy:s.y,r:4*scale,class:'gr-domain-end '+(open?'gr-open-end':'gr-closed-end'),'data-gr-endpoint':open?'open':'closed'});};
  for(const object of objects){
    if(object.type==='line'){
      const extent=object.extent||'segment',p={x:object.x1,y:object.y1},q={x:object.x2,y:object.y2};
      const clipped=grClipSegment(p,q,a,extent==='line'?-Infinity:0,extent==='segment'?1:Infinity);if(!clipped)continue;
      stroke(...clipped);
      if(extent==='line')arrow(clipped[0],clipped[1]);
      if(extent!=='segment')arrow(clipped[1],clipped[0]);
      if(extent==='segment'){endpoint(p,false);endpoint(q,false);}else if(extent==='ray')endpoint(p,false);
      continue;
    }
    if(!['function','parabola'].includes(object.type))continue;
    const fn=object.type==='parabola'?x=>object.a*(x-object.h)**2+object.k:GR_HGL.compile(object.expr).eval;
    const minimum=Math.max(a.xMin,object.domainMin??a.xMin),maximum=Math.min(a.xMax,object.domainMax??a.xMax);if(minimum>=maximum)continue;
    const breaks=[minimum,...(object.discontinuities||[]).filter(x=>x>minimum&&x<maximum).sort((x,y)=>x-y),maximum];
    const boundary=p=>Math.abs(p.x-a.xMin)<1e-8||Math.abs(p.x-a.xMax)<1e-8||Math.abs(p.y-a.yMin)<1e-8||Math.abs(p.y-a.yMax)<1e-8;
    const restricted=p=>object.domainMin!=null&&Math.abs(p.x-object.domainMin)<1e-8||object.domainMax!=null&&Math.abs(p.x-object.domainMax)<1e-8;
    for(let branch=1;branch<breaks.length;branch++){
      const left=breaks[branch-1],right=breaks[branch],segments=[];let previous;
      for(let i=0;i<=768;i++){
        let x=left+(right-left)*i/768;if(i===0&&branch>1||i===768&&branch<breaks.length-1)x+=(i===0?1:-1)*(right-left)*1e-7;
        const point={x,y:fn(x)};
        if(previous&&Number.isFinite(point.y)&&Number.isFinite(previous.y)){
          const middle=fn((previous.x+point.x)/2),span=a.yMax-a.yMin;
          // A pole must not turn into a straight chord across the viewport.
          if(Number.isFinite(middle)&&!(Math.abs(point.y-previous.y)>span*2&&Math.abs(middle-(point.y+previous.y)/2)>span)){
            const clipped=grClipSegment(previous,point,a);if(clipped)segments.push(clipped);
          }
        }
        previous=point;
      }
      // Separate visible runs preserve discontinuities and off-screen gaps.
      const runs=[];for(const segment of segments){const last=runs.at(-1);if(last&&Math.hypot(last.at(-1).x-segment[0].x,last.at(-1).y-segment[0].y)<1e-7)last.push(segment[1]);else runs.push([...segment]);}
      for(const run of runs){const d=run.map((p,i)=>{const s=map(p);return (i?'L':'M')+s.x+','+s.y;}).join(' ');add('path',{d,class:'gp-curve gr-object',fill:'none',stroke:'#007e6e','stroke-width':2.2});const start=run[0],end=run.at(-1);if(boundary(start)&&!restricted(start))arrow(start,run[1]);if(boundary(end)&&!restricted(end))arrow(end,run.at(-2));}
    }
    if(object.domainMin!=null)endpoint({x:object.domainMin,y:fn(object.domainMin)},object.openMin===true);
    if(object.domainMax!=null)endpoint({x:object.domainMax,y:fn(object.domainMax)},object.openMax===true);
  }
}
