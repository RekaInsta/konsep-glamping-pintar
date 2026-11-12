// Penampil 3D alat glamping pintar. Kartu memakai gambar render (img/alat-N.webp, ringan); tombol "Putar 3D"
// membuka model interaktif. Model disusun dari bentuk dasar (bukan file model). Three.js baru diunduh saat jendela
// pertama kali dibuka. Mode ?snap dipakai untuk membuat gambar kartu (960x600, tanpa putar otomatis).
// Pola sama dengan halaman konsep jalur potong (konsep-jalur-potong/alat3d.js), bahan & alat diganti untuk tenda.
const dlg = document.getElementById('v3d');
const figs = [...document.querySelectorAll('#alat-grid figure')];
const capDi = document.getElementById('v3d-di');
const capNama = document.getElementById('v3d-nama');
const capKet = document.getElementById('v3d-ket');
const loadEl = document.getElementById('v3d-load');
const SNAP = new URLSearchParams(location.search).has('snap');

function punyaWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
}

let current = 0;
let engine = null;
function setCaption(i) {
  const f = figs[i];
  capDi.textContent = f.querySelector('.di').textContent;
  capNama.textContent = f.querySelector('b').textContent;
  capKet.textContent = f.querySelector('p').textContent;
}
async function open(i) {
  current = (i + figs.length) % figs.length;
  setCaption(current);
  if (!dlg.open) dlg.showModal();
  if (!engine) engine = start().catch((err) => { console.error(err); loadEl.textContent = 'Model 3D tidak bisa dimuat di perangkat ini.'; return null; });
  const e = await engine;
  if (e) e.show(current);
}

if (punyaWebGL() && dlg && typeof dlg.showModal === 'function') {
  document.querySelectorAll('.putar').forEach((b) => { b.hidden = false; b.addEventListener('click', () => open(Number(b.dataset.i))); });
  document.getElementById('v3d-tutup').addEventListener('click', () => dlg.close());
  document.getElementById('v3d-prev').addEventListener('click', () => open(current - 1));
  document.getElementById('v3d-next').addEventListener('click', () => open(current + 1));
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
  if (SNAP) { document.documentElement.classList.add('snap'); window.__pilih = (i) => open(i); window.__frame = 0; }
}

