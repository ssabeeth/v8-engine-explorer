
/* =====================================================================
   ENGINE CONSTRUCTION
   ===================================================================== */
Part.prototype.geos = function () {
  const out = [];
  for (const [mat, list] of this.map) {
    const g = list.length === 1 ? list[0] : mergeGeometries(list, false);
    g.computeBoundingSphere();
    out.push({ g, mat });
  }
  return out;
};
function inst(geos, parent, ud, shadows = true) {
  const grp = new THREE.Group();
  for (const { g, mat } of geos) {
    const m = new THREE.Mesh(g, mat);
    m.castShadow = shadows;
    m.receiveShadow = true;
    grp.add(m);
  }
  parent.add(grp);
  reg(grp, ud);
  return grp;
}
function bankBox(s, x0, x1, y0, y1, zo0, zo1, r = 0.03, seg = 3) {
  const a = zo0 * s, b = zo1 * s;
  return rboxMM(x0, x1, y0, y1, Math.min(a, b), Math.max(a, b), r, seg);
}
function colored(g, rgb) {
  g = norm(g);
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set(rgb, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const qFromY = (dir) => new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
/* place a Y-aligned geometry between two points */
function between(g, a, b) {
  const d = b.clone().sub(a);
  const len = d.length();
  g.scale(1, len, 1).translate(0, len / 2, 0);
  g.applyQuaternion(qFromY(d));
  return g.translate(a.x, a.y, a.z);
}

/* ---------------- groups ---------------- */
const engine = new THREE.Group();
scene.add(engine);
const G = {
  block: new THREE.Group(), pan: new THREE.Group(), front: new THREE.Group(), rot: new THREE.Group(),
  crank: new THREE.Group(), fly: new THREE.Group(), cam: new THREE.Group(), intake: new THREE.Group(), chain: new THREE.Group(),
  bank: {}, head: {}, cover: {}, push: {}, rotBank: {}, ex: {},
};
engine.add(G.block, G.pan, G.front, G.rot, G.fly, G.cam, G.intake, G.chain);
G.rot.add(G.crank);
for (const b of ['L', 'R']) {
  const s = b === 'L' ? -1 : 1;
  G.bank[b] = new THREE.Group();
  G.bank[b].rotation.x = s * 45 * DEG;
  G.head[b] = new THREE.Group();
  G.cover[b] = new THREE.Group();
  G.push[b] = new THREE.Group();
  G.bank[b].add(G.head[b], G.cover[b], G.push[b]);
  engine.add(G.bank[b]);
  G.rotBank[b] = new THREE.Group();
  G.rotBank[b].rotation.x = s * 45 * DEG;
  G.rot.add(G.rotBank[b]);
  G.ex[b] = new THREE.Group();
  engine.add(G.ex[b]);
}
G.cam.position.set(0, CAM_Y, 0);

/* ---------------- block ---------------- */
function buildBlock() {
  const p = new Part();
  const cc = new THREE.Shape();
  [[-1.05, -0.75], [1.05, -0.75], [1.15, 0.25], [0.674, 1.55], [-0.674, 1.55], [-1.15, 0.25]].forEach(([u, v], i) => (i ? cc.lineTo(u, v) : cc.moveTo(u, v)));
  cc.closePath();
  p.add(extrudeX(cc, 4.98, 0.04), MAT.block);
  // pan rail
  p.add(rboxMM(-2.52, 2.52, -0.8, -0.71, -1.13, 1.13, 0.02), MAT.block);
  // valley cover with ribs
  p.add(rboxMM(-2.15, 2.15, 1.53, 1.6, -0.44, 0.44, 0.025), MAT.block);
  for (let i = 0; i < 7; i++) p.add(rboxMM(-1.8 + i * 0.6 - 0.03, -1.8 + i * 0.6 + 0.03, 1.59, 1.64, -0.36, 0.36, 0.012), MAT.block);
  // bellhousing flange
  const bh = new THREE.Shape();
  [[-1.3, -0.78], [1.3, -0.78], [1.62, 0.2], [1.95, 1.2], [1.35, 1.9], [0.55, 1.75], [-0.55, 1.75], [-1.35, 1.9], [-1.95, 1.2], [-1.62, 0.2]].forEach(([u, v], i) => (i ? bh.lineTo(u, v) : bh.moveTo(u, v)));
  bh.closePath();
  bh.holes.push(holePath(0.5, 0, 0));
  p.add(extrudeX(bh, 0.05, 0.012).translate(-2.555, 0, 0), MAT.block);
  const boltList = [];
  for (const s of [-1, 1]) {
    const bm = bankMatrix(s);
    const add = (g) => p.add(g.applyMatrix4(bm), MAT.block);
    add(rboxMM(-2.49, 2.49, 1.0, DECK, -0.62, 0.62, 0.05));
    // deck lip
    add(bankBox(s, -2.5, 2.5, DECK - 0.07, DECK, -0.66, 0.66, 0.02));
    for (const c of CYL.filter((c) => c.s === s)) {
      add(cylY(0.6, 0.6, DECK - 0.1 - 1.08, 40).translate(c.x, (DECK - 0.1 + 1.08) / 2, 0.1 * s));
      if (c.k < 3) {
        // freeze plug between barrels
        add(cylY(0.1, 0.1, 0.05, 28).rotateX(Math.PI / 2).translate(c.x - 0.559, 1.42, 0.63 * s));
        add(cylY(0.075, 0.075, 0.06, 28).rotateX(Math.PI / 2).translate(c.x - 0.559, 1.42, 0.645 * s));
      }
      // head-bolt bosses along outboard deck edge
      boltList.push([bankToWorld(s, c.x - 0.45, DECK - 0.18, 0.69), bankToWorld(s, 0, 0, 1).normalize()]);
    }
  }
  const out = p.build(G.block, { part: 'block', type: 'block', sys: 'block' });
  // pan rail bolts
  const rail = [];
  for (let i = 0; i < 12; i++) for (const s of [-1, 1]) rail.push([V3(-2.3 + i * 0.418, -0.71, 1.07 * s), V3(0, 1, 0)]);
  bolts(G.block, rail, { part: 'block', type: 'block', sys: 'block' }, 0.9);
  // cylinder liners (only visible in cutaway/transparent modes)
  const lp = new Part();
  for (const c of CYL) lp.add(cylY(BORE_R, BORE_R, DECK - 1.0, 48, true).translate(c.x, (DECK + 1.0) / 2, 0).applyMatrix4(bankMatrix(c.s)), MAT.liner);
  const liners = lp.build(G.block, { part: 'block', type: 'block', sys: 'block', liner: true }, false);
  return { out, liners };
}

/* ---------------- oil pan + filter ---------------- */
function buildPan() {
  const p = new Part();
  const ps = new THREE.Shape();
  [[2.45, -0.8], [2.45, -1.03], [0.74, -1.08], [0.44, -1.66], [-2.18, -1.72], [-2.45, -1.46], [-2.45, -0.8]].forEach(([x, y], i) => (i ? ps.lineTo(x, y) : ps.moveTo(x, y)));
  ps.closePath();
  p.add(extrude(ps, 1.86, 0.05), MAT.pan);
  p.add(rboxMM(-2.52, 2.52, -0.86, -0.8, -1.12, 1.12, 0.015), MAT.pan);
  for (let i = 0; i < 5; i++) p.add(rboxMM(-2.0 + i * 0.52 - 0.025, -2.0 + i * 0.52 + 0.025, -1.79, -1.7, -0.8, 0.8, 0.012), MAT.pan);
  p.add(cylY(0.07, 0.07, 0.06, 6).translate(-1.2, -1.8, 0.4), MAT.bolt);
  p.build(G.pan, { part: 'pan', type: 'pan', sys: 'block' });
  // oil filter on the left side of the sump
  const f = new Part();
  const prof = [[0, 0], [0.21, 0], [0.245, 0.03], [0.245, 0.42], [0.225, 0.46], [0.06, 0.475], [0, 0.475]];
  f.add(lathe(prof, 48).rotateX(-Math.PI / 2).translate(-1.05, -1.33, -0.98), MAT.filter);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    f.add(rboxMM(-0.012, 0.012, -0.03, 0.03, 0, 0.09, 0.005).translate(0, 0, 0).applyMatrix4(M(-1.05 + Math.cos(a) * 0.245, -1.33 + Math.sin(a) * 0.245, -1.38, 0, 0, a)), MAT.filter);
  }
  f.add(cylY(0.22, 0.22, 0.07, 32).rotateX(Math.PI / 2).translate(-1.05, -1.33, -0.97), MAT.pan);
  f.build(G.pan, { part: 'oilFilter', type: 'oilFilter', sys: 'block' });
}

/* ---------------- crankshaft ---------------- */
function webShape() {
  const s = new THREE.Shape();
  const pr = 0.33, cw = 0.66;
  s.moveTo(pr, R);
  s.absarc(0, R, pr, 0, Math.PI, false);
  s.lineTo(cw * Math.cos(200 * DEG), cw * Math.sin(200 * DEG));
  s.absarc(0, 0, cw, 200 * DEG, 340 * DEG, false);
  s.lineTo(pr, R);
  return s;
}
function buildCrank() {
  const p = new Part();
  for (const x of [2.236, 1.118, 0, -1.118, -2.236]) p.add(cylX(0.29, 0.212, 48), MAT.journal, M(x));
  const web = webShape();
  for (let j = 0; j < 4; j++) {
    const a = PIN_ANGLES[j] * DEG, xp = (1.5 - j) * BORE_SPACING;
    p.add(cylX(0.26, 0.46, 48), MAT.journal, M(xp, R * Math.cos(a), R * Math.sin(a)));
    for (const side of [1, -1]) {
      p.add(extrudeX(web, 0.19, 0.022, 36), MAT.crank, M(xp + side * 0.342, 0, 0, a));
      // oil drilling
      p.add(cylX(0.035, 0.012, 12), MAT.steelDark, M(xp + side * 0.232, R * Math.cos(a) + 0.12 * Math.cos(a + 1), R * Math.sin(a) + 0.12 * Math.sin(a + 1)));
    }
  }
  p.add(cylX(0.2, 0.78, 32), MAT.journal, M(2.73));      // snout
  p.add(cylX(0.3, 0.2, 40), MAT.journal, M(-2.43));      // rear seal surface
  p.add(cylX(0.44, 0.07, 40), MAT.crank, M(-2.595));     // flywheel flange
  // timing sprocket
  p.add(extrudeX(gearShape(0.27, 0.31, 20, [holePath(0.2)]), 0.055, 0.006, 8), MAT.steelDark, M(2.585));
  p.build(G.crank, { part: 'crank', type: 'crank', sys: 'crankshaft' });
  const fb = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; fb.push([V3(-2.64, Math.cos(a) * 0.3, Math.sin(a) * 0.3), V3(-1, 0, 0)]); }
  bolts(G.crank, fb, { part: 'crank', type: 'crank', sys: 'crankshaft' }, 1.2);

  // harmonic balancer (crank pulley)
  const b = new Part();
  const prof = [[0.0, 2.84], [0.22, 2.84], [0.24, 2.86], [0.34, 2.86], [0.35, 2.845], [0.52, 2.845], [0.535, 2.865], [0.535, 3.02], [0.52, 3.04]];
  for (let i = 0; i < 5; i++) { prof.push([0.475, 3.045 + i * 0.024], [0.5, 3.057 + i * 0.024]); }
  prof.push([0.5, 3.17], [0.2, 3.17], [0.2, 3.19], [0.0, 3.19]);
  b.add(latheX(prof, 72), MAT.balancer);
  b.add(new THREE.RingGeometry(0.345, 0.365, 64).rotateY(Math.PI / 2).translate(3.041, 0, 0), MAT.rubber);
  b.add(rboxMM(3.0, 3.045, 0.44, 0.53, -0.012, 0.012, 0.004), MAT.mark);     // timing mark
  b.add(cylX(0.08, 0.06, 6), MAT.bolt, M(3.215));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; b.add(cylX(0.035, 0.02, 16), MAT.steelDark, M(3.195, Math.cos(a) * 0.15, Math.sin(a) * 0.15)); }
  b.build(G.crank, { part: 'balancer', type: 'balancer', sys: 'crankshaft' });
}

