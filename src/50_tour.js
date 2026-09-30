
/* =====================================================================
   CINEMATIC TOUR — one deterministic script used for live presenting
   and for frame-by-frame video capture.
   ===================================================================== */
const TOUR = { active: false, capture: false, t: 0, shot: -1, dur: 70, events: [], alog: [], blend: null, cont: false, thr: null, cm: 0 };
const C1 = CYL[0];
const C1T = bankToWorld(C1, C1.x, 2.0, 0.05), C1OUT = bankToWorld(C1, 0, 0, 1);
const SHOTS = [
  { t0: 0, t1: 8, kick: 'Interactive engineering model', title: 'V8 Engine', sub: '5.7 litre · 90° V · cross‑plane crankshaft',
    setup() { setSolo(false); setTrans(false); setExplode(false); setCut(true, 'R'); },
    from: [V3(14.2, 4.4, 5.4), V3(0.2, 1.0, 0.2)], to: [V3(8.8, 6.0, 12.2), V3(0.1, 1.0, 0.3)] },
  { t0: 8, t1: 17, kick: 'Cross‑section', title: 'Pistons in a 90° V', sub: 'Opposite cylinders share one crankpin, 90° apart in the cycle',
    setup() { setCut(true, 'X'); },
    from: [V3(16.0, 3.0, 3.8), V3(1.4, 1.35, 0)], to: [V3(15.4, 1.9, -3.6), V3(1.4, 1.25, 0)] },
  { t0: 17, t1: 35, kick: 'Cylinder 1 · four‑stroke cycle', title: '', sub: '', strokeShot: true,
    setup() { selectCyl(1); setSolo(true); setCut(true, 'L'); },
    theta: (t) => FIRE_AT[1] + 360 + 40 * (t - 17),
    from: [C1T.clone().addScaledVector(C1OUT, 9.2).add(V3(4.2, 3.4, 0)), C1T.clone().add(V3(-0.4, 0.2, 0))], to: [C1T.clone().addScaledVector(C1OUT, 7.8).add(V3(2.6, 2.8, 0)), C1T.clone().add(V3(-0.2, 0.3, 0))] },
  { t0: 35, t1: 44, kick: 'Firing order 1‑8‑4‑3‑6‑5‑7‑2', title: 'One power stroke every 90°', sub: 'Eight cylinders, two crank revolutions per complete cycle',
    setup() { setSolo(false); setCut(false); state.opacity = 0.14; setTrans(true); },
    from: [V3(8.0, 7.6, 12.8), V3(-0.3, 0.9, 0)], to: [V3(-5.6, 7.2, 13.4), V3(0.3, 0.9, 0)] },
  { t0: 44, t1: 53, kick: 'Exploded view', title: 'Every part, still moving', sub: 'Block, heads, valvetrain, rotating assembly and manifolds',
    setup() { setTrans(false); state.explodeDist = 1; setExplode(true); },
    from: [V3(20.5, 10.0, 18.0), V3(0, 1.7, 0)], to: [V3(24.0, 10.5, -12.5), V3(0, 1.7, 0)] },
  { t0: 53, t1: 61, kick: 'Sound · real Ferrari V8 recordings', title: 'Free rev to 8,000 rpm', sub: 'Recorded 458 and F430 loops matched to the crank speed: off the limiter and back to idle', rev: true,
    setup() { setExplode(false); setTrans(false); setCut(true, 'R'); },
    from: [V3(8.4, 2.6, 9.4), V3(0.3, 1.0, 0.3)], to: [V3(6.9, 2.1, 8.0), V3(0.3, 1.1, 0.3)] },
  { t0: 61, t1: 70, kick: 'V8 Engine Explorer', title: 'Explore it live', sub: 'Rotate, cut away, explode and step through every stroke in the browser',
    setup() { setCut(true, 'R'); },
    from: [V3(9.2, 5.4, 10.8), V3(0.1, 1.0, 0.3)], to: [V3(11.4, 6.3, 13.0), V3(0.1, 1.0, 0.3)] },
];
const STROKE_TXT = [
  ['INTAKE', 'Intake', 'Piston falls, intake valve open: the air‑fuel charge is drawn in'],
  ['COMPRESSION', 'Compression', 'Both valves shut: the rising piston squeezes the charge'],
  ['POWER', 'Ignition & power', 'Spark at 10° BTDC: burning gas drives the piston down'],
  ['EXHAUST', 'Exhaust', 'Exhaust valve open: the piston pushes spent gas into the header'],
];

