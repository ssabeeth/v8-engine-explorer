
/* =====================================================================
   ASSEMBLE
   ===================================================================== */
const blockParts = buildBlock();
buildPan();
buildCrank();
buildFlywheel();
buildCam();
buildChain();
buildBankHardware();
const throttleBlade = buildIntake();
buildHeaders();
const pulleyRot = buildFront();
for (let n = 1; n <= 8; n++) {
  const m = cylObjs[n].coilMat;
  m.onBeforeCompile = MAT.accDark.onBeforeCompile;
  m.customProgramCacheKey = MAT.accDark.customProgramCacheKey;
  m.emissive = new THREE.Color(0xff7a2f);
  m.emissiveIntensity = 0;
  CLIP_MATS.push(m);
}

/* =====================================================================
   STATE
   ===================================================================== */
const state = {
  playing: true, slow: true, rpm: 900, theta: 0,
  explode: false, explodeDist: 1, explodeAmt: 0,
  trans: false, opacity: 1, shellOp: 1,
  cut: true, cutMode: 'R', cutPos: 0,
  sys: { block: true, heads: true, pistons: true, rods: true, crankshaft: true, valves: true, camshaft: true, plugs: true, intake: true, exhaust: true, flywheel: true, accessories: true, labels: true, effects: true },
  selCyl: 1, selPart: null, solo: false,
  learning: null, quality: 'balanced', particleCount: 900, fireLight: true,
};

/* ---------------- explode ---------------- */
const bankDir = (v, s) => { const b = s * 45 * DEG; return V3(v.x, v.y * Math.cos(b) + v.z * Math.sin(b), -v.y * Math.sin(b) + v.z * Math.cos(b)); };
const EXPLODE = [
  [G.pan, V3(0, -3.3, 0)], [G.rot, V3(0, -1.75, 0)], [G.fly, V3(-1.6, -1.75, 0)], [G.cam, V3(0, 1.35, 0)],
  [G.intake, V3(0, 3.5, 0)], [G.front, V3(2.5, 0, 0)], [G.chain, V3(1.1, 0, 0)],
];
for (const b of ['L', 'R']) {
  const s = b === 'L' ? -1 : 1;
  EXPLODE.push([G.head[b], V3(0, 1.4, 0)], [G.cover[b], V3(0, 2.8, 0)], [G.push[b], bankDir(V3(0, 1.35, 0), s)], [G.ex[b], V3(0, -0.5, 2.0 * s)]);
}
for (const e of EXPLODE) e.push(e[0].position.clone());
function applyExplode() {
  const k = smooth(clamp(state.explodeAmt, 0, 1)) * state.explodeDist;
  for (const [obj, dir, base] of EXPLODE) obj.position.copy(base).addScaledVector(dir, k);
  floor.position.y = FLOOR_Y - 3.5 * k;
  grid.position.y = floor.position.y + 0.002;
}

/* ---------------- shell opacity + section cut ---------------- */
const HL = new Map();
function hlMat(m) {
  if (!HL.has(m)) {
    const h = m.clone();
    if (h.emissive) { h.emissive = new THREE.Color(0x2e8bff); h.emissiveIntensity = 0.5; }
    h.onBeforeCompile = m.onBeforeCompile;
    h.customProgramCacheKey = m.customProgramCacheKey;
    h.clippingPlanes = m.clippingPlanes;
    h.side = m.side;
    HL.set(m, h);
  }
  return HL.get(m);
}
function setShellOpacity(op) {
  state.shellOp = op;
  const t = op < 0.995;
  for (const m of SHELL_MATS) {
    for (const mm of HL.has(m) ? [m, HL.get(m)] : [m]) {
      if (mm.transparent !== t) mm.needsUpdate = true;
      mm.transparent = t;
      mm.opacity = t ? op : 1;
      mm.depthWrite = !t;
    }
  }
  for (const o of ALL) if (SHELL_MATS.includes(o.userData.baseMat)) o.castShadow = op > 0.6;
  applyVisibility();
}
const cutPlane = new THREE.Plane(V3(0, 0.7071, -0.7071), 0);
function cutConstant() {
  return state.cutMode === 'X' ? lerp(-2.7, 3.3, (state.cutPos + 1) / 2) : state.cutPos * 1.3;
}
function updateCutPlane() {
  if (state.cutMode === 'X') cutPlane.normal.set(-1, 0, 0);
  else { const s = state.cutMode === 'R' ? 1 : -1; cutPlane.normal.set(0, Math.SQRT1_2, -Math.SQRT1_2 * s); }
  cutPlane.constant = cutConstant();
}
function applyCut() {
  updateCutPlane();
  CUT_ON.value = state.cut ? 1 : 0;
  const planes = state.cut ? [cutPlane] : null;
  const side = state.cut ? THREE.DoubleSide : THREE.FrontSide;
  for (const m of CLIP_MATS) {
    for (const mm of HL.has(m) ? [m, HL.get(m)] : [m]) {
      mm.clippingPlanes = planes;
      if (mm !== MAT.liner && !mm.isShaderMaterial && mm.side !== side) { mm.side = side; mm.needsUpdate = true; }
    }
  }
  // accessories hide the cross-section view from the front
  applyVisibility();
}

