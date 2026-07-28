// ============================================================================
// JARVIS Core — Núcleo de partículas para landing
// Réplica fiel del JarvisCore principal del producto: 3 capas (heart/mantle/
// periphery) con shader Perlin noise, ~8000 partículas en periferia, mismos
// uniforms y comportamiento de "calmado".
// Standalone: solo requiere Three.js (cargado vía importmap en el HTML).
// ============================================================================
import * as THREE from 'three';

const _vs = `
uniform float uTime;
uniform float uStateIntensity;
uniform float uLayerType;
uniform float uSpikeBoost;
varying vec2 vUv;
varying vec3 vPosition;
varying float vNoise;

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0 = floor(P); vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod(Pi0, 289.0); Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P); vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x); vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz; vec4 iz1 = Pi1.zzzz;
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0); vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 / 7.0; vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5); gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 / 7.0; vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5); gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x); vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z); vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x); vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z); vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0); float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z)); float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z)); float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz)); float n111 = dot(g111, Pf1);
  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

void main() {
  vUv = uv;
  vec3 newPosition = position;
  float freq = 1.5; float amp = 1.0;
  if (uLayerType == 0.0) { freq = 1.0; amp = 0.25; }
  else if (uLayerType == 1.0) { freq = 1.8; amp = 1.1; }
  else { freq = 0.8; amp = 3.5; }
  float safeIntensity = uStateIntensity + 0.15;
  float noise1 = cnoise(position * freq + uTime * safeIntensity * 0.5);
  float noise2 = cnoise(position * freq * 2.5 - uTime * 0.8);
  float finalNoise = noise1;
  vNoise = finalNoise;
  float spike = max(0.0, noise2 * 1.5 - 0.5) * (safeIntensity * 1.2) * uSpikeBoost;
  if (uLayerType == 1.0 || uLayerType == 2.0) {
    newPosition += normal * (finalNoise * safeIntensity * amp * 0.5 + spike * amp);
  } else {
    newPosition += normal * (finalNoise * safeIntensity * amp);
  }
  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float baseSize = 8.0;
  if (uLayerType == 0.0) baseSize = 4.0;
  if (uLayerType == 1.0) baseSize = 10.0;
  if (uLayerType == 2.0) baseSize = 5.0;
  gl_PointSize = (baseSize + finalNoise * 2.0 + spike * 12.0) * (2.0 / -mvPosition.z);
  gl_PointSize *= (1.0 + uStateIntensity * 0.2);
  vPosition = newPosition;
}`;

const _fs = `
uniform float uTime;
uniform float uStateIntensity;
uniform float uLayerType;
varying vec2 vUv;
varying vec3 vPosition;
varying float vNoise;

void main() {
  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
  float alpha = 0.05 / distanceToCenter - 0.1;
  vec3 color = vec3(0.0, 0.7, 0.9);
  if (uLayerType == 0.0) {
    color = vec3(0.1, 0.6, 0.9) + vec3(0.3) * max(0.0, vNoise);
    alpha *= 0.5;
  } else if (uLayerType == 1.0) {
    color += vec3(0.35) * max(0.0, vNoise * 1.3);
    alpha *= 0.6;
  } else {
    color = mix(vec3(0.0, 0.4, 0.9), vec3(0.9, 1.0, 1.0), max(0.0, vNoise * 2.0));
    alpha *= 0.45;
  }
  alpha = max(0.0, alpha);
  gl_FragColor = vec4(color, alpha);
}`;