/* overlay canvas (captions + mini HUD), shared by live mode and capture */
const ov = document.createElement('canvas');
ov.id = 'overlay';
document.body.appendChild(ov);
const og = ov.getContext('2d');
function sizeOverlay(w, h, dpr) {
  ov.width = Math.round(w * dpr); ov.height = Math.round(h * dpr);
  ov.style.width = w + 'px'; ov.style.height = h + 'px';
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function drawOverlay() {
  const W = ov.width, H = ov.height, k = H / 1080, t = TOUR.t;
  og.clearRect(0, 0, W, H);
  const S = SHOTS[TOUR.shot];
  if (!S) return;
  const inA = clamp((t - S.t0 - 0.4) / 0.7, 0, 1), outA = clamp((S.t1 - t - 0.2) / 0.6, 0, 1);
  const a = smooth(Math.min(inA, outA));
  const x0 = 88 * k, yb = H - 120 * k;
  og.textBaseline = 'alphabetic';
  const gr = og.createLinearGradient(0, H * 0.58, 0, H);
  gr.addColorStop(0, 'rgba(4,5,7,0)'); gr.addColorStop(1, `rgba(4,5,7,${0.72 * a})`);
  og.fillStyle = gr; og.fillRect(0, H * 0.58, W, H * 0.42);
  // caption block
  let kick = S.kick, title = S.title, sub = S.sub, sw = null;
  let ca = a;
  if (S.strokeShot) {
    const u = (t - S.t0) / (S.t1 - S.t0), i = Math.min(3, Math.floor(u * 4));
    const lu = u * 4 - i;
    ca = Math.min(a, smooth(clamp(lu / 0.12, 0, 1)), smooth(clamp((1 - lu) / 0.1, 0, 1)) + (i === 3 ? 0 : 0));
    [, title, sub] = STROKE_TXT[i];
    sw = STROKE_COL[STROKE_TXT[i][0]];
    // cycle bar
    const bw = 620 * k, bx = x0, by = yb + 44 * k;
    og.globalAlpha = a;
    STROKE_TXT.forEach(([key, name], j) => {
      const sx = bx + (j * bw) / 4;
      og.fillStyle = STROKE_COL[key] + (j === i ? 'ff' : '44');
      rr(og, sx + 2 * k, by, bw / 4 - 4 * k, 6 * k, 3 * k); og.fill();
      og.fillStyle = j === i ? '#e9ecf0' : 'rgba(233,236,240,.45)';
      og.font = `600 ${15 * k}px Inter, sans-serif`;
      og.fillText(name.toUpperCase(), sx + 2 * k, by + 28 * k);
    });
    og.fillStyle = '#fff';
    rr(og, bx + u * bw - 2 * k, by - 5 * k, 4 * k, 16 * k, 2 * k); og.fill();
  }
  og.globalAlpha = a;
  og.fillStyle = '#6cb6ff';
  og.font = `600 ${17 * k}px Inter, sans-serif`;
  og.fillText(kick.toUpperCase().split('').join(String.fromCharCode(8202)), x0, yb - 92 * k);
  og.globalAlpha = ca;
  if (sw) { og.fillStyle = sw; rr(og, x0, yb - 72 * k, 14 * k, 14 * k, 3 * k); og.fill(); }
  og.fillStyle = '#f2f4f7';
  og.font = `600 ${58 * k}px Inter, sans-serif`;
  og.fillText(title, x0 + (sw ? 28 * k : 0), yb - 20 * k + (sw ? -8 * k : 0) + (sw ? 8 * k : 0) - (sw ? 0 : 0) - 0);
  og.fillStyle = 'rgba(214,220,228,.82)';
  og.font = `400 ${25 * k}px Inter, sans-serif`;
  og.fillText(sub, x0, yb + 20 * k);
  // mini HUD
  og.globalAlpha = 1;
  const HW = 460 * k, hx = W - 88 * k - HW, hy = 70 * k;
  og.fillStyle = 'rgba(12,14,18,.58)';
  rr(og, hx, hy, HW, 150 * k, 14 * k); og.fill();
  og.strokeStyle = 'rgba(255,255,255,.08)'; og.lineWidth = k; og.stroke();
  og.font = `500 ${13 * k}px "JetBrains Mono", monospace`;
  og.fillStyle = 'rgba(139,147,158,1)';
  og.fillText('RPM', hx + 22 * k, hy + 32 * k);
  og.fillText('CRANK', hx + 190 * k, hy + 32 * k);
  og.fillText('FIRING', hx + 330 * k, hy + 32 * k);
  og.font = `600 ${24 * k}px "JetBrains Mono", monospace`;
  og.fillStyle = state.rpm > 7500 ? '#ff5a3c' : '#e9ecf0';
  og.fillText(String(state.rpm).padStart(4, ' '), hx + 62 * k, hy + 34 * k);
  og.fillStyle = '#e9ecf0';
  og.fillText(`${mod(state.theta, 720).toFixed(0).padStart(3, ' ')}°`, hx + 244 * k, hy + 34 * k);
  og.fillStyle = '#ff9a5c';
  og.fillText(String(live.firing), hx + 400 * k, hy + 34 * k);
  // tach bar 0–9000 with redline from 8000
  const tx = hx + 22 * k, tw = HW - 44 * k, ty = hy + 50 * k;
  og.fillStyle = 'rgba(255,255,255,.07)'; rr(og, tx, ty, tw, 8 * k, 4 * k); og.fill();
  og.fillStyle = 'rgba(255,70,50,.35)'; rr(og, tx + tw * (8000 / 9000), ty, tw * (1000 / 9000), 8 * k, 4 * k); og.fill();
  const tg = og.createLinearGradient(tx, 0, tx + tw, 0);
  tg.addColorStop(0, '#6cb6ff'); tg.addColorStop(0.7, '#ffb04a'); tg.addColorStop(0.9, '#ff4a32');
  og.fillStyle = tg; rr(og, tx, ty, Math.max(8 * k, tw * clamp(state.rpm / 9000, 0, 1)), 8 * k, 4 * k); og.fill();
  const cw = (HW / k - 44) / 8;
  FIRING_ORDER.forEach((n, i) => {
    const cx = hx + 22 * k + i * cw * k, hot = n === live.firing;
    og.fillStyle = hot ? '#ff7a2f' : 'rgba(255,255,255,.06)';
    rr(og, cx, hy + 76 * k, (cw - 5) * k, 34 * k, 7 * k); og.fill();
    og.fillStyle = hot ? '#1a0b02' : 'rgba(170,178,188,1)';
    og.font = `600 ${16 * k}px "JetBrains Mono", monospace`;
    og.textAlign = 'center';
    og.fillText(String(n), cx + ((cw - 5) * k) / 2, hy + 99 * k);
    og.textAlign = 'left';
  });
  og.font = `500 ${12 * k}px Inter, sans-serif`;
  og.fillStyle = 'rgba(139,147,158,.9)';
  og.fillText('FIRING ORDER', hx + 22 * k, hy + 132 * k);
  if (S.rev || TOUR.shot === SHOTS.length - 1) {
    og.globalAlpha = a * 0.8;
    og.fillStyle = 'rgba(170,178,188,1)';
    og.font = `400 ${14 * k}px Inter, sans-serif`;
    og.textAlign = 'right';
    og.fillText('Engine sound: “Ferrari 458 Italia” and “Ferrari F430 (2010)” by Edvvc, Wikimedia Commons, CC BY‑SA 3.0 (trimmed, looped, pitch‑matched)', W - 88 * k, H - 48 * k);
    og.textAlign = 'left';
    og.globalAlpha = 1;
  }
  // fades
  const fade = Math.max(clamp(1 - t / 1.0, 0, 1), clamp((t - (TOUR.dur - 1.4)) / 1.4, 0, 1));
  if (fade > 0) { og.fillStyle = `rgba(0,0,0,${smooth(fade)})`; og.fillRect(0, 0, W, H); }
}

function tourTick(dt) {
  TOUR.t += dt;
  const t = TOUR.t;
  let i = SHOTS.findIndex((s) => t >= s.t0 && t < s.t1);
  if (i < 0) i = SHOTS.length - 1;
  if (i !== TOUR.shot) {
    TOUR.blend = TOUR.shot >= 0 ? { pos: camera.position.clone(), target: controls.target.clone(), t0: t } : null;
    TOUR.shot = i;
    SHOTS[i].setup();
  }
  const S = SHOTS[i];
  // crank
  let rpm = 900, thr = 0.3;
  const cont = !!S.rev && t - S.t0 > 0.6;
  if (S.rev) { const p = t - S.t0 >= 1.3 ? revProfile(t - S.t0 - 1.3, 900) : null; if (p) { rpm = p.rpm; thr = p.thr; } }
  TOUR.cont = cont; TOUR.thr = cont ? thr : null;
  TOUR.cm += ((cont ? 1 : 0) - TOUR.cm) * Math.min(1, dt * 8);
  if (Math.round(rpm / 10) * 10 !== state.rpm) setRpm(Math.round(rpm / 10) * 10);
  TOUR.alog.push({ t, rpm, thr, cont: TOUR.cm });
  const prev = state.theta;
  if (S.theta) state.theta = S.theta(t);
  else state.theta += (rpm / 60) * 360 * 0.05 * dt;
  const d = state.theta - prev;
  if (d > 0 && d < 200 && TOUR.cm < 0.98) {
    for (const n of FIRING_ORDER) {
      const a = FIRE_AT[n], x = a + 720 * Math.ceil((prev - a + 1e-9) / 720);
      if (x > prev && x <= state.theta) TOUR.events.push({ t: t - (state.theta - x) / (d / dt), n, g: (1 - TOUR.cm) * (state.solo && n !== state.selCyl ? 0.22 : 1) });
    }
  }
  // camera
  const u = smooth(clamp((t - S.t0) / (S.t1 - S.t0), 0, 1));
  const pos = S.from[0].clone().lerp(S.to[0], u), tgt = S.from[1].clone().lerp(S.to[1], u);
  if (TOUR.blend) {
    const b = smooth(clamp((t - TOUR.blend.t0) / 1.2, 0, 1));
    pos.lerpVectors(TOUR.blend.pos, pos, b);
    tgt.lerpVectors(TOUR.blend.target, tgt, b);
  }
  camera.position.copy(pos);
  controls.target.copy(tgt);
  camera.lookAt(tgt);
  if (t >= TOUR.dur && !TOUR.capture) stopTour();
}

/* ---------------- live presentation ---------------- */
function startTour(capture = false) {
  if (state.learning) stopLearning();
  TOUR.saved = { cut: state.cut, cutMode: state.cutMode, cutPos: state.cutPos, trans: state.trans, opacity: state.opacity, explode: state.explode, explodeDist: state.explodeDist, solo: state.solo, selCyl: state.selCyl, labels: state.sys.labels, playing: state.playing, pos: camera.position.clone(), target: controls.target.clone() };
  Object.assign(TOUR, { active: true, capture, t: 0, shot: -1, events: [], alog: [], blend: null, cont: false, thr: null, cm: 0 });
  TOUR.saved.rpm = state.rpm; TOUR.saved.slow = state.slow;
  setSlow(true);
  selectPart(null);
  setSys('labels', false);
  controls.enabled = false;
  tween = null;
  document.body.classList.add('presenting');
  if (!capture) sizeOverlay(innerWidth, innerHeight, Math.min(devicePixelRatio, 2));
  $('btnPresent').textContent = '■ Stop tour';
}
function stopTour() {
  if (!TOUR.active) return;
  const S = TOUR.saved;
  TOUR.active = false;
  document.body.classList.remove('presenting');
  og.clearRect(0, 0, ov.width, ov.height);
  controls.enabled = true;
  state.cutPos = S.cutPos; $('cutPos').value = S.cutPos;
  setCut(S.cut, S.cutMode);
  state.opacity = S.opacity; setTrans(S.trans);
  state.explodeDist = S.explodeDist; setExplode(S.explode);
  setSolo(S.solo); selectCyl(S.selCyl || 1);
  setSys('labels', S.labels);
  setPlaying(S.playing);
  setRpm(S.rpm); setSlow(S.slow);
  TOUR.cont = false; TOUR.thr = null;
  flyTo(S.pos, S.target, 1.0);
  $('btnPresent').textContent = '▶ Present cinematic tour';
}
$('btnPresent').onclick = () => (TOUR.active ? stopTour() : startTour());
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.toLowerCase() === 'p') TOUR.active ? stopTour() : startTour();
  else if (e.key === 'Escape' && TOUR.active) stopTour();
});
addEventListener('resize', () => { if (TOUR.active && !TOUR.capture) sizeOverlay(innerWidth, innerHeight, Math.min(devicePixelRatio, 2)); });