/* ---------------- visibility + materials ---------------- */
function applyVisibility() {
  const see = state.shellOp < 0.995 || state.cut;
  for (const o of ALL) {
    const ud = o.userData;
    let v = state.sys[ud.sys] !== false;
    if (ud.liner) v = v && see;
    o.visible = v;
  }
  for (const n in cylObjs) cylObjs[n].label.visible = state.sys.labels;
}
function refreshMaterials() {
  for (const o of ALL) {
    const ud = o.userData;
    if (ud.liner) continue;
    let m = ud.baseMat;
    if (state.selPart && ud.part === state.selPart) m = hlMat(m);
    else if (state.solo && ud.cyl && ud.cyl !== state.selCyl) m = MAT.ghost;
    o.material = m;
  }
}

/* =====================================================================
   FLOW PARTICLES
   ===================================================================== */
const MAX_P = 1800;
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_P * 3), 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_P * 3), 3));
pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(MAX_P), 1));
pGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(MAX_P), 1));
const pMat = new THREE.ShaderMaterial({
  uniforms: { uScale: { value: 800 } },
  vertexShader: `#include <clipping_planes_pars_vertex>
    attribute float aAlpha; attribute float aSize; attribute vec3 color; varying vec3 vC; varying float vA; uniform float uScale;
    void main(){ vC = color; vA = aAlpha; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mvPosition.z; gl_Position = projectionMatrix * mvPosition;
    #include <clipping_planes_vertex>
    }`,
  fragmentShader: `#include <clipping_planes_pars_fragment>
    varying vec3 vC; varying float vA;
    void main(){
    #include <clipping_planes_fragment>
    vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5 || vA < 0.003) discard; float a = pow(1.0 - r * 2.0, 1.6); gl_FragColor = vec4(vC * a * vA, a * vA); }`,
  clipping: true,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
CLIP_MATS.push(pMat);
const points = new THREE.Points(pGeo, pMat);
points.userData.noPick = true;
points.frustumCulled = false;
points.renderOrder = 7;
engine.add(points);
const PATHS = {};
function buildPaths() {
  for (const c of CYL) {
    const s = c.s;
    const nI = bankToWorld(c, 0, 0, -1);
    const port = bankToWorld(c, c.xI, 2.72, -0.9);
    const intake = [V3(c.xI, 3.66, 0.02 * s), V3(c.xI, 3.52, 0.3 * s), V3(c.xI, 3.3, 0.66 * s), port.clone().addScaledVector(nI, 0.28), port,
      bankToWorld(c, c.xI, 2.6, -0.45), bankToWorld(c, c.xI, 2.42, -0.12), bankToWorld(c, c.xI, 2.28, 0), bankToWorld(c, (c.xI + c.x) / 2, 2.0, 0.1), bankToWorld(c, c.x, 1.65, 0.05)];
    const hp = HEADER_PATHS[c.n].getPoints(20);
    const exhaust = [bankToWorld(c, c.x, 1.95, -0.05), bankToWorld(c, c.xE, 2.26, 0), bankToWorld(c, c.xE, 2.5, 0.3), bankToWorld(c, c.xEport, 2.72, 0.7), ...hp.slice(1),
      V3(-3.0, -0.55, 2.0 * s), V3(-3.45, -0.55, 2.0 * s)];
    PATHS[c.n] = {
      I: new THREE.CatmullRomCurve3(intake, false, 'centripetal').getSpacedPoints(80),
      E: new THREE.CatmullRomCurve3(exhaust, false, 'centripetal').getSpacedPoints(110),
    };
  }
}
buildPaths();
const PD = [];
for (let i = 0; i < MAX_P; i++) {
  PD.push({ n: 1 + (i % 8), kind: (i >> 3) % 2 ? 'E' : 'I', u: Math.random(), sp: 0.85 + Math.random() * 0.3,
    j: V3((Math.random() - 0.5) * 0.14, (Math.random() - 0.5) * 0.14, (Math.random() - 0.5) * 0.14), size: 0.05 + Math.random() * 0.05 });
}
const _pv = new THREE.Vector3();
function samplePath(arr, t, out) {
  const f = t * (arr.length - 1), i = Math.floor(f), k = f - i;
  const a = arr[i], b = arr[Math.min(i + 1, arr.length - 1)];
  return out.set(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));
}
const CI = [0.3, 0.62, 1.0], CE0 = [1.0, 0.56, 0.2], CE1 = [0.62, 0.12, 0.06];
function updateParticles(T, lifts, fx) {
  const pos = pGeo.attributes.position.array, col = pGeo.attributes.color.array, al = pGeo.attributes.aAlpha.array, sz = pGeo.attributes.aSize.array;
  const N = state.particleCount;
  for (let i = 0; i < N; i++) {
    const p = PD[i];
    const lf = p.kind === 'I' ? lifts[p.n].I : lifts[p.n].E;
    let a = lf * fx * (state.solo && p.n !== state.selCyl ? 0 : 1);
    const t = mod(p.u + (T / 720) * 2.2 * p.sp, 1);
    a *= smooth(clamp(t / 0.08, 0, 1)) * smooth(clamp((1 - t) / 0.12, 0, 1));
    samplePath(PATHS[p.n][p.kind], t, _pv).add(p.j);
    pos[i * 3] = _pv.x; pos[i * 3 + 1] = _pv.y; pos[i * 3 + 2] = _pv.z;
    const c = p.kind === 'I' ? CI : [lerp(CE0[0], CE1[0], t), lerp(CE0[1], CE1[1], t), lerp(CE0[2], CE1[2], t)];
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    al[i] = a * (p.kind === 'I' ? 0.75 : 0.9);
    sz[i] = p.size * (p.kind === 'E' ? 1 + t * 0.8 : 1);
  }
  pGeo.setDrawRange(0, N);
  for (const k of ['position', 'color', 'aAlpha', 'aSize']) pGeo.attributes[k].needsUpdate = true;
}

/* =====================================================================
   MECHANISM UPDATE — everything derived from one crank angle
   ===================================================================== */
const _A = new THREE.Vector3(), _B = new THREE.Vector3(), _D = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);
const colTmp = new THREE.Color();
const GAS = { hot: new THREE.Color(1.0, 0.93, 0.7), mid: new THREE.Color(1.0, 0.45, 0.12), late: new THREE.Color(0.7, 0.12, 0.04), ex: new THREE.Color(0.55, 0.14, 0.06), air: new THREE.Color(0.22, 0.5, 1.0), comp: new THREE.Color(0.5, 0.42, 1.0) };
const live = { cyl: {}, firing: 1 };
function updateMechanism(T) {
  const th = mod(T, 720);
  const crankRot = -th * DEG;
  G.crank.rotation.x = crankRot;
  G.fly.rotation.x = crankRot;
  G.cam.rotation.x = crankRot / 2;
  for (const r of pulleyRot) r.obj.rotation.x = mod(-th * r.ratio, 360) * DEG;
  chainTex.offset.x = mod((th * DEG * 0.315) / 0.16, 1);
  throttleBlade.rotation.y = lerp(0.12, 1.35, clamp((state.rpm - 300) / 8700, 0, 1));
  const fxBase = state.sys.effects ? 1 - clamp(state.explodeAmt * 3, 0, 1) : 0;
  const lifts = {};
  let fireN = 1, fireComb = 0;
  for (const c of CYL) {
    const o = cylObjs[c.n];
    const cs = crankState(th, c);
    o.piston.position.y = cs.s;
    o.rod.position.set(c.x, cs.py, cs.pz);
    o.rod.rotation.x = cs.rodAng;
    const cc = cycleOf(th, c);
    const li = liftProfile(cc, VT.ivo, VT.ivc), le = liftProfile(cc, VT.evo, VT.evc);
    lifts[c.n] = { I: li, E: le };
    for (const v of o.valves) {
      const lift = (v.kind === 'I' ? li : le) * MAX_LIFT;
      const d = Math.asin(clamp(lift / VALVE_ARM, 0, 1));
      v.valve.position.y = ROOF - lift;
      v.spring.scale.y = 3.34 - lift - 3.1;
      v.rocker.rotation.x = c.s * d;
      const cupY = 3.44 - 0.05 * Math.cos(d) + 0.16 * Math.sin(d);
      const cupZo = -0.24 - 0.05 * Math.sin(d) - 0.16 * Math.cos(d);
      const rise = cupY - 3.39;
      v.lifter.position.y = CAM_Y * Math.SQRT1_2 + LOBE_RB + rise;
      _A.set(v.xv, v.lifter.position.y + 0.37, -CAM_Y * Math.SQRT1_2 * c.s);
      _B.set(v.xv, cupY, cupZo * c.s);
      _D.subVectors(_B, _A);
      const len = _D.length();
      v.pushrod.position.copy(_A);
      v.pushrod.quaternion.setFromUnitVectors(_Y, _D.divideScalar(len));
      v.pushrod.scale.set(1, len, 1);
    }
    /* charge / combustion column between crown and roof */
    const crown = cs.s + COMP_H;
    const h = Math.max(ROOF - crown, 0.02);
    o.gas.position.set(c.x, crown + h / 2, 0);
    o.gas.scale.y = h;
    const stroke = strokeOf(cc);
    const comb = combustionOf(cc);
    let op = 0;
    if (cc >= VT.spark) { colTmp.copy(GAS.hot); op = 0.25 + 0.5 * comb; }
    else if (stroke === 'POWER') {
      const t = cc / 180;
      colTmp.copy(t < 0.35 ? GAS.hot : GAS.mid).lerp(t < 0.35 ? GAS.mid : GAS.late, t < 0.35 ? t / 0.35 : (t - 0.35) / 0.65);
      op = 0.1 + 0.62 * comb;
    } else if (stroke === 'EXHAUST') { colTmp.copy(GAS.ex); op = 0.14 * (1 - (cc - 180) / 180) + 0.03; }
    else if (stroke === 'INTAKE') { colTmp.copy(GAS.air); op = 0.05 + 0.08 * li; }
    else { const t = (cc - 540) / 170; colTmp.copy(GAS.air).lerp(GAS.comp, t); op = 0.07 + 0.16 * t; }
    const soloK = state.solo && c.n !== state.selCyl ? 0 : 1;
    o.gasMat.color.copy(colTmp);
    o.gasMat.opacity = op * fxBase * soloK;
    o.gas.visible = o.gasMat.opacity > 0.004 && state.sys.pistons;
    /* spark */
    const sp = cc >= VT.spark && cc < VT.spark + 14 ? 1 - (cc - VT.spark) / 14 : 0;
    o.sparkMat.opacity = sp * fxBase * soloK * (0.75 + 0.25 * Math.random());
    o.spark.visible = o.sparkMat.opacity > 0.01;
    o.spark.scale.setScalar(0.35 + sp * 0.5);
    o.coilMat.emissiveIntensity = (cc >= VT.spark - 8 || cc < 12 ? 0.9 : 0) * (state.sys.effects ? 1 : 0.4);
    if (cc >= VT.spark || cc < VT.spark - 630) { fireN = c.n; fireComb = comb; }
    live.cyl[c.n] = { cc, stroke, li, le, spark: sp > 0 || (cc >= VT.spark || cc < 10) };
  }
  live.firing = fireN;
  /* single moving light inside the firing chamber */
  if (state.fireLight && fxBase > 0 && (state.shellOp < 0.995 || state.cut)) {
    const fc = CYL[fireN - 1];
    const cs = crankState(th, fc);
    bankToWorld(fc, fc.x, cs.s + COMP_H + 0.08, 0, fireLight.position).add(G.rot.position);
    fireLight.intensity = fireComb * 9 * fxBase * (state.solo && fireN !== state.selCyl ? 0 : 1);
  } else fireLight.intensity = 0;
  if (fxBase > 0 && state.particleCount > 0) { points.visible = true; updateParticles(T, lifts, fxBase); }
  else points.visible = false;
}

