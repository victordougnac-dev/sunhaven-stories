import * as THREE from 'three';
import type { AABBCollider, VehicleSpec } from './types';
import type { InputState } from './PlayerController';

export interface VehicleInstance {
  spec: VehicleSpec;
  group: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Mesh[];
  frontSteerPivots: THREE.Group[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  position: THREE.Vector3;
  yaw: number;
  speed: number;
  steerAngle: number;
  damage: number;
  lightsOn: boolean;
  isSecret?: boolean;
}

export class VehicleController {
  public vehicles: VehicleInstance[] = [];
  public activeVehicle: VehicleInstance | null = null;
  private group = new THREE.Group();
  private headlightMatOn = new THREE.MeshBasicMaterial({ color: 0xfff6cf });
  private headlightMatOff = new THREE.MeshStandardMaterial({ color: 0xd9e1e8, roughness: 0.2 });
  private taillightMatBrake = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  private taillightMatDim = new THREE.MeshStandardMaterial({ color: 0x6b1414, roughness: 0.3 });

  constructor(scene: THREE.Scene, getGroundHeight: (x: number, z: number) => number) {
    scene.add(this.group);
    this.spawnFleet(getGroundHeight);
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  private spawnFleet(getGroundHeight: (x: number, z: number) => number): void {
    const specs: { spec: VehicleSpec; x: number; z: number; yaw: number; secret?: boolean }[] = [
      {
        spec: {
          id: 'solaris_gt',
          name: 'Solaris GT',
          kind: 'sports',
          maxSpeed: 56,
          accel: 26,
          brake: 38,
          reverseSpeed: 15,
          turnSpeed: 2.4,
          grip: 7.5,
          length: 4.5,
          width: 2.0,
          height: 1.25,
          color: 0xff5733,
        },
        x: -150,
        z: -12,
        yaw: 0,
      },
      {
        spec: {
          id: 'bayfront_sedan',
          name: 'Bayfront Sedan',
          kind: 'sedan',
          maxSpeed: 42,
          accel: 19,
          brake: 32,
          reverseSpeed: 13,
          turnSpeed: 2.2,
          grip: 8.5,
          length: 4.6,
          width: 1.95,
          height: 1.45,
          color: 0x2980b9,
        },
        x: -72,
        z: -135,
        yaw: Math.PI * 0.5,
      },
      {
        spec: {
          id: 'dunerunner_suv',
          name: 'DuneRunner SUV',
          kind: 'suv',
          maxSpeed: 40,
          accel: 18,
          brake: 30,
          reverseSpeed: 13,
          turnSpeed: 2.0,
          grip: 8.0,
          length: 4.8,
          width: 2.15,
          height: 1.8,
          color: 0x2c3e50,
        },
        x: 78,
        z: -195,
        yaw: Math.PI,
      },
      {
        spec: {
          id: 'harbor_hauler',
          name: 'Harbor Hauler Pickup',
          kind: 'pickup',
          maxSpeed: 38,
          accel: 17,
          brake: 29,
          reverseSpeed: 12,
          turnSpeed: 2.0,
          grip: 7.8,
          length: 5.1,
          width: 2.1,
          height: 1.75,
          color: 0xd35400,
        },
        x: 135,
        z: 255,
        yaw: -Math.PI * 0.5,
      },
      {
        spec: {
          id: 'veloce_moto',
          name: 'Veloce 900 Moto',
          kind: 'moto',
          maxSpeed: 54,
          accel: 30,
          brake: 42,
          reverseSpeed: 7,
          turnSpeed: 3.1,
          grip: 9.0,
          length: 2.3,
          width: 0.78,
          height: 1.15,
          color: 0xf1c40f,
        },
        x: -165,
        z: 132,
        yaw: 0,
      },
      {
        spec: {
          id: 'bayside_van',
          name: 'Bayside Delivery Van',
          kind: 'van',
          maxSpeed: 35,
          accel: 15,
          brake: 28,
          reverseSpeed: 11,
          turnSpeed: 1.9,
          grip: 8.2,
          length: 5.2,
          width: 2.15,
          height: 2.2,
          color: 0xecf0f1,
        },
        x: -128,
        z: -36,
        yaw: 0,
      },
      {
        spec: {
          id: 'coral_sports',
          name: 'Coral GT Roadster',
          kind: 'sports',
          maxSpeed: 58,
          accel: 27,
          brake: 40,
          reverseSpeed: 16,
          turnSpeed: 2.5,
          grip: 7.8,
          length: 4.5,
          width: 2.0,
          height: 1.22,
          color: 0x1fd1c5,
        },
        x: 258,
        z: -195,
        yaw: Math.PI * 0.5,
      },
      {
        spec: {
          id: 'marina_speedboat_1',
          name: 'WaveRunner Speedboat',
          kind: 'boat',
          maxSpeed: 44,
          accel: 18,
          brake: 22,
          reverseSpeed: 10,
          turnSpeed: 2.1,
          grip: 4.5,
          length: 6.2,
          width: 2.4,
          height: 1.4,
          color: 0xf8f9fa,
        },
        x: -230,
        z: 325,
        yaw: -Math.PI * 0.5,
      },
      {
        spec: {
          id: 'marina_speedboat_2',
          name: 'Sunhaven Offshore Boat',
          kind: 'boat',
          maxSpeed: 48,
          accel: 20,
          brake: 22,
          reverseSpeed: 10,
          turnSpeed: 2.1,
          grip: 4.5,
          length: 6.2,
          width: 2.4,
          height: 1.4,
          color: 0xff6b4a,
        },
        x: -165,
        z: 325,
        yaw: Math.PI,
      },
      {
        spec: {
          id: 'midnight_solaris_proto',
          name: 'Midnight Solaris Prototype',
          kind: 'sports',
          maxSpeed: 66,
          accel: 33,
          brake: 45,
          reverseSpeed: 18,
          turnSpeed: 2.6,
          grip: 8.2,
          length: 4.6,
          width: 2.05,
          height: 1.2,
          color: 0x131722,
        },
        x: 255,
        z: 278,
        yaw: Math.PI * 0.5,
        secret: true,
      },
    ];

    for (const item of specs) {
      const v = this.createVehicleMesh(item.spec, item.secret);
      const y = item.spec.kind === 'boat' ? -0.35 : getGroundHeight(item.x, item.z);
      v.position.set(item.x, y, item.z);
      v.yaw = item.yaw;
      v.group.position.copy(v.position);
      v.group.rotation.y = v.yaw;
      this.group.add(v.group);
      this.vehicles.push(v);
    }
  }

  private createVehicleMesh(spec: VehicleSpec, isSecret = false): VehicleInstance {
    const group = new THREE.Group();
    const bodyGroup = new THREE.Group();
    group.add(bodyGroup);

    const paintMat = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: 0.25,
      metalness: 0.65,
    });
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x17222d,
      roughness: 0.15,
      metalness: 0.85,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: isSecret ? 0x1fd1c5 : 0x22262c,
      roughness: 0.5,
      metalness: 0.4,
      emissive: isSecret ? 0x1fd1c5 : 0x000000,
      emissiveIntensity: isSecret ? 0.65 : 0,
    });

    const wheels: THREE.Mesh[] = [];
    const frontSteerPivots: THREE.Group[] = [];
    const headlights: THREE.Mesh[] = [];
    const taillights: THREE.Mesh[] = [];

    if (spec.kind === 'boat') {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(spec.width, 0.9, spec.length * 0.82), paintMat);
      hull.position.set(0, 0.35, 0.2);
      hull.castShadow = true;
      bodyGroup.add(hull);

      const bow = new THREE.Mesh(new THREE.ConeGeometry(spec.width * 0.55, 1.9, 4), paintMat);
      bow.rotation.x = Math.PI * 0.5;
      bow.rotation.y = Math.PI * 0.25;
      bow.position.set(0, 0.45, -spec.length * 0.46);
      bodyGroup.add(bow);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.82, 0.55, 1.1), cabinMat);
      windshield.position.set(0, 0.95, -0.5);
      windshield.rotation.x = -0.35;
      bodyGroup.add(windshield);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(spec.width + 0.04, 0.18, spec.length * 0.78), trimMat);
      stripe.position.set(0, 0.65, 0.2);
      bodyGroup.add(stripe);
    } else if (spec.kind === 'moto') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 1.65), paintMat);
      frame.position.set(0, 0.62, 0);
      frame.castShadow = true;
      bodyGroup.add(frame);

      const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.7), cabinMat);
      fairing.position.set(0, 0.9, -0.55);
      fairing.rotation.x = -0.35;
      bodyGroup.add(fairing);

      const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.18, 16);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.85 });
      for (const wz of [-0.78, 0.78]) {
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.36, wz);
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.castShadow = true;
        pivot.add(w);
        group.add(pivot);
        wheels.push(w);
        if (wz < 0) frontSteerPivots.push(pivot);
      }

      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.08), this.headlightMatOff);
      hl.position.set(0, 0.82, -0.92);
      bodyGroup.add(hl);
      headlights.push(hl);
    } else {
      // Cars, SUVs, Pickups, Vans
      const chassisH = spec.kind === 'sports' ? 0.58 : spec.kind === 'van' ? 1.25 : 0.72;
      const chassisY = spec.kind === 'suv' || spec.kind === 'pickup' ? 0.66 : 0.54;

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(spec.width, chassisH, spec.length), paintMat);
      chassis.position.set(0, chassisY, 0);
      chassis.castShadow = true;
      chassis.receiveShadow = true;
      bodyGroup.add(chassis);

      // Cabin
      const cabinLen = spec.kind === 'van' ? spec.length * 0.78 : spec.kind === 'pickup' ? spec.length * 0.38 : spec.length * 0.52;
      const cabinZ = spec.kind === 'pickup' ? -0.45 : spec.kind === 'van' ? 0.25 : 0.15;
      const cabinH = spec.kind === 'sports' ? 0.48 : 0.62;
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(spec.width * 0.84, cabinH, cabinLen),
        cabinMat
      );
      cabin.position.set(0, chassisY + chassisH * 0.5 + cabinH * 0.45, cabinZ);
      cabin.castShadow = true;
      bodyGroup.add(cabin);

      if (spec.kind === 'sports') {
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(spec.width * 0.92, 0.1, 0.36), trimMat);
        spoiler.position.set(0, chassisY + chassisH * 0.5 + 0.24, spec.length * 0.44);
        bodyGroup.add(spoiler);
      }

      // Bumpers & headlights/taillights
      for (const sx of [-spec.width * 0.34, spec.width * 0.34]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.1), this.headlightMatOff);
        hl.position.set(sx, chassisY + 0.08, -spec.length * 0.5 - 0.02);
        bodyGroup.add(hl);
        headlights.push(hl);

        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.1), this.taillightMatDim);
        tl.position.set(sx, chassisY + 0.08, spec.length * 0.5 + 0.02);
        bodyGroup.add(tl);
        taillights.push(tl);
      }

      // 4 Wheels + rims
      const wheelRadius = spec.kind === 'suv' || spec.kind === 'pickup' ? 0.42 : 0.36;
      const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.26, 16);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x17191e, roughness: 0.85 });
      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, 0.28, 10);
      rimGeo.rotateZ(Math.PI / 2);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xc8d0d8, metalness: 0.8, roughness: 0.25 });

      const wx = spec.width * 0.48;
      const wzFront = -spec.length * 0.32;
      const wzRear = spec.length * 0.32;

      for (const [xPos, zPos, isFront] of [
        [-wx, wzFront, true],
        [wx, wzFront, true],
        [-wx, wzRear, false],
        [wx, wzRear, false],
      ] as [number, number, boolean][]) {
        const pivot = new THREE.Group();
        pivot.position.set(xPos, wheelRadius, zPos);
        const tire = new THREE.Mesh(wheelGeo, wheelMat);
        tire.castShadow = true;
        const rim = new THREE.Mesh(rimGeo, rimMat);
        tire.add(rim);
        pivot.add(tire);
        group.add(pivot);
        wheels.push(tire);
        if (isFront) frontSteerPivots.push(pivot);
      }
    }

    return {
      spec,
      group,
      bodyGroup,
      wheels,
      frontSteerPivots,
      headlights,
      taillights,
      position: new THREE.Vector3(),
      yaw: 0,
      speed: 0,
      steerAngle: 0,
      damage: 0,
      lightsOn: false,
      isSecret,
    };
  }

  findNearestVehicle(pos: THREE.Vector3, maxDist = 4.2): VehicleInstance | null {
    let best: VehicleInstance | null = null;
    let bestD = maxDist;
    for (const v of this.vehicles) {
      const d = v.position.distanceTo(pos);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  enterVehicle(v: VehicleInstance): void {
    this.activeVehicle = v;
  }

  exitVehicle(): THREE.Vector3 {
    if (!this.activeVehicle) return new THREE.Vector3();
    const v = this.activeVehicle;
    const sideOffset = new THREE.Vector3(Math.cos(v.yaw) * 2.4, 0.3, -Math.sin(v.yaw) * 2.4);
    const exitPos = v.position.clone().add(sideOffset);
    this.activeVehicle = null;
    return exitPos;
  }

  toggleLights(): void {
    if (this.activeVehicle) {
      this.activeVehicle.lightsOn = !this.activeVehicle.lightsOn;
    }
  }

  update(
    dt: number,
    input: InputState,
    isNight: boolean,
    colliders: AABBCollider[],
    getGroundHeight: (x: number, z: number) => number
  ): void {
    for (const v of this.vehicles) {
      const isActive = v === this.activeVehicle;
      const lightsShouldBeOn = isNight || (isActive && v.lightsOn);

      for (const hl of v.headlights) {
        hl.material = lightsShouldBeOn ? this.headlightMatOn : this.headlightMatOff;
      }

      if (!isActive) {
        // Gentle coasting stop when exited
        v.speed = THREE.MathUtils.lerp(v.speed, 0, Math.min(1, dt * 3));
        if (Math.abs(v.speed) > 0.1) {
          const fwd = new THREE.Vector3(-Math.sin(v.yaw), 0, -Math.cos(v.yaw));
          v.position.addScaledVector(fwd, v.speed * dt);
        }
        if (v.spec.kind === 'boat') {
          v.position.y = -0.35 + Math.sin(performance.now() * 0.002 + v.position.x) * 0.08;
        } else {
          v.position.y = getGroundHeight(v.position.x, v.position.z);
        }
        v.group.position.copy(v.position);
        v.group.rotation.y = v.yaw;
        for (const tl of v.taillights) tl.material = this.taillightMatDim;
        continue;
      }

      // Active driving physics
      const throttle = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      const braking = (throttle < 0 && v.speed > 1.5) || input.handbrake;

      for (const tl of v.taillights) {
        tl.material = braking ? this.taillightMatBrake : this.taillightMatDim;
      }

      if (throttle > 0) {
        const accelCurve = 1 - 0.35 * (Math.abs(v.speed) / v.spec.maxSpeed);
        v.speed += v.spec.accel * accelCurve * dt;
      } else if (throttle < 0) {
        if (v.speed > 1) {
          v.speed -= v.spec.brake * dt;
        } else {
          v.speed -= v.spec.accel * 0.65 * dt;
        }
      } else {
        v.speed = THREE.MathUtils.lerp(v.speed, 0, Math.min(1, dt * 1.4));
      }

      if (input.handbrake) {
        v.speed = THREE.MathUtils.lerp(v.speed, 0, Math.min(1, dt * 3.8));
      }

      v.speed = THREE.MathUtils.clamp(v.speed, -v.spec.reverseSpeed, v.spec.maxSpeed);

      // Speed-sensitive steering
      const targetSteer = steerInput * 0.52;
      v.steerAngle = THREE.MathUtils.lerp(v.steerAngle, targetSteer, Math.min(1, dt * 10));
      for (const pivot of v.frontSteerPivots) {
        pivot.rotation.y = v.steerAngle;
      }

      const speedFactor = Math.min(1, Math.abs(v.speed) / 6.5);
      const highSpeedDamp = 1 - 0.35 * (Math.abs(v.speed) / v.spec.maxSpeed);
      const dirSign = v.speed >= 0 ? 1 : -1;
      const driftBoost = input.handbrake ? 1.35 : 1.0;
      v.yaw += v.steerAngle * v.spec.turnSpeed * speedFactor * highSpeedDamp * dirSign * driftBoost * dt;

      const forward = new THREE.Vector3(-Math.sin(v.yaw), 0, -Math.cos(v.yaw));
      const nextX = v.position.x + forward.x * v.speed * dt;
      const nextZ = v.position.z + forward.z * v.speed * dt;

      if (v.spec.kind === 'boat') {
        const gNext = getGroundHeight(nextX, nextZ);
        if (gNext < -0.45) {
          v.position.x = THREE.MathUtils.clamp(nextX, -700, 700);
          v.position.z = THREE.MathUtils.clamp(nextZ, -700, 700);
        } else {
          // Beach / pier collision stop
          v.speed *= -0.25;
        }
        v.position.y = -0.32 + Math.min(0.35, Math.abs(v.speed) * 0.012);
      } else {
        // Ground vehicle collision check
        const prevX = v.position.x;
        const prevZ = v.position.z;
        v.position.x = THREE.MathUtils.clamp(nextX, -700, 700);
        v.position.z = THREE.MathUtils.clamp(nextZ, -700, 700);

        const gY = getGroundHeight(v.position.x, v.position.z);
        if (gY < -1.1) {
          // Prevent driving deep into ocean
          v.position.x = prevX;
          v.position.z = prevZ;
          v.speed *= -0.3;
        } else {
          const hit = this.checkCollision(v, colliders);
          if (hit) {
            v.position.x = prevX;
            v.position.z = prevZ;
            if (Math.abs(v.speed) > 12) {
              v.damage = Math.min(1, v.damage + 0.12);
            }
            v.speed *= -0.32;
          } else {
            v.position.y = gY;
          }
        }
      }

      // Spin wheels
      const wheelSpin = (v.speed * dt) / 0.36;
      for (const w of v.wheels) {
        w.rotation.x -= wheelSpin;
      }

      // Suspension body roll & pitch
      const targetRoll =
        v.spec.kind === 'moto'
          ? -v.steerAngle * speedFactor * 0.68
          : v.steerAngle * speedFactor * 0.12;
      const targetPitch = throttle * 0.032;
      v.bodyGroup.rotation.z = THREE.MathUtils.lerp(v.bodyGroup.rotation.z, targetRoll, dt * 8);
      v.bodyGroup.rotation.x = THREE.MathUtils.lerp(v.bodyGroup.rotation.x, targetPitch, dt * 8);

      v.group.position.copy(v.position);
      v.group.rotation.y = v.yaw;
    }
  }

  private checkCollision(v: VehicleInstance, colliders: AABBCollider[]): boolean {
    const r = Math.max(v.spec.width, v.spec.length) * 0.36;
    const vx = v.position.x;
    const vy = v.position.y;
    const vz = v.position.z;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (vy + v.spec.height < c.minY || vy > c.maxY) continue;
      if (vx + r > c.minX && vx - r < c.maxX && vz + r > c.minZ && vz - r < c.maxZ) {
        return true;
      }
    }
    return false;
  }
}
