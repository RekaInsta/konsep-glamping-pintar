// Tur 3D lokasi glamping (pola "peta gudang 3D" di prototipe toko: putar, ketuk, kamera terbang, panel isi).
// Sebelum tombol "Mulai tur" ditekan hanya gambar sampul yang tampil; Three.js baru diunduh saat itu.
// Gambar 3D hanya dirender saat ada gerakan/animasi dan bagian ini terlihat, supaya HP tidak panas.
// Mode ?snaptur dipakai untuk membuat gambar sampul (img/tur-3d.webp).
const wrap = document.getElementById('tur');
const kanvasWrap = document.getElementById('tur-kanvas');
const tombolMulai = document.getElementById('tur-mulai');
const panel = document.getElementById('tur-panel');
const chips = document.getElementById('tur-chips');
const SNAP = new URLSearchParams(location.search).has('snaptur');

const TENDA = [
  { id: 'k1', nama: 'Tenda Kabut 1', x: -7, z: 1, rot: 0.25, status: 'isi', tamu: '2 tamu di dalam', suhu: '21°', pemanas: 'Menyala', air: 'Siap, sisa 80%', lampu: 'Hangat', pesan: 'Api unggun 19.04' },
  { id: 'k2', nama: 'Tenda Kabut 2', x: -2.5, z: -2.5, rot: 0.08, status: 'isi', tamu: '2 tamu di dalam', suhu: '20°', pemanas: 'Menyala', air: 'Siap, sisa 65%', lampu: 'Senja', pesan: 'Bandrek 2 gelas 19.40' },
  { id: 'k3', nama: 'Tenda Kabut 3', x: 2.5, z: -2.5, rot: -0.08, status: 'tunggu', tamu: 'Belum check-in, PIN aktif s/d 22.00', suhu: '19°', pemanas: 'Memanaskan', air: 'Siap, sisa 100%', lampu: 'Hangat', pesan: '—' },
  { id: 't1', nama: 'Tenda Teh 1', x: 7, z: 1, rot: -0.25, status: 'awas', tamu: '3 tamu di dalam', suhu: '18°', pemanas: 'Menyala', air: 'MATI sejak 20.12, petugas diberi tahu', lampu: 'Bulan', pesan: 'Selimut tambahan 20.15' },
  { id: 't2', nama: 'Tenda Teh 2', x: -5, z: 7, rot: 0.15, status: 'kosong', tamu: 'Kosong malam ini', suhu: '13°', pemanas: 'Mati (hemat listrik)', air: 'Mati', lampu: 'Mati', pesan: '—' },
  { id: 'tp', nama: 'Tenda Teh Premium', x: 5, z: 7, rot: -0.15, premium: true, status: 'isi', tamu: '2 tamu di dalam', suhu: '22°', pemanas: 'Menyala', air: 'Bak rendam 39°', lampu: 'Senja, jendela buram', pesan: 'Sarapan nasi liwet besok 07.00' },
];
// tenda melingkar menghadap api unggun di (0, 0)
const SUDUT = [-112, -68, -24, 24, 68, 112];
TENDA.forEach((t, i) => { const a = SUDUT[i] * Math.PI / 180, R = 10; t.x = Math.sin(a) * R; t.z = -Math.cos(a) * R; t.rot = Math.atan2(-t.x, -t.z); });
const PETUGAS = { id: 'pt', nama: 'Ruang petugas', x: -8, z: 13 };
const STATUS = { isi: ['Terisi', '#5E7F45'], tunggu: ['Menunggu tamu', '#E9A23B'], awas: ['Perlu dicek', '#B8502E'], kosong: ['Kosong', '#9A9384'] };
const ALAT_POS = [ // posisi penanda alat di dalam tenda (koordinat lokal tenda)
  [0.55, 1.1, 2.12], [-0.9, 1.4, -2.0], [0, 2.35, 0], [1.1, 0.6, -0.9], [0.9, 1.5, -1.95], [-0.7, 1.1, 2.05], [0.0, 2.75, -1.6],
];

const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
function alatInfo(i) {
  const f = document.querySelectorAll('#alat-grid figure')[i];
  return f ? { di: f.querySelector('.di').textContent, nama: f.querySelector('b').textContent, ket: f.querySelector('p').textContent } : { di: '', nama: '', ket: '' };
}