/* ---------------- deterministic capture API (used to render the MP4) ---------------- */
const CAP = { w: 1920, h: 1080, comp: null };
window.__v8.capture = {
  begin(w = 1920, h = 1080, quality = 'high') {
    renderer.setAnimationLoop(null);
    setQuality(quality);
    CAP.w = w; CAP.h = h;
    renderer.setPixelRatio(1);
    renderer.setSize(w, h);
    if (composer) { composer.setPixelRatio(1); composer.setSize(w, h); }
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pMat.uniforms.uScale.value = h / (2 * Math.tan((camera.fov * DEG) / 2));
    sizeOverlay(w, h, 1);
    CAP.comp = document.createElement('canvas');
    CAP.comp.width = w; CAP.comp.height = h;
    state.theta = 0;
    startTour(true);
    return TOUR.dur;
  },
  async frame(dt) {
    frame(0, dt);
    const g = CAP.comp.getContext('2d');
    g.drawImage(renderer.domElement, 0, 0, CAP.w, CAP.h);
    g.drawImage(ov, 0, 0, CAP.w, CAP.h);
    return CAP.comp.toDataURL('image/jpeg', 0.94);
  },
  events: () => TOUR.events,
  alog: () => TOUR.alog,
  audio: async (profile) => { const ab = await renderTourAudio(profile); let bin = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return 'data:audio/wav;base64,' + btoa(bin); },
  t: () => TOUR.t,
};
