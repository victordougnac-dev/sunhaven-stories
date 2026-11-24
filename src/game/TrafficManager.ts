import * as THREE from 'three';
import { ROAD_X, ROAD_Z, type TrafficSignalState } from './WorldManager';
import type { QualityPreset } from './types';

interface TrafficCar {
  group: THREE.Group;
  headlights: THREE.Mesh[];
  axis: 'x' | 'z';
  laneCoord: number;
  dir: 1 | -1;
  pos: THREE.Vector3;
  speed: number;
  maxSpeed: number;
}

export class TrafficManager {
  public cars: TrafficCar[] = [];
  private group = new THREE.Group();
  private activeCount = 20;

  private hlOn = new THREE.MeshBasicMaterial({ color: 0xfff5c0 });
  private hlOff = new THREE.MeshStandardMaterial({ color: 0xd0d8e0, roughness: 0.25 });

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.spawnTraffic();
  }

  private spawnTraffic(): void {
    const colors = [0xe74c3c, 0x3498db, 0xf39c12, 0x2ecc71, 0xecf0f1, 0x34495e, 0x1abc9c];
    const bodyGeo = new THREE.BoxGeometry(1.9, 0.72, 4.3);
    const cabinGeo = new THREE.BoxGeometry(1.65, 0.56, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x16222f, roughness: 0.2, metalness: 0.8 });
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 10);
    wheelGeo.rotateZ(Math.PI * 0.5);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.9 });

    for (let i = 0; i < 20; i++) {
      const axis: 'x' | 'z' = i % 2 === 0 ? 'z' : 'x';
      const dir: 1 | -1 = i % 4 < 2 ? 1 : -1;
      const roadArr = axis === 'z' ? ROAD_X : ROAD_Z;
      const roadCenter = roadArr[i % roadArr.length];
      // Right-hand lane offset (~3.4m from road centerline)
      const laneOffset = axis === 'z' ? (dir === 1 ? -3.4 : 3.4) : dir === 1 ? 3.4 : -3.4;
      const laneCoord = roadCenter + laneOffset;

      const g = new THREE.Group();
      const paintMat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.3,
        metalness: 0.5,
      });

      const body = new THREE.Mesh(bodyGeo, paintMat);
      body.position.y = 0.54;
      body.castShadow = true;
      g.add(body);

      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, 1.12, 0.1);
      g.add(cabin);

      for (const [wx, wz] of [[-0.9, -1.35], [0.9, -1.35], [-0.9, 1.35], [0.9, 1.35]]) {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.position.set(wx, 0.35, wz);
        g.add(w);
      }

      const headlights: THREE.Mesh[] = [];
      for (const hx of [-0.62, 0.62]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.08), this.hlOff);
        hl.position.set(hx, 0.58, -2.16);
        g.add(hl);
        headlights.push(hl);
      }

      const startAlong = -210 + ((i * 67) % 420);
      const pos =
        axis === 'z'
          ? new THREE.Vector3(laneCoord, 0.18, startAlong)
          : new THREE.Vector3(startAlong, 0.18, laneCoord);

      g.position.copy(pos);
      g.rotation.y =
        axis === 'z' ? (dir === 1 ? Math.PI : 0) : dir === 1 ? -Math.PI * 0.5 : Math.PI * 0.5;

      this.group.add(g);
      this.cars.push({
        group: g,
        headlights,
        axis,
        laneCoord,
        dir,
        pos,
        speed: 14,
        maxSpeed: 14 + (i % 4) * 2.5,
      });
    }
  }

  applyQuality(quality: QualityPreset): void {
    this.activeCount = quality === 'low' ? 10 : quality === 'medium' ? 14 : 20;
    this.cars.forEach((c, idx) => {
      c.group.visible = idx < this.activeCount;
    });
  }

  update(
    dt: number,
    isInside: boolean,
    isNight: boolean,
    playerPos: THREE.Vector3,
    signals: TrafficSignalState[]
  ): void {
    this.group.visible = !isInside;
    if (isInside) return;

    for (let i = 0; i < this.activeCount; i++) {
      const c = this.cars[i];
      for (const hl of c.headlights) {
        hl.material = isNight ? this.hlOn : this.hlOff;
      }

      let shouldStop = false;

      // Check upcoming traffic lights
      for (const sig of signals) {
        if (c.axis === 'z') {
          if (Math.abs(c.laneCoord - sig.x) < 6) {
            const dz = (sig.z - c.pos.z) * c.dir;
            if (dz > 8 && dz < 22 && !sig.nsGreen) {
              shouldStop = true;
              break;
            }
          }
        } else {
          if (Math.abs(c.laneCoord - sig.z) < 6) {
            const dx = (sig.x - c.pos.x) * c.dir;
            if (dx > 8 && dx < 22 && sig.nsGreen) {
              shouldStop = true;
              break;
            }
          }
        }
      }

      // Avoid player
      const distPlayer = c.pos.distanceTo(playerPos);
      if (distPlayer < 10) {
        const toPlayerX = playerPos.x - c.pos.x;
        const toPlayerZ = playerPos.z - c.pos.z;
        const ahead = c.axis === 'z' ? toPlayerZ * c.dir : toPlayerX * c.dir;
        const lateral = c.axis === 'z' ? Math.abs(toPlayerX) : Math.abs(toPlayerZ);
        if (ahead > 0 && ahead < 9 && lateral < 3.6) {
          shouldStop = true;
        }
      }

      // Avoid car ahead in same lane
      for (let j = 0; j < this.activeCount; j++) {
        if (i === j) continue;
        const other = this.cars[j];
        if (other.axis !== c.axis || Math.abs(other.laneCoord - c.laneCoord) > 2) continue;
        const delta =
          c.axis === 'z'
            ? (other.pos.z - c.pos.z) * c.dir
            : (other.pos.x - c.pos.x) * c.dir;
        if (delta > 0 && delta < 11) {
          shouldStop = true;
          break;
        }
      }

      const targetSpeed = shouldStop ? 0 : c.maxSpeed;
      c.speed = THREE.MathUtils.lerp(c.speed, targetSpeed, Math.min(1, dt * (shouldStop ? 7 : 3)));

      if (c.axis === 'z') {
        c.pos.z += c.dir * c.speed * dt;
        if (c.pos.z > 250) c.pos.z = -245;
        if (c.pos.z < -250) c.pos.z = 245;
      } else {
        c.pos.x += c.dir * c.speed * dt;
        if (c.pos.x > 335) c.pos.x = -190;
        if (c.pos.x < -195) c.pos.x = 330;
      }

      c.group.position.copy(c.pos);
    }
  }
}
