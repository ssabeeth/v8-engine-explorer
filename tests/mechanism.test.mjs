// Mechanism checks for src/05_kinematics.js (run: node --test).
// The module is plain script (no imports), so it is evaluated in a sandbox
// and its top-level bindings are exported for the tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('../src/05_kinematics.js', import.meta.url), 'utf8');
const K = {};
vm.createContext(K);
vm.runInContext(
  `${code}
  Object.assign(globalThis, { R, L, COMP_H, DECK, ROOF, MAX_LIFT, VT, FIRING_ORDER, FIRE_AT, CYL, PIN_ANGLES,
    liftProfile, cycleOf, strokeOf, crankState, firingCylinder, mod });`,
  K,
);

const STEP = 0.25; // degrees
const sweep = function* () { for (let th = 0; th < 720; th += STEP) yield th; };

test('cylinders fire in the order 1-8-4-3-6-5-7-2, one every 90°', () => {
  const order = [...K.CYL].sort((a, b) => K.FIRE_AT[a.n] - K.FIRE_AT[b.n]).map((c) => c.n);
  assert.deepEqual(order, [1, 8, 4, 3, 6, 5, 7, 2]);
  const angles = order.map((n) => K.FIRE_AT[n]);
  angles.forEach((a, i) => assert.equal(a, i * 90));
});

test('opposite-bank pairs share a crankpin and the four pins are 90° apart (cross-plane)', () => {
  for (let j = 0; j < 4; j++) assert.equal(K.CYL[2 * j].pinAngle, K.CYL[2 * j + 1].pinAngle);
  const pins = [...K.PIN_ANGLES].sort((a, b) => a - b);
  assert.deepEqual(pins, [45, 135, 225, 315]);
});

test('connecting-rod length is constant through the whole cycle', () => {
  for (const c of K.CYL) for (const th of sweep()) {
    const s = K.crankState(th, c);
    assert.ok(Math.abs(Math.hypot(s.s - s.py, s.pz) - K.L) < 1e-12, `cyl ${c.n} at ${th}°`);
  }
});

test('each piston is at top dead centre when it fires and at bottom dead centre 180° later', () => {
  for (const c of K.CYL) {
    const f = K.FIRE_AT[c.n];
    assert.ok(Math.abs(K.crankState(f, c).s - (K.R + K.L)) < 1e-12);
    assert.ok(Math.abs(K.crankState(f + 360, c).s - (K.R + K.L)) < 1e-12);
    assert.ok(Math.abs(K.crankState(f + 180, c).s - (K.L - K.R)) < 1e-12);
  }
});

test('piston crown is flush with the deck at TDC', () => {
  assert.ok(Math.abs(K.R + K.L + K.COMP_H - K.DECK) < 1e-12);
});

test('valves never touch the piston (clearance > 3 mm at every crank angle)', () => {
  let min = Infinity;
  for (const c of K.CYL) for (const th of sweep()) {
    const cc = K.cycleOf(th, c);
    const crown = K.crankState(th, c).s + K.COMP_H;
    for (const [o, cl] of [[K.VT.ivo, K.VT.ivc], [K.VT.evo, K.VT.evc]]) {
      min = Math.min(min, K.ROOF - K.liftProfile(cc, o, cl) * K.MAX_LIFT - crown);
    }
  }
  assert.ok(min > 0.03, `minimum clearance ${(min * 100).toFixed(1)} mm`); // scene unit = 100 mm
});

test('valves open on the right strokes', () => {
  const lift = (cc, kind) => (kind === 'I' ? K.liftProfile(cc, K.VT.ivo, K.VT.ivc) : K.liftProfile(cc, K.VT.evo, K.VT.evc));
  assert.equal(lift(470, 'I'), 1, 'intake fully open mid intake stroke');
  assert.equal(lift(250, 'E'), 1, 'exhaust fully open mid exhaust stroke');
  for (const cc of [0, 45, 90, 630, 690]) {
    assert.equal(lift(cc, 'I'), 0, `intake shut at ${cc}°`);
    assert.equal(lift(cc, 'E'), 0, `exhaust shut at ${cc}°`);
  }
  assert.ok(lift(360, 'I') > 0 && lift(360, 'E') > 0, 'overlap around exhaust/intake TDC');
});

test('strokes follow power, exhaust, intake, compression from the firing TDC', () => {
  assert.deepEqual([10, 200, 400, 600].map(K.strokeOf), ['POWER', 'EXHAUST', 'INTAKE', 'COMPRESSION']);
});

test('the "firing now" cylinder advances through the firing order every 90°', () => {
  const seen = [];
  for (let th = 0; th < 720; th += 90) seen.push(K.firingCylinder(th + 1));
  assert.deepEqual(seen, [1, 8, 4, 3, 6, 5, 7, 2]);
});
