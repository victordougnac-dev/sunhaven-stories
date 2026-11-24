import * as THREE from 'three';
import type { EasterEggDef, Interactable } from './types';

export class EasterEggManager {
  public secrets: EasterEggDef[] = [];
  public foundSet = new Set<string>();
  public interactables: Interactable[] = [];
  private beacons: { id: string; mesh: THREE.Object3D }[] = [];
  private onDiscover: (egg: EasterEggDef) => void;

  constructor(
    scene: THREE.Scene,
    getGroundHeight: (x: number, z: number) => number,
    initialFound: string[],
    onDiscover: (egg: EasterEggDef) => void
  ) {
    this.onDiscover = onDiscover;
    for (const id of initialFound) this.foundSet.add(id);
    this.buildSecrets(scene, getGroundHeight);
  }

  private buildSecrets(scene: THREE.Scene, getGroundHeight: (x: number, z: number) => number): void {
    const defs: EasterEggDef[] = [
      {
        id: 'egg_sunken_monolith',
        title: 'The Sunken Monolith',
        clue: 'Swim or boat west into the ocean off Palm Beach to find a glowing reef pillar.',
        district: 'palm_beach',
        position: new THREE.Vector3(-335, -1.8, -60),
        rewardCash: 350,
        type: 'object',
      },
      {
        id: 'egg_subway_vault',
        title: 'Subway Smuggler Vault',
        clue: 'Enter the Underground Metro & Bunker in Downtown and inspect the vault terminal.',
        district: 'downtown',
        position: new THREE.Vector3(-72, 0.2, -55),
        rewardCash: 500,
        type: 'location',
      },
      {
        id: 'egg_rooftop_lounge',
        title: 'Developer Rooftop Lounge',
        clue: 'Take the Apex Rooftop Skybar elevator to the top of Sunhaven Apex Tower.',
        district: 'downtown',
        position: new THREE.Vector3(-26, 95.8, -180),
        rewardCash: 600,
        type: 'location',
      },
      {
        id: 'egg_lighthouse_journal',
        title: "Keeper's Secret Journal",
        clue: "Enter the Keeper's Cottage near the Marina Lighthouse and read the logbook.",
        district: 'marina',
        position: new THREE.Vector3(-355, 1.5, 368),
        rewardCash: 300,
        type: 'object',
      },
      {
        id: 'egg_coral_island_treasure',
        title: 'Coral Cove Treasure Chest',
        clue: 'Take a boat or plane northwest across the bay to Coral Cove Island.',
        district: 'secret_island',
        position: new THREE.Vector3(-520, getGroundHeight(-520, 120) + 0.5, 125),
        rewardCash: 750,
        type: 'object',
      },
      {
        id: 'egg_phantom_yacht',
        title: 'The Phantom Yacht',
        clue: 'Sail southwest far into deep water south of Coral Cove Island.',
        district: 'secret_island',
        position: new THREE.Vector3(-540, 0.2, 340),
        rewardCash: 500,
        type: 'vehicle',
      },
      {
        id: 'egg_neon_arcade',
        title: 'Neon Alley Arcade Cabinet',
        clue: 'Check the hidden back alley behind Neon Pulse Nightclub.',
        district: 'neon_mile',
        position: new THREE.Vector3(-142, 0.4, 178),
        rewardCash: 300,
        type: 'object',
      },
      {
        id: 'egg_mountain_telescope',
        title: 'Emerald Overlook Telescope',
        clue: 'Drive or hike up the northern Emerald Hills road to the wooden overlook deck.',
        district: 'emerald_hills',
        position: new THREE.Vector3(95, getGroundHeight(95, -455) + 1.2, -455),
        rewardCash: 400,
        type: 'location',
      },
      {
        id: 'egg_signal_dish',
        title: 'Mysterious Signal Broadcast',
        clue: 'Approach the giant radio dish in the northwestern Emerald Hills countryside.',
        district: 'emerald_hills',
        position: new THREE.Vector3(-120, getGroundHeight(-120, -390) + 0.5, -390),
        rewardCash: 450,
        type: 'object',
      },
      {
        id: 'egg_midnight_solaris',
        title: 'Midnight Solaris Prototype',
        clue: 'Search the far southeast corner of the Harbor Port industrial containers.',
        district: 'harbor_port',
        position: new THREE.Vector3(255, 0.5, 278),
        rewardCash: 800,
        type: 'vehicle',
      },
      {
        id: 'egg_drainage_cache',
        title: 'Harbor Drainage Cache',
        clue: 'Inspect the recessed industrial hatch near the Harbor Crane.',
        district: 'harbor_port',
        position: new THREE.Vector3(204, 0.5, 295),
        rewardCash: 350,
        type: 'location',
      },
      {
        id: 'egg_time_capsule',
        title: 'Sunhaven 1984 Time Capsule',
        clue: 'Inspect the central stone fountain plaque in Central Palm Park.',
        district: 'central_park',
        position: new THREE.Vector3(0, 0.6, -51),
        rewardCash: 250,
        type: 'object',
      },
      {
        id: 'egg_pier_wanderer',
        title: 'The Pier Wanderer',
        clue: 'Talk to the mysterious traveler standing at the end of the central Marina Pier.',
        district: 'marina',
        position: new THREE.Vector3(-175, 1.0, 348),
        rewardCash: 300,
        type: 'npc',
      },
      {
        id: 'egg_shipwreck',
        title: 'Submerged Reef Compass',
        clue: 'Explore the shallow waters west of the Marina Lighthouse.',
        district: 'marina',
        position: new THREE.Vector3(-445, -1.2, 260),
        rewardCash: 550,
        type: 'object',
      },
      {
        id: 'egg_airport_wing',
        title: 'Golden Aviator Trophy',
        clue: 'Land a helicopter or inspect the base of the Airport Control Tower.',
        district: 'airport',
        position: new THREE.Vector3(360, 0.5, 48),
        rewardCash: 450,
        type: 'object',
      },
      {
        id: 'egg_abandoned_cottage',
        title: 'Hills Echo Note',
        clue: 'Visit the quiet abandoned cottage tucked into the Emerald Hills.',
        district: 'emerald_hills',
        position: new THREE.Vector3(-155, getGroundHeight(-155, -420) + 0.5, -412),
        rewardCash: 350,
        type: 'location',
      },
    ];

    this.secrets = defs;

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xff9f1c,
      emissiveIntensity: 0.75,
      metalness: 0.85,
      roughness: 0.2,
    });
    const cyanMat = new THREE.MeshStandardMaterial({
      color: 0x1fd1c5,
      emissive: 0x1fd1c5,
      emissiveIntensity: 1.1,
    });

    for (const s of this.secrets) {
      // Create recognizable physical 3D props for secrets
      const prop = new THREE.Group();
      prop.position.copy(s.position);

      if (s.id === 'egg_sunken_monolith') {
        const mono = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.2, 1.4), cyanMat);
        mono.position.y = 1.6;
        prop.add(mono);
      } else if (s.id === 'egg_phantom_yacht') {
        const hull = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 1.4, 9.5),
          new THREE.MeshStandardMaterial({ color: 0x1e2b38, emissive: 0x1fd1c5, emissiveIntensity: 0.35 })
        );
        hull.position.y = 0.2;
        prop.add(hull);
      } else if (s.id === 'egg_neon_arcade') {
        const cab = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 1.9, 0.9),
          new THREE.MeshStandardMaterial({ color: 0x161b26, emissive: 0xff477e, emissiveIntensity: 0.65 })
        );
        cab.position.y = 0.95;
        prop.add(cab);
      } else if (s.id === 'egg_mountain_telescope') {
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.4, 8), goldMat);
        stand.position.y = 0.7;
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.0, 8), goldMat);
        tube.rotation.x = Math.PI * 0.42;
        tube.position.y = 1.45;
        prop.add(stand, tube);
      } else {
        // Golden collectible relic / plaque / chest
        const relic = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), goldMat);
        relic.position.y = 1.0;
        prop.add(relic);
      }

      scene.add(prop);
      this.beacons.push({ id: s.id, mesh: prop });

      // Skip outdoor interactable for indoor-only vault/journal (triggered inside BuildingManager)
      if (s.id !== 'egg_subway_vault' && s.id !== 'egg_lighthouse_journal') {
        this.interactables.push({
          id: s.id,
          kind: 'secret',
          key: 'E',
          label: `Inspect: ${s.title}`,
          position: s.position.clone(),
          radius: s.type === 'vehicle' ? 7.5 : 4.2,
          onInteract: () => this.unlock(s.id),
        });
      }
    }
  }

  unlock(id: string): boolean {
    if (this.foundSet.has(id)) return false;
    const def = this.secrets.find((s) => s.id === id);
    if (!def) return false;
    this.foundSet.add(id);
    this.onDiscover(def);
    return true;
  }

  checkProximityAutoDiscover(pos: THREE.Vector3): void {
    // Auto-discover underwater monolith, phantom yacht, rooftop lounge, and midnight solaris when right beside them
    for (const s of this.secrets) {
      if (this.foundSet.has(s.id)) continue;
      if (s.id === 'egg_subway_vault' || s.id === 'egg_lighthouse_journal') continue;
      const threshold =
        s.id === 'egg_rooftop_lounge'
          ? 7
          : s.id === 'egg_sunken_monolith' || s.id === 'egg_phantom_yacht' || s.id === 'egg_shipwreck'
          ? 12
          : s.id === 'egg_midnight_solaris'
          ? 6
          : 0;
      if (threshold > 0 && pos.distanceTo(s.position) < threshold) {
        this.unlock(s.id);
      }
    }
  }

  update(elapsed: number): void {
    for (const b of this.beacons) {
      const found = this.foundSet.has(b.id);
      if (b.mesh.children.length === 1 && !found) {
        b.mesh.children[0].rotation.y = elapsed * 1.4;
      }
    }
  }
}
