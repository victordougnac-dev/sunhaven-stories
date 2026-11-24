import * as THREE from 'three';
import type { AircraftSpec } from './types';
import type { InputState } from './PlayerController';

export interface AircraftInstance {
  spec: AircraftSpec;
  group: THREE.Group;
  rotor: THREE.Object3D;
  tailRotor?: THREE.Object3D;
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  roll: number;
  throttle: number;
  speed: number;
  verticalSpeed: number;
  grounded: boolean;
}

export class AircraftController {
  public aircrafts: AircraftInstance[] = [];
  public activeAircraft: AircraftInstance | null = null;
  private group = new THREE.Group();

  constructor(scene: THREE.Scene, getGroundHeight: (x: number, z: number) => number) {
    scene.add(this.group);
    this.spawnAircraft(getGroundHeight);
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  private spawnAircraft(getGroundHeight: (x: number, z: number) => number): void {
    // 1. Sunbird Prop parked ready near South Runway threshold
    this.addAircraft(
      {
        id: 'sunbird_prop',
        name: 'Sunbird Propeller',
        kind: 'prop',
        maxSpeed: 88,
        takeoffSpeed: 24,
        liftFactor: 0.72,
        pitchRate: 1.05,
        rollRate: 1.65,
        yawRate: 0.9,
        color: 0xf4f4f2,
      },
      445,
      getGroundHeight(445, 290),
      290,
      0
    );

    // 2. AeroJet Private at Airport Apron
    this.addAircraft(
      {
        id: 'aerojet_private',
        name: 'AeroJet Coastal',
        kind: 'jet',
        maxSpeed: 125,
        takeoffSpeed: 32,
        liftFactor: 0.68,
        pitchRate: 1.15,
        rollRate: 1.9,
        yawRate: 0.95,
        color: 0xeaf0f6,
      },
      395,
      getGroundHeight(395, 165),
      165,
      -Math.PI * 0.5
    );

    // 3. SkyHawk Helicopter on Airport Pad
    this.addAircraft(
      {
        id: 'skyhawk_heli',
        name: 'SkyHawk Helicopter',
        kind: 'heli',
        maxSpeed: 72,
        takeoffSpeed: 0,
        liftFactor: 1.0,
        pitchRate: 1.1,
        rollRate: 1.2,
        yawRate: 1.4,
        color: 0x1a7f8e,
      },
      395,
      getGroundHeight(395, 88),
      88,
      -Math.PI * 0.5
    );
  }

  private addAircraft(
    spec: AircraftSpec,
    x: number,
    y: number,
    z: number,
    yaw: number
  ): void {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.3, metalness: 0.45 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xff6b4a, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x162636, roughness: 0.15, metalness: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.7 });

    let rotor: THREE.Object3D = new THREE.Group();
    let tailRotor: THREE.Object3D | undefined;

