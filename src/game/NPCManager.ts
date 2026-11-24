import * as THREE from 'three';
import {
  buildHumanoidRig,
  CharacterAnimationController,
  type HumanoidRig,
} from './CharacterAnimationController';
import type { QualityPreset } from './types';

export interface NPCInstance {
  id: string;
  name: string;
  role: string;
  dialogue: string;
  rig: HumanoidRig;
  anim: CharacterAnimationController;
  waypoints: THREE.Vector3[];
  wpIndex: number;
  position: THREE.Vector3;
  yaw: number;
  speed: number;
  pauseTimer: number;
  isMysteryTraveler?: boolean;
}

const NPC_TEMPLATES = [
  {
    role: 'Tourist',
    names: ['Liam', 'Sofia', 'Noah', 'Camila'],
    shirts: [0xff8a65, 0x4dd0e1, 0xffd54f, 0xf06292],
    pants: [0xd7ccc8, 0x546e7a, 0xf5f5f5],
    lines: [
      'First time in Sunhaven! Have you visited the Palm Beach boardwalk yet?',
      'I heard there are 16 hidden secrets scattered across the island.',
      'Try taking a speedboat from the Marina out to the rocky island northwest!',
    ],
  },
  {
    role: 'Office Worker',
    names: ['Marcus', 'Claire', 'Devon', 'Nadia'],
    shirts: [0xffffff, 0xcfd8dc, 0x90caf9],
    jackets: [0x263238, 0x37474f, 0x1c2833],
    pants: [0x1c222a, 0x2c3e50],
    lines: [
      'Busy morning in Downtown Sunhaven! Take the elevator at Apex Tower for an incredible view.',
      'Someone left a hidden lounge on the roof of Apex Tower.',
      'Watch out for rush hour traffic along Commerce Blvd.',
    ],
  },
  {
    role: 'Beachgoer',
    names: ['Maya', 'Kai', 'Tessa', 'Leo'],
    shirts: [0xff6b4a, 0x1fd1c5, 0xffb84d],
    pants: [0xf4e3b2, 0x2980b9],
    lines: [
      'Water is crystal clear today! Swim out past the reef if you dare.',
      'The Sunset Cafe makes the best iced espresso on Bayside Promenade.',
      'Nighttime on Neon Mile hits completely different.',
    ],
  },
  {
    role: 'Airport Crew',
    names: ['Captain Reyes', 'Samir', 'Hannah'],
    shirts: [0xf39c12, 0xeaf0f6],
    jackets: [0x2c3e50, 0xd35400],
    pants: [0x1a252f],
    lines: [
      'Runway is clear! Hop into the Sunbird Prop or AeroJet with [F] whenever you want to fly.',
      'Use SHIFT to throttle up and S to pull the nose up once you hit takeoff speed!',
      'There is a hidden trophy high atop the airport control tower.',
    ],
  },
];

export class NPCManager {
  public npcs: NPCInstance[] = [];
  private maxActiveAnimDist = 85;
  private group = new THREE.Group();

  constructor(scene: THREE.Scene, getGroundHeight: (x: number, z: number) => number) {
    scene.add(this.group);
    this.spawnNPCs(getGroundHeight);
  }

