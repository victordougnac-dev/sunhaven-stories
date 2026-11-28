import * as THREE from 'three';
import { ROAD_X, ROAD_Z, type TrafficSignalState } from './WorldManager';
import type { QualityPreset } from './types';
import { createSculptedCarMesh, type CarBodyStyle } from './CarGeometry';

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

  private hlOn = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff2c2,
    emissiveIntensity: 3.0,
    roughness: 0.1,
  });
  private hlOff = new THREE.MeshStandardMaterial({
    color: 0xdce6ee,
    emissive: 0xd8ebff,
    emissiveIntensity: 0.35,
    roughness: 0.15,
  });

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.spawnTraffic();
  }

  private spawnTraffic(): void {
    const colors = [0xd6362c, 0x1e6fb8, 0xe8941c, 0x1c9a5e, 0xeef2f5, 0x263240, 0x15a89d, 0x8a3052];
    const styles: CarBodyStyle[] = ['sedan', 'sports', 'suv', 'sedan', 'pickup'];

    for (let i = 0; i < 20; i++) {
      const axis: 'x' | 'z' = i % 2 === 0 ? 'z' : 'x';
      const dir: 1 | -1 = i % 4 < 2 ? 1 : -1;
      const roadArr = axis === 'z' ? ROAD_X : ROAD_Z;
      const roadCenter = roadArr[i % roadArr.length];
      // Right-hand lane offset (~3.4m from road centerline)
      const laneOffset = axis === 'z' ? (dir === 1 ? -3.4 : 3.4) : dir === 1 ? 3.4 : -3.4;
      const laneCoord = roadCenter + laneOffset;

      const style = styles[i % styles.length];
      const parts = createSculptedCarMesh(
        style,
        colors[i % colors.length],
        style === 'pickup' ? 4.8 : 4.4,
        style === 'suv' || style === 'pickup' ? 2.05 : 1.92,
        {
          lightweight: true,
          headlightMatOff: this.hlOff,
        }
      );
      const g = parts.group;
      const headlights = parts.headlights;

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
