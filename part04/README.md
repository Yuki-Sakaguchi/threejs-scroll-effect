# Part04

スクロールに応じてアニメーションさせるように変える  

## スクロール量を取得しシェーダーエフェクトに反映する

スクロール量と線形補完を適応した現在のスクロール位置を保存して、スクロールの差分を出す。

```js
// スクロール追従
let targetScrollY = 0; // 本来のスクロール位置
let currentScrollY = 0; // 線形補間を適用した現在のスクロール位置
let scrollOffset = 0; // 上記2つの差分

// 開始と終了をなめらかに補間する関数
const lerp = (start, end, multiplier) => {
  return (1 - multiplier) * start + multiplier * end;
};

const updateScroll = () => {
  // スクロール位置を取得
  targetScrollY = document.documentElement.scrollTop;
  // リープ関数でスクロール位置をなめらかに追従
  currentScrollY = lerp(currentScrollY, targetScrollY, 0.1);

  scrollOffset = targetScrollY - currentScrollY;
};
```

今まで経過時間をでアニメーションしていたけど2つの差分 `scrollOffset` をuniformsで渡してそれを元にアニメーションを実行する


## 頂点シェーダーを修正

今まで横方向のアニメーションだけでしたが縦方向のアニメーションを追加  

```c#
varying vec2 vUv;
uniform float uTime;

float PI = 3.1415926535897932384626433832795;

void main() {
  vUv = uv;
  vec3 pos = position;

  // 横方向
  float amp = 0.03; // 振幅（の役割）。大きくすると波が大きくなる
  float freq = 0.01 * uTime; // 振動数（の役割）。大きくすると波が細かくなる

  // 縦方向
  float tension = -0.001 * uTime; // 上下の貼り具合

  pos.x = pos.x + sin(pos.y * PI * freq) * amp;
  pos.y = pos.y + (cos(pos.x * PI) * tension);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```


## フラグメントシェーダーに追記してRGBシフト

形の変化だけではなく、RGBの色をそれぞれ少しずつずらしてエフェクトにバリエーションをつける  

```c#
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uImageAspect;
uniform float uPlaneAspect;
uniform float uTime;

void main() {
  // 画像のアスペクトとプレーンのアスペクトを比較して短い方に合わせる
  vec2 ratio = vec2(
    min(uPlaneAspect / uImageAspect, 1.0),
    min((1.0 / uPlaneAspect) / (1.0 / uImageAspect), 1.0)
  );

  // 計算結果を用いて修正後のuv値を生成
  vec2 fixedUv = vec2(
    (vUv.x - 0.5) * ratio.x + 0.5,
    (vUv.y - 0.5) * ratio.y + 0.5
  );

  vec2 offset = vec2(0.0, uTime * 0.0005);
  float r = texture2D(uTexture, fixedUv + offset).r;
  float g = texture2D(uTexture, fixedUv + offset * 0.5).g;
  float b = texture2D(uTexture, fixedUv).b;
  vec3 texture = vec3(r, g, b);

  gl_FragColor = vec4(texture, 1.0);
}
```


## リサイズ処理

こんな感じでリサイズが怒るたびにサイズ関連の数値を更新する

```js
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
};

window.addEventListener('resize', () => {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(resize, 200);
});
```


## 慣性スクロールによる同期ずれ対策

DOMとcanvasの映像を完璧に同期させるのは難しいみたい（今のままだとずれちゃうらしい）
requestAnimationFrameとDOMのスクロールの処理のタイミングが違うのが原因らしい  

解決策としては完成スクロールを導入する  
スクロールをrequestAnimationFrameと同じタイミングで処理するようにする


↓ 全体を覆うスクロールエリアを作る
```html
<div class="wrapper">
  <div class="scrollable">
    <div class="container">
      <ul class="image-list">
        <li class="image-item"><a href="#" class="image-wrapper"><img src="https://source.unsplash.com/whOkVvf0_hU/" alt=""></a></li>
        <li class="image-item"><a href="#" class="image-wrapper"><img src="https://source.unsplash.com/whOkVvf0_hU/" alt=""></a></li>
        <li class="image-item"><a href="#" class="image-wrapper"><img src="https://source.unsplash.com/whOkVvf0_hU/" alt=""></a></li>
        <li class="image-item"><a href="#" class="image-wrapper"><img src="https://source.unsplash.com/whOkVvf0_hU/" alt=""></a></li>
      </ul>
    </div>
  </div>
</div>
```

↓ .scrollableは `transform` でスクロールさせるので `overflow: scroll;` とかではない
```css
body {
  overscroll-behavior: none;
}

.wrapper {
  width: 100%;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
}

.scrollable {
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
}
```

↓ こんな感じでコンテンツの高さをbodyに入れる。タイミングは `load` と `resize` で毎回入れる
```js
document.body.style.height = `${scrollArea.getBoundingClientRect().height}px`;
```

↓ 保存していたスクロール位置元にスクロール位置を反映
```js
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
```