async function start() {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  try { await document.fonts.ready; } catch (e) {}

  const canvas = document.getElementById('v3d-canvas');
  const stage = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: SNAP });
  renderer.setPixelRatio(SNAP ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.45;
  let idle;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idle); });
  controls.addEventListener('end', () => { idle = setTimeout(() => { controls.autoRotate = true; }, 4000); });

  const key = new THREE.DirectionalLight(0xfff1dd, 2.2);
  key.position.set(2.2, 4.2, 2.8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: 0.5, far: 12 });
  key.shadow.bias = -0.0006;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xf2e6d2, 0x13201b, 0.65));
  const rim = new THREE.DirectionalLight(0xf4b860, 1.3); rim.position.set(-3, 2.6, -3.2); scene.add(rim);
  const fillL = new THREE.DirectionalLight(0xcfe3d6, 0.45); fillL.position.set(-3, 1.2, 2.5); scene.add(fillL);

  // lantai studio: piringan pudar ke tepi + bayangan saja
  const fade = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256); gr.addColorStop(0, 'rgba(64,74,62,0.95)'); gr.addColorStop(0.55, 'rgba(40,52,44,0.6)'); gr.addColorStop(1, 'rgba(26,36,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(244,184,96,0.12)'; g.lineWidth = 2; for (const r of [120, 190]) { g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.001; scene.add(disc);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.45 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.002; floor.receiveShadow = true; scene.add(floor);

  // ---------- bahan ----------
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glow = (c, k = 0.9) => std({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.4 });
  const M = {
    kayu: std({ color: 0xa67a4f, roughness: 0.75 }),
    kayuMuda: std({ color: 0xb48a5d, roughness: 0.75 }),
    kayuTua: std({ color: 0x4e3422, roughness: 0.7 }),
    krem: std({ color: 0xefe8da, roughness: 0.6 }),
    putih: std({ color: 0xf6f3ec, roughness: 0.45 }),
    hitam: std({ color: 0x1f2522, roughness: 0.5 }),
    abu: std({ color: 0x5d675f, roughness: 0.55 }),
    kuningan: std({ color: 0xb98a3c, metalness: 0.85, roughness: 0.32 }),
    tembaga: std({ color: 0xb8693a, metalness: 0.8, roughness: 0.35 }),
    baja: std({ color: 0xc8cfd5, metalness: 0.85, roughness: 0.3 }),
    kain: std({ color: 0xe6dccb, roughness: 0.95 }),
    selimut: std({ color: 0x5e7f45, roughness: 0.95 }),
    selimutTua: std({ color: 0x4a6a37, roughness: 0.95 }),
    bantal: std({ color: 0xf2ece0, roughness: 0.95 }),
    keramik: std({ color: 0x8fa39a, roughness: 0.5 }),
    kaca: std({ color: 0xbcd6dc, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, depthWrite: false }),
    hangat: glow(0xf4b860, 0.85),
    senja: glow(0xee8455, 0.8),
    bulan: glow(0xa9c9ec, 0.8),
    hijau: glow(0x7bd88f, 1.6),
    merahMati: std({ color: 0x5a2a27, roughness: 0.35 }),
    kabel: std({ color: 0x2e3632, roughness: 0.5 }),
  };

  // ---------- bentuk dasar ----------
  const shade = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); return m; };
  const rbox = (w, h, d, r, mat, x = 0, y = 0, z = 0) => {
    const s = new THREE.Shape(); const hw = w / 2 - r, hh = h / 2 - r;
    s.moveTo(-hw, -h / 2); s.lineTo(hw, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -hh); s.lineTo(w / 2, hh); s.quadraticCurveTo(w / 2, h / 2, hw, h / 2);
    s.lineTo(-hw, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, hh); s.lineTo(-w / 2, -hh); s.quadraticCurveTo(-w / 2, -h / 2, -hw, -h / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -d / 2);
    const m = shade(new THREE.Mesh(g, mat)); m.position.set(x, y, z); return m;
  };
  const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 28) => { const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)); m.position.set(x, y, z); return m; };
  const sph = (r, mat, x = 0, y = 0, z = 0) => { const m = shade(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat)); m.position.set(x, y, z); return m; };
  const tube = (pts, r, mat) => shade(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 64, r, 8, false), mat));

  function tex(cw, ch, draw) {
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d'); draw(g, cw, ch);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const SANS = 'Figtree, system-ui, sans-serif';
  const SERIF = 'Lora, Georgia, serif';
  function plane(w, h, map) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, toneMapped: false })); }
  function layar(teks, { fg = '#F4B860', bg = '#14201B', w = 0.2, h = 0.08, size = 64, font = SANS } = {}) {
    const cw = 320, ch = Math.round(320 * h / w);
    return plane(w, h, tex(cw, ch, (g) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.fillStyle = fg; g.font = `600 ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(teks, cw / 2, ch / 2 + 2); }));
  }
  // dinding papan kayu (berselang warna supaya terbaca sebagai papan)
  function dindingPapan(w, h, x, y, z, n = 9) {
    const g = new THREE.Group(); const pw = w / n;
    g.add(box(w, h, 0.02, M.kayuTua, x, y, z - 0.012));
    for (let i = 0; i < n; i++) g.add(box(pw - 0.01, h, 0.04, [M.kayu, M.kayuMuda, M.kayu, M.kayuMuda, M.kayuMuda][i % 5], x - w / 2 + pw * (i + 0.5), y, z));
    return g;
  }
  // layar HP: teks tamu (panel tenda)
  const layarHpTamu = () => tex(300, 600, (c, w, h) => {
    c.fillStyle = '#FFFDF8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1E2823'; c.font = `600 30px ${SERIF}`; c.fillText('Tenda Kabut 3', 22, 60);
    c.fillStyle = '#5D675F'; c.font = `500 18px ${SANS}`; c.fillText('Lampu', 22, 104);
    [['#F4B860', 'Hangat'], ['#EE8455', 'Senja'], ['#A9C9EC', 'Bulan']].forEach(([col, t], i) => {
      const x = 22 + i * 88; c.strokeStyle = i === 0 ? '#1E2823' : '#D9D0BE'; c.lineWidth = i === 0 ? 3 : 1.5; c.strokeRect(x, 116, 78, 78);
      c.fillStyle = col; c.beginPath(); c.arc(x + 39, 144, 13, 0, 7); c.fill(); c.fillStyle = '#1E2823'; c.font = `500 15px ${SANS}`; c.textAlign = 'center'; c.fillText(t, x + 39, 182); c.textAlign = 'left'; });
    [['Pemanas', true], ['Jendela buram', false]].forEach(([t, on], i) => { const y = 232 + i * 64; c.fillStyle = '#1E2823'; c.font = `600 20px ${SANS}`; c.fillText(t, 22, y + 26);
      c.fillStyle = on ? '#2F4A3A' : '#CFC8B8'; c.beginPath(); c.roundRect(214, y + 6, 62, 32, 16); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(on ? 260 : 230, y + 22, 12, 0, 7); c.fill(); });
    c.fillStyle = '#5D675F'; c.font = `500 18px ${SANS}`; c.fillText('Pesan ke petugas', 22, 384);
    ['Api unggun', 'Bandrek', 'Sarapan', 'Petik teh'].forEach((t, i) => { const x = 22 + (i % 2) * 132, y = 398 + Math.floor(i / 2) * 70; c.fillStyle = i === 0 ? '#13201B' : '#ECE5D6'; c.beginPath(); c.roundRect(x, y, 122, 58, 10); c.fill();
      c.fillStyle = i === 0 ? '#F5F1E8' : '#1E2823'; c.font = `500 17px ${SANS}`; c.textAlign = 'center'; c.fillText(t, x + 61, y + 35); c.textAlign = 'left'; });
  });

  // ---------- 8 alat ----------
  function kunciPintu() {
    const g = new THREE.Group();
    g.add(box(1.4, 0.06, 0.8, M.kayuTua, 0, 0.03, 0.2));                      // lantai dek
    for (let i = 0; i < 6; i++) g.add(box(1.38, 0.004, 0.006, M.hitam, 0, 0.061, -0.17 + i * 0.13));
    g.add(box(0.08, 2.0, 0.12, M.kayuTua, -0.5, 1.0, 0)); g.add(box(0.08, 2.0, 0.12, M.kayuTua, 0.5, 1.0, 0)); g.add(box(1.08, 0.08, 0.12, M.kayuTua, 0, 2.0, 0));
    const daun = dindingPapan(0.9, 1.9, 0, 1.0, 0, 6); g.add(daun);
    g.add(box(0.9, 0.04, 0.05, M.kayuTua, 0, 1.45, 0.02)); g.add(box(0.9, 0.04, 0.05, M.kayuTua, 0, 0.55, 0.02));
    // badan kunci + tombol
    const kx = 0.33, ky = 1.06, kz = 0.03;
    g.add(rbox(0.1, 0.32, 0.035, 0.02, M.hitam, kx, ky, kz));
    const pad = plane(0.072, 0.17, tex(144, 340, (c, w, h) => { c.fillStyle = '#121a16'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#F4B860'; c.font = `600 34px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '✓'].forEach((d, i) => c.fillText(d, 26 + (i % 3) * 46, 34 + Math.floor(i / 3) * 84)); }));
    pad.position.set(kx, ky + 0.04, kz + 0.0185); g.add(pad);
    g.add(sph(0.008, M.hijau, kx, ky + 0.145, kz + 0.018));
    // gagang tuas kuningan
    g.add(cyl(0.025, 0.025, 0.03, M.kuningan, kx, ky - 0.2, kz + 0.02).rotateX(Math.PI / 2));
    g.add(box(0.15, 0.022, 0.022, M.kuningan, kx - 0.07, ky - 0.2, kz + 0.045));
    g.add(cyl(0.012, 0.012, 0.012, M.kuningan, kx, ky - 0.29, kz + 0.02).rotateX(Math.PI / 2)); // lubang kunci cadangan
    // kartu cadangan petugas melayang di depan
    const kartu = rbox(0.085, 0.054, 0.004, 0.006, M.krem, kx + 0.2, ky + 0.02, 0.22); kartu.rotation.y = -0.5; g.add(kartu);
    const logo = layar('Petugas', { fg: '#2F4A3A', bg: '#EFE8DA', w: 0.07, h: 0.02, size: 56 }); logo.position.set(kx + 0.2 + 0.001, ky + 0.025, 0.2225); logo.rotation.y = -0.5; g.add(logo);
    // lentera dinding
    g.add(box(0.03, 0.03, 0.08, M.hitam, -0.5, 1.62, 0.09)); g.add(box(0.08, 0.13, 0.08, M.hitam, -0.5, 1.55, 0.16)); g.add(box(0.06, 0.09, 0.06, M.hangat, -0.5, 1.55, 0.16));
    const pl = new THREE.PointLight(0xf4b860, 0.6, 1.2); pl.position.set(-0.5, 1.55, 0.3); g.add(pl);
    return g;
  }

  function platQr() {
    const g = new THREE.Group();
    g.add(dindingPapan(1.3, 1.5, 0, 0.75, -0.25, 8));
    const px = -0.18, py = 1.0;
    g.add(rbox(0.3, 0.4, 0.02, 0.03, M.kayuTua, px, py, -0.22));
    const qr = plane(0.26, 0.36, tex(260, 360, (c, w, h) => {
      c.fillStyle = '#4E3422'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#EFE8DA'; c.font = `600 22px ${SERIF}`; c.textAlign = 'center'; c.fillText('Tenda Kabut 3', w / 2, 34);
      const ox = 40, oy = 52, n = 21, s = 180 / n; c.fillStyle = '#EFE8DA'; c.fillRect(ox - 8, oy - 8, 196, 196); c.fillStyle = '#2A1C12';
      let r = 7; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { r = (r * 9301 + 49297) % 233280; if (r / 233280 > 0.52) c.fillRect(ox + i * s, oy + j * s, s, s); }
      for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) { c.fillStyle = '#2A1C12'; c.fillRect(ox + fx * s, oy + fy * s, 7 * s, 7 * s); c.fillStyle = '#EFE8DA'; c.fillRect(ox + (fx + 1) * s, oy + (fy + 1) * s, 5 * s, 5 * s); c.fillStyle = '#2A1C12'; c.fillRect(ox + (fx + 2) * s, oy + (fy + 2) * s, 3 * s, 3 * s); }
      c.fillStyle = '#EFE8DA'; c.font = `500 15px ${SANS}`; c.fillText('Pindai dengan HP:', w / 2, 282); c.fillText('lampu, pemanas, tirai,', w / 2, 304); c.fillText('dan pesan ke petugas', w / 2, 326);
    }));
    qr.position.set(px, py, -0.209); g.add(qr);
    // HP tamu memindai
    const hp = new THREE.Group();
    hp.add(rbox(0.16, 0.32, 0.016, 0.018, M.hitam));
    const s = plane(0.146, 0.292, layarHpTamu()); s.position.z = 0.0085; hp.add(s);
    hp.scale.setScalar(1.35); hp.position.set(0.3, 1.0, 0.18); hp.rotation.set(-0.08, -0.45, 0.04); g.add(hp);
    // garis pindai
    const sinar = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.012), new THREE.MeshBasicMaterial({ color: 0xf4b860, transparent: true, opacity: 0.8 }));
    sinar.position.set(0.05, 1.0, 0.0); sinar.rotation.y = -0.55; g.add(sinar);
    // meja kecil + lampu tidur
    g.add(box(0.36, 0.04, 0.3, M.kayu, -0.3, 0.55, 0.0)); g.add(box(0.32, 0.5, 0.26, M.kayuMuda, -0.3, 0.28, 0.0));
    g.add(cyl(0.04, 0.05, 0.12, M.krem, -0.36, 0.63, 0.0)); g.add(cyl(0.08, 0.1, 0.1, M.kain, -0.36, 0.74, 0.0));
    return g;
  }

  function lampuSuasana() {
    const g = new THREE.Group();
    // rangka segitiga kabin (dua balok miring)
    const b1 = box(0.1, 2.3, 0.1, M.kayuTua, -0.55, 1.0, -0.25); b1.rotation.z = -0.5; g.add(b1);
    const b2 = box(0.1, 2.3, 0.1, M.kayuTua, 0.55, 1.0, -0.25); b2.rotation.z = 0.5; g.add(b2);
    g.add(box(1.4, 0.08, 0.1, M.kayuTua, 0, 1.55, -0.25));                     // balok melintang
    [[-0.38, 0.95, glow(0xff9f2e, 0.55), 0xf4b860], [0, 0.82, glow(0xff5f3a, 0.55), 0xee8455], [0.38, 1.02, glow(0x5f9cff, 0.6), 0xa9c9ec]].forEach(([x, y, m, col]) => {
      g.add(cyl(0.004, 0.004, 1.55 - y, M.kabel, x, (1.55 + y) / 2 + 0.06, -0.25, 6));
      g.add(cyl(0.025, 0.03, 0.05, M.kuningan, x, y + 0.11, -0.25));
      const bohlam = sph(0.075, m, x, y, -0.25); bohlam.scale.set(1, 1.2, 1); g.add(bohlam);
      const pl = new THREE.PointLight(col, 0.9, 1.6); pl.position.set(x, y - 0.05, -0.1); g.add(pl);
    });
    // lampu strip di bawah rak
    g.add(box(1.0, 0.04, 0.22, M.kayu, 0, 0.42, -0.2));
    g.add(box(0.96, 0.012, 0.012, M.hangat, 0, 0.395, -0.11));
    for (const x of [-0.45, 0.45]) g.add(box(0.04, 0.42, 0.2, M.kayu, x, 0.21, -0.2));
    // colokan pintar
    g.add(rbox(0.07, 0.07, 0.04, 0.012, M.putih, 0.55, 0.12, -0.28)); g.add(sph(0.006, M.hijau, 0.57, 0.14, -0.258));
    return g;
  }

  function pemanas() {
    const g = new THREE.Group();
    g.add(dindingPapan(1.8, 1.4, 0, 0.7, -0.6, 10));
    // kasur
    g.add(box(1.3, 0.3, 1.0, M.kayu, -0.15, 0.15, -0.05));
    g.add(box(1.24, 0.14, 0.94, M.bantal, -0.15, 0.37, -0.05));
    g.add(box(0.9, 0.06, 0.96, M.selimut, 0.06, 0.47, -0.05));
    g.add(box(0.06, 0.08, 0.96, M.selimutTua, -0.4, 0.47, -0.05));
    for (const z of [-0.3, 0.2]) { const b = box(0.28, 0.1, 0.36, M.bantal, -0.62, 0.5, z - 0.05); b.rotation.z = 0.15; g.add(b); }
    g.add(box(0.12, 0.9, 1.04, M.kayuTua, -0.82, 0.45, -0.05));                 // sandaran kepala
    // kabel selimut listrik ke colokan pintar
    g.add(tube([[0.5, 0.44, 0.35], [0.62, 0.3, 0.4], [0.7, 0.1, 0.2], [0.72, 0.12, -0.5]], 0.007, M.kabel));
    g.add(box(0.04, 0.05, 0.03, M.hitam, 0.5, 0.47, 0.36));
    g.add(rbox(0.08, 0.08, 0.04, 0.012, M.putih, 0.72, 0.16, -0.56)); g.add(sph(0.007, M.hijau, 0.74, 0.18, -0.537));
    // radiator sirip (pemanas minyak) di samping kasur
    const rx = 0.78, rz = -0.2;
    for (let i = 0; i < 9; i++) g.add(rbox(0.035, 0.56, 0.3, 0.06, M.putih, rx - 0.17 + i * 0.042, 0.36, rz).rotateY(Math.PI / 2));
    g.add(box(0.4, 0.03, 0.06, M.abu, rx, 0.08, rz)); for (const dx of [-0.16, 0.16]) g.add(cyl(0.03, 0.03, 0.03, M.hitam, rx + dx, 0.03, rz + 0.12).rotateX(Math.PI / 2));
    g.add(rbox(0.12, 0.16, 0.06, 0.012, M.hitam, rx + 0.24, 0.5, rz));
    const d = layar('21°', { w: 0.085, h: 0.045, size: 90 }); d.position.set(rx + 0.24, 0.53, rz + 0.031); g.add(d);
    g.add(sph(0.008, M.senja, rx + 0.24, 0.47, rz + 0.031));
    for (let i = 0; i < 3; i++) g.add(tube([[rx - 0.1 + i * 0.1, 0.7, rz], [rx - 0.07 + i * 0.1, 0.8, rz + 0.02], [rx - 0.1 + i * 0.1, 0.9, rz]], 0.006, M.hangat));
    g.add(tube([[rx + 0.24, 0.42, rz - 0.03], [rx + 0.3, 0.1, rz - 0.2], [0.72, 0.12, -0.5]], 0.007, M.kabel));
    return g;
  }

  function airPanas() {
    const g = new THREE.Group();
    // dinding keramik
    const keramik = tex(512, 512, (c, w, h) => { c.fillStyle = '#7f948a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a9b8b0'; c.lineWidth = 4; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } });
    const dk = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), std({ map: keramik, roughness: 0.4 })); dk.position.set(0, 0.8, -0.4); dk.receiveShadow = true; g.add(dk);
    // tangki pemanas air
    const tx = -0.35;
    g.add(cyl(0.2, 0.2, 0.72, M.putih, tx, 1.0, -0.18, 40));
    g.add(cyl(0.2, 0.2, 0.02, M.abu, tx, 1.37, -0.18, 40)); g.add(cyl(0.2, 0.2, 0.02, M.abu, tx, 0.63, -0.18, 40));
    const cin = new THREE.Mesh(new THREE.CylinderGeometry(0.202, 0.202, 0.1, 40, 1, true, -0.9, 1.8), new THREE.MeshBasicMaterial({ map: tex(512, 80, (c, w, h) => { c.fillStyle = '#14201B'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#F4B860'; c.font = `600 48px ${SANS}`; c.fillText('48°', 40, 58); c.fillStyle = '#A9B5AC'; c.font = `500 26px ${SANS}`; c.fillText('Sisa', 210, 52);
      c.fillStyle = '#2C3B33'; c.fillRect(280, 30, 190, 22); c.fillStyle = '#7BD88F'; c.fillRect(280, 30, 152, 22); }), toneMapped: false }));
    cin.position.set(tx, 1.1, -0.18); g.add(cin);
    // sensor + antena
    g.add(rbox(0.08, 0.1, 0.04, 0.01, M.hitam, tx + 0.23, 0.82, -0.18)); g.add(sph(0.007, M.hijau, tx + 0.23, 0.86, -0.158));
    g.add(cyl(0.004, 0.004, 0.1, M.hitam, tx + 0.25, 0.92, -0.18, 6));
    // pipa tembaga ke shower
    g.add(tube([[tx + 0.1, 0.62, -0.24], [tx + 0.1, 0.45, -0.3], [0.2, 0.45, -0.36], [0.35, 0.5, -0.37], [0.35, 1.3, -0.37]], 0.014, M.tembaga));
    g.add(tube([[tx - 0.1, 0.62, -0.24], [tx - 0.1, 0.4, -0.3], [tx - 0.1, 0.05, -0.32]], 0.014, M.baja));
    g.add(tube([[0.35, 1.3, -0.37], [0.35, 1.42, -0.3], [0.35, 1.38, -0.12]], 0.014, M.baja));
    const kepala = cyl(0.09, 0.06, 0.03, M.baja, 0.35, 1.35, -0.1); g.add(kepala);
    g.add(cyl(0.04, 0.04, 0.04, M.baja, 0.35, 0.95, -0.36).rotateX(Math.PI / 2));     // keran
    // lantai kayu kamar mandi
    for (let i = 0; i < 7; i++) g.add(box(0.12, 0.03, 0.8, M.kayu, -0.4 + i * 0.14, 0.015, 0.05));
    return g;
  }

  function tirai() {
    const g = new THREE.Group();
    g.add(dindingPapan(1.8, 1.6, 0, 0.8, -0.3, 10));
    // pemandangan kebun teh di balik kaca
    const pem = plane(1.06, 0.78, tex(530, 390, (c, w, h) => {
      const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#9fb8bf'); sky.addColorStop(0.45, '#e9d3ad'); sky.addColorStop(1, '#e9d3ad'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffe3b0'; c.beginPath(); c.arc(380, 150, 26, 0, 7); c.fill();
      c.fillStyle = '#7d958e'; c.beginPath(); c.moveTo(0, 190); c.lineTo(120, 140); c.lineTo(250, 175); c.lineTo(380, 130); c.lineTo(530, 170); c.lineTo(530, 390); c.lineTo(0, 390); c.fill();
      c.fillStyle = '#4f7a4a'; c.fillRect(0, 210, w, 180); c.strokeStyle = '#6e9a5a'; c.lineWidth = 9;
      for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(0, 225 + i * 24); c.quadraticCurveTo(265, 205 + i * 24, 530, 228 + i * 24); c.stroke(); }
    }));
    pem.position.set(0, 0.95, -0.275); g.add(pem);
    // kusen jendela
    g.add(box(1.16, 0.06, 0.08, M.kayuTua, 0, 1.37, -0.25)); g.add(box(1.16, 0.06, 0.08, M.kayuTua, 0, 0.53, -0.25));
    g.add(box(0.06, 0.9, 0.08, M.kayuTua, -0.55, 0.95, -0.25)); g.add(box(0.06, 0.9, 0.08, M.kayuTua, 0.55, 0.95, -0.25)); g.add(box(0.03, 0.8, 0.05, M.kayuTua, 0, 0.95, -0.25));
    const kaca = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.78), M.kaca); kaca.position.set(0, 0.95, -0.24); g.add(kaca);
    // rumah motor + kain tirai turun separuh
    g.add(rbox(1.24, 0.1, 0.1, 0.03, M.putih, 0, 1.47, -0.2));
    const kain = box(1.12, 0.36, 0.008, M.kain, 0, 1.24, -0.18); g.add(kain);
    g.add(box(1.14, 0.025, 0.025, M.kayuTua, 0, 1.055, -0.18));
    g.add(cyl(0.006, 0.006, 0.12, M.kain, 0.5, 0.99, -0.17, 6)); g.add(sph(0.014, M.kuningan, 0.5, 0.92, -0.17));
    g.add(sph(0.008, M.hijau, 0.55, 1.47, -0.148));
    // saklar dinding
    g.add(rbox(0.09, 0.14, 0.02, 0.01, M.putih, 0.78, 0.95, -0.27));
    g.add(box(0.05, 0.035, 0.008, M.abu, 0.78, 0.98, -0.255)); g.add(box(0.05, 0.035, 0.008, M.abu, 0.78, 0.92, -0.255));
    // jendela segitiga kabin di atas (penanda bentuk A-frame)
    return g;
  }

  function sensorSpeaker() {
    const g = new THREE.Group();
    g.add(dindingPapan(1.6, 1.5, 0, 0.75, -0.3, 10));
    // balok atap miring khas kabin segitiga
    const ba = box(1.2, 0.1, 0.14, M.kayuTua, -0.45, 1.5, -0.22); ba.rotation.z = 0.5; g.add(ba);
    const bb = box(1.2, 0.1, 0.14, M.kayuTua, 0.45, 1.5, -0.22); bb.rotation.z = -0.5; g.add(bb);
    // sensor asap & gas bundar di dinding atas
    const s = new THREE.Group();
    s.add(cyl(0.12, 0.12, 0.035, M.putih, 0, 0, 0, 40)); s.add(cyl(0.085, 0.105, 0.03, M.putih, 0, 0.03, 0, 40));
    for (const r of [0.045, 0.07]) { const t = shade(new THREE.Mesh(new THREE.TorusGeometry(r, 0.004, 6, 40), M.abu)); t.rotation.x = Math.PI / 2; t.position.y = 0.046; s.add(t); }
    s.add(sph(0.01, M.hijau, 0.065, 0.046, 0.02));
    s.rotation.x = Math.PI / 2; s.position.set(-0.3, 1.3, -0.26); g.add(s);
    // pengukur suhu & kelembapan
    g.add(rbox(0.2, 0.15, 0.025, 0.02, M.putih, 0.3, 1.15, -0.27));
    const t = layar('20,6°', { w: 0.14, h: 0.065, size: 84 }); t.position.set(0.3, 1.17, -0.256); g.add(t);
    const t2 = layar('lembap 74%', { fg: '#A9B5AC', w: 0.14, h: 0.03, size: 40 }); t2.position.set(0.3, 1.11, -0.256); g.add(t2);
    // meja + speaker
    g.add(box(0.56, 0.04, 0.42, M.kayu, 0.05, 0.5, 0.1)); for (const [x, z] of [[-0.18, -0.07], [0.28, -0.07], [-0.18, 0.27], [0.28, 0.27]]) g.add(cyl(0.015, 0.015, 0.48, M.kayuTua, x, 0.24, z, 10));
    g.add(rbox(0.3, 0.2, 0.14, 0.06, M.abu, 0.05, 0.62, 0.1));
    g.add(rbox(0.27, 0.17, 0.005, 0.05, std({ color: 0x3c4741, roughness: 1 }), 0.05, 0.62, 0.173));
    g.add(box(0.2, 0.008, 0.01, M.hangat, 0.05, 0.535, 0.173));
    for (const r of [0.2, 0.27]) { const w = shade(new THREE.Mesh(new THREE.TorusGeometry(r, 0.005, 6, 40, Math.PI * 0.5), M.hangat)); w.position.set(0.05, 0.62, 0.12); w.rotation.set(0, 0, Math.PI * 0.25); g.add(w); }
    // cangkir bandrek
    g.add(cyl(0.035, 0.03, 0.08, M.krem, -0.17, 0.56, 0.22)); g.add(cyl(0.03, 0.03, 0.005, std({ color: 0x8a5a2a, roughness: 0.3 }), -0.17, 0.598, 0.22));
    return g;
  }

  function kotakOtak() {
    const g = new THREE.Group();
    g.add(dindingPapan(1.7, 1.5, 0, 0.75, -0.3, 10));
    // rak
    g.add(box(1.0, 0.04, 0.32, M.kayuTua, -0.15, 0.95, -0.12)); g.add(box(1.0, 0.04, 0.32, M.kayuTua, -0.15, 0.45, -0.12));
    // otak: komputer mini
    g.add(rbox(0.22, 0.06, 0.22, 0.02, M.hitam, -0.42, 1.0, -0.12));
    g.add(sph(0.007, M.hijau, -0.36, 1.0, -0.008)); g.add(sph(0.007, M.hangat, -0.33, 1.0, -0.008));
    // router + antena
    g.add(rbox(0.3, 0.05, 0.18, 0.02, M.putih, -0.08, 0.995, -0.12));
    for (const x of [-0.18, -0.08, 0.02]) { const a = cyl(0.008, 0.008, 0.18, M.putih, x, 1.11, -0.2, 8); g.add(a); }
    [0, 1, 2, 3].forEach((i) => g.add(sph(0.006, M.hijau, -0.2 + i * 0.05, 0.995, -0.029)));
    // UPS cadangan listrik
    g.add(box(0.2, 0.3, 0.3, M.hitam, -0.42, 0.62, -0.12));
    const u = layar('100%', { fg: '#7BD88F', w: 0.1, h: 0.045, size: 74 }); u.position.set(-0.42, 0.68, 0.031); g.add(u);
    // kabel
    g.add(tube([[-0.42, 0.97, -0.25], [-0.3, 0.8, -0.27], [-0.42, 0.77, -0.25]], 0.006, M.kabel));
    g.add(tube([[-0.2, 0.97, -0.25], [-0.3, 0.98, -0.27], [-0.35, 1.0, -0.24]], 0.006, M.kabel));
    // tablet petugas di dudukan
    const tb = new THREE.Group();
    tb.add(rbox(0.42, 0.3, 0.016, 0.02, M.hitam));
    const lay = plane(0.4, 0.28, tex(560, 392, (c, w, h) => {
      c.fillStyle = '#FFFDF8'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#1E2823'; c.font = `600 30px ${SERIF}`; c.fillText('Tugas malam ini', 24, 46);
      [['Api unggun', 'Kabut 1 · 19.04', '#13201B', '#F5F1E8'], ['Bandrek 2 gelas', 'Kabut 2 · 19.40', '#ECE5D6', '#1E2823'], ['Air panas mati', 'Teh 1 · periksa', '#F8E7DF', '#B8502E'], ['Tamu tiba', 'Kabut 3 · PIN 14.32', '#ECE5D6', '#1E2823']].forEach(([a, b, bg, fg], i) => {
        const y = 70 + i * 78; c.fillStyle = bg; c.beginPath(); c.roundRect(20, y, w - 40, 66, 12); c.fill();
        c.fillStyle = fg; c.font = `600 24px ${SANS}`; c.fillText(a, 38, y + 30); c.font = `400 19px ${SANS}`; c.fillStyle = i === 0 ? '#A9B5AC' : '#5D675F'; c.fillText(b, 38, y + 55); });
    }));
    lay.position.z = 0.0085; tb.add(lay);
    tb.position.set(0.42, 0.8, 0.08); tb.rotation.set(-0.35, -0.4, 0); g.add(tb);
    g.add(box(0.1, 0.18, 0.1, M.kayuTua, 0.42, 0.6, 0.04)); g.add(box(0.5, 0.04, 0.4, M.kayu, 0.42, 0.5, 0.04));
    for (const [x, z] of [[0.2, -0.13], [0.64, -0.13], [0.2, 0.21], [0.64, 0.21]]) g.add(cyl(0.015, 0.015, 0.48, M.kayuTua, x, 0.24, z, 10));
    return g;
  }

  const builders = [kunciPintu, platQr, lampuSuasana, pemanas, airPanas, tirai, sensorSpeaker, kotakOtak];
  const cache = [];
  let shown = null;

  function frame(obj) {
    const b = new THREE.Box3().setFromObject(obj);
    const size = b.getSize(new THREE.Vector3());
    const r = size.length() / 2;
    const aspect = camera.aspect || 1;
    const fit = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = fit * (aspect < 1 ? 0.95 / aspect : 0.8);
    controls.target.set(0, size.y * 0.48, 0);
    const dir = new THREE.Vector3(0.55, 0.32, 0.85).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    camera.near = dist / 60; camera.far = dist * 12; camera.updateProjectionMatrix(); controls.update();
  }
  function show(i) {
    if (!cache[i]) {
      const g = builders[i]();
      const b = new THREE.Box3().setFromObject(g); const c = b.getCenter(new THREE.Vector3());
      g.position.x -= c.x; g.position.z -= c.z; cache[i] = g;
    }
    if (shown) scene.remove(shown);
    shown = cache[i]; scene.add(shown); frame(shown);
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (shown) frame(shown);
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  if (SNAP) controls.autoRotate = false;

  renderer.setAnimationLoop(() => {
    if (!dlg.open) return;
    controls.update(); renderer.render(scene, camera);
    loadEl.hidden = true;
    if (SNAP) window.__frame++;
  });
  return { show: (i) => { if (!SNAP) controls.autoRotate = true; show(i); resize(); } };
}
