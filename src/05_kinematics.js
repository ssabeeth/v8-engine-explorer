/* Pure engine kinematics and valve timing: no DOM, no three.js (unit-tested in tests/). */
/* =====================================================================
   ENGINE SPECIFICATION  (scene unit = 100 mm)
   Small-block style 5.7 L: bore 101.6 mm, stroke 88.4 mm, rod 144.8 mm,
   90° V, cross-plane crank, left bank (odd cylinders) forward.
   ===================================================================== */
const DEG = Math.PI / 180;
const R = 0.442;            // crank throw (stroke / 2)
const L = 1.448;            // connecting-rod centre-to-centre
const COMP_H = 0.40;        // wrist-pin centre to crown
const DECK = R + L + COMP_H; // 2.29: crown flush with deck at TDC
const ROOF = 2.34;          // combustion-chamber roof / valve seat plane
const BORE_R = 0.508;
const BORE_SPACING = 1.118;
const CAM_Y = 1.14;         // camshaft centre above crank centre
const ROCKER_RATIO = 1.5;
const VALVE_ARM = 0.24, PUSH_ARM = VALVE_ARM / ROCKER_RATIO;
const MAX_LIFT = 0.115;     // 11.5 mm valve lift
// valve events in cylinder-cycle degrees (0 = compression TDC, i.e. firing)
const VT = { ivo: 340, ivc: 600, evo: 120, evc: 380, spark: 710 };
const FIRING_ORDER = [1, 8, 4, 3, 6, 5, 7, 2];
const FIRE_AT = {};         // crank angle (0..720) at which each cylinder reaches firing TDC
FIRING_ORDER.forEach((c, i) => (FIRE_AT[c] = i * 90));

const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/* Cylinder table. Bank angle beta: left -45°, right +45° (rotation about X).
   Crank rotates clockwise seen from the front: pin world angle = pinAngle - theta.
   A cylinder is at TDC when its pin angle equals its bank angle, so
   pinAngle = beta + FIRE_AT  (this reproduces the classic 90° cross-plane crank). */
const CYL = [];
for (let n = 1; n <= 8; n++) {
  const left = n % 2 === 1;
  const k = Math.floor((n - 1) / 2);            // position along bank, 0 = front
  const xPin = (1.5 - k) * BORE_SPACING;         // crankpin centre (front = +X)
  const beta = left ? -45 : 45;
  const c = {
    n, k, bank: left ? 'L' : 'R', s: left ? -1 : 1, beta,
    xPin, x: xPin + (left ? 0.12 : -0.12),
    pinAngle: mod(beta + FIRE_AT[n], 360),
  };
  // SBC valve order along each bank: E-I-I-E-E-I-I-E (front to back)
  const exFront = k % 2 === 0;
  c.xI = c.x + (exFront ? -0.24 : 0.24);
  c.xE = c.x + (exFront ? 0.24 : -0.24);
  c.xEport = c.x + (exFront ? 0.32 : -0.32);
  CYL.push(c);
}
const PIN_ANGLES = [0, 1, 2, 3].map((j) => CYL[j * 2].pinAngle);

function liftProfile(c, open, close) {
  const t = mod(c - open, 720) / (close - open);
  if (t <= 0 || t >= 1) return 0;
  const s = Math.sin(Math.PI * t);
  return s * s;
}
const cycleOf = (theta, cyl) => mod(theta - FIRE_AT[cyl.n], 720);
function strokeOf(c) {
  if (c < 180) return 'POWER';
  if (c < 360) return 'EXHAUST';
  if (c < 540) return 'INTAKE';
  return 'COMPRESSION';
}
const STROKE_COL = { INTAKE: '#4aa3ff', COMPRESSION: '#9a8cff', POWER: '#ff7a2f', EXHAUST: '#d0493d' };

/* slider-crank: returns bank-local pin position, wrist-pin distance and rod angle */
function crankState(theta, cyl) {
  const pl = (cyl.pinAngle - theta - cyl.beta) * DEG;
  const py = R * Math.cos(pl), pz = R * Math.sin(pl);
  const s = py + Math.sqrt(L * L - pz * pz);
  return { py, pz, s, rodAng: Math.atan2(-pz, s - py) };
}
/* combustion intensity after spark (0..1) */
function combustionOf(c) {
  if (c >= VT.spark) return 0.35 + 0.65 * (c - VT.spark) / (720 - VT.spark);
  if (c < 150) return Math.exp(-c / 38) * (c < 8 ? 1 : 1);
  return 0;
}
/* which cylinder is "firing": ignited within the last 90° window */
function firingCylinder(theta) {
  for (const cy of CYL) {
    const c = cycleOf(theta, cy);
    if (c >= VT.spark || c < VT.spark - 630) return cy.n;
  }
  return 1;
}