let api = null;
function isiPanelPeta() {
  panel.innerHTML = '';
  panel.append(el('h3', '', 'Keliling lokasi'), el('p', 'tur-muted', 'Ketuk tenda di gambar atau pilih di bawah. Geser untuk memutar, cubit atau gulir untuk mendekat.'));
  const ul = el('ul', 'tur-ringkas');
  const n = (s) => TENDA.filter((t) => t.status === s).length;
  ul.innerHTML = `<li><b>${n('isi') + n('awas')}</b> terisi</li><li><b>${n('tunggu')}</b> menunggu tamu</li><li><b>${n('kosong')}</b> kosong</li><li class="awas"><b>${n('awas')}</b> perlu dicek</li>`;
  panel.append(ul);
}
function isiPanelTenda(t) {
  const [lbl, warna] = STATUS[t.status];
  panel.innerHTML = '';
  const h = el('div', 'tur-kepala'); h.append(el('h3', '', t.nama), el('span', 'tur-status', lbl)); h.lastChild.style.setProperty('--w', warna);
  panel.append(h);
  const dl = el('dl', 'tur-data');
  [['Tamu', t.tamu], ['Suhu dalam', t.suhu + ' · luar 12°'], ['Pemanas', t.pemanas], [t.premium ? 'Air panas & bak' : 'Air panas', t.air], ['Lampu', t.lampu], ['Pesanan', t.pesan]].forEach(([a, b]) => {
    const d = el('div', a.startsWith('Air') && t.status === 'awas' ? 'awas' : ''); d.append(el('dt', '', a), el('dd', '', b)); dl.append(d);
  });
  panel.append(dl);
  const b = el('button', 'tur-btn', 'Lihat ke dalam tenda'); b.type = 'button'; b.addEventListener('click', () => api && api.masuk(t.id)); panel.append(b);
}
function isiPanelDalam(t, pilih) {
  panel.innerHTML = '';
  const h = el('div', 'tur-kepala'); h.append(el('h3', '', 'Di dalam ' + t.nama)); panel.append(h);
  panel.append(el('p', 'tur-muted', 'Atap dan dinding kaca dibuka supaya isinya kelihatan. Ketuk nomor untuk melihat alatnya.'));
  const ol = el('ol', 'tur-alat');
  for (let i = 0; i < 7; i++) {
    const a = alatInfo(i); const li = el('li', i === pilih ? 'on' : '');
    const bt = el('button', '', `<b>${String(i + 1).padStart(2, '0')}</b><span>${a.nama}</span>`); bt.type = 'button';
    bt.addEventListener('click', () => api && api.pilihAlat(i)); li.append(bt);
    if (i === pilih) li.append(el('p', '', a.ket + (i === 4 && t.status === 'awas' ? ' <em>Sekarang: air panas mati sejak 20.12.</em>' : '')));
    ol.append(li);
  }
  panel.append(ol);
  const b = el('button', 'tur-btn tur-btn-2', 'Kembali ke peta'); b.type = 'button'; b.addEventListener('click', () => api && api.keluar()); panel.append(b);
}
function isiPanelPetugas() {
  panel.innerHTML = '';
  const h = el('div', 'tur-kepala'); h.append(el('h3', '', 'Ruang petugas'), el('span', 'tur-status', 'Online')); h.lastChild.style.setProperty('--w', '#5E7F45'); panel.append(h);
  const dl = el('dl', 'tur-data');
  [['Otak sistem', 'Jalan, mengatur 6 tenda'], ['Internet', 'Tersambung (sistem tetap jalan kalau putus)'], ['Cadangan listrik', '100%'], ['Tugas malam ini', '4 belum selesai'], ['Peringatan', 'Air panas Tenda Teh 1']].forEach(([a, b], i) => {
    const d = el('div', i === 4 ? 'awas' : ''); d.append(el('dt', '', a), el('dd', '', b)); dl.append(d);
  });
  panel.append(dl);
}
function buatChips() {
  chips.innerHTML = '';
  [...TENDA, PETUGAS].forEach((t) => {
    const b = el('button', 'tur-chip', t.nama.replace('Tenda ', '')); b.type = 'button'; b.dataset.id = t.id;
    if (t.status) b.style.setProperty('--w', STATUS[t.status][1]);
    b.addEventListener('click', () => api ? api.pilih(t.id) : mulai().then(() => api.pilih(t.id)));
    chips.append(b);
  });
}
function tandaiChip(id) { chips.querySelectorAll('.tur-chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false')); }

