// 3D robot viewer: three.js 0.170.0 + urdf-loader 0.12.6 (vendored, see assets/vendor/VENDOR.md).
// <div class="model3d" data-manifest="../models/models.json" data-robot="<id>" data-base="../"> on a robot page.
// Sliders per joint (mm for insertion, degrees for rotation), reset view, replay of a recorded run.
// Exposes window.__viewer3d for the browser tests (tools/shoot_site.py).
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import URDFLoader from "urdf-loader";

const state = { ready: false, error: null, robot: null, playing: false, frame: 0 };
window.__viewer3d = state;

function el(tag, attrs, text) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  return e;
}

async function start(box) {
  const canvasBox = box.querySelector(".m3d-canvas");
  const panel = box.querySelector(".m3d-panel");
  const base = box.dataset.base || "";
  if (location.protocol === "file:") {
    canvasBox.querySelector(".m3d-msg").textContent =
      "The 3D viewer needs the site served over http: cd site_internal && python3 -m http.server 8000";
    state.error = "file-protocol";
    return;
  }
  const manifest = await (await fetch(box.dataset.manifest)).json();
  const entry = manifest.models.find(m => m.robot_id === box.dataset.robot);
  if (!entry) throw new Error("model not in manifest");

  // scene
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f2f2f2");
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(0.6, 1.4, 0.9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 4 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-1, 0.5, -0.8);
  scene.add(fill);

  // robot
  const gltf = new GLTFLoader();
  const loader = new URDFLoader();
  const stl = new STLLoader();
  loader.loadMeshCb = (path, manager, done) => {
    if (/\.stl$/i.test(path)) {      // a model may also ship plain STL meshes
      stl.load(path, geom => { geom.computeVertexNormals(); done(new THREE.Mesh(geom)); }, undefined, err => done(null, err));
      return;
    }
    gltf.load(path, g => {
      let mesh = null;
      g.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
      done(mesh ? new THREE.Mesh(mesh.geometry) : g.scene);
    }, undefined, err => done(null, err));
  };
  const urdfText = await (await fetch(base + entry.urdf)).text();
  const managerDone = new Promise(resolve => { loader.manager.onLoad = resolve; });
  const robot = loader.parse(urdfText, base + entry.urdf.replace(/[^/]+$/, ""));
  await managerDone;
  state.robot = robot;
  robot.traverse(o => {
    if (!o.isMesh) return;
    let link = o;
    while (link && !link.isURDFLink) link = link.parent;
    const hex = (entry.colors || {})[link ? link.name : ""] || "#9a9a9a";
    o.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.62, metalness: 0.04,
                                                  flatShading: true });   // the CAD export is faceted (sliver triangles)
    o.castShadow = true;
    o.receiveShadow = true;
  });
  for (const name in robot.joints) robot.joints[name].ignoreLimits = true;   // the URDF's limits are placeholders
  // device lines: fixed at the module end, the far end moves with the module's insertion (manifest "devices")
  const devices = (entry.devices || []).map(d => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16, 1, false),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(d.color), roughness: 0.45, metalness: 0.1 }));
    mesh.castShadow = true;
    robot.links[d.parent].add(mesh);
    return { d, mesh, near: new THREE.Vector3().fromArray(d.near), far: new THREE.Vector3().fromArray(d.far),
             axis: new THREE.Vector3().fromArray(d.axis) };
  });
  const yAxis = new THREE.Vector3(0, 1, 0);
  function updateDevices() {
    for (const x of devices) {
      const ins = robot.joints[x.d.joint] ? robot.joints[x.d.joint].angle : 0;
      const end = x.far.clone().addScaledVector(x.axis, ins);
      const dir = end.clone().sub(x.near);
      const len = dir.dot(x.far.clone().sub(x.near).normalize());
      x.mesh.visible = len > 1e-4;
      if (!x.mesh.visible) continue;
      x.mesh.position.copy(x.near).addScaledVector(dir, 0.5);
      x.mesh.quaternion.setFromUnitVectors(yAxis, dir.clone().normalize());
      x.mesh.scale.set(Math.max(x.d.radius, 0.0009), dir.length(), Math.max(x.d.radius, 0.0009));
    }
  }
  updateDevices();
  state.devices = devices;
  // base_link's ceiling axis -> world +y
  const up = new THREE.Vector3().fromArray(entry.up_axis || [0, 0, 1]);
  robot.quaternion.setFromUnitVectors(up, new THREE.Vector3(0, 1, 0));
  const holder = new THREE.Group();
  holder.add(robot);
  scene.add(holder);
  const bbox = new THREE.Box3().setFromObject(robot);
  const center = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3()).length();   // (computed before the devices move)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.13 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = bbox.min.y - 0.001;
  ground.receiveShadow = true;
  scene.add(ground);
  key.target = robot;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  // frame the robot plus room on the side where the devices leave it (insertion slides them out)
  const exit = new THREE.Vector3(0, -1, 0).applyQuaternion(robot.quaternion);
  center.addScaledVector(exit, size * 0.08);
  controls.target.copy(center);
  const home = center.clone().add(new THREE.Vector3(0.75, 0.8, 1.15).normalize().multiplyScalar(size * 1.7));
  camera.position.copy(home);
  controls.update();

  canvasBox.innerHTML = "";
  canvasBox.appendChild(renderer.domElement);
  function resize() {
    const w = canvasBox.clientWidth, h = canvasBox.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + "px";
    renderer.domElement.style.height = h + "px";
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvasBox);
  resize();

  // sliders
  const inputs = {};
  const list = el("div", { class: "m3d-joints" });
  for (const j of entry.joints) {
    const row = el("label", { class: "m3d-joint" });
    const head = el("span", { class: "m3d-jl" });
    head.appendChild(el("span", {}, j.label));
    const unit = j.unit === "deg" ? "°" : " " + j.unit;
    const out = el("output", {}, "0" + unit);
    head.appendChild(out);
    const inp = el("input", { type: "range", min: j.min, max: j.max, step: j.step, value: 0, "data-joint": j.name });
    inp.addEventListener("input", () => { stop(); setJoint(j, +inp.value); });
    row.appendChild(head);
    row.appendChild(inp);
    list.appendChild(row);
    inputs[j.name] = { j, inp, out };
  }
  function setJoint(j, shown) {
    robot.setJointValue(j.name, shown / j.scale);
    updateDevices();
    const r = inputs[j.name];
    r.inp.value = shown;
    r.out.textContent = (Math.abs(shown) < 10 ? shown.toFixed(1) : Math.round(shown)) + (j.unit === "deg" ? "°" : " " + j.unit);
  }
  state.setJoint = (name, shown) => setJoint(inputs[name].j, shown);

  const bar = el("div", { class: "m3d-buttons" });
  const reset = el("button", { type: "button" }, "Reset");
  reset.addEventListener("click", () => {
    stop();
    for (const name in inputs) setJoint(inputs[name].j, 0);
    camera.position.copy(home);
    controls.target.copy(center);
    controls.update();
  });
  bar.appendChild(reset);

  // replay
  let rp = null, playBtn = null, clock = el("span", { class: "m3d-clock" }, "");
  const speed = 4;
  let t0 = 0, startWall = 0;
  if (entry.replay) {
    playBtn = el("button", { type: "button", class: "m3d-play" }, "Replay run ×" + speed);
    playBtn.addEventListener("click", async () => {
      if (state.playing) { stop(); return; }
      if (!rp) rp = await (await fetch(base + entry.replay.file)).json();
      if (state.frame >= rp.t.length - 1) state.frame = 0;
      t0 = rp.t[state.frame];
      startWall = performance.now();
      state.playing = true;
      playBtn.textContent = "Pause";
    });
    bar.appendChild(playBtn);
    bar.appendChild(clock);
  }
  function stop() {
    if (!state.playing) return;
    state.playing = false;
    if (playBtn) playBtn.textContent = "Replay run ×" + speed;
  }
  function stepReplay() {
    if (!state.playing || !rp) return;
    const t = t0 + (performance.now() - startWall) / 1000 * speed;
    let k = state.frame;
    while (k < rp.t.length - 1 && rp.t[k + 1] <= t) k++;
    state.frame = k;
    for (const name in inputs) {
      const v = rp.joints[name];
      if (v) setJoint(inputs[name].j, v[k] * inputs[name].j.scale);
    }
    clock.textContent = "t = " + rp.t[k].toFixed(1) + " / " + rp.t[rp.t.length - 1].toFixed(1) + " s";
    if (k >= rp.t.length - 1) stop();
  }

  panel.appendChild(list);
  panel.appendChild(bar);

  renderer.setAnimationLoop(() => {
    stepReplay();
    controls.update();
    renderer.render(scene, camera);
  });
  state.ready = true;
  state.meshes = (() => { let n = 0; robot.traverse(o => { if (o.isMesh) n++; }); return n; })();
}

document.querySelectorAll(".model3d").forEach(box => {
  start(box).catch(err => {
    state.error = String(err);
    console.error(err);
    const msg = box.querySelector(".m3d-msg");
    if (msg) msg.textContent = "The 3D model could not be loaded (" + err + ").";
  });
});
