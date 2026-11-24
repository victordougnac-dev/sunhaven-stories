import * as THREE from 'three';
import type { AABBCollider } from './types';

export type CameraMode = 'foot' | 'interior' | 'vehicle' | 'boat' | 'aircraft' | 'photo';

export class CameraController {
  public yaw = 0;
  public pitch = 0.24;
  public distance = 5.2;
  public targetDistance = 5.2;
  public sensitivity = 1.0;
  public invertY = false;
  public mode: CameraMode = 'foot';

  private currentTarget = new THREE.Vector3();
  private currentPos = new THREE.Vector3();
  private initialized = false;

  snap(yaw?: number): void {
    this.initialized = false;
    if (yaw !== undefined) {
      this.yaw = yaw;
    }
  }

  onMouseMove(dx: number, dy: number): void {
    const sens = 0.0026 * this.sensitivity;
    this.yaw -= dx * sens;
    const ySign = this.invertY ? -1 : 1;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * sens * ySign, -0.35, 1.15);
  }

  onWheel(deltaY: number): void {
    const minD = this.mode === 'aircraft' ? 9 : this.mode === 'vehicle' ? 4.8 : 2.0;
    const maxD = this.mode === 'aircraft' ? 28 : this.mode === 'interior' ? 4.5 : 14;
    this.targetDistance = THREE.MathUtils.clamp(
      this.targetDistance + deltaY * 0.004,
      minD,
      maxD
    );
  }

  setMode(mode: CameraMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'foot') this.targetDistance = 4.8;
    else if (mode === 'interior') {
      this.targetDistance = 3.1;
      this.distance = 3.1;
      this.pitch = 0.16;
    } else if (mode === 'vehicle') this.targetDistance = 7.4;
    else if (mode === 'boat') this.targetDistance = 9.2;
    else if (mode === 'aircraft') this.targetDistance = 16.5;
  }

  update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    targetPos: THREE.Vector3,
    headingYaw: number,
    speed: number,
    colliders: AABBCollider[],
    getGroundHeight: (x: number, z: number) => number,
    isAutoFollow: boolean
  ): void {
    const lookOffsetY =
      this.mode === 'aircraft' ? 1.8 : this.mode === 'vehicle' || this.mode === 'boat' ? 1.4 : 1.45;
    const desiredTarget = new THREE.Vector3(targetPos.x, targetPos.y + lookOffsetY, targetPos.z);

    const justInit = !this.initialized;
    if (justInit) {
      this.currentTarget.copy(desiredTarget);
      this.initialized = true;
    } else {
      this.currentTarget.lerp(desiredTarget, Math.min(1, dt * 14));
    }

    // Gentle auto-align behind vehicle/aircraft when moving forward
    if (isAutoFollow && speed > 3.5 && (this.mode === 'vehicle' || this.mode === 'boat' || this.mode === 'aircraft')) {
      const targetCamYaw = headingYaw + Math.PI;
      let diff = targetCamYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 2.4);
    }

    this.distance = THREE.MathUtils.lerp(this.distance, this.targetDistance, Math.min(1, dt * 8));

    if (this.mode === 'photo') {
      // First-person photo camera positioned at player eye level
      const eye = new THREE.Vector3(targetPos.x, targetPos.y + 1.62, targetPos.z);
      const lookDir = new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        -Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch)
      );
      camera.position.copy(eye);
      camera.lookAt(eye.clone().add(lookDir));
      camera.fov = THREE.MathUtils.lerp(camera.fov, 54, dt * 8);
      camera.updateProjectionMatrix();
      return;
    }

    const horizDist = Math.cos(this.pitch) * this.distance;
    const vertDist = Math.sin(this.pitch) * this.distance;

    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * horizDist,
      vertDist,
      Math.cos(this.yaw) * horizDist
    );

    const idealPos = this.currentTarget.clone().add(offset);

    // Collision avoidance raymarch along spring arm
    const steps = 6;
    let clampedFraction = 1.0;
    for (let s = 1; s <= steps; s++) {
      const f = s / steps;
      const sample = this.currentTarget.clone().lerp(idealPos, f);
      let hit = false;
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (
          sample.x > c.minX - 0.3 &&
          sample.x < c.maxX + 0.3 &&
          sample.y > c.minY &&
          sample.y < c.maxY &&
          sample.z > c.minZ - 0.3 &&
          sample.z < c.maxZ + 0.3
        ) {
          hit = true;
          break;
        }
      }
      if (hit) {
        clampedFraction = Math.max(0.22, (s - 1) / steps);
        break;
      }
    }

    const finalPos = this.currentTarget.clone().lerp(idealPos, clampedFraction);
    const groundAtCam = getGroundHeight(finalPos.x, finalPos.z);
    if (finalPos.y < groundAtCam + 0.55) {
      finalPos.y = groundAtCam + 0.55;
    }

    if (justInit) {
      this.currentPos.copy(finalPos);
    } else {
      this.currentPos.lerp(finalPos, Math.min(1, dt * 18));
    }
    camera.position.copy(this.currentPos);
    camera.lookAt(this.currentTarget);

    const targetFov =
      this.mode === 'aircraft'
        ? 68 + Math.min(14, speed * 0.15)
        : this.mode === 'vehicle'
        ? 60 + Math.min(14, speed * 0.32)
        : 60;
    if (Math.abs(camera.fov - targetFov) > 0.1) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, Math.min(1, dt * 6));
      camera.updateProjectionMatrix();
    }
  }
}