buatChips(); isiPanelPeta();
let mulaiP = null;
function mulai() {
  if (!mulaiP) mulaiP = bangun().catch((e) => { console.error(e); tombolMulai.disabled = false; tombolMulai.querySelector('span').textContent = 'Tur 3D tidak bisa dimuat di perangkat ini'; });
  return mulaiP;
}
tombolMulai.addEventListener('click', () => { tombolMulai.querySelector('span').textContent = 'Menyiapkan tur 3D…'; tombolMulai.disabled = true; mulai(); });
if (SNAP) { document.documentElement.classList.add('snaptur'); mulai(); }

async function bangun() {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  try { await document.fonts.ready; } catch (e) {}

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: SNAP });
  renderer.setPixelRatio(SNAP ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  kanvasWrap.append(renderer.domElement);
  wrap.classList.add('jalan');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x16241e);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2.15; controls.minDistance = 3; controls.maxDistance = 46; controls.enablePan = false;
  const ATAS = { target: new THREE.Vector3(0, 0.5, -1.5), cam: new THREE.Vector3(6, 19, 25) };
  controls.target.copy(ATAS.target); camera.position.copy(ATAS.cam);

  scene.add(new THREE.HemisphereLight(0xdde5ee, 0x24382b, 1.25));
  const bulan = new THREE.DirectionalLight(0xdfe6f2, 1.0); bulan.position.set(-12, 22, 10); bulan.castShadow = true;
  bulan.shadow.mapSize.set(1024, 1024); Object.assign(bulan.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 }); bulan.shadow.bias = -0.0008;
  scene.add(bulan);

  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glow = (c, k = 1) => std({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.5 });
  const M = {
    tanah: std({ color: 0x2c4a36, roughness: 1 }), teh: std({ color: 0x4a7a44, roughness: 0.95 }), jalan: std({ color: 0x8d7a5c, roughness: 1 }),
    kayuTua: std({ color: 0x3f2b1e, roughness: 0.8 }), kayu: std({ color: 0x9a6a40, roughness: 0.8 }), dek: std({ color: 0x6f4b31, roughness: 0.85 }),
    atap: std({ color: 0x1f2a24, roughness: 0.85 }), pinus: std({ color: 0x14231b, roughness: 1 }), krem: std({ color: 0xefe8da, roughness: 0.7 }),
    selimut: std({ color: 0x5e7f45, roughness: 0.95 }), putih: std({ color: 0xf4f1ea, roughness: 0.5 }), hitam: std({ color: 0x1f2522, roughness: 0.5 }),
    kacaNyala: glow(0xf4b860, 0.9), kacaRedup: std({ color: 0x2b3a33, roughness: 0.2, metalness: 0.2 }), kacaDalam: std({ color: 0xbcd6dc, transparent: true, opacity: 0.18, depthWrite: false }),
    api: glow(0xf28c38, 1.6), apiMuda: glow(0xffd27a, 1.6), air: std({ color: 0x6fa3b8, roughness: 0.1 }),
  };
  const shade = (m, c = true) => { m.castShadow = c; m.receiveShadow = true; return m; };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); return m; };
  const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 20) => { const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)); m.position.set(x, y, z); return m; };
  function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const pendarTex = tex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(244,184,96,.75)'); r.addColorStop(1, 'rgba(244,184,96,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
  function pendar(s, x, y, z, k = 1) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pendarTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: k })); sp.scale.set(s, s, 1); sp.position.set(x, y, z); return sp; }
  function label(teks, warna) {
    const t = tex(512, 128, (g, w, h) => {
      g.font = '600 46px Figtree, system-ui, sans-serif'; const tw = g.measureText(teks).width + 92;
      const x0 = (w - tw) / 2; g.fillStyle = 'rgba(255,253,248,.95)'; g.beginPath(); g.roundRect(x0, 22, tw, 84, 42); g.fill();
      g.fillStyle = warna; g.beginPath(); g.arc(x0 + 40, 64, 13, 0, 7); g.fill();
      g.fillStyle = '#1E2823'; g.textBaseline = 'middle'; g.fillText(teks, x0 + 64, 66);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(4, 1, 1); sp.renderOrder = 10; return sp;
  }

  // tanah, kebun teh, jalan setapak, pinus
  const tanah = new THREE.Mesh(new THREE.CircleGeometry(48, 64), M.tanah); tanah.rotation.x = -Math.PI / 2; tanah.receiveShadow = true; scene.add(tanah);
  // kebun teh: barisan panjang di belakang dan samping
  const barisGeo = new THREE.CapsuleGeometry(0.5, 1, 4, 10); const baris = new THREE.InstancedMesh(barisGeo, M.teh, 80); let n = 0; const o = new THREE.Object3D();
  for (let r = 0; r < 18; r++) { const z = -16 - r * 1.5; const half = Math.sqrt(Math.max(0, 44 * 44 - z * z)) - 2; if (half < 4) continue;
    o.position.set(0, 0.42, z); o.rotation.set(0, 0, Math.PI / 2); o.scale.set(1, half * 2, 1); o.updateMatrix(); baris.setMatrixAt(n++, o.matrix); }
  for (const sx of [-1, 1]) for (let r = 0; r < 12; r++) { const x = sx * (20 + r * 1.5); const half = Math.min(14, Math.sqrt(Math.max(0, 44 * 44 - x * x)) - 2); if (half < 3) continue;
    o.position.set(x, 0.42, -2); o.rotation.set(Math.PI / 2, 0, 0); o.scale.set(1, half * 2, 1); o.updateMatrix(); baris.setMatrixAt(n++, o.matrix); }
  baris.count = n; baris.castShadow = true; baris.receiveShadow = true; scene.add(baris);
  const jalanG = new THREE.Group();
  TENDA.forEach((t) => { const L = 10 - 3.4; const j = box(1.1, 0.04, L, M.jalan, t.x * 0.47, 0.02, t.z * 0.47); j.rotation.y = t.rot; j.castShadow = false; jalanG.add(j); });
  { const j = box(1.3, 0.04, 11, M.jalan, -4, 0.02, 6.5); j.rotation.y = Math.atan2(-8, 13); j.castShadow = false; jalanG.add(j); }
  scene.add(jalanG);
  const pinusGeo = new THREE.ConeGeometry(1, 1, 8);
  [[-17, -6, 5.5], [-19, 2, 6.5], [-20, 14, 5], [17, -7, 6], [19, 3, 5], [16, 12, 5.5], [-8, -15, 4.5], [9, -15, 5], [-24, -14, 7], [25, -12, 7], [12, 18, 4.5]].forEach(([x, z, h]) => {
    for (let i = 0; i < 3; i++) { const p = shade(new THREE.Mesh(pinusGeo, M.pinus)); p.scale.set(h * 0.3 * (1 - i * 0.22), h * 0.45, h * 0.3 * (1 - i * 0.22)); p.position.set(x, h * 0.25 + i * h * 0.22, z); scene.add(p); }
  });

  // api unggun di tengah
  const apiG = new THREE.Group(); apiG.position.set(0, 0, 0);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; apiG.add(box(0.35, 0.35, 0.35, std({ color: 0x6b6a62, roughness: 1 }), Math.cos(a) * 0.9, 0.17, Math.sin(a) * 0.9)); }
  [0.5, -0.5].forEach((r) => { const k = cyl(0.09, 0.09, 1.2, M.kayuTua, 0, 0.12, 0, 8); k.rotation.set(Math.PI / 2, 0, r); apiG.add(k); });
  const lidah1 = cyl(0, 0.32, 0.9, M.api, 0, 0.6, 0, 8), lidah2 = cyl(0, 0.18, 0.6, M.apiMuda, 0.05, 0.5, 0.05, 8);
  apiG.add(lidah1, lidah2, pendar(4.5, 0, 0.8, 0, 0.9));
  const apiL = new THREE.PointLight(0xf28c38, 6, 9, 1.6); apiL.position.set(0, 1.0, 0); apiG.add(apiL);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; const b = box(1.4, 0.35, 0.4, M.kayu, Math.cos(a) * 2.3, 0.2, Math.sin(a) * 2.3); b.rotation.y = -a + Math.PI / 2; apiG.add(b); }
  scene.add(apiG);

  // tenda segitiga
  const W = 3.4, H = 3.4, D = 4.4;
  const segi = new THREE.Shape(); segi.moveTo(-W / 2, 0); segi.lineTo(0, H); segi.lineTo(W / 2, 0); segi.lineTo(-W / 2, 0);
  const segiGeo = new THREE.ShapeGeometry(segi);
  const sisi = Math.hypot(W / 2, H), sudut = Math.atan2(H, W / 2);
  const pick = []; const tendaObj = new Map();
  function buatTenda(t) {
    const g = new THREE.Group(); g.position.set(t.x, 0, t.z); g.rotation.y = t.rot;
    const nyala = t.status !== 'kosong';
    g.add(box(W + 0.4, 0.25, D + 2.0, M.dek, 0, 0.12, 0.9));
    const lantai = box(W - 0.2, 0.05, D - 0.1, M.kayu, 0, 0.27, 0); g.add(lantai);
    const atapKiri = box(sisi, 0.16, D + 0.3, M.atap, -W / 4, H / 2 + 0.25, 0); atapKiri.rotation.z = sudut; g.add(atapKiri);
    const atapKanan = box(sisi, 0.16, D + 0.3, M.atap, W / 4, H / 2 + 0.25, 0); atapKanan.rotation.z = -sudut; g.add(atapKanan);
    const belakang = shade(new THREE.Mesh(segiGeo, M.kayuTua)); belakang.position.set(0, 0.25, -D / 2); belakang.rotation.y = Math.PI; g.add(belakang);
    const belakang2 = shade(new THREE.Mesh(segiGeo, M.kayuTua)); belakang2.position.set(0, 0.25, -D / 2 + 0.02); g.add(belakang2);
    const kaca = new THREE.Mesh(segiGeo, nyala ? M.kacaNyala : M.kacaRedup); kaca.scale.set(0.9, 0.9, 1); kaca.position.set(0, 0.3, D / 2); g.add(kaca);
    const bingkai = new THREE.Group();
    bingkai.add(box(0.1, H * 0.86, 0.12, M.kayuTua, 0, 0.3 + H * 0.43, D / 2 + 0.02)); bingkai.add(box(W * 0.55, 0.1, 0.12, M.kayuTua, 0, 0.3 + H * 0.4, D / 2 + 0.02));
    g.add(bingkai);
    if (nyala) g.add(pendar(7, 0, 1.0, D / 2 + 1.4, t.status === 'tunggu' ? 0.55 : 0.85));
    if (t.premium) { g.add(cyl(0.9, 0.9, 0.55, M.kayu, 2.6, 0.45, 2.4, 24)); g.add(cyl(0.8, 0.8, 0.05, M.air, 2.6, 0.7, 2.4, 24)); g.add(pendar(2.5, 2.6, 1.0, 2.4, 0.4)); }
    const lb = label(t.nama.replace('Tenda ', ''), STATUS[t.status][1]); lb.position.set(0, H + 1.3, 0); g.add(lb);
    [atapKiri, atapKanan, belakang, kaca, lantai].forEach((m) => { m.userData.id = t.id; pick.push(m); });
    scene.add(g);
    tendaObj.set(t.id, { t, g, atapKanan, kaca, bingkai, lb });
  }
  TENDA.forEach(buatTenda);
  // ruang petugas
  const pt = new THREE.Group(); pt.position.set(PETUGAS.x, 0, PETUGAS.z); pt.rotation.y = 0.55;
  const badan = box(5, 2.6, 3.4, M.krem, 0, 1.3, 0); pt.add(badan);
  const ap = new THREE.Shape(); ap.moveTo(-2.8, 0); ap.lineTo(0, 1.4); ap.lineTo(2.8, 0); ap.lineTo(-2.8, 0);
  const atapP = shade(new THREE.Mesh(new THREE.ExtrudeGeometry(ap, { depth: 3.8, bevelEnabled: false }), M.atap)); atapP.position.set(0, 2.6, -1.9); pt.add(atapP);
  pt.add(box(1.0, 1.9, 0.08, M.kayuTua, -1.2, 0.95, 1.72)); pt.add(box(1.6, 0.9, 0.06, M.kacaNyala, 1.0, 1.5, 1.72));
  const lbp = label('Ruang petugas', '#13201B'); lbp.position.set(0, 5.2, 0); pt.add(lbp);
  badan.userData.id = 'pt'; atapP.userData.id = 'pt'; pick.push(badan, atapP);
  scene.add(pt);

  // isi tenda (dibangun sekali, ditempel ke tenda yang dimasuki)
  const dalam = new THREE.Group(); dalam.visible = false;
  dalam.add(box(1.7, 0.4, 2.2, M.kayu, -0.55, 0.47, -0.8)); dalam.add(box(1.6, 0.18, 2.1, M.putih, -0.55, 0.76, -0.8)); dalam.add(box(1.62, 0.08, 1.4, M.selimut, -0.55, 0.88, -0.45));
  dalam.add(box(0.5, 0.14, 0.35, M.putih, -0.9, 0.92, -1.65)); dalam.add(box(0.5, 0.14, 0.35, M.putih, -0.2, 0.92, -1.65));
  for (let i = 0; i < 7; i++) dalam.add(box(0.06, 0.6, 0.3, M.putih, 0.95 + i * 0.07, 0.6, -0.9));
  dalam.add(box(0.05, 0.6, 0.4, M.hitam, 0.92 + 0.5, 0.65, -0.9));
  [[-0.35, M.kacaNyala], [0, glow(0xee8455, 0.9)], [0.35, glow(0xa9c9ec, 0.9)]].forEach(([x, m]) => { dalam.add(cyl(0.008, 0.008, 0.8, M.hitam, x, 2.75, 0)); const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), m); b.position.set(x, 2.3, 0); dalam.add(b); });
  dalam.add(box(0.36, 0.5, 0.05, M.kayuTua, -0.9, 1.4, -2.06));
  dalam.add(cyl(0.22, 0.22, 0.75, M.putih, 0.9, 1.5, -1.8, 20));
  const sens = cyl(0.13, 0.13, 0.05, M.putih, 0.0, 2.75, -2.05, 24); sens.rotation.x = Math.PI / 2; dalam.add(sens);
  dalam.add(box(1.6, 0.25, 0.08, M.krem, -0.7, 2.1, 2.05));
  dalam.add(box(0.12, 0.3, 0.06, M.hitam, 0.55, 1.1, 2.12));
  const lampuDalam = new THREE.PointLight(0xf4b860, 4, 6, 1.5); lampuDalam.position.set(0, 2.2, 0); dalam.add(lampuDalam);
  const pinTex = (n, on) => tex(128, 128, (g) => { g.fillStyle = on ? '#13201B' : '#E9A23B'; g.beginPath(); g.arc(64, 64, 54, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = on ? '#F4B860' : '#13201B'; g.font = '700 50px Figtree, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n).padStart(2, '0'), 64, 68); });
  const pins = ALAT_POS.map((p, i) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinTex(i + 1, false), depthTest: false })); sp.scale.set(0.42, 0.42, 1); sp.position.set(...p); sp.renderOrder = 12; sp.userData.pin = i; dalam.add(sp); return sp; });
  const pinOn = ALAT_POS.map((p, i) => pinTex(i + 1, true)), pinOff = pins.map((p) => p.material.map);
  scene.add(dalam);

  // sorotan tenda terpilih
  const cincin = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.55, 48), new THREE.MeshBasicMaterial({ color: 0xf4b860, transparent: true, opacity: 0.8, depthWrite: false }));
  cincin.rotation.x = -Math.PI / 2; cincin.visible = false; scene.add(cincin);

  let anim = null, aktif = null, diDalam = false, terakhir = performance.now(), terlihat = true, jalan = false;
  function terbang(target, cam) { anim = { f: controls.target.clone(), t: target, cf: camera.position.clone(), ct: cam, t0: performance.now() }; bangunkan(); }
  function pilih(id) {
    if (diDalam) keluarDalam();
    tandaiChip(id); aktif = id;
    if (id === 'pt') {
      cincin.visible = true; cincin.position.set(PETUGAS.x, 0.06, PETUGAS.z); cincin.scale.setScalar(1.25);
      terbang(new THREE.Vector3(PETUGAS.x, 1.4, PETUGAS.z), new THREE.Vector3(PETUGAS.x + 7, 6, PETUGAS.z + 9)); isiPanelPetugas(); return;
    }
    const { t } = tendaObj.get(id);
    cincin.visible = true; cincin.position.set(t.x, 0.06, t.z); cincin.scale.setScalar(1);
    const depan = new THREE.Vector3(Math.sin(t.rot), 0, Math.cos(t.rot));
    terbang(new THREE.Vector3(t.x, 1.6, t.z), new THREE.Vector3(t.x, 4.2, t.z).addScaledVector(depan, 9.5).add(new THREE.Vector3(depan.z * 3, 0, -depan.x * 3)));
    isiPanelTenda(t);
  }
  function keluarDalam() {
    if (!diDalam) return; const o = tendaObj.get(diDalam);
    o.atapKanan.visible = true; o.kaca.visible = true; o.bingkai.visible = true; o.lb.visible = true; dalam.visible = false; diDalam = false;
  }
  function masuk(id) {
    const o = tendaObj.get(id); keluarDalam();
    diDalam = id; o.atapKanan.visible = false; o.kaca.visible = false; o.bingkai.visible = false; o.lb.visible = false;
    dalam.visible = true; dalam.position.copy(o.g.position).setY(0); dalam.rotation.y = o.g.rotation.y; cincin.visible = false;
    const t = o.t; const kanan = new THREE.Vector3(Math.cos(t.rot), 0, -Math.sin(t.rot)), depan = new THREE.Vector3(Math.sin(t.rot), 0, Math.cos(t.rot));
    terbang(new THREE.Vector3(t.x, 1.3, t.z).addScaledVector(depan, -0.3), new THREE.Vector3(t.x, 5.2, t.z).addScaledVector(kanan, 4.2).addScaledVector(depan, 3.8));
    pilihAlat(-1);
  }
  function pilihAlat(i) {
    pins.forEach((p, j) => { p.material.map = j === i ? pinOn[j] : pinOff[j]; p.material.needsUpdate = true; p.scale.setScalar(j === i ? 0.55 : 0.42); });
    isiPanelDalam(tendaObj.get(diDalam).t, i); bangunkan();
  }
  function keluar() { keluarDalam(); const id = aktif; aktif = null; if (id) pilih(id); }
  api = { pilih, masuk, pilihAlat, keluar };

  // ketuk
  const ray = new THREE.Raycaster(); let turun = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { turun = { x: e.clientX, y: e.clientY }; bangunkan(); });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!turun || Math.hypot(e.clientX - turun.x, e.clientY - turun.y) > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    if (diDalam) { const hp = ray.intersectObjects(pins, false)[0]; if (hp) { pilihAlat(hp.object.userData.pin); return; } }
    const hit = ray.intersectObjects(pick, false)[0];
    if (hit) { if (hit.object.userData.id === diDalam) return; pilih(hit.object.userData.id); }
  });
  controls.addEventListener('change', bangunkan);
  addEventListener('wheel', () => {}, { passive: true });

  function ukur() { const w = kanvasWrap.clientWidth, h = kanvasWrap.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); bangunkan(); }
  new ResizeObserver(ukur).observe(kanvasWrap); ukur();
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { terlihat = es[0].isIntersecting; if (terlihat) bangunkan(); }).observe(kanvasWrap);

  // render hanya saat perlu: ada animasi kamera, sedang digeser, atau 6 detik setelah sentuhan terakhir
  function bangunkan() { terakhir = performance.now(); if (!jalan && (terlihat || SNAP) && !document.hidden) { jalan = true; requestAnimationFrame(loop); } }
  function loop(now) {
    if (anim) { const k = Math.min(1, (now - anim.t0) / 1000), e = 1 - Math.pow(1 - k, 3); controls.target.lerpVectors(anim.f, anim.t, e); camera.position.lerpVectors(anim.cf, anim.ct, e); if (k >= 1) anim = null; }
    const s = 1 + Math.sin(now / 90) * 0.08 + Math.sin(now / 37) * 0.04; lidah1.scale.set(1, s, 1); lidah2.scale.set(1, 2 - s, 1); apiL.intensity = 5.5 + (s - 1) * 14;
    if (cincin.visible) cincin.material.opacity = 0.55 + Math.sin(now / 260) * 0.25;
    controls.update(); renderer.render(scene, camera);
    if (SNAP) window.__turFrame = (window.__turFrame || 0) + 1;
    if (anim || now - terakhir < 6000 || SNAP) requestAnimationFrame(loop); else jalan = false;
  }
  bangunkan();
  if (!SNAP) tombolMulai.hidden = true;
}
