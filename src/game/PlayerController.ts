import * as THREE from 'three';
import {
  buildHumanoidRig,
  CharacterAnimationController,
  type AnimState,
  type HumanoidRig,
} from './CharacterAnimationController';
import type { AABBCollider } from './types';
import type { SurfaceType } from './AudioManager';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  handbrake: boolean;
  yawLeft: boolean;
  yawRight: boolean;
  throttleUp: boolean;
  throttleDown: boolean;
}

export class PlayerController {
  public position = new THREE.Vector3(-135, 0.2, -20);
  public velocity = new THREE.Vector3();
  public yaw = Math.PI * 0.5;
  public grounded = true;
  public inWater = false;
  public sitting = false;
  public visible = true;

  public rig: HumanoidRig;
  public anim: CharacterAnimationController;
  public animState: AnimState = 'idle';

  private radius = 0.42;
  private gravity = 24;

  constructor(scene: THREE.Scene) {
    this.rig = buildHumanoidRig({
      skinColor: 0xd99b78,
      shirtColor: 0xf4f4f2,
      jacketColor: 0x1a7f8e, // signature coastal teal jacket
      pantsColor: 0x263242,
      shoeColor: 0xeaeaea,
      hairColor: 0x241a14,
      sunglasses: true,
    });
    this.rig.root.position.copy(this.position);
    scene.add(this.rig.root);
    this.anim = new CharacterAnimationController(this.rig);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.rig.root.visible = v;
  }

  update(
    dt: number,
    input: InputState,
    cameraYaw: number,
    colliders: AABBCollider[],
    getGroundHeight: (x: number, z: number) => number,
    getSurfaceType: (x: number, z: number) => SurfaceType,
    isInside = false
  ): { speed: number; surface: SurfaceType } {
    if (!this.visible) {
      return { speed: 0, surface: 'asphalt' };
    }

    // Cancel sitting on any move key
    if (this.sitting && (input.forward || input.backward || input.left || input.right || input.jump)) {
      this.sitting = false;
    }

    if (this.sitting) {
      this.animState = 'sit';
      this.anim.update(dt, 'sit', 0);
      this.rig.root.position.copy(this.position);
      this.rig.root.rotation.y = this.yaw;
      return { speed: 0, surface: 'asphalt' };
    }

    // Camera-relative movement direction
    const moveZ = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    const forwardVec = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const rightVec = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    const wishDir = new THREE.Vector3()
      .addScaledVector(forwardVec, moveZ)
      .addScaledVector(rightVec, moveX);

    const hasInput = wishDir.lengthSq() > 0.001;
    if (hasInput) wishDir.normalize();

    const groundY = getGroundHeight(this.position.x, this.position.z);
    this.inWater = !isInside && groundY < -0.55 && this.position.y <= -0.35;

    const targetSpeed = this.inWater
      ? 4.2
      : input.sprint
      ? 10.6
      : 5.6;

    const accel = this.grounded ? 36 : 14;
    const decel = this.grounded ? 28 : 4;

    if (hasInput) {
      this.velocity.x = THREE.MathUtils.lerp(
        this.velocity.x,
        wishDir.x * targetSpeed,
        Math.min(1, dt * accel * 0.25)
      );
      this.velocity.z = THREE.MathUtils.lerp(
        this.velocity.z,
        wishDir.z * targetSpeed,
        Math.min(1, dt * accel * 0.25)
      );

      // Smoothly turn character toward movement direction
      const targetYaw = Math.atan2(wishDir.x, wishDir.z);
      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 11);
    } else {
      const drop = Math.min(1, dt * decel * 0.35);
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, drop);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, drop);
    }

    // Jump / Gravity / Swim
    if (this.inWater) {
      this.grounded = false;
      const swimY = -0.65;
      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, (swimY - this.position.y) * 5, dt * 6);
      if (input.jump && this.position.y < -0.2) {
        this.velocity.y = 4.2;
      }
    } else {
      if (input.jump && this.grounded) {
        this.velocity.y = 8.4;
        this.grounded = false;
      }
      this.velocity.y -= this.gravity * dt;
    }

    // Integrate horizontal & resolve AABB collisions
    this.position.x += this.velocity.x * dt;
    this.resolveCollisions('x', colliders);
    this.position.z += this.velocity.z * dt;
    this.resolveCollisions('z', colliders);

    // World bounds clamp
    this.position.x = THREE.MathUtils.clamp(this.position.x, -1080, 1080);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -1080, 1080);

    // Vertical ground clamp
    this.position.y += this.velocity.y * dt;
    const newGround = getGroundHeight(this.position.x, this.position.z);
    if (!this.inWater && this.position.y <= newGround) {
      this.position.y = newGround;
      this.velocity.y = 0;
      this.grounded = true;
    } else if (!this.inWater && this.position.y > newGround + 0.18) {
      this.grounded = false;
    }

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.inWater) {
      this.animState = 'swim';
    } else if (!this.grounded) {
      this.animState = this.velocity.y > 0.5 ? 'jump' : 'fall';
    } else if (horizSpeed > 8.4) {
      this.animState = 'sprint';
    } else if (horizSpeed > 4.2) {
      this.animState = 'run';
    } else if (horizSpeed > 0.45) {
      this.animState = 'walk';
    } else {
      this.animState = 'idle';
    }

    this.anim.update(dt, this.animState, horizSpeed);
    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.y = this.yaw;

    return {
      speed: horizSpeed,
      surface: getSurfaceType(this.position.x, this.position.z),
    };
  }

  private resolveCollisions(axis: 'x' | 'z', colliders: AABBCollider[]): void {
    const px = this.position.x;
    const py = this.position.y;
    const pz = this.position.z;
    const r = this.radius;

    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (py + 1.75 <= c.minY || py >= c.maxY - 0.15) continue;
      if (px + r > c.minX && px - r < c.maxX && pz + r > c.minZ && pz - r < c.maxZ) {
        if (axis === 'x') {
          if (this.velocity.x > 0) this.position.x = c.minX - r - 0.002;
          else if (this.velocity.x < 0) this.position.x = c.maxX + r + 0.002;
          this.velocity.x = 0;
        } else {
          if (this.velocity.z > 0) this.position.z = c.minZ - r - 0.002;
          else if (this.velocity.z < 0) this.position.z = c.maxZ + r + 0.002;
          this.velocity.z = 0;
        }
      }
    }
  }
}
