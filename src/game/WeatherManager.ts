import * as THREE from 'three';
import type { WeatherMode, WeatherState } from './types';
import type { AudioManager } from './AudioManager';

export class WeatherManager {
  public mode: WeatherMode = 'auto';
  public current: WeatherState = 'sunny';
  public windStrength = 0.4;
  public wetness = 0;

  private weatherTimer = 75;
  private rainLines: THREE.LineSegments;
  private rainPositions: Float32Array;
  private rainCount = 1350;
  private lightningTimer = 10;
  private lightningFlash = 0;
  private lightningLight: THREE.PointLight;

  constructor(scene: THREE.Scene) {
    this.rainPositions = new Float32Array(this.rainCount * 6);
    for (let i = 0; i < this.rainCount; i++) {
      const rx = (Math.random() - 0.5) * 90;
      const ry = Math.random() * 48;
      const rz = (Math.random() - 0.5) * 90;
      const idx = i * 6;
      this.rainPositions[idx] = rx;
      this.rainPositions[idx + 1] = ry;
      this.rainPositions[idx + 2] = rz;
      this.rainPositions[idx + 3] = rx - 0.08;
      this.rainPositions[idx + 4] = ry + 0.95;
      this.rainPositions[idx + 5] = rz;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xbfe2ff,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(geo, mat);
    this.rainLines.visible = false;
    this.rainLines.frustumCulled = false;
    scene.add(this.rainLines);

    this.lightningLight = new THREE.PointLight(0xd9ecff, 0, 900);
    scene.add(this.lightningLight);
  }

  setMode(mode: WeatherMode): void {
    this.mode = mode;
    if (mode !== 'auto') {
      this.current = mode;
    }
  }

  update(
    dt: number,
    focusPos: THREE.Vector3,
    isInside: boolean,
    asphaltMat: THREE.MeshStandardMaterial,
    scene: THREE.Scene,
    audio: AudioManager
  ): void {
    if (this.mode === 'auto') {
      this.weatherTimer -= dt;
      if (this.weatherTimer <= 0) {
        this.weatherTimer = 60 + Math.random() * 60;
        const r = Math.random();
        if (r < 0.52) this.current = 'sunny';
        else if (r < 0.76) this.current = 'cloudy';
        else if (r < 0.92) this.current = 'rain';
        else this.current = 'storm';
      }
    }

    const targetWet = this.current === 'rain' || this.current === 'storm' ? 1 : 0;
    this.wetness = THREE.MathUtils.lerp(this.wetness, targetWet, dt * 0.4);
    this.windStrength = this.current === 'storm' ? 1.5 : this.current === 'rain' ? 0.9 : 0.4;

    // Make asphalt glossy & mirror-like when wet!
    asphaltMat.roughness = THREE.MathUtils.lerp(0.82, 0.14, this.wetness);
    asphaltMat.metalness = THREE.MathUtils.lerp(0.08, 0.42, this.wetness);

    if (scene.fog instanceof THREE.FogExp2) {
      const targetDensity =
        this.current === 'storm'
          ? 0.0026
          : this.current === 'rain'
          ? 0.0019
          : this.current === 'cloudy'
          ? 0.0012
          : 0.00082;
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, targetDensity, dt * 0.5);
    }

    const showRain = !isInside && (this.current === 'rain' || this.current === 'storm');
    this.rainLines.visible = showRain;
    if (showRain) {
      this.rainLines.position.set(focusPos.x, focusPos.y, focusPos.z);
      const speed = this.current === 'storm' ? 46 : 34;
      const drift = this.current === 'storm' ? 8 : 2.5;
      const tailDx = -drift * 0.032;
      const tailDy = this.current === 'storm' ? 1.25 : 0.95;
      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 6;
        let rx = this.rainPositions[idx] + drift * dt;
        let ry = this.rainPositions[idx + 1] - speed * dt;
        let rz = this.rainPositions[idx + 2];
        if (ry < -4) {
          ry = 44;
          rx = (Math.random() - 0.5) * 90;
          rz = (Math.random() - 0.5) * 90;
        }
        this.rainPositions[idx] = rx;
        this.rainPositions[idx + 1] = ry;
        this.rainPositions[idx + 2] = rz;
        this.rainPositions[idx + 3] = rx + tailDx;
        this.rainPositions[idx + 4] = ry + tailDy;
        this.rainPositions[idx + 5] = rz;
      }
      this.rainLines.geometry.attributes.position.needsUpdate = true;
    }

    // Lightning in storm
    if (this.current === 'storm' && !isInside) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 7 + Math.random() * 12;
        this.lightningFlash = 4.5;
        this.lightningLight.position.set(
          focusPos.x + (Math.random() - 0.5) * 200,
          160,
          focusPos.z + (Math.random() - 0.5) * 200
        );
        audio.playThunder();
      }
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 14);
    }
    this.lightningLight.intensity = this.lightningFlash;
  }

  getLabel(): string {
    if (this.current === 'sunny') return 'Sunny';
    if (this.current === 'cloudy') return 'Cloudy';
    if (this.current === 'rain') return 'Rain';
    return 'Storm';
  }
}
