import * as THREE from 'three';
import type { TimeMode, WeatherState } from './types';

export class TimeManager {
  public timeOfDay = 17.35; // Golden tropical magic hour (dramatic coastal shadows & reflections)
  public mode: TimeMode = 'cycle';
  public cycleSpeed = 0.14; // ~2.8 mins per full 24h cycle

  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public skyMesh: THREE.Mesh;
  public skyUniforms: {
    topColor: { value: THREE.Color };
    bottomColor: { value: THREE.Color };
    sunDir: { value: THREE.Vector3 };
    nightFactor: { value: number };
    timeSec: { value: number };
  };

  public nightFactor = 0;
  private sunDisc: THREE.Mesh;
  private moonDisc: THREE.Mesh;
  private stars: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.sunLight = new THREE.DirectionalLight(0xffe6bd, 2.55);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 8;
    this.sunLight.shadow.camera.far = 420;
    const d = 105;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.normalBias = 0.025;
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    this.hemiLight = new THREE.HemisphereLight(0x94d3ff, 0x615548, 0.92);
    scene.add(this.hemiLight);

    // Rayleigh / Mie inspired coastal atmospheric sky dome
    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x185fa8) },
      bottomColor: { value: new THREE.Color(0xf7ae7c) },
      sunDir: { value: new THREE.Vector3(0.7, 0.25, -0.4) },
      nightFactor: { value: 0 },
      timeSec: { value: 0 },
    };

    const skyGeo = new THREE.SphereGeometry(2250, 32, 22);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 sunDir;
        uniform float nightFactor;
        uniform float timeSec;
        varying vec3 vWorldPos;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.05;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);
          // Multi-band Rayleigh horizon scatter
          vec3 horizonWarm = mix(bottomColor, vec3(1.0, 0.62, 0.36), clamp((1.0 - nightFactor) * (1.0 - h * 2.5), 0.0, 1.0) * 0.48);
          vec3 col = mix(horizonWarm, topColor, pow(h, 0.48));

          // Mie solar scatter aureole
          vec3 sDir = normalize(sunDir);
          float sunDot = max(dot(dir, sDir), 0.0);
          float dayVis = 1.0 - nightFactor * 0.88;
          col += vec3(1.0, 0.58, 0.28) * pow(sunDot, 5.0) * 0.36 * dayVis;
          col += vec3(1.0, 0.84, 0.56) * pow(sunDot, 36.0) * 0.72 * dayVis;
          col += vec3(1.0, 0.96, 0.88) * smoothstep(0.9985, 0.9997, sunDot) * 1.45 * dayVis;

          // Subtle volumetric coastal cirrus clouds
          if (dir.y > 0.03) {
            vec2 cloudUv = dir.xz / (dir.y + 0.14) * 1.4 + vec2(timeSec * 0.008, timeSec * 0.003);
            float c = fbm(cloudUv * 1.5);
            float cMask = smoothstep(0.48, 0.76, c) * smoothstep(0.03, 0.24, dir.y) * (1.0 - nightFactor * 0.8);
            vec3 cloudCol = mix(vec3(0.98, 0.95, 0.92), vec3(1.0, 0.72, 0.52), pow(sunDot, 2.0) * 0.75);
            col = mix(col, cloudCol, cMask * 0.45);
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(this.skyMesh);

    this.sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(40, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffefc2, fog: false })
    );
    scene.add(this.sunDisc);

    this.moonDisc = new THREE.Mesh(
      new THREE.SphereGeometry(26, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xdce7ff, fog: false })
    );
    scene.add(this.moonDisc);

    // Stars field
    const starPositions = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.12 + Math.random() * 0.88);
      const r = 1850;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 4.5,
      transparent: true,
      opacity: 0,
      fog: false,
    });
    this.stars = new THREE.Points(starGeo, starMat);
    scene.add(this.stars);
  }

  setMode(mode: TimeMode): void {
    this.mode = mode;
    if (mode === 'sunrise') this.timeOfDay = 6.4;
    else if (mode === 'noon') this.timeOfDay = 13.0;
    else if (mode === 'sunset') this.timeOfDay = 18.25;
    else if (mode === 'night') this.timeOfDay = 22.5;
  }

  update(dt: number, focusPos: THREE.Vector3, weather: WeatherState, scene: THREE.Scene): void {
    if (this.mode === 'cycle') {
      this.timeOfDay = (this.timeOfDay + dt * this.cycleSpeed) % 24;
    }
    this.skyUniforms.timeSec.value += dt;

    // Sun angle (6:00 sunrise -> 12:00 zenith -> 18:00 sunset)
    const angle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunDir = new THREE.Vector3(
      Math.cos(angle) * 0.85,
      Math.sin(angle),
      -0.42
    ).normalize();

    this.skyUniforms.sunDir.value.copy(sunDir);
    this.skyMesh.position.copy(focusPos);
    this.stars.position.copy(focusPos);

    this.sunDisc.position.copy(focusPos).addScaledVector(sunDir, 1700);
    this.sunDisc.visible = sunDir.y > -0.15;

    this.moonDisc.position.copy(focusPos).addScaledVector(sunDir, -1700);
    this.moonDisc.visible = sunDir.y < 0.15;

    // Day/night interpolation
    const elevation = sunDir.y;
    const dayAmount = THREE.MathUtils.clamp((elevation + 0.12) / 0.45, 0, 1);
    const sunsetAmount = THREE.MathUtils.clamp(1 - Math.abs(elevation - 0.06) / 0.24, 0, 1);
    this.nightFactor = 1 - dayAmount;
    this.skyUniforms.nightFactor.value = this.nightFactor;

    const stormDim = weather === 'storm' ? 0.45 : weather === 'rain' ? 0.65 : weather === 'cloudy' ? 0.8 : 1.0;

    // Sky colors
    const dayTop = new THREE.Color(0x1b6ec2);
    const dayBot = new THREE.Color(0xa6dcf5);
    const sunsetTop = new THREE.Color(0x3a4375);
    const sunsetBot = new THREE.Color(0xff7e4b);
    const nightTop = new THREE.Color(0x050b16);
    const nightBot = new THREE.Color(0x112035);

    const topCol = nightTop.clone().lerp(dayTop, dayAmount).lerp(sunsetTop, sunsetAmount * 0.7);
    const botCol = nightBot.clone().lerp(dayBot, dayAmount).lerp(sunsetBot, sunsetAmount * 0.85);

    if (weather === 'storm' || weather === 'rain') {
      const overcast = new THREE.Color(0x3e4b59).multiplyScalar(0.35 + dayAmount * 0.65);
      topCol.lerp(overcast, 0.72);
      botCol.lerp(overcast, 0.78);
    }

    this.skyUniforms.topColor.value.copy(topCol);
    this.skyUniforms.bottomColor.value.copy(botCol);

    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(botCol);
    }

    // Keep shadow camera centered around player
    const activeDir = elevation > -0.05 ? sunDir : sunDir.clone().negate();
    this.sunLight.position.copy(focusPos).addScaledVector(activeDir, 180);
    this.sunLight.target.position.copy(focusPos);
    this.sunLight.target.updateMatrixWorld();

    const sunColor = new THREE.Color(0xfff4df)
      .lerp(new THREE.Color(0xff8e53), sunsetAmount * 0.75)
      .lerp(new THREE.Color(0x6b88c9), this.nightFactor);
    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = (0.35 + dayAmount * 2.15) * stormDim;

    this.hemiLight.color.copy(topCol).lerp(new THREE.Color(0xffffff), 0.45);
    this.hemiLight.groundColor.setHex(dayAmount > 0.3 ? 0x7c7467 : 0x1a2533);
    this.hemiLight.intensity = (0.52 + dayAmount * 0.92) * (0.7 + 0.3 * stormDim);

    (this.stars.material as THREE.PointsMaterial).opacity =
      this.nightFactor * (weather === 'sunny' ? 0.9 : 0.25);
  }

  getFormattedTime(): string {
    const h = Math.floor(this.timeOfDay) % 24;
    const m = Math.floor((this.timeOfDay % 1) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  isNight(): boolean {
    return this.nightFactor > 0.55;
  }
}
