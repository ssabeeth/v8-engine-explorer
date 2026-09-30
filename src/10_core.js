import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* bank-local (x, y along bore, zo outboard) -> engine/world coordinates */
function bankToWorld(cyl_or_s, x, y, zo, out = new THREE.Vector3()) {
  const s = typeof cyl_or_s === 'number' ? cyl_or_s : cyl_or_s.s;
  const b = s * 45 * DEG;
  const z = zo * s;
  return out.set(x, y * Math.cos(b) - z * Math.sin(b), y * Math.sin(b) + z * Math.cos(b));
}
const bankMatrix = (s) => new THREE.Matrix4().makeRotationX(s * 45 * DEG);

/* =====================================================================
   RENDERER / SCENE
   ===================================================================== */
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
labelRenderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const BG = new THREE.Color(0x08090b);
scene.background = BG;
scene.fog = new THREE.Fog(BG, 22, 46);

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 200);
camera.position.set(9.2, 5.6, 10.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 2.2;
controls.maxDistance = 34;
controls.zoomToCursor = true;
controls.screenSpacePanning = true;
controls.rotateSpeed = 0.75;
controls.target.set(0.1, 1.0, 0.2);

/* ---------- studio environment for reflections (softboxes) ---------- */
function buildStudioEnv() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x0d0e10);
  const room = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.MeshBasicMaterial({ color: 0x15171a, side: THREE.BackSide }));
  env.add(room);
  const box = (w, h, pos, look, k, tint = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.copy(pos); m.lookAt(look); env.add(m);
  };
  const o = new THREE.Vector3(0, 0, 0);
  box(22, 9, new THREE.Vector3(0, 18, 2), o, 2.6);                       // overhead
  box(3.2, 20, new THREE.Vector3(16, 4, 10), o, 3.4, 0xfff4e6);           // key strip
  box(3.2, 20, new THREE.Vector3(-14, 4, 12), o, 1.7, 0xe6f0ff);          // fill strip
  box(18, 3, new THREE.Vector3(-4, 8, -18), o, 3.2, 0xcfe3ff);            // rim bar
  box(10, 6, new THREE.Vector3(18, 2, -8), o, 1.8);
  box(40, 40, new THREE.Vector3(0, -14, 0), new THREE.Vector3(0, 0, 0), 0.06); // floor bounce
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0.035);
  pm.dispose();
  return rt.texture;
}
scene.environment = buildStudioEnv();
scene.environmentIntensity = 0.95;

const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x1a1512, 0.35);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff1e0, 2.3);
key.position.set(7, 12, 8);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 2, far: 34 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.025;
key.shadow.radius = 4;
scene.add(key);
const rim = new THREE.DirectionalLight(0xa9c8ff, 1.5);
rim.position.set(-8, 7, -9);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xffffff, 0.45);
fill.position.set(-7, 2, 7);
scene.add(fill);
const fireLight = new THREE.PointLight(0xff8a3c, 0, 3.2, 1.6);
scene.add(fireLight);

/* floor */
const FLOOR_Y = -2.2;
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.42, metalness: 0.15 });
const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = FLOOR_Y;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(40, 80, 0x2a3440, 0x1a2028);
grid.material.transparent = true;
grid.material.opacity = 0.28;
grid.material.depthWrite = false;
grid.position.y = FLOOR_Y + 0.002;
scene.add(grid);

/* =====================================================================
   PROCEDURAL TEXTURES + MATERIALS
   ===================================================================== */
