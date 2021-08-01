# Part02

画像を揺らすための三角関数を使う  
シェーダーは全てのピクセルに同時に処理をするので、y座標に合わせてx軸をどれくらいずらすか計算している  
よくあるsin波で波を作っているのと同じような感じ  

```csharp
varying vec2 vUv;
uniform float uTime;

float PI = 3.1415926535897932384626433832795;

void main(){
  vUv = uv;
  vec3 pos = position;

  float offset = 0.01; // y座標に比例して値をずらすが、そのままだとかなり値が大きいので調整するための係数
  float freq = 0.05; // 振動数（の役割）。大きくすると波が細かくなる
  float amp = 10.0; // 振幅（の役割）。大きくすると波が大きくなる
  pos.x = pos.x + sin(pos.y * offset + uTime * freq * PI ) * amp;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```