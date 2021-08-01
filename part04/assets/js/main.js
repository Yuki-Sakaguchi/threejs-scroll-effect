// 画像をテクスチャにしたplaneを扱うクラス
class ImagePlane {
  constructor(mesh, img) {
    this.refImage = img;
    this.mesh = mesh;
  }

  setParams() {
    const rect = this.refImage.getBoundingClientRect();
    this.mesh.scale.x = rect.width;
    this.mesh.scale.y = rect.height;

    // window座標をWebGL座標に変換
    const x = rect.left - canvasSize.w / 2 + rect.width / 2;
    const y = -rect.top + canvasSize.h / 2 - rect.height / 2;
    this.mesh.position.set(x, y, this.mesh.position.z);
  }

  update(offset) {
    this.setParams();
    this.mesh.material.uniforms.uTime.value = offset;
  }
}

// キャンバス情報を準備
const canvasEl = document.getElementById('webgl-canvas');
const canvasSize = {
  w: window.innerWidth,
  h: window.innerHeight,
};

// 慣性スクロール
const scrollArea = document.querySelector('.scrollable');

// レンダラーを設定
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvasSize.w, canvasSize.h);

// ウィンドウとWebGLの座標を一致させるため、描画がウィンドウぴったりになるようにカメラを調整
const fov = 60; // 視野角
const fovRad = (fov / 2) * (Math.PI / 180);
const dist = canvasSize.h / 2 / Math.tan(fovRad);
const camera = new THREE.PerspectiveCamera(
  fov,
  canvasSize.w / canvasSize.h,
  0.1,
  1000
);
camera.position.z = dist;

// シーン作成
const scene = new THREE.Scene();

// テクスチャを読み込む
const loader = new THREE.TextureLoader();

// Planeを作る関数
const createMesh = (img) => {
  const texture = loader.load(img.src);
  const uniforms = {
    uTexture: { value: texture },
    uImageAspect: { value: img.naturalWidth / img.naturalHeight },
    uPlaneAspect: { value: img.clientWidth / img.clientHeight },
    uTime: { value: 0 },
  };
  const geo = new THREE.PlaneBufferGeometry(1, 1, 100, 100); // 後から画像のサイズにスケールするので1にしておく
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: document.getElementById('v-shader').textContent,
    fragmentShader: document.getElementById('f-shader').textContent,
  });
  return new THREE.Mesh(geo, mat);
};

// 画像オブジェクトの配列
const imagePlaneArray = [];

// スクロール追従
let targetScrollY = 0; // 本来のスクロール位置
let currentScrollY = 0; // 線形補完を適応した現在のスクロール位置
let scrollOffset = 0; // 上記2つの差分

// 開始と終了をなめらかに保管する関数
const lerp = (start, end, multiplier) => (1 - multiplier) * start + multiplier * end;

// スクロール位置を更新
const updateScroll = () => {
  targetScrollY = document.documentElement.scrollTop; // スクロール位置を取得
  currentScrollY = lerp(currentScrollY, targetScrollY, 0.1); // リープ関数でスクロール位置をなめらかに追従
  scrollOffset = targetScrollY - currentScrollY; // 差分を保存
};

// リサイズ処理
let timeoutId = 0;
const resize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvasSize.w = width;
  canvasSize.h = height;

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  const dist = canvasSize.h / 2 / Math.tan(fovRad);
  camera.position.z = dist;

  document.body.style.height = `${scrollArea.getBoundingClientRect().height}px`;
};

// ループ処理
const loop = () => {
  updateScroll();

  scrollArea.style.transform = `translate3d(0,${-currentScrollY}px,0)`;

  for (const plane of imagePlaneArray) {
    plane.update(scrollOffset);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
};

// 実行
window.addEventListener('load', () => {
  // 画像を取得してメッシュを作り、DOMと位置を連携する
  const imageArray = [...document.querySelectorAll('img')];
  for (const img of imageArray) {
    const mesh = createMesh(img);
    scene.add(mesh);

    const imagePlane = new ImagePlane(mesh, img);
    imagePlane.setParams();

    imagePlaneArray.push(imagePlane);
  }

  // 高さの調整
  document.body.style.height = `${scrollArea.getBoundingClientRect().height}px`;

  // 実行
  loop();
});

// リサイズ処理
window.addEventListener('resize', () => {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(resize, 200);
});