/* =====================================================================
   CAMERA
   ===================================================================== */
let tween = null;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function flyTo(pos, target, dur = 1.3) {
  tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), k: 0, dur };
}
function stepTween(dt) {
  if (!tween) return;
  tween.k = Math.min(1, tween.k + dt / tween.dur);
  const e = ease(tween.k);
  camera.position.lerpVectors(tween.p0, tween.p1, e);
  controls.target.lerpVectors(tween.t0, tween.t1, e);
  if (tween.k >= 1) tween = null;
}
const HOME = { pos: V3(9.2, 5.6, 10.4), target: V3(0.1, 1.0, 0.2) };
function selCylObj() { return CYL[(state.selCyl || 1) - 1]; }
function presetView(name) {
  const c = selCylObj();
  const out = bankToWorld(c, 0, 0, 1);
  switch (name) {
    case 'front': return { pos: V3(14, 1.7, 0.01), target: V3(0, 1.1, 0) };
    case 'top': return { pos: V3(0.8, 15.5, 0.02), target: V3(0, 1.3, 0) };
    case 'crank': return { pos: V3(5.2, -1.6, 6.6), target: V3(0.1, -0.1, 0.3), needCut: 'R' };
    case 'piston': { const t = bankToWorld(c, c.x, 1.75, 0); return { pos: t.clone().addScaledVector(out, 7.2).add(V3(3.2, 2.2, 0)), target: t, needCut: c.bank }; }
    case 'chamber': { const t = bankToWorld(c, c.x, 2.4, 0.05); return { pos: t.clone().addScaledVector(out, 4.0).add(V3(1.9, 2.2, 0)), target: t, needCut: c.bank }; }
    case 'intake': return { pos: V3(6.6, 9.4, 2.6), target: V3(0.2, 3.0, 0) };
    case 'exhaust': return { pos: V3(3.6, 0.6, 10.6), target: V3(-0.6, 0.3, 2.0) };
    case 'left': return { pos: V3(1.2, 6.2, -11.2), target: V3(0, 1.5, -1.0) };
    case 'right': return { pos: V3(1.2, 6.2, 11.2), target: V3(0, 1.5, 1.0) };
    default: return { pos: HOME.pos, target: HOME.target };
  }
}

/* =====================================================================
   PICKING
   ===================================================================== */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function visibleChain(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }
function pickAt(clientX, clientY) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(engine.children, true);
  for (const h of hits) {
    const o = h.object, ud = o.userData;
    if (!o.isMesh || ud.noPick || !ud.part || ud.liner) continue;
    if (!visibleChain(o)) continue;
    if (SHELL_MATS.includes(ud.baseMat) && state.shellOp < 0.5) continue;
    if (state.cut && CLIP_MATS.includes(ud.baseMat) && cutPlane.distanceToPoint(h.point) < 0) continue;
    if (state.solo && ud.cyl && ud.cyl !== state.selCyl) continue;
    return h;
  }
  return null;
}