function noiseCanvas(size, octaves, contrast = 1, base = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = `rgb(${base},${base},${base})`;
  g.fillRect(0, 0, size, size);
  for (const [cells, alpha] of octaves) {
    const s = document.createElement('canvas');
    s.width = s.height = cells;
    const sg = s.getContext('2d');
    const img = sg.createImageData(cells, cells);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 255 * contrast;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    sg.putImageData(img, 0, 0);
    g.globalAlpha = alpha;
    g.imageSmoothingEnabled = cells < size;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) g.drawImage(s, ox * size, oy * size, size, size);
  }
  g.globalAlpha = 1;
  return c;
}
function texFrom(canvas, repeat = 1, srgb = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const castTex = texFrom(noiseCanvas(512, [[16, 0.4], [64, 0.35], [256, 0.3], [512, 0.22]], 0.55), 1.2);
const fineTex = texFrom(noiseCanvas(256, [[128, 0.5], [256, 0.8]], 1.0), 3);
const brushedTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const y = Math.random() * 512, v = 100 + Math.random() * 80;
    g.strokeStyle = `rgba(${v},${v},${v},${0.15 + Math.random() * 0.3})`;
    g.lineWidth = Math.random() * 1.4;
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y + (Math.random() - 0.5) * 2); g.stroke();
  }
  return texFrom(c, 2);
})();
const chainTex = (() => {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1d20'; g.fillRect(0, 0, 256, 32);
  for (let i = 0; i < 16; i++) {
    const x = i * 16;
    g.fillStyle = i % 2 ? '#6d7278' : '#8a9096';
    g.fillRect(x + 1, 4, 14, 24);
    g.fillStyle = '#2b2e32';
    g.beginPath(); g.arc(x + 4, 16, 2.4, 0, 7); g.arc(x + 12, 16, 2.4, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
function plateTex(text, sub) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#c9cdd2'); gr.addColorStop(0.5, '#9ea3a9'); gr.addColorStop(1, '#c2c6cb');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(0, Math.random() * 256, 1024, 1); }
  g.fillStyle = '#16181b';
  g.font = '700 132px Inter, Helvetica, Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 512, 118);
  g.font = '600 38px Inter, Helvetica, Arial, sans-serif';
  g.fillText(sub, 512, 212);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* Shared uniform: when a section cut is active, back faces (the inside of cut
   castings) are painted the classic cutaway red so the section reads clearly. */
const CUT_ON = { value: 0 };
function withCutShader(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCutOn = CUT_ON;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uCutOn;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nif (uCutOn > 0.5 && !gl_FrontFacing) { diffuseColor.rgb = vec3(0.46, 0.07, 0.05); }')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nif (uCutOn > 0.5 && !gl_FrontFacing) { metalnessFactor = 0.0; }')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nif (uCutOn > 0.5 && !gl_FrontFacing) { roughnessFactor = 0.62; }');
  };
  mat.customProgramCacheKey = () => 'cut' + mat.type;
  return mat;
}

const SHELL_MATS = [];   // affected by transparency
const CLIP_MATS = [];    // affected by the section cut
function shell(mat, clip = true, trans = true) {
  mat.side = THREE.FrontSide;
  withCutShader(mat);
  if (trans) SHELL_MATS.push(mat);
  if (clip) CLIP_MATS.push(mat);
  mat.userData.baseOpacity = 1;
  return mat;
}
const std = (o) => new THREE.MeshStandardMaterial(o);
const phys = (o) => new THREE.MeshPhysicalMaterial(o);

const MAT = {
  // castings
  block: shell(phys({ color: 0xaeb3b8, metalness: 0.92, roughness: 0.56, roughnessMap: castTex, bumpMap: castTex, bumpScale: 0.5 })),
  head: shell(phys({ color: 0xb6babf, metalness: 0.92, roughness: 0.5, roughnessMap: castTex, bumpMap: castTex, bumpScale: 0.45 })),
  pan: shell(phys({ color: 0xa4a9ae, metalness: 0.9, roughness: 0.46, roughnessMap: castTex, bumpMap: castTex, bumpScale: 0.35 })),
  cover: shell(phys({ color: 0x17181b, metalness: 0.35, roughness: 0.62, bumpMap: fineTex, bumpScale: 1.2, clearcoat: 0.35, clearcoatRoughness: 0.5 })),
  coverFin: shell(phys({ color: 0xc9cdd2, metalness: 1, roughness: 0.2, roughnessMap: brushedTex })),
  intake: shell(phys({ color: 0x1c1d20, metalness: 0.05, roughness: 0.5, bumpMap: fineTex, bumpScale: 0.6, clearcoat: 0.2, clearcoatRoughness: 0.6 })),
  tcover: shell(phys({ color: 0xa9aeb3, metalness: 0.9, roughness: 0.5, roughnessMap: castTex, bumpMap: castTex, bumpScale: 0.35 })),
  liner: withCutShader(std({ color: 0x9aa3ad, metalness: 1, roughness: 0.22, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })),
  gasket: shell(std({ color: 0x3b3a37, metalness: 0.4, roughness: 0.8 }), true, true),
  // rotating / reciprocating
  piston: phys({ color: 0xd9dce0, metalness: 1, roughness: 0.25, roughnessMap: brushedTex }),
  pistonCrown: std({ color: 0x8d8a85, metalness: 0.85, roughness: 0.45, bumpMap: fineTex, bumpScale: 0.6 }),
  ring: std({ color: 0x3d4146, metalness: 1, roughness: 0.3 }),
  rod: phys({ color: 0x80868d, metalness: 1, roughness: 0.33, roughnessMap: fineTex }),
  crank: phys({ color: 0x8c9298, metalness: 1, roughness: 0.34, roughnessMap: castTex }),
  journal: phys({ color: 0xeef0f2, metalness: 1, roughness: 0.08 }),
  cam: phys({ color: 0x6f757c, metalness: 1, roughness: 0.3 }),
  camLobe: phys({ color: 0xd4d7db, metalness: 1, roughness: 0.14 }),
  valve: phys({ color: 0xc2c6ca, metalness: 1, roughness: 0.18 }),
  valveEx: phys({ color: 0x8f8579, metalness: 1, roughness: 0.34 }),
  spring: std({ color: 0x2c3036, metalness: 0.9, roughness: 0.32 }),
  rocker: phys({ color: 0xc9cdd2, metalness: 1, roughness: 0.2, roughnessMap: brushedTex }),
  pushrod: phys({ color: 0xb8bcc0, metalness: 1, roughness: 0.16 }),
  lifter: std({ color: 0x55595f, metalness: 1, roughness: 0.3 }),
  steelDark: std({ color: 0x3f4348, metalness: 1, roughness: 0.4 }),
  flywheel: phys({ color: 0xb4b8bd, metalness: 1, roughness: 0.22, roughnessMap: brushedTex }),
  // ignition / fuel
  ceramic: std({ color: 0xf1efe9, metalness: 0, roughness: 0.3 }),
  plugHex: std({ color: 0xb9bdc1, metalness: 1, roughness: 0.25 }),
  wire: phys({ color: 0x7a1814, metalness: 0, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
  fuel: phys({ color: 0x9da3a9, metalness: 1, roughness: 0.25, roughnessMap: brushedTex }),
  // accessories (own instances so the cross-section can clip them)
  accAlu: shell(phys({ color: 0xc3c7cc, metalness: 1, roughness: 0.3, roughnessMap: brushedTex }), true, false),
  accCast: shell(phys({ color: 0x9ea3a8, metalness: 0.9, roughness: 0.5, roughnessMap: castTex, bumpMap: castTex, bumpScale: 0.35 }), true, false),
  accDark: shell(std({ color: 0x1b1c1f, metalness: 0.2, roughness: 0.5 }), true, false),
  rubber: shell(std({ color: 0x0f1011, metalness: 0, roughness: 0.82 }), true, false),
  chain: std({ color: 0xffffff, map: chainTex, metalness: 0.9, roughness: 0.35 }),
  balancer: shell(phys({ color: 0xaeb2b7, metalness: 1, roughness: 0.28, roughnessMap: brushedTex }), true, false),
  mark: std({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.5 }),
  bolt: std({ color: 0x777c82, metalness: 1, roughness: 0.32 }),
  filter: shell(phys({ color: 0x14161a, metalness: 0.3, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 }), true, false),
  headerMat: shell(std({ vertexColors: true, metalness: 1, roughness: 0.3, roughnessMap: brushedTex }), true, false),
  throttleDark: std({ color: 0x0a0a0b, roughness: 0.9 }),
  plate: shell(std({ map: plateTex('V8', '5.7 LITRE · 90° CROSS-PLANE'), metalness: 0.9, roughness: 0.3 }), true, true),
  ghost: std({ color: 0x8b98a8, metalness: 0.2, roughness: 0.6, transparent: true, opacity: 0.1, depthWrite: false }),
};
// liner is part of the shell for transparency + cut but has its own opacity rule
CLIP_MATS.push(MAT.liner);

/* =====================================================================
   GEOMETRY HELPERS
   ===================================================================== */
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const V2 = (x, y) => new THREE.Vector2(x, y);
function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(sx, sy, sz));
}
const cylY = (r1, r2, h, seg = 32, open = false) => new THREE.CylinderGeometry(r1, r2, h, seg, 1, open);
const cylX = (r, len, seg = 32, open = false) => new THREE.CylinderGeometry(r, r, len, seg, 1, open).rotateZ(Math.PI / 2);
const rbox = (w, h, d, r = 0.03, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
/* box from min/max corners */
function rboxMM(x0, x1, y0, y1, z0, z1, r = 0.03, seg = 3) {
  return rbox(x1 - x0, y1 - y0, z1 - z0, r, seg).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map((p) => V2(Math.max(p[0], 0.0001), p[1])), seg);
const latheX = (pts, seg = 40) => lathe(pts, seg).rotateZ(-Math.PI / 2); // axis along +X
function extrude(shape, depth, bevel = 0.015, curveSeg = 28) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: curveSeg,
  });
  return g.translate(0, 0, -depth / 2);
}
/* shape drawn in (z, y) → extruded along X, centred */
const extrudeX = (shape, depth, bevel, cs) => extrude(shape, depth, bevel, cs).rotateY(-Math.PI / 2); // shape (u,v) -> (z,y)
function circleShape(r, cx = 0, cy = 0, seg = 48) {
  const s = new THREE.Shape();
  s.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return s;
}
function holePath(r, cx = 0, cy = 0) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
}
function gearShape(rRoot, rTip, teeth, holes = []) {
  const s = new THREE.Shape();
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2, da = (Math.PI * 2) / teeth;
    const pts = [[rRoot, a0], [rTip, a0 + da * 0.28], [rTip, a0 + da * 0.52], [rRoot, a0 + da * 0.8]];
    pts.forEach(([r, a], j) => (i === 0 && j === 0 ? s.moveTo(r * Math.cos(a), r * Math.sin(a)) : s.lineTo(r * Math.cos(a), r * Math.sin(a))));
  }
  s.closePath();
  holes.forEach((h) => s.holes.push(h));
  return s;
}
function tube(points, r, seg = 64, radial = 16, closed = false, tension = 0.5) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal', tension);
  return new THREE.TubeGeometry(curve, seg, r, radial, closed);
}
class Helix extends THREE.Curve {
  constructor(r, turns) { super(); this.r = r; this.turns = turns; }
  getPoint(t, o = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return o.set(Math.cos(a) * this.r, t, Math.sin(a) * this.r);
  }
}
/* strip everything but position/normal/uv (and optionally color) so geometries merge */
function norm(g, keepColor = false) {
  if (g.index) g = g.toNonIndexed();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', ...(keepColor ? ['color'] : [])].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  return g;
}

