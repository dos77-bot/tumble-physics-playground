/**
 * Tumble — 3D physics playground
 * three.js + cannon-es, mobile-first touch grab/orbit
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";

const MAX_BODIES = 90;
const FIXED_STEP = 1 / 60;

const MATERIALS = {
  wood:   { color: 0xc4a06a, friction: 0.55, restitution: 0.18, density: 0.55, roughness: 0.75, metalness: 0.05 },
  rubber: { color: 0xc4543a, friction: 0.8,  restitution: 0.82, density: 0.35, roughness: 0.55, metalness: 0.0 },
  metal:  { color: 0x9aa3ab, friction: 0.28, restitution: 0.12, density: 3.2,  roughness: 0.35, metalness: 0.85 },
  ice:    { color: 0xd7e4e8, friction: 0.02, restitution: 0.08, density: 0.92, roughness: 0.15, metalness: 0.2 },
};

const SHAPE_SIZES = {
  box:      [0.72, 0.72, 0.72],
  sphere:   [0.38],
  cylinder: [0.3, 0.78],
  plank:    [1.4, 0.16, 0.42],
};

const state = {
  mat: "wood",
  shape: "box",
  sceneId: "warm",
  gravity: 9.81,
  paused: false,
  slow: false,
  muted: false,
  bodies: [],
  joints: [],
  grabbed: null,
  pieceCount: 0,
};

const canvas = document.getElementById("c");
const boot = document.getElementById("boot");
const helpEl = document.getElementById("help");
const hintEl = document.getElementById("hint");
const noticeEl = document.getElementById("notice");
const sceneLabel = document.getElementById("sceneLabel");
const countEl = document.getElementById("count");
const gVal = document.getElementById("gVal");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x12110e);
scene.fog = new THREE.Fog(0x12110e, 16, 40);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 80);
camera.position.set(8.2, 6.4, 10.6);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.target.set(0, 1.1, 0);
controls.minDistance = 3.5;
controls.maxDistance = 26;
controls.maxPolarAngle = Math.PI / 2 - 0.08;
controls.minPolarAngle = 0.12;
controls.update();

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.defaultContactMaterial.friction = 0.4;
world.defaultContactMaterial.restitution = 0.1;

const cMatCache = {};
function contactPair(a, b) {
  const key = [a, b].sort().join("|");
  if (cMatCache[key]) return cMatCache[key];
  const ma = MATERIALS[a], mb = MATERIALS[b];
  const cm = new CANNON.ContactMaterial(
    getCannonMat(a),
    getCannonMat(b),
    {
      friction: Math.min(ma.friction, mb.friction),
      restitution: Math.max(ma.restitution, mb.restitution) * 0.85,
    }
  );
  world.addContactMaterial(cm);
  cMatCache[key] = cm;
  return cm;
}
const cannonMats = {};
function getCannonMat(name) {
  if (!cannonMats[name]) cannonMats[name] = new CANNON.Material(name);
  return cannonMats[name];
}
["wood", "rubber", "metal", "ice"].forEach((a) => {
  ["wood", "rubber", "metal", "ice"].forEach((b) => {
    if (a <= b) contactPair(a, b);
  });
});

scene.add(new THREE.HemisphereLight(0xf3efe6, 0x3a3228, 0.55));
scene.add(new THREE.AmbientLight(0xffffff, 0.22));
const sun = new THREE.DirectionalLight(0xffe2b8, 2.1);
sun.position.set(7, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12;
sun.shadow.camera.bottom = -12;
sun.shadow.bias = -0.0004;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xc9d4da, 0.35);
fill.position.set(-6, 6, -4);
scene.add(fill);

function addStaticBox(sx, sy, sz, x, y, z, color = 0x3a3832, receive = true) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = receive;
  mesh.castShadow = false;
  mesh.userData.fixed = true;
  scene.add(mesh);
  const body = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)),
    material: getCannonMat("wood"),
  });
  body.position.set(x, y, z);
  world.addBody(body);
  return { mesh, body };
}

addStaticBox(28, 0.6, 28, 0, -0.3, 0, 0x3a3832);
const curbH = 0.7, curbT = 0.35, half = 7.2;
addStaticBox(half * 2 + curbT * 2, curbH, curbT, 0, curbH / 2, half, 0x2a2824);
addStaticBox(half * 2 + curbT * 2, curbH, curbT, 0, curbH / 2, -half, 0x2a2824);
addStaticBox(curbT, curbH, half * 2, half, curbH / 2, 0, 0x2a2824);
addStaticBox(curbT, curbH, half * 2, -half, curbH / 2, 0, 0x2a2824);

const grid = new THREE.GridHelper(24, 24, 0xe8a04a, 0x3a342c);
grid.position.y = 0.01;
grid.material.opacity = 0.35;
grid.material.transparent = true;
scene.add(grid);

let audioCtx = null;
function unlockAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}
let lastThunk = 0;
function thunk(force) {
  if (state.muted || !audioCtx || audioCtx.state !== "running") return;
  const now = performance.now();
  if (now - lastThunk < 50) return;
  lastThunk = now;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const f = audioCtx.createBiquadFilter();
  o.type = "triangle";
  o.frequency.value = 80 + Math.min(force, 12) * 8;
  f.type = "lowpass";
  f.frequency.value = 500;
  const vol = Math.min(0.22, 0.03 + force * 0.015);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(f); f.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + 0.14);
}
world.addEventListener("beginContact", (e) => {
  const force = Math.max(e.bodyA.velocity.length(), e.bodyB.velocity.length());
  if (force > 1.4) thunk(force);
});

function uid() { return "b" + Math.random().toString(36).slice(2, 9); }

function createPiece({
  id = uid(), shape = "box", mat = "wood", position = [0, 2, 0], rotation = [0, 0, 0],
  size = null, fixed = false, density = null, restitution = null, friction = null, color = null,
}) {
  const mdef = MATERIALS[mat] || MATERIALS.wood;
  const dens = density ?? mdef.density;
  const col = color ?? mdef.color;
  let mesh, shape3, mass;

  if (shape === "sphere") {
    const r = (size && size[0]) || SHAPE_SIZES.sphere[0];
    mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), new THREE.MeshStandardMaterial({ color: col, roughness: mdef.roughness, metalness: mdef.metalness }));
    shape3 = new CANNON.Sphere(r);
    mass = dens * (4 / 3) * Math.PI * r * r * r;
  } else if (shape === "cylinder") {
    const r = (size && size[0]) || SHAPE_SIZES.cylinder[0];
    const h = (size && size[1]) || SHAPE_SIZES.cylinder[1];
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), new THREE.MeshStandardMaterial({ color: col, roughness: mdef.roughness, metalness: mdef.metalness }));
    shape3 = new CANNON.Cylinder(r, r, h, 16);
    mass = dens * Math.PI * r * r * h;
  } else {
    const s = size || (shape === "plank" ? SHAPE_SIZES.plank : SHAPE_SIZES.box);
    const [sx, sy, sz] = s;
    mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshStandardMaterial({ color: col, roughness: mdef.roughness, metalness: mdef.metalness }));
    shape3 = new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2));
    mass = dens * sx * sy * sz;
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.userData.id = id;
  mesh.userData.fixed = fixed;
  scene.add(mesh);

  const body = new CANNON.Body({
    mass: fixed ? 0 : Math.max(0.05, mass),
    material: getCannonMat(mat),
    shape: shape3,
    linearDamping: 0.08,
    angularDamping: 0.12,
    allowSleep: true,
  });
  body.position.set(position[0], position[1], position[2]);
  body.quaternion.setFromEuler(rotation[0], rotation[1], rotation[2], "XYZ");
  world.addBody(body);

  const entry = { id, mesh, body, mat, dynamic: !fixed, shape };
  state.bodies.push(entry);
  if (!fixed) state.pieceCount++;
  updateCount();
  return entry;
}

function clearDynamics() {
  for (const c of state.joints) world.removeConstraint(c);
  state.joints = [];
  for (const e of state.bodies) {
    scene.remove(e.mesh);
    e.mesh.geometry?.dispose();
    if (e.mesh.material) e.mesh.material.dispose();
    world.removeBody(e.body);
  }
  state.bodies = [];
  state.pieceCount = 0;
  state.grabbed = null;
  updateCount();
}

function updateCount() {
  countEl.textContent = state.pieceCount + (state.pieceCount === 1 ? " piece" : " pieces");
}

function flash(msg) {
  noticeEl.textContent = msg;
  noticeEl.hidden = false;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => { noticeEl.hidden = true; }, 2200);
}

const SCENES = {
  warm: {
    name: "Warm-up",
    build() {
      createPiece({ shape: "box", mat: "wood", position: [-0.8, 0.36, 0] });
      createPiece({ shape: "box", mat: "wood", position: [0, 0.36, 0.2] });
      createPiece({ shape: "box", mat: "wood", position: [-0.4, 1.1, 0.1] });
      createPiece({ shape: "sphere", mat: "rubber", position: [1.2, 0.38, 0.4] });
      createPiece({ shape: "sphere", mat: "metal", position: [2.1, 0.36, -0.6] });
      createPiece({ shape: "cylinder", mat: "ice", position: [-1.8, 0.4, 1] });
    },
  },
  tower: {
    name: "Tower",
    build() {
      const h = 0.16, gap = 0.004;
      for (let layer = 0; layer < 12; layer++) {
        const y = h / 2 + layer * (h + gap);
        const rotY = layer % 2 === 0 ? 0 : Math.PI / 2;
        for (let i = -1; i <= 1; i++) {
          const along = i * 0.5;
          const pos = rotY === 0 ? [along, y, 0] : [0, y, along];
          createPiece({ shape: "plank", mat: "wood", position: pos, rotation: [0, rotY, 0], size: [1.55, h, 0.48] });
        }
      }
      createPiece({ shape: "sphere", mat: "metal", position: [2.4, 0.42, 1.6] });
    },
  },
  dominos: {
    name: "Dominos",
    build() {
      for (let i = 0; i < 24; i++) {
        createPiece({ shape: "box", mat: "wood", position: [0, 0.46, -2.2 + i * 0.42], size: [0.46, 0.92, 0.08] });
      }
      createPiece({ shape: "sphere", mat: "rubber", position: [0, 0.4, -3.3] });
    },
  },
  bowl: {
    name: "Bowling",
    build() {
      const spacing = 0.46;
      for (let row = 0; row < 4; row++) {
        for (let i = 0; i <= row; i++) {
          const x = (i - row / 2) * spacing;
          const z = -2 - row * spacing * 0.9;
          createPiece({ shape: "cylinder", mat: "wood", position: [x, 0.36, z], size: [0.15, 0.72] });
        }
      }
      createPiece({ shape: "sphere", mat: "metal", position: [0, 0.3, 3.2], size: [0.28] });
      createPiece({ shape: "box", mat: "wood", position: [1.35, 0.09, 0.5], size: [0.2, 0.18, 8], fixed: true, color: 0x2a2824 });
      createPiece({ shape: "box", mat: "wood", position: [-1.35, 0.09, 0.5], size: [0.2, 0.18, 8], fixed: true, color: 0x2a2824 });
    },
  },
  pyramid: {
    name: "Pyramid",
    build() {
      const s = 0.62;
      for (let layer = 0; layer < 4; layer++) {
        const count = 4 - layer;
        const y = s / 2 + layer * s;
        for (let i = 0; i < count; i++) {
          for (let j = 0; j < count; j++) {
            const x = (i - (count - 1) / 2) * s;
            const z = (j - (count - 1) / 2) * s;
            createPiece({ shape: "box", mat: "wood", position: [x, y, z], size: [s * 0.98, s * 0.98, s * 0.98] });
          }
        }
      }
      createPiece({ shape: "sphere", mat: "metal", position: [2.6, 0.4, 2.2] });
    },
  },
  cradle: {
    name: "Cradle",
    build() {
      const n = 5, r = 0.26, spacing = r * 2 + 0.01, L = 1.7, barY = 3.4;
      const bar = createPiece({ shape: "plank", mat: "metal", position: [0, barY, 0], size: [spacing * n + 0.4, 0.12, 0.12], fixed: true });
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * spacing;
        const ang = i === 0 ? -0.55 : 0;
        const py = barY - 0.06 - Math.cos(ang) * L;
        const pz = Math.sin(ang) * L;
        const ball = createPiece({ shape: "sphere", mat: "metal", position: [x, py, pz], rotation: [-ang, 0, 0], size: [r], density: 1.2, restitution: 0.92, friction: 0.02 });
        const c = new CANNON.PointToPointConstraint(bar.body, new CANNON.Vec3(x, -0.06, 0), ball.body, new CANNON.Vec3(0, L, 0));
        world.addConstraint(c);
        state.joints.push(c);
      }
    },
  },
  wreck: {
    name: "Wrecking",
    build() {
      const bw = 0.46, bh = 0.28, bd = 0.28;
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
          const offset = row % 2 === 0 ? 0 : bw / 2;
          const x = (col - 3) * bw + offset;
          if (Math.abs(x) > 1.8) continue;
          const y = bh / 2 + row * bh;
          createPiece({ shape: "box", mat: "wood", position: [x, y, 0.1], size: [bw * 0.96, bh * 0.96, bd] });
        }
      }
      const pivotY = 5.2, pivotZ = 2.4, L = 3.5, ang = 0.85;
      const hook = createPiece({ shape: "box", mat: "metal", position: [0, pivotY, pivotZ], size: [0.25, 0.25, 0.25], fixed: true });
      const cy = pivotY - Math.cos(ang) * L;
      const cz = pivotZ + Math.sin(ang) * L;
      const ball = createPiece({ shape: "sphere", mat: "metal", position: [0, cy, cz], rotation: [-ang, 0, 0], size: [0.55], density: 4 });
      const c = new CANNON.PointToPointConstraint(hook.body, new CANNON.Vec3(0, -0.12, 0), ball.body, new CANNON.Vec3(0, 0.55, 0));
      world.addConstraint(c);
      state.joints.push(c);
    },
  },
  ramps: {
    name: "Ramps",
    build() {
      createPiece({ shape: "box", mat: "wood", position: [-2.2, 2.2, 1.2], size: [1.8, 0.14, 1.6], fixed: true, color: 0x4a453c });
      createPiece({ shape: "box", mat: "wood", position: [-1.2, 1.3, 0.2], rotation: [0.45, 0.15, 0], size: [1.2, 0.12, 3.0], fixed: true, color: 0x4a453c });
      createPiece({ shape: "box", mat: "wood", position: [1.0, 0.7, -0.6], rotation: [-0.38, -0.25, 0], size: [1.2, 0.12, 2.8], fixed: true, color: 0x4a453c });
      createPiece({ shape: "sphere", mat: "rubber", position: [-2.4, 2.6, 1.4] });
      createPiece({ shape: "sphere", mat: "wood", position: [-2.0, 2.6, 1.0] });
      createPiece({ shape: "sphere", mat: "ice", position: [-1.7, 2.6, 1.5] });
      createPiece({ shape: "sphere", mat: "metal", position: [-2.2, 2.6, 0.8] });
    },
  },
};

function loadScene(id) {
  const def = SCENES[id] || SCENES.warm;
  state.sceneId = id;
  sceneLabel.textContent = def.name;
  clearDynamics();
  def.build();
  document.querySelectorAll(".scene-chip").forEach((el) => {
    el.classList.toggle("active", el.dataset.scene === id);
  });
}

function spawn() {
  if (state.pieceCount >= MAX_BODIES) { flash("Yard is full — clear a few pieces"); return; }
  const x = (Math.random() - 0.5) * 1.2;
  const z = (Math.random() - 0.5) * 1.2;
  createPiece({
    shape: state.shape, mat: state.mat,
    position: [x, 3.4 + Math.random() * 0.6, z],
    rotation: [Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4],
  });
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const hitPoint = new THREE.Vector3();
const plane = new THREE.Plane();
const planeHit = new THREE.Vector3();
const camDir = new THREE.Vector3();

function setNDC(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX ?? (e.touches && e.touches[0]?.clientX);
  const cy = e.clientY ?? (e.touches && e.touches[0]?.clientY);
  if (cx == null) return false;
  ndc.x = ((cx - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((cy - rect.top) / rect.height) * 2 + 1;
  return true;
}

function onPointerDown(e) {
  if (e.button != null && e.button !== 0) return;
  unlockAudio();
  if (!setNDC(e)) return;
  raycaster.setFromCamera(ndc, camera);
  const meshes = state.bodies.filter((b) => b.dynamic).map((b) => b.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return;
  const mesh = hits[0].object;
  const entry = state.bodies.find((b) => b.mesh === mesh);
  if (!entry || !entry.dynamic) return;
  e.preventDefault();
  e.stopPropagation();
  controls.enabled = false;
  hitPoint.copy(hits[0].point);
  camera.getWorldDirection(camDir);
  plane.setFromNormalAndCoplanarPoint(camDir.clone().negate(), hitPoint);
  state.grabbed = { entry, plane: plane.clone(), last: hitPoint.clone(), lastT: performance.now() };
  mesh.material.emissive = new THREE.Color(0xe8a04a);
  mesh.material.emissiveIntensity = 0.35;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
}

function onPointerMove(e) {
  const g = state.grabbed;
  if (!g) return;
  if (!setNDC(e)) return;
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(g.plane, planeHit)) return;
  const body = g.entry.body;
  const target = planeHit;
  const pos = body.position;
  const vel = body.velocity;
  const k = 55, damp = 10, maxF = 40;
  const ix = (target.x - pos.x) * k - vel.x * damp;
  const iy = (target.y - pos.y) * k - vel.y * damp;
  const iz = (target.z - pos.z) * k - vel.z * damp;
  body.force.x += THREE.MathUtils.clamp(ix, -maxF, maxF) * body.mass;
  body.force.y += THREE.MathUtils.clamp(iy, -maxF, maxF) * body.mass;
  body.force.z += THREE.MathUtils.clamp(iz, -maxF, maxF) * body.mass;
  body.wakeUp();
  g.last.copy(target);
  g.lastT = performance.now();
}

function onPointerUp(e) {
  const g = state.grabbed;
  if (!g) return;
  const mat = g.entry.mesh.material;
  mat.emissive = new THREE.Color(0x000000);
  mat.emissiveIntensity = 0;
  state.grabbed = null;
  controls.enabled = true;
  try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
}

canvas.addEventListener("pointerdown", onPointerDown, { capture: true });
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

document.querySelectorAll("#materials .chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.mat = btn.dataset.mat;
    document.querySelectorAll("#materials .chip").forEach((b) => b.classList.toggle("active", b === btn));
  });
});
document.querySelectorAll("#shapes .shape-btn[data-shape]").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.shape = btn.dataset.shape;
    document.querySelectorAll("#shapes .shape-btn[data-shape]").forEach((b) => b.classList.toggle("active", b === btn));
  });
});
document.getElementById("btnSpawn").addEventListener("click", () => { unlockAudio(); spawn(); });
document.querySelectorAll(".scene-chip").forEach((btn) => {
  btn.addEventListener("click", () => { unlockAudio(); loadScene(btn.dataset.scene); });
});

const gravSlider = document.getElementById("gravity");
gravSlider.addEventListener("input", () => {
  state.gravity = parseFloat(gravSlider.value);
  world.gravity.y = -state.gravity;
  gVal.textContent = (state.gravity / 9.81).toFixed(2) + "g";
});

document.getElementById("btnSlow").addEventListener("click", () => {
  state.slow = !state.slow;
  document.getElementById("btnSlow").classList.toggle("active", state.slow);
});
document.getElementById("btnClear").addEventListener("click", () => { clearDynamics(); flash("Yard cleared"); });
document.getElementById("btnReload").addEventListener("click", () => { unlockAudio(); loadScene(state.sceneId); });
document.getElementById("btnPause").addEventListener("click", () => {
  state.paused = !state.paused;
  document.getElementById("btnPause").textContent = state.paused ? "▶" : "⏸";
});
document.getElementById("btnMute").addEventListener("click", () => {
  state.muted = !state.muted;
  document.getElementById("btnMute").textContent = state.muted ? "🔇" : "🔊";
});

function openHelp() { helpEl.hidden = false; }
function closeHelp() {
  helpEl.hidden = true;
  try { localStorage.setItem("tumble-help-seen", "1"); } catch (_) {}
}
document.getElementById("btnHelp").addEventListener("click", openHelp);
document.getElementById("btnCloseHelp").addEventListener("click", closeHelp);
document.getElementById("btnGotIt").addEventListener("click", closeHelp);

window.addEventListener("keydown", (e) => {
  if (e.target.matches("input,textarea")) return;
  if (e.key === "Escape") closeHelp();
  if (e.key === "?" || e.key === "h" || e.key === "H") openHelp();
  if (e.key === " ") {
    e.preventDefault();
    state.paused = !state.paused;
    document.getElementById("btnPause").textContent = state.paused ? "▶" : "⏸";
  }
  if (e.key === "r" || e.key === "R") loadScene(state.sceneId);
});

let acc = 0;
let last = performance.now();

function tick(now) {
  const raw = Math.min((now - last) / 1000, 0.1);
  last = now;
  const scale = state.slow ? 0.35 : 1;
  if (!state.paused) {
    acc += raw * scale;
    let guard = 0;
    while (acc >= FIXED_STEP && guard++ < 5) {
      world.step(FIXED_STEP);
      acc -= FIXED_STEP;
    }
  }
  for (const e of state.bodies) {
    e.mesh.position.copy(e.body.position);
    e.mesh.quaternion.copy(e.body.quaternion);
    if (e.dynamic && e.body.position.y < -4) {
      scene.remove(e.mesh);
      e.mesh.geometry?.dispose();
      e.mesh.material?.dispose();
      world.removeBody(e.body);
      state.bodies = state.bodies.filter((x) => x !== e);
      state.pieceCount = Math.max(0, state.pieceCount - 1);
      updateCount();
    }
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function onResize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", onResize);

loadScene("warm");
try {
  if (!localStorage.getItem("tumble-help-seen")) openHelp();
} catch (_) { openHelp(); }
setTimeout(() => { hintEl.classList.add("fade"); }, 8000);
requestAnimationFrame(tick);
requestAnimationFrame(() => {
  boot.classList.add("hide");
  setTimeout(() => { boot.hidden = true; }, 500);
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
