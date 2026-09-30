
/* =====================================================================
   SOUND
   Slow motion: one combustion "thump" per firing event, synced to the
   animation and panned to its bank.
   Real-time speeds / rev: an AudioWorklet generates exhaust pressure pulses
   sample-by-sample from the crank angle (8 per 720°, routed to the bank that
   fired), then fixed band-pass "exhaust resonances" shape the timbre, so the
   harmonics sweep through them as the revs rise, like a real engine.
   ===================================================================== */
/* exhaust-pulse generator: shared by the AudioWorklet and the fallback processor */
class EngineGen {
  constructor(sr) {
    this.sr = sr; this.ph = 0; this.last = -1; this.p = []; this.s = 987654; this.flat = null;
    this.KMAX = 96;
    this.AL = new Float64Array(2 * 97); this.AR = new Float64Array(2 * 97);
    this.w = new Float64Array(8); this.wb = new Float64Array(8); this.walk = new Float64Array(8);
    for (let i = 0; i < 8; i++) this.wb[i] = 1 + 0.1 * (this.r() - 0.5);
  }
  r() { this.s = (this.s * 16807) % 2147483647; return this.s / 2147483647; }
  g(f, c, w) { const x = Math.log2(f / c) / w; return Math.exp(-x * x); }
  // exhaust-system magnitude response for one harmonic (fixed resonances + pulse shape)
  mag(f, rpm, th, flat) {
    const tp = (55 / 360) * (60 / Math.max(rpm, 300));
    const pulse = 1 / (1 + (f * tp) * (f * tp));
    let H, hp;
    if (flat) {
      H = 0.15 + 2.2 * this.g(f, 540, 0.45) + 1.5 * this.g(f, 1080, 0.35) + 0.9 * this.g(f, 2150, 0.35) + 0.45 * this.g(f, 3500, 0.3);
      hp = (f * f) / (f * f + 150 * 150);
    } else {
      H = 0.3 + 2.6 * this.g(f, 120, 0.8) + 1.3 * this.g(f, 420, 0.55) + 0.55 * this.g(f, 1300, 0.45) + 0.2 * this.g(f, 2800, 0.4);
      hp = (f * f) / (f * f + 45 * 45);
    }
    return pulse * H * hp * Math.pow(f / 600, 0.5 * (th - 0.6));
  }
  render(Lo, Ro, rpmA, thrA, flat) {
    const n = Lo.length, sr = this.sr;
    // which of the 8 firing slots (every 90 deg) feed each bank's exhaust
    const SL = flat ? [0, 2, 4, 6] : [0, 3, 5, 6], SR = flat ? [1, 3, 5, 7] : [1, 2, 4, 7];
    const rpm0 = rpmA[0], th0 = thrA[0];
    const fc = rpm0 / 120;                         // cycle (720 deg) frequency
    const K = Math.max(8, Math.min(this.KMAX, Math.floor(6500 / Math.max(fc, 1))));
    // cylinder-to-cylinder variation: fixed spread + slow random walk
    for (let s = 0; s < 8; s++) { this.walk[s] = 0.96 * this.walk[s] + 0.04 * (this.r() - 0.5) * 2; this.w[s] = this.wb[s] * (1 + 0.07 * this.walk[s]); }
    let e = 0;
    for (let k = 1; k <= K; k++) {
      const m = fc > 1 ? this.mag(k * fc, rpm0, th0, flat) : 0;
      let lr = 0, li = 0, rr = 0, ri = 0;
      for (const s of SL) { const a = (-2 * Math.PI * k * s) / 8; lr += this.w[s] * Math.cos(a); li += this.w[s] * Math.sin(a); }
      for (const s of SR) { const a = (-2 * Math.PI * k * s) / 8; rr += this.w[s] * Math.cos(a); ri += this.w[s] * Math.sin(a); }
      this.AL[2 * k] = m * lr; this.AL[2 * k + 1] = m * li; this.AR[2 * k] = m * rr; this.AR[2 * k + 1] = m * ri;
      e += m * m * (lr * lr + li * li + rr * rr + ri * ri);
    }
    const norm = 0.5 / Math.sqrt(e / 4 + 1e-9);
    for (let i = 0; i < n; i++) {
      const rpm = rpmA.length > 1 ? rpmA[i] : rpm0;
      const th = thrA.length > 1 ? thrA[i] : th0;
      this.ph += (rpm * 6) / sr;
      if (this.ph >= 720) this.ph -= 720;
      // overrun pops (only noise source left)
      const slot = Math.floor(this.ph / 90);
      if (slot !== this.last) {
        this.last = slot;
        if (th < 0.12 && rpm > 2400 && this.r() < 0.07) {
          const w = Math.max(40, sr * (60 / rpm) * (140 / 360));
          this.p.push({ age: 0, a: 1.1, w, b: (flat ? SR : SR).includes(slot) ? 1 : 0 });
        }
      }
      const x = (2 * Math.PI * this.ph) / 720, c1 = Math.cos(x), s1 = Math.sin(x);
      let zr = 1, zi = 0, l = 0, r = 0;
      const AL = this.AL, AR = this.AR;
      for (let k = 1; k <= K; k++) {
        const t = zr * c1 - zi * s1; zi = zr * s1 + zi * c1; zr = t;
        l += AL[2 * k] * zi + AL[2 * k + 1] * zr;
        r += AR[2 * k] * zi + AR[2 * k + 1] * zr;
      }
      l *= norm; r *= norm;
      // combustion grit: band-limited noise gated to each firing, well below the harmonics
      this.n1 = (this.n1 || 0) + 0.3 * ((this.r() * 2 - 1) - (this.n1 || 0));
      this.n2 = (this.n2 || 0) + 0.3 * ((this.r() * 2 - 1) - (this.n2 || 0));
      const ce = 0.5 + 0.5 * Math.cos((2 * Math.PI * this.ph) / 90), env = ce * ce * ce * ce * ce * ce;
      l += 0.09 * (0.4 + th) * env * this.n1; r += 0.09 * (0.4 + th) * env * this.n2;
      for (let j = this.p.length - 1; j >= 0; j--) {
        const q = this.p[j], t = q.age / q.w;
        const v = q.a * (Math.exp(-t) - Math.exp(-4 * t)) * (this.r() * 2 - 1) * 2;
        if (q.b) r += v; else l += v;
        if (++q.age > q.w * 7) this.p.splice(j, 1);
      }
      Lo[i] = l + 0.4 * r; Ro[i] = r + 0.4 * l;
    }
  }
}
const GEN_SRC = EngineGen.toString();   // same class source runs inside the AudioWorklet
const ENGINE_WORKLET = GEN_SRC + `
class EngineProc extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [
    { name: 'rpm', defaultValue: 900, minValue: 0, maxValue: 12000, automationRate: 'a-rate' },
    { name: 'throttle', defaultValue: 0.3, minValue: 0, maxValue: 1, automationRate: 'a-rate' },
    { name: 'mode', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' } ]; }
  constructor() { super(); this.g = new EngineGen(sampleRate); }
  process(_in, outputs, P) { const o = outputs[0]; this.g.render(o[0], o[1] || o[0], P.rpm, P.throttle, P.mode[0] >= 0.5); return true; }
}
registerProcessor('engine-proc', EngineProc);`;
/* fallback when AudioWorklet is unavailable (non-secure contexts, older browsers) */
function scriptEngineNode(ctx) {
  const gen = new EngineGen(ctx.sampleRate);
  const param = (v) => ({ value: v, cur: v, setTargetAtTime(x) { this.value = x; }, setValueAtTime(x) { this.value = x; } });
  const rpm = param(900), thr = param(0.3), mode = param(1);
  const node = ctx.createScriptProcessor(1024, 0, 2);
  const rA = new Float32Array(1024), tA = new Float32Array(1024);
  node.onaudioprocess = (e) => {
    const L = e.outputBuffer.getChannelData(0), Rr = e.outputBuffer.getChannelData(1), n = L.length;
    for (let i = 0; i < n; i++) { rA[i] = rpm.cur + ((rpm.value - rpm.cur) * i) / n; tA[i] = thr.cur + ((thr.value - thr.cur) * i) / n; }
    rpm.cur = rpm.value; thr.cur = thr.value;
    gen.render(L, Rr, rA.subarray(0, n), tA.subarray(0, n), mode.value >= 0.5);
  };
  node.parameters = new Map([['rpm', rpm], ['throttle', thr], ['mode', mode]]);
  return node;
}
const WORKLET_URL = URL.createObjectURL(new Blob([ENGINE_WORKLET], { type: 'application/javascript' }));
const PROFILES = {
  rec: { mode: 1, drive: 1.8, rec: true }, // recorded Ferrari loops (synth only below ~2,000 rpm)
  flat: { mode: 1, drive: 1.8 },   // alternating banks: clean, high-revving shriek
  cross: { mode: 0, drive: 1.5 },  // uneven bank pulses: deep burble
};
// level-matched: the synth idle hands over to the recordings without a jump
const SYNTH_TRIM = 0.45, REC_TRIM = 1.0;
// measured per-loop level correction so the recorded loops are equally loud through the mix bus
const LOOP_TRIM = [1.0, 1.22, 1.53, 1.68];
/* how much synth vs. each recorded loop to use at a given rpm.
   Loops are sorted by their recorded rpm; between two neighbours we crossfade
   in the middle of the (log-rpm) gap so each loop plays close to its native pitch. */