/* registry of pickable/toggleable meshes */
const ALL = [];
function reg(obj, ud) {
  Object.assign(obj.userData, ud);
  obj.traverse((o) => {
    if (o.isMesh) {
      Object.assign(o.userData, ud);
      if (!o.userData.baseMat) o.userData.baseMat = o.material;
      ALL.push(o);
    }
  });
  return obj;
}
class Part {
  constructor() { this.map = new Map(); }
  add(geom, mat, matrix) {
    if (matrix) geom.applyMatrix4(matrix);
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(norm(geom, mat.vertexColors));
    return this;
  }
  build(parent, ud, shadows = true) {
    const out = new THREE.Group();
    for (const [mat, list] of this.map) {
      const g = list.length === 1 ? list[0] : mergeGeometries(list, false);
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      out.add(mesh);
    }
    parent.add(out);
    reg(out, ud);
    return out;
  }
}
/* instanced hex bolts */
const BOLT_GEO = (() => {
  const head = cylY(0.034, 0.034, 0.03, 6).translate(0, 0.015, 0);
  const washer = cylY(0.045, 0.045, 0.008, 20).translate(0, 0.004, 0);
  return mergeGeometries([norm(head), norm(washer)]);
})();
function bolts(parent, list, ud, scale = 1) {
  // list: [position Vector3, normal Vector3]
  const im = new THREE.InstancedMesh(BOLT_GEO, MAT.bolt, list.length);
  const q = new THREE.Quaternion(), up = V3(0, 1, 0), m = new THREE.Matrix4();
  list.forEach(([p, n], i) => {
    q.setFromUnitVectors(up, n.clone().normalize());
    m.compose(p, q, V3(scale, scale, scale));
    im.setMatrixAt(i, m);
  });
  im.castShadow = true;
  im.receiveShadow = true;
  parent.add(im);
  reg(im, ud);
  return im;
}
