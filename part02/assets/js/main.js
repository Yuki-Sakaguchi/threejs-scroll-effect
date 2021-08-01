// キャンバス情報を準備
const canvasEl = document.getElementById('webgl-canvas');
const canvasSize = {
  w: window.innerWidth,
  h: window.innerHeight,
};

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
const texture = loader.load('https://source.unsplash.com/whOkVvf0_hU/');

// シェーダーとやり取りする値
const uniforms = {
  uTexture: { value: texture },
  uImageAspect: { value: 1920 / 1280 },
  uPlaneAspect: { value: 800 / 500 },
  uTime: { value: 0 },
};

// プレーンジオメトリにシェーダーのマテリアルを紐づけてシーンに追加
const geo = new THREE.PlaneBufferGeometry(800, 500, 100, 100);
const mat = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: document.getElementById('v-shader').textContent,
  fragmentShader: document.getElementById('f-shader').textContent,
});
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);

// ループ処理
const loop = () => {
  uniforms.uTime.value++;
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
};

// 実行！
window.addEventListener('load', loop);