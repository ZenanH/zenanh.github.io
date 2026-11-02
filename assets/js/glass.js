/*!
 * Liquid Glass — refraction directive (Angular).
 *
 * The refraction field is a port of the fragment shader in liquid-glass-js
 * (https://github.com/dashersw/liquid-glass-js) — Copyright (c) 2025 Armagan
 * Amcalar, MIT. Permission is hereby granted, free of charge, to any person
 * obtaining a copy of that software to deal in it without restriction,
 * provided this notice travels with it; it is provided "as is", without
 * warranty of any kind. Keep this header on any copy or port.
 *
 * The port targets an SVG displacement filter fed by a live backdrop instead
 * of the library's html2canvas page snapshot.
 *
 * Pair with the `.liquid-glass` class from ../css/liquid-glass.css:
 *   <div class="liquid-glass" appLiquidGlass>…</div>
 *
 * Porting to another framework: ../references/refraction.md carries the
 * mechanism and the formulas.
 */
const SUPERSAMPLE=2, MAX_MAP_EDGE=1400, BLUR_STD_PER_RADIUS=.35;
const GLASS_PRESET={edgeIntensity:.015,rimIntensity:.028,baseIntensity:.05,edgeDistance:.5,rimDistance:1.7,baseDistance:.2,cornerBoost:.06,rippleEffect:.26,blurRadius:2,warp:false};
function buildDisplacementMap(
  w,
  h,
  radius,
  pageW,
  pageH,
  cfg,
) {
  // Supersample small elements for a crisp rim; for surfaces wider than
  // MAX_MAP_EDGE let ss drop below 1 (a coarser map, stretched by feImage) so
  // the bake and data-URL stay bounded — the wide topbar is mostly neutral
  // anyway. Floor keeps at least ~1 map px per 4 CSS px.
  const ss = Math.max(0.25, Math.min(SUPERSAMPLE, MAX_MAP_EDGE / Math.max(w, h)));
  const bw = Math.max(1, Math.round(w * ss));
  const bh = Math.max(1, Math.round(h * ss));
  const r = radius * ss;
  const minDim = Math.min(w, h);
  const dx = new Float32Array(bw * bh);
  const dy = new Float32Array(bw * bh);
  let maxAbs = 0;

  for (let py = 0; py < bh; py++) {
    for (let px = 0; px < bw; px++) {
      const cx = (px + 0.5) / bw;
      const cy = (py + 0.5) / bh;

      // Signed distance to the rounded-rect edge (supersampled px → CSS px).
      const tx = Math.abs(px + 0.5 - bw / 2) - (bw / 2 - r);
      const ty = Math.abs(py + 0.5 - bh / 2) - (bh / 2 - r);
      const outside = Math.hypot(Math.max(tx, 0), Math.max(ty, 0));
      const inside = Math.min(Math.max(tx, ty), 0);
      const distPx = Math.max(-(outside + inside - r), 0) / ss;

      const edgeFall = Math.exp(-distPx * cfg.edgeDistance);
      const rimFall = Math.exp(-distPx * cfg.rimDistance);
      const baseFall = 1 - Math.exp(-distPx * cfg.baseDistance);
      const baseComponent = cfg.warp ? baseFall * cfg.baseIntensity : 0;
      const total = baseComponent + edgeFall * cfg.edgeIntensity + rimFall * cfg.rimIntensity;

      // The shader's rounded-rect normal is taken in texcoord space.
      let nx = cx - 0.5;
      let ny = cy - 0.5;
      const len = Math.hypot(nx, ny);
      if (len > 0) {
        nx /= len;
        ny /= len;
      }

      const cornerNorm = Math.max(Math.min(cx, 1 - cx), Math.min(cy, 1 - cy)) * minDim;
      const corner = Math.exp(-cornerNorm * 0.3) * cfg.cornerBoost;

      const ripple = Math.sin((distPx / minDim) * 25) * cfg.rippleEffect * rimFall;

      // normal * (refraction + corner boost) + perpendicular * ripple,
      // converted from page-texture fractions to pixels.
      const fx = (nx * (total + corner) - ny * ripple) * pageW;
      const fy = (ny * (total + corner) + nx * ripple) * pageH;

      const i = py * bw + px;
      dx[i] = fx;
      dy[i] = fy;
      maxAbs = Math.max(maxAbs, Math.abs(fx), Math.abs(fy));
    }
  }

  const scale = Math.max(maxAbs * 2, 1e-4);
  // feDisplacementMap decodes byte b as scale*(b/255 - 0.5); since 128/255 ≠ 0.5,
  // a naive neutral (128) would shift the whole interior by scale/510 px.
  // Pre-subtract that decode bias so zero displacement stays put (warp off ⇒
  // the middle must read undistorted).
  const bias = scale * (128 / 255 - 0.5);
  const canvas = document.createElement('canvas');
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(bw, bh);
  const data = image.data;
  for (let i = 0; i < bw * bh; i++) {
    data[i * 4] = clampByte(255 * (0.5 + (dx[i] - bias) / scale));
    data[i * 4 + 1] = clampByte(255 * (0.5 + (dy[i] - bias) / scale));
    data[i * 4 + 2] = 128;
    data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return { mapUrl: canvas.toDataURL('image/png'), scale };
}

/** Resolve a computed border-radius (px or %) to CSS pixels. */
function resolveRadius(computed, w, h) {
  const value = parseFloat(computed) || 0;
  return computed.trim().endsWith('%') ? (value / 100) * Math.min(w, h) : value;
}

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

(() => {
const supported=navigator.userAgentData?.brands?.some(b=>/Chromium|Google Chrome|Microsoft Edge/i.test(b.brand)) ?? /Chrome\//.test(navigator.userAgent);
if(!supported)return;
const ns='http://www.w3.org/2000/svg', cache=new Map(), states=new Map();let serial=0, frame=0, timer;
const svg=document.createElementNS(ns,'svg');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='fixed';svg.setAttribute('aria-hidden','true');const defs=document.createElementNS(ns,'defs');svg.append(defs);document.body.append(svg);
function release(key){const entry=cache.get(key);if(entry&&--entry.refs===0){entry.node.remove();cache.delete(key)}}
function rebuild(){
for(const el of document.querySelectorAll('[data-glass]')){
const w=Math.round(el.offsetWidth),h=Math.round(el.offsetHeight);if(w<2||h<2)continue;
const radius=Math.min(resolveRadius(getComputedStyle(el).borderTopLeftRadius,w,h),Math.min(w,h)/2),pw=innerWidth,ph=innerHeight,key=[w,h,radius,pw,ph,JSON.stringify(GLASS_PRESET),el.matches('.masthead')?'nav':'panel'].join('|');
const old=states.get(el);if(old===key&&cache.get(key)?.node.isConnected)continue;if(old)release(old);
let entry=cache.get(key);if(!entry?.node.isConnected){
const {mapUrl,scale}=buildDisplacementMap(w,h,radius,pw,ph,GLASS_PRESET),id='glass-'+serial++,node=document.createElementNS(ns,'filter'),margin=scale/2+3*(.7),mx=margin/w*100,my=margin/h*100;
for(const [k,v]of Object.entries({id,x:-mx+'%',y:-my+'%',width:(100+2*mx)+'%',height:(100+2*my)+'%','color-interpolation-filters':'sRGB'}))node.setAttribute(k,v);
function add(tag,attrs){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);node.append(n)}
add('feImage',{href:mapUrl,x:0,y:0,width:w,height:h,preserveAspectRatio:'none',result:'map'});
add('feDisplacementMap',{in:'SourceGraphic',in2:'map',scale,xChannelSelector:'R',yChannelSelector:'G',result:'displaced'});
add('feGaussianBlur',{in:'displaced',stdDeviation:.7});if(!svg.isConnected)document.body.append(svg);defs.append(node);entry={id,node,refs:0};cache.set(key,entry);
}entry.refs++;states.set(el,key);el.style.backdropFilter=el.matches('.masthead')?'url(#'+entry.id+') blur(14px) saturate(145%)':'url(#'+entry.id+')';
}}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(rebuild)}
const observer=new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(schedule,180)});
function observeGlass(root){if(root.nodeType!==1)return;if(root.matches('[data-glass]'))observer.observe(root);root.querySelectorAll('[data-glass]').forEach(el=>observer.observe(el))}
observeGlass(document.body);
const mutations=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(observeGlass)));
mutations.observe(document.body,{childList:true,subtree:true});
function resize(){clearTimeout(timer);timer=setTimeout(schedule,180)}window.addEventListener('resize',resize,{passive:true});schedule();
window.addEventListener('pagehide',e=>{if(e.persisted)return;observer.disconnect();mutations.disconnect();window.removeEventListener('resize',resize);clearTimeout(timer);cancelAnimationFrame(frame);for(const key of states.values())release(key);states.clear();svg.remove()},{once:true});
})();