function mixFor(rpm, profile) {
  const L = REC.loops, n = L.length, w = new Array(n).fill(0);
  if (!PROFILES[profile].rec) return { s: 1, w };
  const up = smooth(clamp((rpm - 1500) / 800, 0, 1));
  if (rpm <= L[0].rpm) w[0] = 1;
  else if (rpm >= L[n - 1].rpm) w[n - 1] = 1;
  else {
    let i = 0;
    while (rpm > L[i + 1].rpm) i++;
    const x = Math.log(rpm / L[i].rpm) / Math.log(L[i + 1].rpm / L[i].rpm);
    const t = smooth(clamp((x - 0.3) / 0.4, 0, 1));
    w[i] = Math.sqrt(1 - t); w[i + 1] = Math.sqrt(t);
  }
  return { s: Math.sqrt(1 - up), w: w.map((v) => v * Math.sqrt(up)) };
}
function setMix(G2, rpm, thr, t, instant) {
  const set = (p, v, tau) => (instant ? p.setValueAtTime(v, t) : p.setTargetAtTime(v, t, tau));
  const m = mixFor(rpm, G2.profile);
  const over = thr < 0.15;
  set(G2.synthGain.gain, SYNTH_TRIM * Math.max(m.s, over && PROFILES[G2.profile].rec ? 0.25 : 0), 0.03);
  G2.loops.forEach((lp, k) => {
    set(lp.gain.gain, REC_TRIM * m.w[k] * LOOP_TRIM[k], 0.03);
    set(lp.src.playbackRate, Math.max(0.05, rpm / REC.loops[k].rpm), 0.012);
  });
  set(G2.sLP.frequency, over ? 1500 : 15000, 0.05);
}
async function decodeDataUrl(ctx, url) {
  const b = atob(url.split(',')[1]);
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return await ctx.decodeAudioData(u.buffer);
}
/* loudness rises with revs and load, as on a real engine */
const engineLevel = (rpm, thr) => (0.3 + 0.7 * thr) * (0.5 + 0.5 * clamp(rpm / 8000, 0, 1.1));
const AUDIO = { ctx: null, on: false, ready: false, vol: 0.6, prevT: null, prevRpm: 900, thr: 0.3, contMix: 0, profile: 'rec' };

