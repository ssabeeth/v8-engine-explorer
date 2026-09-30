
/* =====================================================================
   COMPONENT KNOWLEDGE
   ===================================================================== */
const INFO = {
  block: ['Cylinder Block', 'The cast-aluminium backbone of the engine. It holds the eight cylinder bores and carries the crankshaft in five main bearings. Coolant and oil run through internal passages.', 'Cylinder heads, crankshaft (main caps), camshaft, oil pan, timing cover, bellhousing.', 'A cracked block or scored bore leaks coolant or oil and loses compression. Usually terminal.'],
  pan: ['Oil Pan', 'The oil reservoir. The pump draws from the deep sump and sends pressurised oil to the bearings and valvetrain.', 'Block pan rail, oil pump pickup, oil filter.', 'A holed pan drains the oil. The bearings then fail within minutes.'],
  oilFilter: ['Oil Filter', 'Traps metal and carbon particles before the oil reaches the bearings.', 'Oil pan / block oil gallery.', 'A clogged filter goes into bypass and dirty oil wears the bearings and cam.'],
  crank: ['Crankshaft', 'Turns the pistons’ up-and-down force into torque. On this cross-plane crank the four crankpins sit 90° apart, so one cylinder fires every 90° of rotation.', 'Connecting rods (two per crankpin), main bearings, flywheel, harmonic balancer, timing chain.', 'Worn bearings drop oil pressure and knock. A cracked crank causes vibration, then catastrophic failure.'],
  balancer: ['Harmonic Balancer', 'A rubber-bonded inertia ring that damps torsional vibration in the crankshaft. It also serves as the main drive pulley. The white line is the timing mark.', 'Crankshaft snout, serpentine belt.', 'If the outer ring separates, vibration can crack the crank or throw the belt.'],
  flywheel: ['Flywheel', 'Stores rotational energy to smooth out the power pulses. Carries the ring gear that the starter engages.', 'Crankshaft rear flange, clutch, starter motor.', 'A cracked flywheel or damaged ring gear causes vibration or a no-start.'],
  cam: ['Camshaft', 'Spins at half crank speed. Its 16 lobes open every intake and exhaust valve through lifters, pushrods and rockers, each at a precise point in the cycle.', 'Timing chain (from the crank), 16 lifters.', 'A worn lobe cuts lift on one valve, causing misfire, lost power and a ticking noise.'],
  chain: ['Timing Chain', 'Drives the camshaft from the crankshaft at exactly 2 : 1. That keeps every valve in step with its piston.', 'Crank sprocket (20 teeth), cam sprocket (40 teeth).', 'A stretched chain retards valve timing. A broken chain stops the engine at once.'],
  piston: ['Piston', 'Seals the cylinder with three rings and turns combustion pressure into force on the connecting rod. Moves down and up once per crank revolution.', 'Connecting rod (via the wrist pin), cylinder wall (via the rings).', 'Worn rings burn oil and lose compression. A holed or seized piston stops the engine.'],
  rod: ['Connecting Rod', 'Links the piston to the crankshaft, turning straight-line motion into rotation.', 'Piston wrist pin (small end), crankpin bearing shared with the opposite bank (big end).', 'A spun bearing causes rod knock. A broken rod can punch through the block.'],
  head: ['Cylinder Head', 'Closes the top of each bank and forms the combustion chambers. Houses the valves, springs, rockers and the intake and exhaust ports.', 'Block (head gasket + bolts), intake manifold, exhaust header, valve cover, spark plugs.', 'A warped head or blown gasket mixes coolant and combustion gas: overheating, white smoke, lost compression.'],
  cover: ['Valve Cover', 'Seals the rocker area so oil stays in. On this engine it also carries the ignition coils.', 'Cylinder head, PCV system, coil rail.', 'A leaking gasket drips oil onto hot exhaust: smoke, smell, fire risk.'],
  coil: ['Ignition Coil', 'Steps 12 V up to tens of thousands of volts and fires it into its plug at the moment of ignition. One coil per cylinder.', 'Engine computer trigger wire, spark plug lead.', 'A dead coil kills the spark on its cylinder, causing a misfire.'],
  plug: ['Spark Plug', 'Fires a high-voltage spark across its gap to ignite the compressed charge. In this model it fires 10° before top dead centre.', 'Cylinder head (threads into the chamber), ignition coil lead.', 'A fouled or worn plug misfires: rough idle, lost power, unburnt fuel in the exhaust.'],
  intakeValve: ['Intake Valve', 'Opens during the intake stroke to let the air-fuel charge in, then seals the chamber for compression and power. The larger of the two valves.', 'Valve seat in the head, valve spring, rocker arm.', 'A bent or burnt valve leaks compression. If it contacts the piston, the damage can be severe.'],
  exhaustValve: ['Exhaust Valve', 'Opens near the end of the power stroke to release spent gas into the header. It runs much hotter than the intake valve.', 'Valve seat in the head, valve spring, rocker arm.', 'A burnt exhaust valve loses compression and causes a persistent misfire.'],
  spring: ['Valve Spring', 'Snaps the valve shut and keeps the valvetrain following the cam profile.', 'Spring seat on the head, retainer on the valve stem.', 'A weak spring lets the valve float at high RPM, and the valve can then strike the piston.'],
  rocker: ['Rocker Arm', 'Pivots on its stud and multiplies the pushrod’s movement 1.5 : 1 to push the valve open.', 'Pushrod, valve stem tip, rocker stud.', 'A loose or broken rocker leaves its valve shut: misfire and loud ticking.'],
  lifter: ['Roller Lifter', 'Rides on its cam lobe and pushes the pushrod up. A hydraulic plunger takes up clearance for quiet running.', 'Cam lobe, pushrod.', 'A collapsed lifter causes ticking and loss of valve lift.'],
  pushrod: ['Pushrod', 'A hollow steel rod that carries the lifter’s motion from the block up to the rocker arm in the head.', 'Lifter (bottom), rocker arm (top).', 'A bent pushrod leaves its valve closed: dead cylinder, loud tick.'],
  intake: ['Intake Manifold', 'Takes air from the throttle body into a central plenum and splits it into eight runners, one per cylinder.', 'Throttle body, head intake ports, fuel injectors.', 'Vacuum leaks upset the air-fuel ratio: lean running, erratic idle.'],
  fuel: ['Fuel Rail & Injectors', 'The rail holds pressurised fuel. Each injector sprays a metered pulse toward its intake valve.', 'Fuel pump line, intake runners, engine computer.', 'Clogged injectors run lean and misfire. Leaking injectors run rich and smoke.'],
  throttle: ['Throttle Body', 'A butterfly valve that meters air into the manifold, and therefore the engine’s power. The blade opens further as you raise the RPM slider.', 'Intake plenum, air-filter duct, electronic throttle motor.', 'A sticking throttle causes an unstable idle or poor response.'],
  header: ['Exhaust Header', 'Four primary tubes per bank carry gas from each port to a collector. Pulse timing helps scavenge the cylinders.', 'Cylinder-head exhaust ports, collector, exhaust system.', 'Cracks or leaking gaskets cause ticking, fumes and sensor errors.'],
  timingCover: ['Timing Cover', 'Encloses the timing chain and sprockets and seals the front of the crankshaft. The pointer lines up with the balancer’s timing mark.', 'Block front face, water pump, crank seal.', 'A leaking cover or seal lets oil out, or coolant in on some designs.'],
  waterPump: ['Water Pump', 'A belt-driven impeller that circulates coolant through the block, the heads and the radiator.', 'Serpentine belt, block water jackets, head outlets, radiator hose.', 'A leak or failed impeller quickly overheats the engine.'],
  alternator: ['Alternator', 'A belt-driven generator that recharges the battery and powers the electrics while the engine runs.', 'Serpentine belt, battery, vehicle wiring.', 'The battery drains, the warning light comes on, and eventually the engine stops.'],
  psPump: ['Power-Steering Pump', 'A belt-driven hydraulic pump that assists steering effort.', 'Serpentine belt, steering rack, reservoir.', 'Heavy steering, a whining noise, fluid leaks.'],
  tensioner: ['Belt Tensioner', 'A spring-loaded arm and pulley that keep the serpentine belt at the correct tension.', 'Serpentine belt, timing cover mount.', 'A weak tensioner lets the belt slip and squeal.'],
  belt: ['Serpentine Belt', 'One ribbed belt that drives every front accessory from the crank pulley.', 'Balancer, water pump, alternator, power-steering pump, tensioner.', 'A snapped belt stops the water pump and alternator: overheating and battery drain.'],
};
const TYPE_KICK = { piston: 'Reciprocating', rod: 'Reciprocating', crank: 'Rotating assembly', flywheel: 'Rotating assembly', balancer: 'Rotating assembly', cam: 'Valvetrain', lifter: 'Valvetrain', pushrod: 'Valvetrain', rocker: 'Valvetrain', intakeValve: 'Valvetrain', exhaustValve: 'Valvetrain', spring: 'Valvetrain', chain: 'Timing drive', plug: 'Ignition', coil: 'Ignition', intake: 'Induction', fuel: 'Induction', throttle: 'Induction', header: 'Exhaust' };