  private spawnNPCs(getGroundHeight: (x: number, z: number) => number): void {
    const routes: { x1: number; z1: number; x2: number; z2: number; tplIdx: number }[] = [
      // Bayside Promenade sidewalks
      { x1: -171, z1: -100, x2: -171, z2: 100, tplIdx: 0 },
      { x1: -135, z1: -95, x2: -135, z2: 85, tplIdx: 0 },
      { x1: -70, z1: -90, x2: -70, z2: 90, tplIdx: 1 },
      // Downtown
      { x1: -50, z1: -220, x2: -50, z2: -130, tplIdx: 1 },
      { x1: 50, z1: -220, x2: 50, z2: -130, tplIdx: 1 },
      { x1: -45, z1: -110, x2: 45, z2: -110, tplIdx: 1 },
      { x1: -45, z1: 10, x2: 45, z2: 10, tplIdx: 1 },
      // Central Park paths
      { x1: -38, z1: -60, x2: 38, z2: -60, tplIdx: 0 },
      { x1: 0, z1: -98, x2: 0, z2: -22, tplIdx: 2 },
      // Palm Beach boardwalk
      { x1: -195, z1: -200, x2: -195, z2: 200, tplIdx: 2 },
      { x1: -222, z1: -160, x2: -222, z2: 160, tplIdx: 2 },
      // Neon Mile
      { x1: -170, z1: 130, x2: 45, z2: 130, tplIdx: 0 },
      // Airport apron
      { x1: 350, z1: 50, x2: 350, z2: 185, tplIdx: 3 },
      // Suburbs
      { x1: 70, z1: -220, x2: 70, z2: 80, tplIdx: 0 },
    ];

    const skins = [0xf0c2a0, 0xd99b78, 0xb8744c, 0x7c4b32];
    const hairs = [0x1c1512, 0x4a2e1b, 0x8b5a2b, 0xc79c5e];

    let idx = 0;
    for (const r of routes) {
      const count = 3;
      for (let k = 0; k < count; k++) {
        const t = k / count;
        const tpl = NPC_TEMPLATES[r.tplIdx];
        const name = tpl.names[(idx + k) % tpl.names.length];
        const rig = buildHumanoidRig({
          skinColor: skins[idx % skins.length],
          shirtColor: tpl.shirts[idx % tpl.shirts.length],
          jacketColor: 'jackets' in tpl && tpl.jackets ? tpl.jackets[idx % tpl.jackets.length] : undefined,
          pantsColor: tpl.pants[idx % tpl.pants.length],
          shoeColor: 0x22262c,
          hairColor: hairs[(idx + 1) % hairs.length],
          sunglasses: idx % 3 === 0,
        });

        const scaleH = 0.93 + ((idx * 13 + k * 7) % 15) * 0.01;
        const scaleW = 0.94 + ((idx * 7 + k * 11) % 12) * 0.012;
        rig.root.scale.set(scaleW, scaleH, scaleW);

        // Give some NPCs handheld phone or shopping bag
        if ((idx + k) % 3 === 0) {
          const bag = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.26, 0.12),
            new THREE.MeshStandardMaterial({ color: (idx % 2 === 0) ? 0xff6b4a : 0x1fd1c5, roughness: 0.7 })
          );
          bag.position.set(0, -0.34, 0.02);
          rig.forearmR.add(bag);
        } else if ((idx + k) % 4 === 1) {
          const phone = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.12, 0.015),
            new THREE.MeshStandardMaterial({ color: 0x11151c, emissive: 0x64b5f6, emissiveIntensity: 0.7 })
          );
          phone.position.set(0, -0.27, 0.06);
          rig.forearmL.add(phone);
        }

        const sx = THREE.MathUtils.lerp(r.x1, r.x2, t);
        const sz = THREE.MathUtils.lerp(r.z1, r.z2, t);
        const sy = getGroundHeight(sx, sz);

        const pos = new THREE.Vector3(sx, sy, sz);
        rig.root.position.copy(pos);
        this.group.add(rig.root);

        this.npcs.push({
          id: `npc_${idx}`,
          name: `${name} (${tpl.role})`,
          role: tpl.role,
          dialogue: tpl.lines[idx % tpl.lines.length],
          rig,
          anim: new CharacterAnimationController(rig),
          waypoints: [
            new THREE.Vector3(r.x1, 0, r.z1),
            new THREE.Vector3(r.x2, 0, r.z2),
          ],
          wpIndex: k % 2 === 0 ? 1 : 0,
          position: pos,
          yaw: 0,
          speed: 1.55 + (idx % 4) * 0.28,
          pauseTimer: 0,
        });
        idx++;
      }
    }

    // Mystery Traveler NPC at Marina Pier (-175, 348)
    const sageRig = buildHumanoidRig({
      skinColor: 0xc98b65,
      shirtColor: 0x162432,
      jacketColor: 0xffb84d,
      pantsColor: 0x1b2631,
      shoeColor: 0x111111,
      hairColor: 0xd0d7de,
      hatColor: 0x2c3e50,
    });
    const sagePos = new THREE.Vector3(-175, getGroundHeight(-175, 348), 348);
    sageRig.root.position.copy(sagePos);
    this.group.add(sageRig.root);
    this.npcs.push({
      id: 'npc_mystery_traveler',
      name: 'The Pier Wanderer',
      role: 'Mystery',
      dialogue:
        'You found me at the edge of Sunhaven Marina! Remember: look beneath the waves off Palm Beach and high atop the hills.',
      rig: sageRig,
      anim: new CharacterAnimationController(sageRig),
      waypoints: [sagePos.clone()],
      wpIndex: 0,
      position: sagePos,
      yaw: Math.PI,
      speed: 0,
      pauseTimer: 9999,
      isMysteryTraveler: true,
    });
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  applyQuality(quality: QualityPreset): void {
    this.maxActiveAnimDist = quality === 'low' ? 45 : quality === 'medium' ? 65 : 95;
  }

  findNearestNPC(pos: THREE.Vector3, maxDist = 3.2): NPCInstance | null {
    let best: NPCInstance | null = null;
    let bestD = maxDist;
    for (const n of this.npcs) {
      const d = n.position.distanceTo(pos);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  update(
    dt: number,
    playerPos: THREE.Vector3,
    isInside: boolean,
    getGroundHeight: (x: number, z: number) => number
  ): void {
    if (isInside) return;

    for (const n of this.npcs) {
      const distToPlayer = n.position.distanceTo(playerPos);
      if (distToPlayer > 170) {
        n.rig.root.visible = false;
        continue;
      }
      n.rig.root.visible = true;

      if (n.speed <= 0.05 || n.waypoints.length < 2) {
        if (distToPlayer < this.maxActiveAnimDist) {
          n.anim.update(dt, 'idle', 0);
        }
        continue;
      }

      if (n.pauseTimer > 0) {
        n.pauseTimer -= dt;
        if (distToPlayer < this.maxActiveAnimDist) {
          n.anim.update(dt, 'idle', 0);
        }
        continue;
      }

      const target = n.waypoints[n.wpIndex];
      const dx = target.x - n.position.x;
      const dz = target.z - n.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 1.2) {
        n.wpIndex = (n.wpIndex + 1) % n.waypoints.length;
        n.pauseTimer = 1.0 + Math.random() * 2.5;
        continue;
      }

      let dirX = dx / dist;
      let dirZ = dz / dist;

      // Simple player avoidance
      if (distToPlayer < 2.1 && distToPlayer > 0.05) {
        dirX += (n.position.x - playerPos.x) / distToPlayer;
        dirZ += (n.position.z - playerPos.z) / distToPlayer;
        const len = Math.hypot(dirX, dirZ) || 1;
        dirX /= len;
        dirZ /= len;
      }

      n.position.x += dirX * n.speed * dt;
      n.position.z += dirZ * n.speed * dt;
      n.position.y = getGroundHeight(n.position.x, n.position.z);

      const targetYaw = Math.atan2(dirX, dirZ);
      let diff = targetYaw - n.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      n.yaw += diff * Math.min(1, dt * 8);

      n.rig.root.position.copy(n.position);
      n.rig.root.rotation.y = n.yaw;

      if (distToPlayer < this.maxActiveAnimDist) {
        n.anim.update(dt, 'walk', n.speed);
      }
    }
  }
}