function synthPulseBuffer(ctx) {
  const sr = ctx.sampleRate, len = Math.round(sr * 0.42);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  let ph = 0, lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const f = 45 + 85 * Math.exp(-t / 0.035);
    ph += (2 * Math.PI * f) / sr;
    lp += 0.12 * ((Math.random() * 2 - 1) - lp);
    d[i] = Math.sin(ph) * Math.exp(-t / 0.075) * 0.95 + lp * Math.exp(-t / 0.028) * 1.6 + lp * Math.exp(-t / 0.14) * 0.35 * Math.min(1, t / 0.02);
  }
  return buf;
}
function tanhCurve(drive) {
  const c = new Float32Array(2048);
  for (let i = 0; i < 2048; i++) { const x = (i / 2047) * 2 - 1; c[i] = Math.tanh(x * drive) / Math.tanh(drive); }
  return c;
}
/* the complete mix bus; used live and for offline (video) rendering */
async function buildAudioGraph(ctx) {
  const G2 = {};
  G2.master = ctx.createGain();
  G2.master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -9; comp.ratio.value = 3; comp.attack.value = 0.002; comp.release.value = 0.1;
  comp.connect(G2.master);
  G2.master.connect(ctx.destination);
  // slow-motion thump path
  G2.thumpIn = ctx.createBiquadFilter();
  G2.thumpIn.type = 'lowpass'; G2.thumpIn.frequency.value = 450; G2.thumpIn.Q.value = 0.8;
  const ts = ctx.createWaveShaper(); ts.curve = tanhCurve(1.8);
  G2.thumpIn.connect(ts); ts.connect(comp);
  G2.pulse = synthPulseBuffer(ctx);
  // continuous engine path
  G2.node = null;
  if (ctx.audioWorklet && window.AudioWorkletNode) {
    try {
      await ctx.audioWorklet.addModule(WORKLET_URL);
      G2.node = new AudioWorkletNode(ctx, 'engine-proc', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
    } catch (e) { console.warn('AudioWorklet unavailable, using fallback', e); }
  }
  if (!G2.node) G2.node = scriptEngineNode(ctx);
  G2.rpm = G2.node.parameters.get('rpm');
  G2.thr = G2.node.parameters.get('throttle');
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30;
  G2.node.connect(hp);
  G2.intake = ctx.createGain(); G2.intake.gain.value = 0;   // retained for API compatibility (no noise layer)
  G2.shaper = ctx.createWaveShaper();
  const post = ctx.createBiquadFilter(); post.type = 'lowpass'; post.frequency.value = 9000; post.Q.value = 0.5;
  G2.level = ctx.createGain(); G2.level.gain.value = 0;
  G2.synthGain = ctx.createGain();
  hp.connect(G2.shaper); G2.shaper.connect(post); post.connect(G2.synthGain); G2.synthGain.connect(G2.level); G2.level.connect(comp);
  // recorded loops
  G2.sLP = ctx.createBiquadFilter(); G2.sLP.type = 'lowpass'; G2.sLP.frequency.value = 15000; G2.sLP.Q.value = 0.6;
  G2.sLP.connect(G2.level);
  G2.loops = [];
  for (const L of REC.loops) {
    const src = ctx.createBufferSource();
    src.buffer = await decodeDataUrl(ctx, L.url);
    src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(g); g.connect(G2.sLP);
    src.start(0, Math.random() * src.buffer.duration);
    G2.loops.push({ src, gain: g });
  }
  G2.setProfile = (name) => {
    G2.profile = name;
    const P = PROFILES[name];
    G2.node.parameters.get('mode').value = P.mode;
    G2.shaper.curve = tanhCurve(P.drive);
  };
  G2.setProfile(AUDIO.profile);
  return G2;
}
function thumpAt(G2, ctx, when, n, gain) {
  const src = ctx.createBufferSource();
  src.buffer = G2.pulse;
  src.playbackRate.value = 0.93 + Math.random() * 0.14;
  const g = ctx.createGain();
  g.gain.value = gain * (0.8 + Math.random() * 0.25);
  const pan = ctx.createStereoPanner();
  pan.pan.value = n % 2 ? -0.55 : 0.55;
  src.connect(g); g.connect(pan); pan.connect(G2.thumpIn);
  src.start(when);
}

/* ---------------- rev sequence: idle → 8,000 → limiter → overrun → idle ---------------- */
const REV = { active: false, t: 0, base: 900, top: 8000 };
function revProfile(t, base, top = 8000) {
  if (t < 1.5) { const u = t / 1.5; return { rpm: base + (top - base) * (1 - Math.pow(1 - u, 1.7)), thr: 1 }; }
  if (t < 2.2) { const s = Math.sin(t * Math.PI * 2 * 9); return { rpm: top - 150 * Math.abs(s), thr: s > 0 ? 1 : 0.1 }; }
  if (t < 5.0) { const v = (t - 2.2) / 2.8; return { rpm: base + (top - base) * Math.exp(-v * 3.3), thr: 0.02 }; }
  if (t < 5.6) { const v = (t - 5.0) / 0.6; return { rpm: lerp(base + (top - base) * Math.exp(-3.3), base, smooth(v)), thr: 0.3 }; }
  return null;
}
function startRev() {
  if (REV.active) return;
  if (!AUDIO.on) setSound(true);
  REV.active = true; REV.t = 0; REV.base = Math.min(state.rpm, 2000);
  if (!state.playing) setPlaying(true);
  $('btnRev').classList.add('on');
}
function revTick(dt) {
  if (!REV.active) return;
  REV.t += dt;
  const p = revProfile(REV.t, REV.base, REV.top);
  if (!p) { REV.active = false; setRpm(Math.round(REV.base)); $('btnRev').classList.remove('on'); return; }
  setRpm(Math.round(p.rpm / 10) * 10);
  REV.thr = p.thr;
}

/* ---------------- live control ---------------- */
async function audioInit() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  AUDIO.ctx = ctx;
  AUDIO.G = await buildAudioGraph(ctx);
  AUDIO.ready = true;
  AUDIO.G.master.gain.setTargetAtTime(AUDIO.on ? AUDIO.vol : 0, ctx.currentTime, 0.05);
}
function setSound(on) {
  AUDIO.on = on;
  if (on && !AUDIO.ctx) audioInit().catch((e) => { console.error(e); toast('Sound could not start: ' + e.message); });
  if (AUDIO.ctx) {
    if (on) AUDIO.ctx.resume();
    if (AUDIO.ready) AUDIO.G.master.gain.setTargetAtTime(on ? AUDIO.vol : 0, AUDIO.ctx.currentTime, 0.05);
  }
  const b = $('btnSound');
  b.classList.toggle('on', on);
  b.textContent = on ? '🔊 Sound on' : '🔈 Sound off';
}
function setProfile(name) {
  AUDIO.profile = name;
  document.querySelectorAll('#sndProfile button').forEach((b) => b.classList.toggle('on', b.dataset.p === name));
  if (AUDIO.ready) AUDIO.G.setProfile(name);
}
function audioTick(dt) {
  revTick(dt);
  const T = state.theta;
  const prev = AUDIO.prevT ?? T;
  AUDIO.prevT = T;
  const drpm = dt > 0 ? (state.rpm - AUDIO.prevRpm) / dt : 0;
  AUDIO.prevRpm = state.rpm;
  if (!AUDIO.on || !AUDIO.ready) return;
  const ctx = AUDIO.ctx, now = ctx.currentTime, G2 = AUDIO.G;
  // continuous engine at real rpm when running in real time, revving, or in the tour's redline shot
  const cont = state.playing && (!state.slow || REV.active || (TOUR.active && TOUR.cont));
  AUDIO.contMix += ((cont ? 1 : 0) - AUDIO.contMix) * Math.min(1, dt * 8);
  const thrTarget = REV.active ? REV.thr : TOUR.active && TOUR.thr != null ? TOUR.thr : drpm > 400 ? 1 : drpm < -400 ? 0.03 : 0.3;
  AUDIO.thr += (thrTarget - AUDIO.thr) * Math.min(1, dt * 20);
  G2.rpm.setTargetAtTime(state.rpm, now, 0.012);
  G2.thr.setTargetAtTime(AUDIO.thr, now, 0.02);
  G2.level.gain.setTargetAtTime(AUDIO.contMix * engineLevel(state.rpm, AUDIO.thr), now, 0.03);
  setMix(G2, state.rpm, AUDIO.thr, now, false);
  G2.intake.gain.setTargetAtTime(AUDIO.contMix * AUDIO.thr * (state.rpm / 9000) * 0.6, now, 0.04);
  // synced thumps in slow motion
  const d = T - prev;
  if (AUDIO.contMix < 0.98 && d > 0 && d < 200) {
    for (const n of FIRING_ORDER) {
      const a = FIRE_AT[n];
      const x = a + 720 * Math.ceil((prev - a + 1e-9) / 720);
      if (x > prev && x <= T) thumpAt(G2, ctx, now + 0.005, n, 0.36 * (1 - AUDIO.contMix) * (state.solo && n !== state.selCyl ? 0.22 : 1));
    }
  }
}
document.addEventListener('visibilitychange', () => {
  if (!AUDIO.ctx) return;
  if (document.hidden) AUDIO.ctx.suspend(); else if (AUDIO.on) AUDIO.ctx.resume();
});
$('btnSound').onclick = () => setSound(!AUDIO.on);
$('btnRev').onclick = () => startRev();
document.querySelectorAll('#sndProfile button').forEach((b) => (b.onclick = () => setProfile(b.dataset.p)));
$('vol').oninput = (e) => {
  AUDIO.vol = +e.target.value;
  rangeFill(e.target);
  $('volVal').textContent = Math.round(AUDIO.vol * 100) + '%';
  if (!AUDIO.on) setSound(true);
  else if (AUDIO.ready) AUDIO.G.master.gain.setTargetAtTime(AUDIO.vol, AUDIO.ctx.currentTime, 0.05);
};
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'm') { setSound(!AUDIO.on); toast(AUDIO.on ? 'Sound on' : 'Sound muted'); }
  else if (k === 'v') startRev();
});