/* ---------------- flywheel ---------------- */
function buildFlywheel() {
  const p = new Part();
  const disc = circleShape(1.42);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; disc.holes.push(holePath(0.1, Math.cos(a) * 0.98, Math.sin(a) * 0.98)); }
  disc.holes.push(holePath(0.2));
  p.add(extrudeX(disc, 0.075, 0.012, 48), MAT.flywheel, M(-2.7));
  p.add(latheX([[0.19, -2.62], [0.46, -2.62], [0.48, -2.64], [0.48, -2.68], [0.19, -2.68]], 48), MAT.flywheel);
  p.add(new THREE.RingGeometry(0.62, 1.3, 96).rotateY(-Math.PI / 2).translate(-2.7455, 0, 0), MAT.journal);
  p.add(extrudeX(gearShape(1.415, 1.52, 128, [holePath(1.39)]), 0.07, 0.004, 4), MAT.steelDark, M(-2.705));
  p.add(cylX(0.06, 0.01, 20), MAT.mark, M(-2.75, 1.12, 0));
  p.build(G.fly, { part: 'flywheel', type: 'flywheel', sys: 'flywheel' });
  const fb = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; fb.push([V3(-2.745, Math.cos(a) * 0.36, Math.sin(a) * 0.36), V3(-1, 0, 0)]); }
  bolts(G.fly, fb, { part: 'flywheel', type: 'flywheel', sys: 'flywheel' }, 1.3);
}

