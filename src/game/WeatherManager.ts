import * as THREE from 'three';
import type { WeatherMode, WeatherState } from './types';
import type { AudioManager } from './AudioManager';

export class WeatherManager {
  public mode: WeatherMode = 'auto';
  public current: WeatherState = 'sunny';
  public windStrength = 0.4;
  public wetness = 0;

  private weatherTimer = 75;
  private rainPoints: THREE.Points;
  private rainPositions: Float32Array;
  private rainCount = 1600;
  private lightningTimer = 10;
  private lightningFlash = 0;
  private lightningLight: THREE.PointLight;

  constructor(scene: THREE.Scene) {
    this.rainPositions = new Float32Array(this.rainCount * 3);
    for (let i = 0; i < this.rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 90;
      this.rainPositions[i * 3 + 1] = Math.random() * 48;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xcbe4ff,
      size: 0.35,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.rainPoints = new THREE.Points(geo, mat);
    this.rainPoints.visible = false;
    this.rainPoints.frustumCulled = false;
    scene.add(this.rainPoints);

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

    // Make asphalt glossy & reflective when wet!
    asphaltMat.roughness = THREE.MathUtils.lerp(0.88, 0.22, this.wetness);
    asphaltMat.metalness = THREE.MathUtils.lerp(0.05, 0.32, this.wetness);

    if (scene.fog instanceof THREE.FogExp2) {
      const targetDensity =
        this.current === 'storm'
          ? 0.0028
          : this.current === 'rain'
          ? 0.0021
          : this.current === 'cloudy'
          ? 0.0014
          : 0.00095;
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, targetDensity, dt * 0.5);
    }

    const showRain = !isInside && (this.current === 'rain' || this.current === 'storm');
    this.rainPoints.visible = showRain;
    if (showRain) {
      this.rainPoints.position.set(focusPos.x, focusPos.y, focusPos.z);
      const speed = this.current === 'storm' ? 46 : 34;
      const drift = this.current === 'storm' ? 7 : 2;
      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 3;
        this.rainPositions[idx + 1] -= speed * dt;
        this.rainPositions[idx] += drift * dt;
        if (this.rainPositions[idx + 1] < -4) {
          this.rainPositions[idx + 1] = 44;
          this.rainPositions[idx] = (Math.random() - 0.5) * 90;
          this.rainPositions[idx + 2] = (Math.random() - 0.5) * 90;
        }
      }
      this.rainPoints.geometry.attributes.position.needsUpdate = true;
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