    if (spec.kind === 'heli') {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 4.2), bodyMat);
      pod.position.y = 1.4;
      pod.castShadow = true;
      group.add(pod);

      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.1, 1.5), glassMat);
      canopy.position.set(0, 1.55, -1.7);
      canopy.rotation.x = 0.25;
      group.add(canopy);

      const boom = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 4.6), bodyMat);
      boom.position.set(0, 1.75, 4.0);
      group.add(boom);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8), darkMat);
      mast.position.set(0, 2.55, 0);
      group.add(mast);

      rotor = new THREE.Group();
      rotor.position.set(0, 2.9, 0);
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.08, 0.34), darkMat);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 9.2), darkMat);
      rotor.add(b1, b2);
      group.add(rotor);

      tailRotor = new THREE.Group();
      tailRotor.position.set(0.32, 1.85, 6.1);
      const tb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.2), darkMat);
      tailRotor.add(tb);
      group.add(tailRotor);

      for (const sx of [-0.95, 0.95]) {
        const skid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.8), darkMat);
        skid.position.set(sx, 0.15, 0);
        group.add(skid);
      }
    } else {
      // Fixed-wing Prop or Jet
      const fuseLen = spec.kind === 'jet' ? 11.5 : 8.2;
      const wingSpan = spec.kind === 'jet' ? 12.6 : 11.0;

      const fuse = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.95, fuseLen, 12),
        bodyMat
      );
      fuse.rotation.x = Math.PI * 0.5;
      fuse.position.set(0, 1.45, 0);
      fuse.castShadow = true;
      group.add(fuse);

      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(wingSpan, 0.18, spec.kind === 'jet' ? 2.4 : 1.9),
        bodyMat
      );
      wing.position.set(0, spec.kind === 'jet' ? 1.25 : 2.15, -0.3);
      wing.castShadow = true;
      group.add(wing);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(wingSpan * 0.96, 0.2, 0.35), accentMat);
      stripe.position.set(0, spec.kind === 'jet' ? 1.26 : 2.16, -0.9);
      group.add(stripe);

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.2, 1.6), accentMat);
      tail.position.set(0, 2.35, fuseLen * 0.44);
      group.add(tail);

      const hStab = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 1.1), bodyMat);
      hStab.position.set(0, 1.6, fuseLen * 0.44);
      group.add(hStab);

      const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 2.1), glassMat);
      cockpit.position.set(0, 1.9, -fuseLen * 0.18);
      group.add(cockpit);

      // Landing gear
      for (const [gx, gz] of [[0, -fuseLen * 0.32], [-1.3, 0.5], [1.3, 0.5]] as [number, number][]) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 6), darkMat);
        strut.position.set(gx, 0.65, gz);
        group.add(strut);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 10), darkMat);
        wheel.rotation.z = Math.PI * 0.5;
        wheel.position.set(gx, 0.26, gz);
        group.add(wheel);
      }

      if (spec.kind === 'prop') {
        rotor = new THREE.Group();
        rotor.position.set(0, 1.45, -fuseLen * 0.5 - 0.2);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 0.06), darkMat);
        rotor.add(blade);
        group.add(rotor);
      }
    }

    const inst: AircraftInstance = {
      spec,
      group,
      rotor,
      tailRotor,
      position: new THREE.Vector3(x, y, z),
      yaw,
      pitch: 0,
      roll: 0,
      throttle: 0,
      speed: 0,
      verticalSpeed: 0,
      grounded: true,
    };
    group.position.copy(inst.position);
    group.rotation.order = 'YXZ';
    group.rotation.y = yaw;
    this.group.add(group);
    this.aircrafts.push(inst);
  }

  findNearestAircraft(pos: THREE.Vector3, maxDist = 5.5): AircraftInstance | null {
    let best: AircraftInstance | null = null;
    let bestD = maxDist;
    for (const a of this.aircrafts) {
      const d = a.position.distanceTo(pos);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }

  enterAircraft(a: AircraftInstance): void {
    this.activeAircraft = a;
  }

  canExit(): boolean {
    if (!this.activeAircraft) return false;
    return this.activeAircraft.grounded && this.activeAircraft.speed < 8;
  }

  exitAircraft(): THREE.Vector3 {
    if (!this.activeAircraft) return new THREE.Vector3();
    const a = this.activeAircraft;
    a.throttle = 0;
    const side = new THREE.Vector3(Math.cos(a.yaw) * 4.0, 0.3, -Math.sin(a.yaw) * 4.0);
    const pos = a.position.clone().add(side);
    this.activeAircraft = null;
    return pos;
  }

  update(dt: number, input: InputState, getGroundHeight: (x: number, z: number) => number): void {
    for (const a of this.aircrafts) {
      const active = a === this.activeAircraft;

      if (!active) {
        a.throttle = THREE.MathUtils.lerp(a.throttle, 0, dt * 2);
        a.speed = THREE.MathUtils.lerp(a.speed, 0, dt * 2);
        if (a.spec.kind === 'heli') {
          a.rotor.rotation.y += a.throttle * 18 * dt;
        } else {
          a.rotor.rotation.z += a.throttle * 28 * dt;
        }
        continue;
      }

      // Throttle control (Shift / Space up, Ctrl / C down)
      if (input.throttleUp || input.sprint) a.throttle = Math.min(1, a.throttle + dt * 0.48);
      if (input.throttleDown) a.throttle = Math.max(0, a.throttle - dt * 0.55);

      if (a.spec.kind === 'heli') {
        // Helicopter flight: throttle controls hover/climb, W/S pitch forward/back, A/D bank, Q/E yaw
        a.rotor.rotation.y += (4 + a.throttle * 26) * dt;
        if (a.tailRotor) a.tailRotor.rotation.x += (6 + a.throttle * 30) * dt;

        const pitchInput = (input.forward ? -1 : 0) + (input.backward ? 1 : 0);
        const rollInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
        const yawInput = (input.yawLeft ? 1 : 0) - (input.yawRight ? 1 : 0);

        a.pitch = THREE.MathUtils.lerp(a.pitch, pitchInput * 0.34, dt * 5);
        a.roll = THREE.MathUtils.lerp(a.roll, rollInput * 0.35, dt * 5);
        a.yaw += (yawInput * a.spec.yawRate + rollInput * 0.55) * dt;

        const liftAccel = (a.throttle - 0.42) * 24;
        a.verticalSpeed = THREE.MathUtils.lerp(a.verticalSpeed, liftAccel, dt * 3.5);
        if (input.jump) a.verticalSpeed = Math.max(a.verticalSpeed, 9);

        const fwd = new THREE.Vector3(-Math.sin(a.yaw), 0, -Math.cos(a.yaw));
        const right = new THREE.Vector3(Math.cos(a.yaw), 0, -Math.sin(a.yaw));
        const targetForwardSpeed = -a.pitch * a.spec.maxSpeed * 1.4;
        const strafeSpeed = -a.roll * 26;
        a.speed = Math.hypot(targetForwardSpeed, strafeSpeed);

        a.position.addScaledVector(fwd, targetForwardSpeed * dt);
        a.position.addScaledVector(right, strafeSpeed * dt);
        a.position.y += a.verticalSpeed * dt;
      } else {
        // Fixed-wing airplane
        a.rotor.rotation.z += (3 + a.throttle * 34) * dt;

        const targetSpeed = a.throttle * a.spec.maxSpeed;
        a.speed = THREE.MathUtils.lerp(a.speed, targetSpeed, dt * (a.throttle > 0.1 ? 0.55 : 0.35));

        const pitchInput = (input.backward ? 1 : 0) - (input.forward ? 1 : 0);
        const rollInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
        const yawInput = (input.yawLeft ? 1 : 0) - (input.yawRight ? 1 : 0);

        if (a.grounded) {
          // Runway steering
          a.yaw += (rollInput * 0.8 + yawInput * 0.9) * Math.min(1, a.speed / 12) * dt;
          a.roll = THREE.MathUtils.lerp(a.roll, 0, dt * 6);
          if (a.speed >= a.spec.takeoffSpeed && pitchInput > 0) {
            a.pitch = THREE.MathUtils.lerp(a.pitch, 0.26, dt * 3);
            a.grounded = false;
            a.verticalSpeed = 6.5;
          } else {
            a.pitch = THREE.MathUtils.lerp(a.pitch, 0, dt * 6);
          }
        } else {
          a.pitch = THREE.MathUtils.clamp(a.pitch + pitchInput * a.spec.pitchRate * dt, -0.68, 0.72);
          a.roll = THREE.MathUtils.clamp(a.roll + rollInput * a.spec.rollRate * dt, -0.95, 0.95);
          if (Math.abs(rollInput) < 0.05) {
            a.roll = THREE.MathUtils.lerp(a.roll, 0, dt * 1.2);
          }
          a.yaw += (a.roll * 0.78 + yawInput * a.spec.yawRate) * dt;

          // Lift vs gravity
          const lift = Math.min(1.25, a.speed / a.spec.takeoffSpeed);
          const climb = Math.sin(a.pitch) * a.speed * 0.75 + (lift - 0.82) * 9;
          a.verticalSpeed = THREE.MathUtils.lerp(a.verticalSpeed, climb, dt * 3);
        }

        const fwd = new THREE.Vector3(-Math.sin(a.yaw), 0, -Math.cos(a.yaw));
        a.position.addScaledVector(fwd, a.speed * dt);
        a.position.y += a.verticalSpeed * dt;
      }

      // Clamp world boundaries & altitude ceiling
      a.position.x = THREE.MathUtils.clamp(a.position.x, -720, 720);
      a.position.z = THREE.MathUtils.clamp(a.position.z, -720, 720);
      a.position.y = Math.min(280, a.position.y);

      const groundY = Math.max(-0.2, getGroundHeight(a.position.x, a.position.z));
      if (a.position.y <= groundY) {
        a.position.y = groundY;
        a.verticalSpeed = 0;
        a.grounded = true;
        a.pitch = THREE.MathUtils.lerp(a.pitch, 0, dt * 8);
        a.roll = THREE.MathUtils.lerp(a.roll, 0, dt * 8);
      } else if (a.position.y > groundY + 0.45) {
        a.grounded = false;
      }

      a.group.position.copy(a.position);
      a.group.rotation.set(a.pitch, a.yaw, a.roll, 'YXZ');
    }
  }
}