/* ---------------- camshaft + timing drive ---------------- */
const LOBE_RB = 0.19, LOBE_H = MAX_LIFT / ROCKER_RATIO, LOBE_HALF = ((VT.ivc - VT.ivo) / 4) * DEG;
function lobeShape() {
  const s = new THREE.Shape();
  const n = 120;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = a > Math.PI ? a - Math.PI * 2 : a;
    const lift = Math.abs(d) < LOBE_HALF ? LOBE_H * Math.cos((Math.PI / 2) * (d / LOBE_HALF)) ** 2 : 0;
    const r = LOBE_RB + lift;
    i ? s.lineTo(r * Math.sin(a), r * Math.cos(a)) : s.moveTo(r * Math.sin(a), r * Math.cos(a));
  }
  s.closePath();
  return s;
}
function buildCam() {
  const p = new Part();
  p.add(cylX(0.13, 5.0, 24), MAT.cam, M(0.1));
  for (const x of [2.25, 1.118, 0, -1.118, -2.25]) p.add(cylX(0.235, 0.13, 40), MAT.camLobe, M(x));
  const ls = lobeShape();
  for (const c of CYL) {
    for (const [xv, peak] of [[c.xI, (VT.ivo + VT.ivc) / 2], [c.xE, (VT.evo + VT.evc) / 2]]) {
      const gamma = (c.beta + (FIRE_AT[c.n] + peak) / 2) * DEG;
      p.add(extrudeX(ls, 0.12, 0.008, 4), MAT.camLobe, M(xv, 0, 0, gamma));
    }
  }
  const holes = [holePath(0.13)];
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; holes.push(holePath(0.1, Math.cos(a) * 0.36, Math.sin(a) * 0.36)); }
  p.add(extrudeX(gearShape(0.56, 0.6, 40, holes), 0.05, 0.006, 8), MAT.steelDark, M(2.585));
  p.add(cylX(0.1, 0.05, 6), MAT.bolt, M(2.635));
  p.build(G.cam, { part: 'cam', type: 'cam', sys: 'camshaft' });
}
function beltPath(circles, density = 60) {
  const n = circles.length, tan = [];
  for (let i = 0; i < n; i++) {
    const a = circles[i], b = circles[(i + 1) % n];
    const dx = b.u - a.u, dy = b.v - a.v, D = Math.hypot(dx, dy);
    tan.push(Math.atan2(dy, dx) - Math.acos((a.r - b.r) / D));
  }
  const pts = [];
  for (let i = 0; i < n; i++) {
    const c = circles[i];
    const tIn = tan[(i - 1 + n) % n];
    let d = tan[i] - tIn;
    while (d < 0) d += Math.PI * 2;
    while (d >= Math.PI * 2) d -= Math.PI * 2;
    const steps = Math.max(2, Math.ceil(d * c.r * density));
    for (let j = 0; j <= steps; j++) {
      const a = tIn + (d * j) / steps;
      pts.push({ u: c.u + c.r * Math.cos(a), v: c.v + c.r * Math.sin(a), nu: Math.cos(a), nv: Math.sin(a) });
    }
  }
  return pts;
}
/* closed ribbon in the YZ plane at x, with UVs along its length */
function ribbon(pts, x, width, thick, uvPerUnit = 1) {
  const pos = [], uv = [], idx = [];
  const loop = [...pts, pts[0]];
  const len = [0];
  for (let i = 1; i < loop.length; i++) len.push(len[i - 1] + Math.hypot(loop[i].u - loop[i - 1].u, loop[i].v - loop[i - 1].v));
  const faces = [
    (p) => [[x - width / 2, p.v + (p.nv * thick) / 2, p.u + (p.nu * thick) / 2], [x + width / 2, p.v + (p.nv * thick) / 2, p.u + (p.nu * thick) / 2]],
    (p) => [[x + width / 2, p.v - (p.nv * thick) / 2, p.u - (p.nu * thick) / 2], [x - width / 2, p.v - (p.nv * thick) / 2, p.u - (p.nu * thick) / 2]],
    (p) => [[x + width / 2, p.v + (p.nv * thick) / 2, p.u + (p.nu * thick) / 2], [x + width / 2, p.v - (p.nv * thick) / 2, p.u - (p.nu * thick) / 2]],
    (p) => [[x - width / 2, p.v - (p.nv * thick) / 2, p.u - (p.nu * thick) / 2], [x - width / 2, p.v + (p.nv * thick) / 2, p.u + (p.nu * thick) / 2]],
  ];
  for (const f of faces) {
    const base = pos.length / 3;
    loop.forEach((p, i) => {
      const [a, b] = f(p);
      pos.push(...a, ...b);
      uv.push(len[i] * uvPerUnit, 0, len[i] * uvPerUnit, 1);
    });
    for (let i = 0; i < loop.length - 1; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { g, length: len[len.length - 1] };
}
function buildChain() {
  const path = beltPath([{ u: 0, v: 0, r: 0.315 }, { u: 0, v: CAM_Y, r: 0.605 }], 80);
  const { g, length } = ribbon(path, 2.585, 0.06, 0.03, 1 / 0.16);
  const m = new THREE.Mesh(g, MAT.chain);
  m.castShadow = true;
  G.chain.add(m);
  reg(m, { part: 'chain', type: 'chain', sys: 'camshaft' });
  chainTex.repeat.set(1, 1);
  return length;
}

/* ---------------- pistons + rods (shared geometry) ---------------- */
function pistonGeos() {
  const p = new Part();
  const body = [[0.36, 0.385], [0.4, 0.4], [0.49, 0.4], [0.502, 0.39], [0.502, 0.365], [0.488, 0.365], [0.488, 0.34], [0.502, 0.34], [0.502, 0.325],
    [0.488, 0.325], [0.488, 0.3], [0.502, 0.3], [0.502, 0.285], [0.486, 0.285], [0.486, 0.24], [0.502, 0.24], [0.502, -0.27], [0.49, -0.285], [0.45, -0.285], [0.45, 0.2], [0.001, 0.2]];
  p.add(lathe(body, 64), MAT.piston);
  p.add(lathe([[0.001, 0.387], [0.2, 0.387], [0.362, 0.386], [0.401, 0.401]], 64), MAT.pistonCrown);
  for (const y of [0.3525, 0.3125, 0.2625]) p.add(cylY(0.4985, 0.4985, y === 0.2625 ? 0.04 : 0.02, 64, true).translate(0, y, 0), MAT.ring);
  for (const sx of [-1, 1]) p.add(rboxMM(0.22 * sx - 0.08, 0.22 * sx + 0.08, -0.15, 0.2, -0.16, 0.16, 0.03), MAT.piston);
  p.add(cylX(0.1, 0.8, 32), MAT.journal);
  return p.geos();
}
function rodGeos() {
  const p = new Part();
  const big = circleShape(0.37);
  big.holes.push(holePath(0.262));
  p.add(extrudeX(big, 0.19, 0.012, 48), MAT.rod);
  const small = circleShape(0.15, 0, L);
  small.holes.push(holePath(0.1, 0, L));
  p.add(extrudeX(small, 0.17, 0.01, 40), MAT.rod);
  const web = new THREE.Shape();
  [[-0.17, 0.26], [0.17, 0.26], [0.09, L - 0.12], [-0.09, L - 0.12]].forEach(([u, v], i) => (i ? web.lineTo(u, v) : web.moveTo(u, v)));
  web.closePath();
  p.add(extrudeX(web, 0.06, 0.008), MAT.rod);
  for (const sd of [-1, 1]) {
    const fl = new THREE.Shape();
    [[0.13 * sd, 0.22], [0.22 * sd, 0.22], [0.13 * sd, L - 0.12], [0.075 * sd, L - 0.12]].forEach(([u, v], i) => (i ? fl.lineTo(u, v) : fl.moveTo(u, v)));
    fl.closePath();
    p.add(extrudeX(fl, 0.17, 0.01), MAT.rod);
    p.add(rboxMM(-0.095, 0.095, -0.14, 0.12, 0.3 * sd - 0.07, 0.3 * sd + 0.07, 0.025).translate(0, 0, 0), MAT.rod);
    p.add(cylY(0.034, 0.034, 0.34, 12).translate(0, -0.08, 0.3 * sd), MAT.bolt);
    p.add(cylY(0.055, 0.055, 0.06, 6).translate(0, -0.23, 0.3 * sd), MAT.bolt);
  }
  // cap parting line
  p.add(rboxMM(-0.1, 0.1, -0.006, 0.006, -0.37, 0.37, 0.002), MAT.steelDark);
  return p.geos();
}

/* ---------------- valvetrain shared geometry ---------------- */
function valveGeo(rHead) {
  return norm(lathe([[0, 0], [rHead, 0], [rHead, 0.018], [rHead * 0.9, 0.035], [0.075, 0.12], [0.04, 0.2], [0.04, 1.04], [0.001, 1.045]], 36));
}
const SPRING_GEO = norm(new THREE.TubeGeometry(new Helix(0.085, 5.5), 110, 0.014, 6, false));
const RETAINER_GEO = norm(lathe([[0.04, 0.0], [0.105, 0.0], [0.105, 0.015], [0.07, 0.04], [0.04, 0.04]], 24));
function rockerGeos() {
  const p = new Part();
  p.add(rboxMM(-0.05, 0.05, -0.04, 0.045, -0.19, 0.28, 0.02), MAT.rocker);
  p.add(cylX(0.052, 0.13, 20), MAT.rocker);
  p.add(cylX(0.032, 0.075, 16).translate(0, -0.03, 0.24), MAT.journal);
  p.add(new THREE.SphereGeometry(0.032, 12, 8).translate(0, -0.05, -0.16), MAT.rocker);
  return p.geos();
}
function lifterGeos() {
  const p = new Part();
  p.add(lathe([[0.001, 0.06], [0.08, 0.06], [0.085, 0.08], [0.085, 0.36], [0.07, 0.38], [0.001, 0.38]], 24), MAT.lifter);
  p.add(cylX(0.06, 0.07, 20).translate(0, 0.06, 0), MAT.journal);
  return p.geos();
}
const PUSHROD_GEO = norm(cylY(0.026, 0.026, 1, 10).translate(0, 0.5, 0));
function plugGeos() {
  const p = new Part();
  p.add(cylY(0.012, 0.012, 0.03, 8).translate(0, 0.015, 0), MAT.plugHex);
  p.add(cylY(0.07, 0.07, 0.3, 20).translate(0, 0.18, 0), MAT.steelDark);
  p.add(cylY(0.105, 0.105, 0.08, 6).translate(0, 0.55, 0), MAT.plugHex);
  p.add(lathe([[0.072, 0.59], [0.058, 0.61], [0.058, 0.66], [0.052, 0.69]], 20), MAT.ceramic);
  p.add(lathe([[0.03, 0.66], [0.07, 0.68], [0.082, 0.71], [0.082, 0.9], [0.065, 0.93], [0.035, 0.95]], 20), MAT.wire);
  return p.geos();
}
function coilGeos() {
  const p = new Part();
  p.add(rboxMM(-0.13, 0.13, -0.08, 0.08, -0.15, 0.15, 0.03), MAT.accDark);
  p.add(rboxMM(-0.07, 0.07, 0.07, 0.12, -0.12, 0.02, 0.02), MAT.accDark);
  p.add(cylY(0.045, 0.045, 0.1, 16).rotateX(Math.PI / 2).translate(0, -0.03, 0.19), MAT.accDark);
  return p.geos();
}

/* ---------------- heads, valvetrain, plugs, covers ---------------- */
const cylObjs = [];           // per cylinder animated parts
const PLUG_DIR = (s) => V3(0, 0.2, 0.98 * s).normalize();
const PLUG_TIP_Y = 2.36, PLUG_TIP_ZO = 0.3;
const SPARK_TEX = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,240,200,.9)');
  gr.addColorStop(0.45, 'rgba(255,170,80,.35)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

function buildBankHardware() {
  const PG = pistonGeos(), RG = rodGeos(), RKG = rockerGeos(), LG = lifterGeos(), PLG = plugGeos(), CG = coilGeos();
  const VGI = valveGeo(0.25), VGE = valveGeo(0.2);
  for (const b of ['L', 'R']) {
    const s = b === 'L' ? -1 : 1;
    const cyls = CYL.filter((c) => c.s === s);
    /* head casting */
    const h = new Part();
    h.add(bankBox(s, -2.44, 2.44, 2.3, 3.1, -0.78, 0.8, 0.06), MAT.head);
    h.add(bankBox(s, -2.47, 2.47, 2.284, 2.302, -0.7, 0.72, 0.004), MAT.gasket);
    h.add(bankBox(s, 2.38, 2.52, 2.52, 2.98, -0.48, -0.04, 0.05), MAT.head); // front water outlet boss
    for (const c of cyls) {
      h.add(bankBox(s, c.xI - 0.19, c.xI + 0.19, 2.52, 2.92, -0.9, -0.74, 0.045), MAT.head);
      h.add(bankBox(s, c.xEport - 0.2, c.xEport + 0.2, 2.5, 2.94, 0.74, 0.9, 0.045), MAT.head);
      const d = PLUG_DIR(s), tip = V3(c.x, PLUG_TIP_Y, PLUG_TIP_ZO * s);
      h.add(cylY(0.125, 0.125, 0.3, 24).applyQuaternion(qFromY(d)).translate(...tip.clone().addScaledVector(d, 0.4).toArray()), MAT.head);
      // casting ribs between ports on the outboard face
      h.add(bankBox(s, c.x - 0.03, c.x + 0.03, 2.66, 3.06, 0.78, 0.84, 0.01), MAT.head);
    }
    h.build(G.head[b], { part: 'head-' + b, type: 'head', sys: 'heads' });
    bolts(G.head[b], cyls.flatMap((c) => [-0.559, 0.559].map((dx) => [V3(c.x + dx * 0.5 + (c.k === 3 && dx > 0 ? 0 : 0), 2.4, 0.8 * s), V3(0, 0, s)])), { part: 'head-' + b, type: 'head', sys: 'heads' }, 1.1);

    /* valve cover */
    const cv = new Part();
    cv.add(bankBox(s, -2.36, 2.36, 3.13, 3.72, -0.64, 0.64, 0.11, 4), MAT.cover);
    cv.add(bankBox(s, -2.42, 2.42, 3.1, 3.155, -0.7, 0.7, 0.02), MAT.cover);
    for (const zo of [-0.58, 0.02]) cv.add(bankBox(s, -2.1, 2.1, 3.7, 3.76, zo - 0.025, zo + 0.025, 0.012), MAT.coverFin);
    cv.add(bankBox(s, -0.7, 0.7, 3.7, 3.735, -0.5, -0.1, 0.012), MAT.coverFin);
    const plate = new THREE.PlaneGeometry(1.34, 0.36).rotateX(-Math.PI / 2);
    if (s < 0) plate.rotateY(Math.PI);
    cv.add(plate.translate(0, 3.737, -0.3 * s), MAT.plate);
    if (s < 0) cv.add(cylY(0.13, 0.13, 0.08, 32).translate(1.45, 3.76, -0.3 * s), MAT.accDark);
    else cv.add(cylY(0.06, 0.06, 0.12, 20).rotateZ(Math.PI / 2).translate(-1.6, 3.74, -0.3 * s), MAT.accDark);
    cv.build(G.cover[b], { part: 'cover-' + b, type: 'cover', sys: 'heads' });
    const cb = [];
    for (let i = 0; i < 7; i++) for (const zo of [-0.67, 0.67]) cb.push([bankToLocal(-2.1 + i * 0.7, 3.155, zo, s), V3(0, 1, 0)]);
    bolts(G.cover[b], cb, { part: 'cover-' + b, type: 'cover', sys: 'heads' }, 0.8);
    // coil rail
    const cr = new Part();
    cr.add(bankBox(s, -2.2, 2.2, 3.72, 3.78, 0.2, 0.56, 0.015), MAT.steelDark);
    cr.build(G.cover[b], { part: 'coil-' + cyls[0].n, type: 'coil', sys: 'plugs' });

    for (const c of cyls) {
      const o = { c, valves: [] };
      /* piston + rod */
      o.piston = new THREE.Group();
      o.piston.position.x = c.x;
      G.rotBank[b].add(o.piston);
      inst(PG, o.piston, { part: 'piston-' + c.n, type: 'piston', sys: 'pistons', cyl: c.n });
      o.rod = new THREE.Group();
      o.rod.position.x = c.x;
      G.rotBank[b].add(o.rod);
      inst(RG, o.rod, { part: 'rod-' + c.n, type: 'rod', sys: 'rods', cyl: c.n });
      /* combustion / charge column */
      o.gasMat = new THREE.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      o.gas = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 1, 40, 1, false), o.gasMat);
      o.gas.position.x = c.x;
      o.gas.renderOrder = 5;
      o.gas.userData.noPick = true;
      o.gas.userData.fx = true;
      G.rotBank[b].add(o.gas);
      /* spark */
      o.sparkMat = new THREE.SpriteMaterial({ map: SPARK_TEX, color: 0xffe2a8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      o.spark = new THREE.Sprite(o.sparkMat);
      o.spark.position.set(c.x, PLUG_TIP_Y - 0.01, (PLUG_TIP_ZO - 0.02) * s);
      o.spark.scale.setScalar(0.5);
      o.spark.userData.noPick = true;
      o.spark.userData.fx = true;
      o.spark.renderOrder = 6;
      G.head[b].add(o.spark);
      /* spark plug + lead */
      const d = PLUG_DIR(s), tip = V3(c.x, PLUG_TIP_Y, PLUG_TIP_ZO * s);
      const plug = inst(PLG, G.head[b], { part: 'plug-' + c.n, type: 'plug', sys: 'plugs', cyl: c.n });
      plug.quaternion.copy(qFromY(d));
      plug.position.copy(tip);
      const bootEnd = tip.clone().addScaledVector(d, 0.94);
      const wp = [bootEnd, bankToLocal(c.x, 2.98, 1.3, s), bankToLocal(c.x, 3.52, 1.12, s), bankToLocal(c.x, 3.8, 0.9, s), bankToLocal(c.x, 3.83, 0.63, s)];
      const wire = new Part();
      wire.add(tube(wp, 0.032, 40, 10), MAT.wire);
      wire.build(G.head[b], { part: 'plug-' + c.n, type: 'plug', sys: 'plugs', cyl: c.n });
      /* coil */
      o.coilMat = MAT.accDark.clone();
      o.coilMat.userData = {};
      const coil = inst(CG.map((x) => ({ g: x.g, mat: x.mat === MAT.accDark ? o.coilMat : x.mat })), G.cover[b], { part: 'coil-' + c.n, type: 'coil', sys: 'plugs', cyl: c.n });
      coil.position.copy(bankToLocal(c.x, 3.86, 0.38, s));
      if (s < 0) coil.scale.z = -1;
      /* valves */
      for (const kind of ['I', 'E']) {
        const xv = kind === 'I' ? c.xI : c.xE;
        const v = { kind, xv };
        v.valve = new THREE.Group();
        v.valve.position.set(xv, ROOF, 0);
        G.head[b].add(v.valve);
        inst([{ g: kind === 'I' ? VGI : VGE, mat: kind === 'I' ? MAT.valve : MAT.valveEx }, { g: RETAINER_GEO.clone().translate(0, 1.0, 0), mat: MAT.rocker }], v.valve,
          { part: `valve-${kind}-${c.n}`, type: kind === 'I' ? 'intakeValve' : 'exhaustValve', sys: 'valves', cyl: c.n });
        v.spring = new THREE.Mesh(SPRING_GEO, MAT.spring);
        v.spring.position.set(xv, 3.1, 0);
        v.spring.castShadow = true;
        G.head[b].add(v.spring);
        reg(v.spring, { part: `spring-${kind}-${c.n}`, type: 'spring', sys: 'valves', cyl: c.n });
        // rocker stud (static) + rocker (pivoting)
        const stud = new Part();
        stud.add(cylY(0.03, 0.03, 0.44, 10).translate(xv, 3.1 + 0.22, -0.24 * s), MAT.steelDark);
        stud.add(cylY(0.045, 0.045, 0.05, 6).translate(xv, 3.51, -0.24 * s), MAT.bolt);
        stud.build(G.head[b], { part: `rocker-${kind}-${c.n}`, type: 'rocker', sys: 'valves', cyl: c.n });
        v.rocker = new THREE.Group();
        v.rocker.position.set(xv, 3.44, -0.24 * s);
        if (s < 0) v.rocker.scale.z = -1;
        G.head[b].add(v.rocker);
        inst(RKG, v.rocker, { part: `rocker-${kind}-${c.n}`, type: 'rocker', sys: 'valves', cyl: c.n });
        // lifter + pushrod
        v.lifter = new THREE.Group();
        v.lifter.position.set(xv, CAM_Y * Math.SQRT1_2 + LOBE_RB, -CAM_Y * Math.SQRT1_2 * s);
        G.push[b].add(v.lifter);
        inst(LG, v.lifter, { part: `lifter-${kind}-${c.n}`, type: 'lifter', sys: 'camshaft', cyl: c.n });
        v.pushrod = new THREE.Mesh(PUSHROD_GEO, MAT.pushrod);
        v.pushrod.castShadow = true;
        G.push[b].add(v.pushrod);
        reg(v.pushrod, { part: `pushrod-${kind}-${c.n}`, type: 'pushrod', sys: 'camshaft', cyl: c.n });
        o.valves.push(v);
      }
      cylObjs[c.n] = o;
    }
  }
}
function bankToLocal(x, y, zo, s) { return V3(x, y, zo * s); }

/* ---------------- intake manifold ---------------- */
function buildIntake() {
  const p = new Part();
  p.add(rboxMM(-1.95, 2.05, 3.28, 3.98, -0.47, 0.47, 0.17, 4), MAT.intake);
  for (const zs of [-1, 1]) p.add(rboxMM(-1.7, 1.8, 3.96, 4.03, 0.17 * zs - 0.05, 0.17 * zs + 0.05, 0.02), MAT.intake);
  p.add(rboxMM(-1.2, 1.3, 3.96, 4.0, -0.08, 0.08, 0.02), MAT.coverFin);
  const ib = [];
  for (const c of CYL) {
    const s = c.s, bm = bankMatrix(s);
    const P0 = bankToWorld(c, c.xI, 2.72, -0.9), nI = bankToWorld(c, 0, 0, -1);
    p.add(tube([P0.clone().addScaledVector(nI, -0.02), P0.clone().addScaledVector(nI, 0.28), V3(c.xI, 3.3, 0.66 * s), V3(c.xI, 3.52, 0.3 * s)], 0.155, 40, 18), MAT.intake);
    p.add(bankBox(s, c.xI - 0.21, c.xI + 0.21, 2.49, 2.95, -0.97, -0.89, 0.02).applyMatrix4(bm), MAT.intake);
    for (const dy of [-0.19, 0.19]) ib.push([bankToWorld(c, c.xI + 0.15 * Math.sign(dy), 2.72 + dy, -0.97), nI.clone()]);
  }
  p.build(G.intake, { part: 'intake', type: 'intake', sys: 'intake' });
  bolts(G.intake, ib, { part: 'intake', type: 'intake', sys: 'intake' }, 0.8);
  const tb = [];
  for (let i = 0; i < 5; i++) tb.push([V3(-1.5 + i * 0.75, 4.0, 0.34), V3(0, 1, 0)], [V3(-1.5 + i * 0.75, 4.0, -0.34), V3(0, 1, 0)]);
  bolts(G.intake, tb, { part: 'intake', type: 'intake', sys: 'intake' }, 0.9);

  /* fuel rails + injectors */
  const f = new Part();
  for (const s of [-1, 1]) {
    const railC = bankToWorld(s, 0, 2.98, -1.1);
    f.add(cylX(0.05, 4.2, 16).translate(0.05, railC.y, railC.z), MAT.fuel);
    f.add(cylX(0.065, 0.1, 6).translate(2.2, railC.y, railC.z), MAT.fuel);
    for (const c of CYL.filter((c) => c.s === s)) {
      const A = V3(c.xI, railC.y, railC.z);
      const B = bankToWorld(c, c.xI, 2.72, -0.9).addScaledVector(bankToWorld(c, 0, 0, -1), 0.12);
      f.add(between(cylY(0.036, 0.036, 1, 14), A, B.clone().lerp(A, 0.25)), MAT.fuel);
      f.add(rboxMM(-0.05, 0.05, -0.05, 0.05, -0.05, 0.05, 0.015).translate(A.x, A.y + 0.05, A.z), MAT.accDark);
    }
  }
  f.build(G.intake, { part: 'fuel', type: 'fuel', sys: 'intake' });

  /* throttle body */
  const t = new Part();
  t.add(latheX([[0.34, 2.0], [0.43, 2.0], [0.45, 2.03], [0.45, 2.42], [0.43, 2.45], [0.345, 2.45], [0.34, 2.43], [0.34, 2.0]], 56).translate(0, 3.62, 0), MAT.accAlu);
  t.add(cylX(0.34, 0.01, 40).translate(2.08, 3.62, 0), MAT.throttleDark);
  t.add(rboxMM(2.08, 2.38, 3.32, 3.92, -0.66, -0.43, 0.05), MAT.intake);
  t.add(cylX(0.1, 0.18, 24).translate(2.2, 3.5, -0.6), MAT.intake);
  t.build(G.intake, { part: 'throttle', type: 'throttle', sys: 'intake' });
  const blade = new THREE.Group();
  blade.position.set(2.24, 3.62, 0);
  const bp = new Part();
  bp.add(cylY(0.335, 0.335, 0.012, 48).rotateZ(Math.PI / 2), MAT.accAlu);
  bp.add(cylY(0.02, 0.02, 0.72, 10), MAT.journal);
  bp.build(blade, { part: 'throttle', type: 'throttle', sys: 'intake' });
  G.intake.add(blade);
  return blade;
}

/* ---------------- exhaust headers ---------------- */
const TINT = [[0, [0.88, 0.74, 0.5]], [0.1, [0.74, 0.5, 0.32]], [0.2, [0.55, 0.38, 0.52]], [0.3, [0.4, 0.46, 0.64]], [0.45, [0.7, 0.72, 0.76]], [1, [0.8, 0.81, 0.83]]];
function tintAt(t) {
  for (let i = 1; i < TINT.length; i++) {
    if (t <= TINT[i][0]) {
      const [t0, a] = TINT[i - 1], [t1, b] = TINT[i];
      const k = (t - t0) / (t1 - t0);
      return a.map((v, j) => lerp(v, b[j], k));
    }
  }
  return TINT[TINT.length - 1][1];
}
const HEADER_PATHS = {};
function buildHeaders() {
  const YC = -0.55, ZC = 2.0;
  const LANES = [[-0.2, -0.2], [-0.2, 0.2], [0.2, -0.2], [0.2, 0.2]];
  for (const b of ['L', 'R']) {
    const s = b === 'L' ? -1 : 1;
    const p = new Part();
    const eb = [];
    for (const c of CYL.filter((c) => c.s === s)) {
      const [gy, gz] = LANES[c.k];
      const n = bankToWorld(c, 0, 0, 1);
      const P0 = bankToWorld(c, c.xEport, 2.72, 0.93);
      const laneY = YC + gy, laneZ = (ZC + gz) * s;
      const pts = [P0.clone().addScaledVector(n, -0.04), P0.clone().addScaledVector(n, 0.26), P0.clone().addScaledVector(n, 0.52).add(V3(0, -0.5, 0)),
        V3(c.xEport - 0.15, laneY + 0.38, (ZC + gz) * 1.12 * s)];
      if (c.xEport - 0.6 > -2.2) pts.push(V3(c.xEport - 0.6, laneY, laneZ));
      pts.push(V3(-2.45, laneY, laneZ), V3(-2.74, YC + gy * 0.55, (ZC + gz * 0.55) * s));
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      HEADER_PATHS[c.n] = curve;
      const g = new THREE.TubeGeometry(curve, 90, 0.18, 18, false);
      const uv = g.attributes.uv, col = new Float32Array(uv.count * 3);
      for (let i = 0; i < uv.count; i++) col.set(tintAt(uv.getX(i)), i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      p.add(g, MAT.headerMat);
      for (const dx of [-0.25, 0.25]) eb.push([bankToWorld(c, c.xEport + dx, 2.72 + (dx > 0 ? 0.16 : -0.16), 0.955), n.clone()]);
    }
    p.add(colored(bankBox(s, -2.42, 2.42, 2.48, 2.96, 0.9, 0.955, 0.02).applyMatrix4(bankMatrix(s)), [0.62, 0.6, 0.58]), MAT.headerMat);
    const coll = latheX([[0.41, -2.72], [0.41, -2.86], [0.25, -3.18], [0.21, -3.32], [0.21, -3.4]], 40).translate(0, YC, ZC * s);
    p.add(colored(coll, [0.78, 0.79, 0.81]), MAT.headerMat);
    p.add(colored(tube([V3(-3.38, YC, ZC * s), V3(-3.7, YC - 0.05, ZC * s), V3(-4.05, YC - 0.35, ZC * 0.98 * s)], 0.2, 24, 18), [0.78, 0.79, 0.81]), MAT.headerMat);
    p.add(colored(latheX([[0.2, -0.04], [0.32, -0.04], [0.32, 0.04], [0.2, 0.04]], 32).rotateZ(-0.6).translate(-4.05, YC - 0.35, ZC * 0.98 * s), [0.6, 0.6, 0.6]), MAT.headerMat);
    p.add(colored(cylY(0.06, 0.06, 0.2, 6).translate(-3.05, YC + 0.3, ZC * s), [0.5, 0.5, 0.5]), MAT.headerMat);
    p.build(G.ex[b], { part: 'header-' + b, type: 'header', sys: 'exhaust' });
    bolts(G.ex[b], eb, { part: 'header-' + b, type: 'header', sys: 'exhaust' }, 0.9);
  }
}

/* ---------------- front: timing cover + accessory drive ---------------- */
const PULLEYS = [
  { id: 'crank', u: 0, v: 0, r: 0.5 },
  { id: 'tensioner', u: 0.98, v: 0.48, r: 0.2 },
  { id: 'alternator', u: 1.32, v: 1.6, r: 0.3 },
  { id: 'waterPump', u: 0, v: 1.92, r: 0.42 },
  { id: 'psPump', u: -1.3, v: 1.55, r: 0.34 },
];
const BELT_X = 3.105;
function pulleyGeo(r) {
  const prof = [[0.06, -0.085], [r + 0.03, -0.085], [r, -0.07]];
  for (let i = 0; i < 5; i++) prof.push([r - 0.02, -0.058 + i * 0.026], [r, -0.045 + i * 0.026]);
  prof.push([r, 0.07], [r + 0.03, 0.085], [r * 0.55, 0.085], [r * 0.5, 0.07], [0.06, 0.07]);
  return prof.map(([a, x]) => [a, x + BELT_X]);
}
function buildFront() {
  /* timing cover */
  const tc = new THREE.Shape();
  tc.moveTo(0.8, CAM_Y);
  tc.absarc(0, CAM_Y, 0.8, 0, Math.PI, false);
  tc.lineTo(-0.66, 0);
  tc.absarc(0, 0, 0.66, Math.PI, Math.PI * 2, false);
  tc.lineTo(0.8, CAM_Y);
  tc.holes.push(holePath(0.21));
  const t = new Part();
  t.add(extrudeX(tc, 0.12, 0.035, 48).translate(2.72, 0, 0), MAT.tcover);
  t.add(latheX([[0.21, 2.78], [0.3, 2.78], [0.3, 2.84], [0.21, 2.84]], 40), MAT.tcover);
  t.add(rboxMM(2.79, 2.83, 0.5, 0.64, -0.02, 0.02, 0.008).applyMatrix4(M(0, 0, 0, 0.5)), MAT.mark);
  t.build(G.front, { part: 'timingCover', type: 'timingCover', sys: 'block' });
  const tb = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rr = Math.sin(a) > 0 ? 0.72 : 0.58, cy = Math.sin(a) > 0 ? CAM_Y * 0.9 : 0;
    tb.push([V3(2.815, cy + Math.sin(a) * rr, Math.cos(a) * rr), V3(1, 0, 0)]);
  }
  bolts(G.front, tb, { part: 'timingCover', type: 'timingCover', sys: 'block' }, 0.9);

  const ud = (id) => ({ part: id, type: id, sys: 'accessories' });
  const rot = [];
  /* pulleys (crank pulley is the balancer on the crank) */
  for (const P of PULLEYS) {
    if (P.id === 'crank') continue;
    const g = new THREE.Group();
    g.position.set(0, P.v, P.u);
    const pp = new Part();
    pp.add(latheX(pulleyGeo(P.r), 48), MAT.accAlu);
    const face = circleShape(P.r * 0.52);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; face.holes.push(holePath(P.r * 0.13, Math.cos(a) * P.r * 0.32, Math.sin(a) * P.r * 0.32)); }
    face.holes.push(holePath(0.05));
    pp.add(extrudeX(face, 0.02, 0.005, 20).translate(BELT_X + 0.07, 0, 0), MAT.accAlu);
    pp.add(cylX(0.06, 0.05, 6).translate(BELT_X + 0.1, 0, 0), MAT.bolt);
    pp.build(g, ud(P.id));
    G.front.add(g);
    rot.push({ obj: g, ratio: PULLEYS[0].r / P.r });
  }
  /* belt */
  const belt = ribbon(beltPath(PULLEYS.map((p) => ({ ...p, r: p.r + 0.012 })), 70), BELT_X, 0.15, 0.03, 4).g;
  const bm = new THREE.Mesh(belt, MAT.rubber);
  bm.castShadow = true;
  G.front.add(bm);
  reg(bm, ud('belt'));
  /* water pump */
  const w = new Part();
  w.add(rboxMM(2.8, 3.0, 1.3, 2.3, -0.52, 0.52, 0.13, 4), MAT.accCast);
  w.add(cylX(0.2, 0.12, 32).translate(2.98, 1.92, 0), MAT.accCast);
  w.add(cylX(0.1, 0.12, 20).translate(3.03, 1.92, 0), MAT.journal);
  for (const s of [-1, 1]) {
    w.add(cylX(0.1, 0.16, 24).rotateY(Math.PI / 2 * s * 0.4).translate(2.9, 2.08, 0.5 * s), MAT.accCast);
    w.add(tube([V3(2.9, 2.08, 0.52 * s), V3(2.78, 2.22, 0.95 * s), V3(2.6, 2.2, 1.45 * s), V3(2.49, 2.13, 1.76 * s)], 0.075, 30, 12), MAT.rubber);
    w.add(cylX(0.1, 0.03, 20).translate(2.5, 2.13, 1.76 * s), MAT.bolt);
  }
  w.add(tube([V3(2.95, 2.3, 0), V3(3.05, 2.55, 0.05), V3(3.4, 2.72, 0.1)], 0.09, 20, 12), MAT.rubber);
  w.add(cylX(0.1, 0.05, 20).translate(3.42, 2.73, 0.1), MAT.accCast);
  w.build(G.front, ud('waterPump'));
  /* alternator */
  const a = new Part();
  const altY = PULLEYS[2].v, altZ = PULLEYS[2].u;
  a.add(latheX([[0.001, 2.52], [0.3, 2.52], [0.36, 2.58], [0.37, 2.62], [0.37, 2.9], [0.34, 2.97], [0.14, 3.0], [0.06, 3.02]], 40).translate(0, altY, altZ), MAT.accAlu);
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2;
    a.add(rboxMM(2.66, 2.86, -0.015, 0.015, 0.36, 0.385, 0.006).applyMatrix4(M(0, altY, altZ, ang)), MAT.accCast);
  }
  a.add(rboxMM(2.55, 2.62, altY - 0.05, altY + 0.05, altZ - 0.62, altZ - 0.1, 0.02), MAT.steelDark);
  a.add(cylX(0.06, 0.1, 16).translate(3.04, altY, altZ), MAT.journal);
  a.build(G.front, ud('alternator'));
  /* power-steering pump */
  const ps = new Part();
  const psY = PULLEYS[4].v, psZ = PULLEYS[4].u;
  ps.add(latheX([[0.001, 2.5], [0.28, 2.5], [0.31, 2.55], [0.31, 2.92], [0.26, 2.98], [0.08, 3.0]], 40).translate(0, psY, psZ), MAT.accCast);
  ps.add(cylY(0.19, 0.19, 0.3, 32).translate(2.72, psY + 0.42, psZ), MAT.accDark);
  ps.add(cylY(0.1, 0.1, 0.06, 20).translate(2.72, psY + 0.6, psZ), MAT.accDark);
  ps.add(cylX(0.06, 0.1, 16).translate(3.04, psY, psZ), MAT.journal);
  ps.build(G.front, ud('psPump'));
  /* tensioner */
  const tn = new Part();
  const T = PULLEYS[1];
  tn.add(cylX(0.13, 0.2, 24).translate(2.9, 0.86, 0.7), MAT.accCast);
  tn.add(between(rboxMM(-0.07, 0.07, -0.5, 0.5, -0.035, 0.035, 0.02),V3(2.98, 0.86, 0.7), V3(2.98, T.v, T.u)), MAT.accCast);
  tn.build(G.front, ud('tensioner'));
  return rot;
}