class _JarvisCore {
  constructor() {
    this.states = {
      // Scale subido de 0.56 → 1.05 para landing: hace el núcleo visualmente
      // más imponente sin acercar la cámara (que distorsionaría el tamaño
      // de las partículas y mataría los detalles del Perlin noise).
      calmado: { intensity: 0.25, speed: 0.12, rotationSpeed: 0.03, amplitude: 0.4, scale: 1.05 }
    };
    this.currentState = 'calmado';
    this.currentIntensity = this.states.calmado.intensity;
    this.currentAmplitude = this.states.calmado.amplitude;
    this.currentScale = this.states.calmado.scale;
    this.group = new THREE.Group();

    const heartGeo = new THREE.IcosahedronGeometry(0.55, 60);
    this.matHeart = this._mat(0.0);
    this.heart = new THREE.Points(heartGeo, this.matHeart);
    this.group.add(this.heart);

    const mantleGeo = new THREE.IcosahedronGeometry(1.4, 60);
    this.matMantle = this._mat(1.0);
    this.mantle = new THREE.Points(mantleGeo, this.matMantle);
    this.group.add(this.mantle);

    const pCount = 8000;
    const pPos = new Float32Array(pCount * 3);
    const pNorm = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const isRing = Math.random() > 0.3;
      let finalPhi = phi;
      if (isRing) {
        finalPhi = Math.PI / 2 + (Math.random() - 0.5) * (Math.random() < 0.5 ? 0.3 : 1.2);
      }
      const r = 1.9 + Math.random() * 3.0;
      const x = r * Math.sin(finalPhi) * Math.cos(theta);
      const y = r * Math.cos(finalPhi);
      const z = r * Math.sin(finalPhi) * Math.sin(theta);
      pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
      const len = Math.sqrt(x * x + y * y + z * z);
      pNorm[i * 3] = x / len; pNorm[i * 3 + 1] = y / len; pNorm[i * 3 + 2] = z / len;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('normal', new THREE.BufferAttribute(pNorm, 3));
    this.matPeriphery = this._mat(2.0);
    this.periphery = new THREE.Points(pGeo, this.matPeriphery);
    this.periphery.rotation.z = Math.PI * 0.1;
    this.group.add(this.periphery);

    this.group.scale.set(this.currentScale, this.currentScale, this.currentScale);
  }

  _mat(layerType) {
    return new THREE.ShaderMaterial({
      vertexShader: _vs,
      fragmentShader: _fs,
      uniforms: {
        uTime: { value: 0 },
        uStateIntensity: { value: 0.0 },
        uLayerType: { value: layerType },
        uSpikeBoost: { value: 1.0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  update(time) {
    const t = this.states[this.currentState];
    this.currentIntensity += (t.intensity - this.currentIntensity) * 0.03;
    this.currentAmplitude += (t.amplitude - this.currentAmplitude) * 0.03;
    this.currentScale += (t.scale - this.currentScale) * 0.03;
    this.group.scale.set(this.currentScale, this.currentScale, this.currentScale);

    this.matHeart.uniforms.uStateIntensity.value = this.currentIntensity * 0.6;
    this.matMantle.uniforms.uStateIntensity.value = this.currentIntensity * this.currentAmplitude;
    this.matPeriphery.uniforms.uStateIntensity.value = this.currentIntensity * this.currentAmplitude * 1.5;

    const speed = t.speed;
    this.matHeart.uniforms.uTime.value += 0.015 * speed;
    this.matMantle.uniforms.uTime.value += 0.01 * speed;
    this.matPeriphery.uniforms.uTime.value += 0.005 * speed;

    const rs = t.rotationSpeed;
    this.heart.rotation.y += 0.01 * rs;
    this.heart.rotation.x += 0.008 * rs;
    this.mantle.rotation.y -= 0.006 * rs;
    this.mantle.rotation.z += 0.003 * rs;
    this.periphery.rotation.y += 0.002 * rs;
    this.periphery.rotation.x = Math.sin(time * 0.3) * 0.15;
  }
}

// ----- Init en el canvas del landing ----------------------------------------
function _initCore(canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight),
    0.1,
    1000
  );
  // Cámara z=5 igual que en el producto. Para que el núcleo se sienta
  // imponente NO acercamos la cámara (eso engorda las partículas y mata
  // el detalle); en su lugar subimos el scale del grupo (ver _JarvisCore
  // calmado.scale arriba).
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const core = new _JarvisCore();
  scene.add(core.group);

  function _resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Cámara z=5 fija (igual al producto). El tamaño visual lo damos
    // con scale del grupo, no con zoom-in.
    camera.position.z = 5;
    camera.updateProjectionMatrix();
  }
  _resize();
  window.addEventListener('resize', _resize);

  let _t = 0;
  function _tick() {
    _t += 0.016;
    core.update(_t);
    renderer.render(scene, camera);
    requestAnimationFrame(_tick);
  }
  _tick();
}

// ----- Auto-boot ------------------------------------------------------------
const _boot = () => {
  const canvas = document.getElementById('lp-core-canvas');
  if (canvas) {
    try {
      _initCore(canvas);
    } catch (e) {
      canvas.style.display = 'none';
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _boot);
} else {
  _boot();
}