/* ---------------- offline render of the tour soundtrack (for the MP4) ---------------- */
function wavFromBuffer(buf) {
  const n = buf.length, ch = buf.numberOfChannels, sr = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, sr, true);
  out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = [...Array(ch).keys()].map((c) => buf.getChannelData(c));
  let peak = 1e-6;
  for (const d of data) for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  const k = 0.89 / peak;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) out.setInt16(44 + (i * ch + c) * 2, clamp(data[c][i] * k, -1, 1) * 32767, true);
  return out.buffer;
}
async function renderTourAudio(profile = 'rec') {
  const sr = 48000, dur = TOUR.dur;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
  const prevProfile = AUDIO.profile;
  AUDIO.profile = profile;
  const G2 = await buildAudioGraph(ctx);
  AUDIO.profile = prevProfile;
  G2.master.gain.value = 1;
  for (const f of TOUR.alog) {
    G2.rpm.setValueAtTime(f.rpm, f.t);
    G2.thr.setValueAtTime(f.thr, f.t);
    G2.level.gain.setValueAtTime(f.cont * engineLevel(f.rpm, f.thr), f.t);
    setMix(G2, f.rpm, f.thr, f.t, true);
    G2.intake.gain.setValueAtTime(f.cont * f.thr * (f.rpm / 9000) * 0.6, f.t);
  }
  for (const e of TOUR.events) thumpAt(G2, ctx, e.t + 0.005, e.n, 0.9 * e.g * 0.405);
  // fades matching the picture
  G2.master.gain.setValueAtTime(0, 0);
  G2.master.gain.linearRampToValueAtTime(1, 1.0);
  G2.master.gain.setValueAtTime(1, dur - 1.4);
  G2.master.gain.linearRampToValueAtTime(0, dur);
  const buf = await ctx.startRendering();
  return wavFromBuffer(buf);
}
window.__v8.audio = AUDIO;
window.__v8.renderTourAudio = renderTourAudio;
window.__v8.revProfile = revProfile;
window.__v8.buildAudioGraph = buildAudioGraph;
window.__v8.engineLevel = engineLevel;
window.__v8.setMix = setMix;