/* =====================================================================
   DOM
   ===================================================================== */
const $ = (id) => document.getElementById(id);
const toastEl = $('toast');
let toastT = 0;
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 1500); }
function rangeFill(el) { const p = ((el.value - el.min) / (el.max - el.min)) * 100; el.style.setProperty('--p', p + '%'); }

/* cylinder labels in 3D */
for (const c of CYL) {
  const el = document.createElement('div');
  el.className = 'cl';
  el.innerHTML = `<span class="n">${c.n}</span><span class="s"></span><span class="v"></span>`;
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => { e.stopPropagation(); selectCyl(c.n); });
  const lab = new CSS2DObject(el);
  lab.position.copy(bankToLocal(c.x, 3.2, 1.72, c.s));
  G.bank[c.bank].add(lab);
  cylObjs[c.n].label = lab;
  cylObjs[c.n].labelEl = el;
  cylObjs[c.n].labelCache = '';
}

/* HUD: firing order chips + cylinder table */
const foEl = $('hFO');
FIRING_ORDER.forEach((n) => { const d = document.createElement('div'); d.textContent = n; d.dataset.n = n; d.onclick = () => selectCyl(n); d.style.cursor = 'pointer'; foEl.appendChild(d); });
const ct = $('ct');
const rows = {};
for (let n = 1; n <= 8; n++) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td class="n">${n}</td><td><span class="pill"></span></td><td><span class="vl">IN</span><span class="vb in"><i></i></span></td><td><span class="vl">EX</span><span class="vb ex"><i></i></span></td><td class="sp"><i></i></td>`;
  tr.onclick = () => selectCyl(n);
  ct.appendChild(tr);
  rows[n] = { tr, pill: tr.querySelector('.pill'), inb: tr.querySelector('.vb.in i'), exb: tr.querySelector('.vb.ex i'), sp: tr.querySelector('td.sp i'), cache: '' };
}

/* systems chips */
const SYS_LIST = [['block', 'Block'], ['heads', 'Heads'], ['pistons', 'Pistons'], ['rods', 'Rods'], ['crankshaft', 'Crankshaft'], ['valves', 'Valves'], ['camshaft', 'Camshaft'], ['plugs', 'Spark plugs'], ['intake', 'Intake'], ['exhaust', 'Exhaust'], ['flywheel', 'Flywheel'], ['accessories', 'Accessories'], ['labels', 'Labels'], ['effects', 'Flow effects']];
const chipEls = {};
for (const [k, name] of SYS_LIST) {
  const d = document.createElement('div');
  d.className = 'chip on';
  d.innerHTML = `<i></i>${name}`;
  d.onclick = () => setSys(k, !state.sys[k]);
  $('sysChips').appendChild(d);
  chipEls[k] = d;
}
function setSys(k, v) {
  state.sys[k] = v;
  chipEls[k].classList.toggle('on', v);
  applyVisibility();
}

/* cylinder pad */
const cylBtns = {};
{
  const pad = $('cylPad');
  const addRow = (lab, list) => {
    const s = document.createElement('span'); s.textContent = lab; pad.appendChild(s);
    for (const n of list) { const b = document.createElement('button'); b.className = 'btn'; b.textContent = n; b.onclick = () => selectCyl(n); pad.appendChild(b); cylBtns[n] = b; }
  };
  addRow('LEFT', [1, 3, 5, 7]);
  addRow('RIGHT', [2, 4, 6, 8]);
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
function setPlaying(p) {
  state.playing = p;
  $('btnPlay').innerHTML = p ? '❚❚ Pause <kbd>Space</kbd>' : '▶ Play <kbd>Space</kbd>';
}
function setSlow(v) {
  state.slow = v;
  $('btnSlow').classList.toggle('on', v);
  $('speedNote').textContent = v ? 'slow‑mo 1/20×' : 'real time';
  $('hSpeed').textContent = v ? '1/20×' : 'real time';
}
function setRpm(v) {
  state.rpm = v;
  $('rpm').value = v; rangeFill($('rpm'));
  $('rpmVal').textContent = `${v} rpm`;
}
function setTheta(deg) {
  state.theta = Math.floor(state.theta / 720) * 720 + mod(deg, 720);
}
function setTrans(on) {
  state.trans = on;
  if (on && state.opacity > 0.95) { state.opacity = 0.14; $('opacity').value = 0.14; }
  $('btnTrans').classList.toggle('on', on);
  syncOpacityUI();
}
function syncOpacityUI() {
  const el = $('opacity');
  rangeFill(el);
  $('opVal').textContent = state.trans ? Math.round(state.opacity * 100) + '%' : '100%';
}
function setCut(on, mode) {
  state.cut = on;
  if (mode && mode !== state.cutMode) {
    state.cutMode = mode;
    state.cutPos = mode === 'X' ? 0.45 : 0;
    $('cutPos').value = state.cutPos;
  }
  $('btnCut').classList.toggle('on', on);
  document.querySelectorAll('#cutMode button').forEach((b) => b.classList.toggle('on', b.dataset.m === state.cutMode));
  $('cutPos').disabled = !on;
  rangeFill($('cutPos'));
  $('cutVal').textContent = state.cutMode === 'X' ? `x = ${cutConstant().toFixed(2)} dm` : `${(state.cutPos * 130).toFixed(0)} mm`;
  applyCut();
}
function setExplode(on) {
  state.explode = on;
  $('btnExplode').classList.toggle('on', on);
}
function selectCyl(n) {
  state.selCyl = n;
  syncCylUI();
  refreshMaterials();
  drawTimelineBase();
  if (state.learning && state.learning.n !== n) startLearning(n, state.learning.step);
}
function syncCylUI() {
  for (let i = 1; i <= 8; i++) {
    cylBtns[i].classList.toggle('on', state.selCyl === i);
    rows[i].tr.classList.toggle('sel', state.selCyl === i);
    cylObjs[i].labelEl.classList.toggle('sel', state.selCyl === i);
    cylObjs[i].labelEl.classList.toggle('dim', !!(state.solo && state.selCyl && state.selCyl !== i));
  }
  foEl.querySelectorAll('div').forEach((d) => d.classList.toggle('sel', +d.dataset.n === state.selCyl));
  $('btnSolo').classList.toggle('on', state.solo);
  $('tlCyl').textContent = `Cyl ${state.selCyl || 1}`;
}
function setSolo(on) {
  if (on && !state.selCyl) state.selCyl = 1;
  state.solo = on;
  syncCylUI();
  refreshMaterials();
}
function selectPart(ud) {
  state.selPart = ud ? ud.part : null;
  const card = $('info');
  if (!ud) { card.classList.remove('show'); refreshMaterials(); return; }
  const I = INFO[ud.type] || [ud.type, '', '', ''];
  let name = I[0];
  if (ud.cyl) name += ` · Cylinder ${ud.cyl}`;
  else if (/-L$/.test(ud.part)) name += ' · Left bank';
  else if (/-R$/.test(ud.part)) name += ' · Right bank';
  $('iK').textContent = TYPE_KICK[ud.type] || (ud.sys === 'accessories' ? 'Accessory drive' : 'Structure');
  $('iName').textContent = name;
  $('iDoes').textContent = I[1];
  $('iConn').textContent = I[2];
  $('iFail').textContent = I[3];
  card.classList.remove('show'); void card.offsetWidth; card.classList.add('show');
  if (ud.cyl && ud.cyl !== state.selCyl) { state.selCyl = ud.cyl; syncCylUI(); drawTimelineBase(); }
  refreshMaterials();
}
function clearSelection() {
  selectPart(null);
  if (state.solo) setSolo(false);
}
function camTo(name) {
  if (name === 'reset' || name === 'full') { flyTo(HOME.pos, HOME.target); return; }
  const v = presetView(name);
  if (v.needCut && state.shellOp > 0.6 && (!state.cut || state.cutMode === 'X')) { setCut(true, v.needCut); toast('Section cut enabled to show the internals'); }
  else if (v.needCut && state.cut && state.cutMode !== v.needCut) setCut(true, v.needCut);
  flyTo(v.pos, v.target);
}

/* =====================================================================
   LEARNING MODE
   ===================================================================== */
const LEARN = [
  { key: 'INTAKE', title: 'Intake stroke', from: 360, to: 540, text: 'The piston moves down and the pressure in the cylinder falls. The intake valve is open, so the air‑fuel charge is drawn in past it (blue flow) while the exhaust valve stays shut. The intake valve closes about 60° after bottom dead centre, which lets the moving air keep filling the cylinder.' },
  { key: 'COMPRESSION', title: 'Compression stroke', from: 540, to: 710, text: 'Both valves are now closed and the piston rises. It squeezes the charge into the small combustion chamber, roughly ten times smaller. That raises the pressure and temperature so the charge burns fast and completely.' },
  { key: 'POWER', title: 'Ignition & power stroke', from: 705, to: 900, text: 'At 10° before top dead centre the spark plug fires. The flame spreads across the chamber and pressure peaks just after TDC. That pressure drives the piston down, and the rod turns the crankshaft. This is the only stroke that produces work. The other seven cylinders take turns every 90°.' },
  { key: 'EXHAUST', title: 'Exhaust stroke', from: 180, to: 360, text: 'The exhaust valve opened near the end of the power stroke. Now the rising piston pushes the burnt gas out into the header (orange‑red flow). Near TDC both valves are open for a moment (overlap), then the cycle repeats: 720°, two crank revolutions.' },
];
const learnEl = $('learn');
function startLearning(n = state.selCyl || 1, step = 0) {
  if (!state.learning) {
    state.learnSaved = { cut: state.cut, cutMode: state.cutMode, cutPos: state.cutPos, solo: state.solo, explode: state.explode, playing: state.playing, trans: state.trans, sys: { ...state.sys } };
  }
  state.learning = { n, step, t: 0 };
  state.selCyl = n;
  setExplode(false);
  setTrans(false);
  const c = CYL[n - 1];
  setCut(true, c.bank);
  for (const k of ['pistons', 'rods', 'valves', 'crankshaft', 'camshaft', 'plugs', 'effects', 'labels']) setSys(k, true);
  setSolo(true);
  drawTimelineBase();
  const t = bankToWorld(c, c.x, 2.0, 0.05), out = bankToWorld(c, 0, 0, 1);
  flyTo(t.clone().addScaledVector(out, 6.4).add(V3(2.8, 2.1, 0)), t, 1.5);
  learnEl.classList.add('show');
  $('btnLearn').textContent = 'Exit walkthrough';
  renderLearnStep();
}
function renderLearnStep() {
  const L = state.learning, S = LEARN[L.step];
  $('lCyl').textContent = `Learning mode · Cylinder ${L.n} (${L.n % 2 ? 'left' : 'right'} bank)`;
  $('lStepN').textContent = `${L.step + 1} / 4`;
  $('lTitle').textContent = S.title;
  $('lSw').style.background = STROKE_COL[S.key];
  $('lText').textContent = S.text;
  [...$('lDots').children].forEach((d, i) => d.classList.toggle('on', i === L.step));
  L.t = 0;
}
function learnStep(d) {
  if (!state.learning) return;
  state.learning.step = mod(state.learning.step + d, 4);
  renderLearnStep();
}
function stopLearning() {
  if (!state.learning) return;
  const S = state.learnSaved;
  state.learning = null;
  learnEl.classList.remove('show');
  $('btnLearn').textContent = 'Start 4‑stroke walkthrough';
  setCut(S.cut, S.cutMode);
  state.cutPos = S.cutPos; $('cutPos').value = S.cutPos; setCut(S.cut);
  setTrans(S.trans);
  setSolo(S.solo);
  setExplode(S.explode);
  for (const k in S.sys) setSys(k, S.sys[k]);
  setPlaying(S.playing);
}
const LEARN_PLAY = 6.5, LEARN_HOLD = 1.4;
function learnTick(dt) {
  const LS = state.learning, S = LEARN[LS.step];
  LS.t += dt;
  const u = clamp(LS.t / LEARN_PLAY, 0, 1);
  if (LS.t > LEARN_PLAY + LEARN_HOLD) LS.t = 0;
  const cyc = S.from + (S.to - S.from) * u;
  setTheta(FIRE_AT[LS.n] + cyc);
  const lv = live.cyl[LS.n];
  if (lv) {
    const mm = (x) => (x * MAX_LIFT * 100).toFixed(1);
    const cs = crankState(mod(state.theta, 720), CYL[LS.n - 1]);
    const dir = lv.cc < 180 || (lv.cc >= 360 && lv.cc < 540) ? 'moving down ↓' : 'moving up ↑';
    $('lLive').textContent = `cycle ${lv.cc.toFixed(0)}° · piston ${((cs.s - (L - R)) * 100).toFixed(0)} mm from BDC, ${dir} · intake ${lv.li > 0.01 ? mm(lv.li) + ' mm open' : 'closed'} · exhaust ${lv.le > 0.01 ? mm(lv.le) + ' mm open' : 'closed'}${lv.cc >= VT.spark || lv.cc < 14 ? ' · ⚡ spark' : ''}`;
  }
}

/* =====================================================================
   TIMELINE (valve-lift diagram + 720° scrubber)
   ===================================================================== */
const tl = $('tl');
const tlBase = document.createElement('canvas');
let tlW = 0, tlH = 0, tlDpr = 1;
function sizeTimeline() {
  const r = tl.getBoundingClientRect();
  tlDpr = Math.min(devicePixelRatio, 2);
  tlW = r.width; tlH = r.height;
  tl.width = tlBase.width = Math.round(tlW * tlDpr);
  tl.height = tlBase.height = Math.round(tlH * tlDpr);
  drawTimelineBase();
}
const TL = { lift0: 4, lift1: 38, band0: 42, band1: 58, fire0: 62 };
function xOf(deg) { return (mod(deg, 720) / 720) * tlW; }
function drawTimelineBase() {
  if (!tlW) return;
  const g = tlBase.getContext('2d');
  g.setTransform(tlDpr, 0, 0, tlDpr, 0, 0);
  g.clearRect(0, 0, tlW, tlH);
  const c = CYL[(state.selCyl || 1) - 1];
  // grid
  g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
  for (let d = 0; d <= 720; d += 90) { const x = Math.round((d / 720) * tlW) + 0.5; g.beginPath(); g.moveTo(x, TL.lift0); g.lineTo(x, TL.band1); g.stroke(); }
  // lift curves
  for (const [kind, col] of [['I', '74,163,255'], ['E', '208,73,61']]) {
    g.beginPath();
    for (let px = 0; px <= tlW; px += 1) {
      const deg = (px / tlW) * 720;
      const cc = cycleOf(deg, c);
      const l = kind === 'I' ? liftProfile(cc, VT.ivo, VT.ivc) : liftProfile(cc, VT.evo, VT.evc);
      const y = TL.lift1 - l * (TL.lift1 - TL.lift0);
      px ? g.lineTo(px, y) : g.moveTo(px, y);
    }
    g.lineTo(tlW, TL.lift1); g.lineTo(0, TL.lift1); g.closePath();
    g.fillStyle = `rgba(${col},.18)`; g.fill();
    g.strokeStyle = `rgba(${col},.95)`; g.lineWidth = 1.5; g.stroke();
  }
  // stroke band
  for (const [start, key] of [[0, 'POWER'], [180, 'EXHAUST'], [360, 'INTAKE'], [540, 'COMPRESSION']]) {
    const a = FIRE_AT[c.n] + start;
    for (const off of [0, -720, 720]) {
      const x0 = ((a + off) / 720) * tlW, x1 = ((a + off + 180) / 720) * tlW;
      if (x1 < 0 || x0 > tlW) continue;
      g.fillStyle = STROKE_COL[key] + '38';
      g.fillRect(Math.max(0, x0) + 1, TL.band0, Math.min(tlW, x1) - Math.max(0, x0) - 2, TL.band1 - TL.band0);
      g.fillStyle = STROKE_COL[key];
      g.fillRect(Math.max(0, x0) + 1, TL.band1 - 2, Math.min(tlW, x1) - Math.max(0, x0) - 2, 2);
      const cx = (Math.max(0, x0) + Math.min(tlW, x1)) / 2;
      if (Math.min(tlW, x1) - Math.max(0, x0) > 40) {
        g.fillStyle = 'rgba(233,236,240,.85)'; g.font = '600 9.5px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(key, cx, (TL.band0 + TL.band1) / 2 - 1);
      }
    }
  }
  // spark marker
  const sx = xOf(FIRE_AT[c.n] + VT.spark);
  g.fillStyle = '#ffe2a8';
  g.beginPath(); g.moveTo(sx, TL.band0 - 6); g.lineTo(sx + 4, TL.band0 - 1); g.lineTo(sx - 4, TL.band0 - 1); g.closePath(); g.fill();
  // labels
  g.font = '500 9px "JetBrains Mono", monospace'; g.fillStyle = 'rgba(139,147,158,.9)'; g.textAlign = 'left'; g.textBaseline = 'top';
  g.fillText('IN', 4, TL.lift0); g.fillStyle = 'rgba(208,73,61,.9)'; g.fillText('EX', 20, TL.lift0);
}
function drawTimeline() {
  if (!tlW) return;
  const g = tl.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, tl.width, tl.height);
  g.drawImage(tlBase, 0, 0);
  g.setTransform(tlDpr, 0, 0, tlDpr, 0, 0);
  // firing row
  g.font = '600 10px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  FIRING_ORDER.forEach((n, i) => {
    const x = ((i * 90) / 720) * tlW + 1;
    const hot = n === live.firing, sel = n === state.selCyl;
    const w = (90 / 720) * tlW - 2;
    g.fillStyle = hot ? 'rgba(255,122,47,.9)' : sel ? 'rgba(108,182,255,.18)' : 'rgba(255,255,255,.04)';
    g.fillRect(x, TL.fire0, w, 18);
    g.fillStyle = hot ? '#1a0b02' : sel ? '#dcecff' : 'rgba(139,147,158,.9)';
    g.fillText(`${n}`, x + w / 2, TL.fire0 + 9.5);
  });
  // playhead
  const px = xOf(state.theta);
  g.strokeStyle = '#fff'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(px, 0); g.lineTo(px, tlH); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(px, 2, 3, 0, 7); g.fill();
}
let scrubbing = false;
function scrubAt(e) {
  const r = tl.getBoundingClientRect();
  setTheta(clamp((e.clientX - r.left) / r.width, 0, 0.9999) * 720);
}
tl.addEventListener('pointerdown', (e) => { scrubbing = true; tl.setPointerCapture(e.pointerId); if (state.learning) stopLearning(); setPlaying(false); scrubAt(e); });
tl.addEventListener('pointermove', (e) => { if (scrubbing) scrubAt(e); });
tl.addEventListener('pointerup', () => (scrubbing = false));
tl.addEventListener('pointercancel', () => (scrubbing = false));

/* =====================================================================
   HUD UPDATE
   ===================================================================== */
let hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateHUD() {
  const th = mod(state.theta, 720);
  setText('hRpm', String(state.rpm));
  setText('hCrank', `${th.toFixed(0).padStart(3, ' ')}° / 720°`);
  setText('crankVal', `${th.toFixed(0)}°`);
  if (!document.activeElement || document.activeElement.id !== 'crank') { $('crank').value = Math.floor(th); rangeFill($('crank')); }
  setText('hFire', `Cyl ${live.firing}`);
  const sel = state.selCyl;
  setText('hSel', sel ? `Cyl ${sel} · ${live.cyl[sel].stroke}` : '—');
  if (hudCache.fo !== live.firing) {
    hudCache.fo = live.firing;
    foEl.querySelectorAll('div').forEach((d) => d.classList.toggle('hot', +d.dataset.n === live.firing));
    for (let n = 1; n <= 8; n++) cylBtns[n].classList.toggle('firing', n === live.firing);
  }
  for (let n = 1; n <= 8; n++) {
    const L = live.cyl[n], r = rows[n];
    if (r.cache !== L.stroke) { r.cache = L.stroke; r.pill.className = 'pill ' + L.stroke; r.pill.textContent = L.stroke; }
    r.inb.style.width = (L.li * 100).toFixed(0) + '%';
    r.exb.style.width = (L.le * 100).toFixed(0) + '%';
    r.sp.classList.toggle('on', n === live.firing && (L.cc >= VT.spark || L.cc < 40));
    const o = cylObjs[n];
    const vs = `${L.li > 0.02 ? 'IN▲' : ''}${L.le > 0.02 ? ' EX▲' : ''}` || '';
    const key = L.stroke + vs + (n === live.firing);
    if (o.labelCache !== key) {
      o.labelCache = key;
      const s = o.labelEl.querySelector('.s');
      s.textContent = L.stroke; s.className = 's ' + L.stroke;
      o.labelEl.querySelector('.v').textContent = vs.trim() || 'valves shut';
      o.labelEl.classList.toggle('fire', n === live.firing);
    }
  }
}

/* =====================================================================
   INPUT WIRING
   ===================================================================== */
$('btnPlay').onclick = () => { if (state.learning) stopLearning(); setPlaying(!state.playing); };
$('btnSlow').onclick = () => setSlow(!state.slow);
$('rpm').oninput = (e) => setRpm(+e.target.value);
$('crank').oninput = (e) => { if (state.learning) stopLearning(); setPlaying(false); setTheta(+e.target.value); };
document.querySelectorAll('#camBtns [data-cam]').forEach((b) => (b.onclick = () => camTo(b.dataset.cam)));
$('btnCut').onclick = () => { setCut(!state.cut); toast(state.cut ? 'Section cut on' : 'Section cut off'); };
document.querySelectorAll('#cutMode button').forEach((b) => (b.onclick = () => setCut(true, b.dataset.m)));
$('cutPos').oninput = (e) => { state.cutPos = +e.target.value; setCut(state.cut); };
$('btnTrans').onclick = () => setTrans(!state.trans);
$('opacity').oninput = (e) => { state.opacity = +e.target.value; setTrans(state.opacity < 0.99); };
$('btnExplode').onclick = () => setExplode(!state.explode);
$('explode').oninput = (e) => { state.explodeDist = +e.target.value; rangeFill(e.target); $('exVal').textContent = (+e.target.value).toFixed(1) + '×'; if (!state.explode) setExplode(true); };
$('btnSolo').onclick = () => setSolo(!state.solo);
$('btnAll').onclick = () => { setSolo(false); selectPart(null); };
$('btnLearn').onclick = () => (state.learning ? stopLearning() : startLearning());
$('lPrev').onclick = () => learnStep(-1);
$('lNext').onclick = () => learnStep(1);
$('lExit').onclick = () => stopLearning();
$('infoX').onclick = () => selectPart(null);
$('panelToggle').onclick = () => $('panel').classList.toggle('hidden');
document.querySelectorAll('#quality button').forEach((b) => (b.onclick = () => setQuality(b.dataset.q)));
document.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) b.blur(); });
document.querySelectorAll('input[type=range]').forEach((el) => { rangeFill(el); el.addEventListener('change', () => el.blur()); });

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); if (state.learning) stopLearning(); setPlaying(!state.playing); }
  else if (k === 'r') camTo('reset');
  else if (k === 'e') { setExplode(!state.explode); toast(state.explode ? 'Exploded view' : 'Assembled'); }
  else if (k === 't') { setTrans(!state.trans); toast(state.trans ? 'Transparent shell' : 'Opaque shell'); }
  else if (k === 'l') { setSys('labels', !state.sys.labels); toast(state.sys.labels ? 'Labels on' : 'Labels off'); }
  else if (k >= '1' && k <= '8') selectCyl(+k);
  else if (k === 'escape') { if (state.learning) stopLearning(); clearSelection(); }
  else if (k === 'arrowright' && state.learning) learnStep(1);
  else if (k === 'arrowleft' && state.learning) learnStep(-1);
  else return;
  hideHint();
});

/* canvas click / double-click picking */
let downAt = null;
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; tween = null; hideHint(); });
canvas.addEventListener('wheel', () => { tween = null; hideHint(); }, { passive: true });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || e.button !== 0) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  if (moved < 5 && performance.now() - downAt.t < 450) {
    const h = pickAt(e.clientX, e.clientY);
    if (h) selectPart(h.object.userData); else selectPart(null);
  }
  downAt = null;
});
canvas.addEventListener('dblclick', (e) => {
  const h = pickAt(e.clientX, e.clientY);
  if (!h) return;
  const off = camera.position.clone().sub(controls.target);
  const dist = Math.min(off.length(), 7);
  flyTo(h.point.clone().add(off.setLength(dist)), h.point, 0.9);
});

const hintEl = $('hint');
let hintGone = false;
function hideHint() { if (!hintGone) { hintGone = true; hintEl.classList.add('fade'); } }
setTimeout(hideHint, 9000);

/* =====================================================================
   QUALITY PRESETS + POST
   ===================================================================== */
let composer = null, bloomPass = null;
function buildComposer(samples) {
  if (composer) { composer.dispose(); bloomPass.dispose(); }
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.4, 1.05);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
}
function setQuality(q) {
  state.quality = q;
  document.querySelectorAll('#quality button').forEach((b) => b.classList.toggle('on', b.dataset.q === q));
  const cfg = {
    high: { pr: Math.min(devicePixelRatio, 2), shadow: 2048, particles: 1800, light: true, post: true, samples: 4 },
    balanced: { pr: Math.min(devicePixelRatio, 1.5), shadow: 1024, particles: 900, light: true, post: true, samples: 4 },
    performance: { pr: 1, shadow: 0, particles: 320, light: false, post: false, samples: 0 },
  }[q];
  renderer.setPixelRatio(cfg.pr);
  renderer.setSize(innerWidth, innerHeight);
  key.castShadow = cfg.shadow > 0;
  if (cfg.shadow && key.shadow.mapSize.x !== cfg.shadow) {
    key.shadow.mapSize.set(cfg.shadow, cfg.shadow);
    if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
  }
  state.particleCount = cfg.particles;
  state.fireLight = cfg.light;
  if (cfg.post) buildComposer(cfg.samples);
  else if (composer) { composer.dispose(); bloomPass.dispose(); composer = null; }
  onResize();
}
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
  pMat.uniforms.uScale.value = (innerHeight * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * DEG) / 2));
  sizeTimeline();
}
addEventListener('resize', onResize);

/* =====================================================================
   MAIN LOOP
   ===================================================================== */
const clock = new THREE.Clock();
let fpsN = 0, fpsT = 0, firstFrame = true;
function frame(_ts, fixedDt) {
  const dt = fixedDt ?? Math.min(clock.getDelta(), 0.05);
  if (TOUR.active) tourTick(dt);
  else if (state.learning) learnTick(dt);
  else if (state.playing) state.theta += (state.rpm / 60) * 360 * dt * (state.slow ? 0.05 : 1);
  state.explodeAmt += ((state.explode ? 1 : 0) - state.explodeAmt) * Math.min(1, dt * 4.5);
  applyExplode();
  const targetOp = state.trans ? state.opacity : 1;
  if (Math.abs(targetOp - state.shellOp) > 0.002) setShellOpacity(state.shellOp + (targetOp - state.shellOp) * Math.min(1, dt * 9));
  else if (state.shellOp !== targetOp) setShellOpacity(targetOp);
  updateMechanism(state.theta);
  audioTick(dt);
  updateHUD();
  drawTimeline();
  if (!TOUR.active) { stepTween(dt); controls.update(); }
  if (composer) composer.render(); else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  if (TOUR.active) drawOverlay();
  fpsN++; fpsT += dt;
  if (fpsT > 0.5) { $('fps').textContent = Math.round(fpsN / fpsT) + ' fps'; fpsN = 0; fpsT = 0; }
  if (firstFrame) { firstFrame = false; $('loading').classList.add('done'); }
}

/* ---------------- init ---------------- */
setRpm(900);
setSlow(true);
setPlaying(true);
setCut(true, 'R');
setTrans(false);
syncCylUI();
applyVisibility();
setQuality('balanced');
renderer.setAnimationLoop(frame);
window.__v8 = { snap: (p, t) => { tween = null; camera.position.set(...p); controls.target.set(...t); controls.update(); }, presetView, applyExplode, state, CYL, crankState, cycleOf, liftProfile, strokeOf, firingCylinder, cylObjs, VT, FIRE_AT, PIN_ANGLES, MAX_LIFT, ROOF, COMP_H, DECK, L, R, THREE, camera, controls, scene, renderer, G, camTo, setQuality, setExplode, setTrans, setCut, startLearning, stopLearning, selectCyl, pickAt, live, setTheta, setPlaying };
window.__v8ready = true;
