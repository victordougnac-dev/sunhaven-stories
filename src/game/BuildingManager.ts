import * as THREE from 'three';
import type { AABBCollider, BuildingEntryDef, Interactable } from './types';
import { buildHumanoidRig, CharacterAnimationController, type HumanoidRig } from './CharacterAnimationController';

interface InteriorNPC {
  rig: HumanoidRig;
  anim: CharacterAnimationController;
  name: string;
  line: string;
  pos: THREE.Vector3;
}

export class BuildingManager {
  public isInside = false;
  public currentBuilding: BuildingEntryDef | null = null;
  public interiorGroup = new THREE.Group();
  public interiorColliders: AABBCollider[] = [];
  public interiorInteractables: Interactable[] = [];
  public interiorOrigin = new THREE.Vector3(0, 400, 0);

  private interiorLights: THREE.PointLight[] = [];
  private interiorNpcs: InteriorNPC[] = [];
  private returnPos = new THREE.Vector3();
  private returnYaw = 0;

  private onExitCallback: (pos: THREE.Vector3, yaw: number) => void;
  private onToastCallback: (msg: string, kind?: 'info' | 'secret' | 'reward') => void;
  private onDialogueCallback: (speaker: string, text: string) => void;
  private onCashCallback: (delta: number) => void;
  private onSecretCallback: (secretId: string) => void;

  constructor(
    scene: THREE.Scene,
    callbacks: {
      onExit: (pos: THREE.Vector3, yaw: number) => void;
      onToast: (msg: string, kind?: 'info' | 'secret' | 'reward') => void;
      onDialogue: (speaker: string, text: string) => void;
      onCash: (delta: number) => void;
      onSecret: (secretId: string) => void;
    }
  ) {
    this.onExitCallback = callbacks.onExit;
    this.onToastCallback = callbacks.onToast;
    this.onDialogueCallback = callbacks.onDialogue;
    this.onCashCallback = callbacks.onCash;
    this.onSecretCallback = callbacks.onSecret;

    this.interiorGroup.visible = false;
    scene.add(this.interiorGroup);
  }

  enterBuilding(
    building: BuildingEntryDef,
    playerPos: THREE.Vector3,
    playerYaw: number,
    worldGroup: THREE.Group
  ): { spawnPos: THREE.Vector3; spawnYaw: number } {
    if (building.isRooftopTeleport && building.rooftopPos) {
      this.returnPos.copy(playerPos);
      this.returnYaw = playerYaw;
      this.onToastCallback('Elevator ascending to Apex Rooftop Skybar!', 'info');
      return {
        spawnPos: building.rooftopPos.clone(),
        spawnYaw: 0,
      };
    }

    this.clearInterior();
    this.isInside = true;
    this.currentBuilding = building;
    this.returnPos.copy(building.doorPos).add(
      new THREE.Vector3(Math.sin(building.doorYaw) * 1.2, 0, Math.cos(building.doorYaw) * 1.2)
    );
    this.returnYaw = building.doorYaw;

    worldGroup.visible = false;
    this.interiorGroup.visible = true;

    this.buildInteriorFor(building);

    return {
      spawnPos: new THREE.Vector3(this.interiorOrigin.x, this.interiorOrigin.y + 0.1, this.interiorOrigin.z + 5.2),
      spawnYaw: Math.PI,
    };
  }

  exitBuilding(worldGroup: THREE.Group): void {
    if (!this.isInside) return;
    this.isInside = false;
    this.currentBuilding = null;
    this.clearInterior();
    this.interiorGroup.visible = false;
    worldGroup.visible = true;
  }

  private clearInterior(): void {
    while (this.interiorGroup.children.length > 0) {
      const ch = this.interiorGroup.children[0];
      this.interiorGroup.remove(ch);
    }
    this.interiorColliders = [];
    this.interiorInteractables = [];
    this.interiorLights = [];
    this.interiorNpcs = [];
  }

  private addWallBox(
    ox: number,
    oy: number,
    oz: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    collide = true
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(ox, oy, oz);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.interiorGroup.add(mesh);
    if (collide) {
      this.interiorColliders.push({
        minX: ox - w * 0.5,
        maxX: ox + w * 0.5,
        minY: oy - h * 0.5,
        maxY: oy + h * 0.5,
        minZ: oz - d * 0.5,
        maxZ: oz + d * 0.5,
      });
    }
    return mesh;
  }

  private addInteriorNPC(
    x: number,
    z: number,
    yaw: number,
    name: string,
    line: string,
    shirtColor: number,
    jacketColor?: number
  ): void {
    const oy = this.interiorOrigin.y;
    const rig = buildHumanoidRig({
      skinColor: 0xd69a74,
      shirtColor,
      jacketColor,
      pantsColor: 0x262e3a,
      shoeColor: 0x1a1a1a,
      hairColor: 0x2b1d14,
    });
    const pos = new THREE.Vector3(this.interiorOrigin.x + x, oy, this.interiorOrigin.z + z);
    rig.root.position.copy(pos);
    rig.root.rotation.y = yaw;
    this.interiorGroup.add(rig.root);

    const anim = new CharacterAnimationController(rig);
    this.interiorNpcs.push({ rig, anim, name, line, pos });

    this.interiorInteractables.push({
      id: `npc_int_${name}`,
      kind: 'npc',
      key: 'E',
      label: `Talk to ${name}`,
      position: pos,
      radius: 2.8,
      indoorOnly: true,
      onInteract: () => this.onDialogueCallback(name, line),
    });
  }

  private buildInteriorFor(b: BuildingEntryDef): void {
    const ox = this.interiorOrigin.x;
    const oy = this.interiorOrigin.y;
    const oz = this.interiorOrigin.z;

    const rw = b.category === 'warehouse' || b.category === 'terminal' ? 26 : 18;
    const rd = b.category === 'warehouse' || b.category === 'terminal' ? 22 : 18;
    const rh = b.category === 'warehouse' ? 7.5 : 4.8;

    const isNightclub = b.category === 'nightclub';
    const isBunker = b.category === 'bunker';

    const floorCol =
      isNightclub ? 0x14141f : isBunker ? 0x3b4045 : b.category === 'cafe' ? 0x8f623d : 0xd9d2c5;
    const wallCol =
      isNightclub ? 0x1a1526 : isBunker ? 0x4b5359 : b.category === 'office' ? 0xeef2f5 : 0xf2e9dc;

    const floorMat = new THREE.MeshStandardMaterial({ color: floorCol, roughness: isNightclub ? 0.25 : 0.65 });
    const wallMat = new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.78 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: isNightclub ? 0x0d0d14 : 0xeae6df, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c5334, roughness: 0.65 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x5c6873, metalness: 0.6, roughness: 0.35 });
    const accentMat = new THREE.MeshStandardMaterial({
      color: isNightclub ? 0xff477e : 0x1fd1c5,
      emissive: isNightclub ? 0xff477e : 0x1fd1c5,
      emissiveIntensity: isNightclub ? 1.4 : 0.5,
    });

    // Room shell
    this.addWallBox(ox, oy - 0.25, oz, rw, 0.5, rd, floorMat, false);
    this.addWallBox(ox, oy + rh + 0.25, oz, rw, 0.5, rd, ceilMat, false);
    this.addWallBox(ox, oy + rh * 0.5, oz - rd * 0.5, rw, rh, 0.5, wallMat);
    this.addWallBox(ox, oy + rh * 0.5, oz + rd * 0.5, rw, rh, 0.5, wallMat);
    this.addWallBox(ox - rw * 0.5, oy + rh * 0.5, oz, 0.5, rh, rd, wallMat);
    this.addWallBox(ox + rw * 0.5, oy + rh * 0.5, oz, 0.5, rh, rd, wallMat);

    // Interior ambient + key lights (Three.js physical light units)
    const mainLight = new THREE.PointLight(
      isNightclub ? 0xff4f9a : isBunker ? 0x9de6d8 : 0xfff1d6,
      isNightclub ? 32 : 24,
      40,
      1.1
    );
    mainLight.position.set(ox, oy + rh - 0.8, oz);
    this.interiorGroup.add(mainLight);
    this.interiorLights.push(mainLight);

    const fillLight = new THREE.PointLight(isNightclub ? 0x1fd1c5 : 0xffe8cc, 18, 36, 1.1);
    fillLight.position.set(ox - 4, oy + rh - 1.2, oz + 3);
    this.interiorGroup.add(fillLight);
    this.interiorLights.push(fillLight);

    const backLight = new THREE.PointLight(0xffffff, 14, 34, 1.1);
    backLight.position.set(ox + 4, oy + rh - 1.2, oz - 4);
    this.interiorGroup.add(backLight);
    this.interiorLights.push(backLight);

    // Wall accent strip & baseboards
    this.addWallBox(ox, oy + rh - 0.65, oz - rd * 0.5 + 0.3, rw - 1.5, 0.16, 0.12, accentMat, false);
    this.addWallBox(ox, oy + 0.12, oz - rd * 0.5 + 0.28, rw - 0.5, 0.22, 0.08, woodMat, false);

    // Ceiling light panels
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xfff8eb,
      emissive: isNightclub ? 0xff4f9a : 0xffeed0,
      emissiveIntensity: 0.9,
    });
    for (const lz of [-3.5, 2.5]) {
      this.addWallBox(ox, oy + rh - 0.05, oz + lz, 3.6, 0.08, 0.9, panelMat, false);
    }

    // Framed wall art & interior window with curtains
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.4 });
    const artMat = new THREE.MeshStandardMaterial({ color: 0xff8a65, roughness: 0.6 });
    this.addWallBox(ox - 4.2, oy + 2.3, oz - rd * 0.5 + 0.3, 2.2, 1.5, 0.08, frameMat, false);
    this.addWallBox(ox - 4.2, oy + 2.3, oz - rd * 0.5 + 0.33, 1.9, 1.2, 0.08, artMat, false);

    // Corner potted tropical plants
    const potMat = new THREE.MeshStandardMaterial({ color: 0xb8734d, roughness: 0.75 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3b8c3e, roughness: 0.7 });
    for (const px of [-rw * 0.5 + 1.1, rw * 0.5 - 1.1]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.62, 10), potMat);
      pot.position.set(ox + px, oy + 0.31, oz - rd * 0.5 + 1.1);
      const plant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), leafMat);
      plant.position.set(ox + px, oy + 1.05, oz - rd * 0.5 + 1.1);
      this.interiorGroup.add(pot, plant);
    }

    // Center area rug (non-warehouse)
    if (b.category !== 'warehouse' && b.category !== 'garage' && b.category !== 'bunker') {
      const rug = new THREE.Mesh(
        new THREE.BoxGeometry(6.2, 0.04, 4.4),
        new THREE.MeshStandardMaterial({ color: isNightclub ? 0x2b1b38 : 0x3e6b7e, roughness: 0.95 })
      );
      rug.position.set(ox, oy + 0.03, oz + 0.8);
      this.interiorGroup.add(rug);
    }

    // Exit door mesh + interactable
    const exitDoorPos = new THREE.Vector3(ox, oy + 0.1, oz + rd * 0.5 - 1.1);
    const exitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 3.0, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x1c2833, emissive: 0x1fd1c5, emissiveIntensity: 0.45 })
    );
    exitMesh.position.set(ox, oy + 1.5, oz + rd * 0.5 - 0.35);
    this.interiorGroup.add(exitMesh);

    this.interiorInteractables.push({
      id: 'exit_building',
      kind: 'building',
      key: 'E',
      label: `Exit ${b.name}`,
      position: exitDoorPos,
      radius: 3.2,
      indoorOnly: true,
      onInteract: () => this.onExitCallback(this.returnPos.clone(), this.returnYaw),
    });

    // Category-specific furnishings & NPCs
    if (b.category === 'cafe' || b.category === 'skybar') {
      // Bar / espresso counter
      this.addWallBox(ox, oy + 0.55, oz - 5, 8, 1.1, 1.4, woodMat);
      this.addWallBox(ox - 1.5, oy + 1.4, oz - 5.2, 1.1, 0.6, 0.6, metalMat);
      // Cafe tables & chairs
      for (const [tx, tz] of [[-4.5, 0], [4.5, 0], [-4.5, 4], [4.5, 4]]) {
        this.addWallBox(ox + tx, oy + 0.45, oz + tz, 1.6, 0.9, 1.6, woodMat);
        this.addWallBox(ox + tx - 1.3, oy + 0.3, oz + tz, 0.6, 0.6, 0.6, accentMat, false);
        this.addWallBox(ox + tx + 1.3, oy + 0.3, oz + tz, 0.6, 0.6, 0.6, accentMat, false);
      }
      this.addInteriorNPC(0, -6.4, 0, 'Mateo (Barista)', 'Fresh Sunhaven roast! Try checking the Central Park fountain for an old time-capsule.', 0xf5f5f5, 0x6f4e37);
      this.interiorInteractables.push({
        id: 'cafe_buy',
        kind: 'shop_counter',
        key: 'E',
        label: 'Order Tropical Espresso ($10)',
        position: new THREE.Vector3(ox, oy + 0.2, oz - 3.6),
        radius: 2.5,
        indoorOnly: true,
        onInteract: () => {
          this.onCashCallback(-10);
          this.onToastCallback('Enjoyed an iced Sunhaven espresso! Energy refreshed.', 'info');
        },
      });
    } else if (b.category === 'nightclub') {
      // Glowing dance floor tiles
      for (let x = -4; x <= 4; x += 2) {
        for (let z = -2; z <= 3; z += 2) {
          const tile = new THREE.Mesh(
            new THREE.BoxGeometry(1.85, 0.08, 1.85),
            new THREE.MeshStandardMaterial({
              color: (x + z) % 4 === 0 ? 0xff477e : 0x1fd1c5,
              emissive: (x + z) % 4 === 0 ? 0xff477e : 0x1fd1c5,
              emissiveIntensity: 1.2,
            })
          );
          tile.position.set(ox + x, oy + 0.05, oz + z);
          this.interiorGroup.add(tile);
        }
      }
      // DJ Booth & Lounge sofas
      this.addWallBox(ox, oy + 0.7, oz - 6, 5.5, 1.4, 1.8, accentMat);
      this.addWallBox(ox - 6.5, oy + 0.45, oz, 1.6, 0.9, 6, woodMat);
      this.addWallBox(ox + 6.5, oy + 0.45, oz, 1.6, 0.9, 6, woodMat);
      this.addInteriorNPC(0, -7.2, 0, 'DJ Solara', 'Welcome to Neon Pulse! Rumor says there is a vintage arcade cabinet tucked behind our alley outside.', 0x111111, 0xff477e);
    } else if (b.category === 'store' || b.category === 'surf_shop') {
      // Stocked shelves & checkout counter with colorful items
      this.addWallBox(ox - 5, oy + 0.55, oz - 5.4, 4.5, 1.1, 1.4, woodMat);
      const itemColors = [0xff6b4a, 0x1fd1c5, 0xffb84d, 0x45b7d1, 0xbadc58];
      for (const sx of [-3.5, 1.2, 5.4]) {
        this.addWallBox(ox + sx, oy + 0.95, oz - 1.2, 1.1, 1.9, 6.2, metalMat);
        for (let row = 0; row < 2; row++) {
          for (let slot = -2; slot <= 2; slot++) {
            const prodMat = new THREE.MeshStandardMaterial({
              color: itemColors[Math.abs(slot + row) % itemColors.length],
              roughness: 0.4,
            });
            this.addWallBox(ox + sx, oy + 1.0 + row * 0.68, oz - 1.2 + slot * 1.1, 1.22, 0.34, 0.55, prodMat, false);
          }
        }
      }
      this.addInteriorNPC(
        -5,
        -6.6,
        0,
        b.category === 'surf_shop' ? 'Kai (Surf Pro)' : 'Elena (Cashier)',
        b.category === 'surf_shop'
          ? 'The waves are prime! Swim or take a boat west off Palm Beach to spot something glowing under the water.'
          : 'Welcome to Bayside Market! Grab a snack or check the map with [M] to plan your route.',
        0x1fd1c5
      );
    } else if (b.category === 'garage') {
      // Garage lift, tool racks & display chassis
      this.addWallBox(ox - 5, oy + 1.2, oz - 6, 4, 2.4, 1, metalMat);
      this.addWallBox(ox + 5, oy + 1.2, oz - 6, 4, 2.4, 1, metalMat);
      this.addWallBox(ox, oy + 0.65, oz - 1, 2.4, 1.1, 4.8, new THREE.MeshStandardMaterial({ color: 0xff6b4a, metalness: 0.6, roughness: 0.25 }));
      this.addInteriorNPC(-4, -3, 0.5, 'Marco (Chief Mechanic)', 'Looking for our prototype Solaris? We keep a secret midnight edition hidden in the port industrial bay!', 0x2c3e50, 0xd35400);
    } else if (b.category === 'bunker') {
      // Underground Metro & Secret Smuggler Bunker!
      this.addWallBox(ox - 5.5, oy + 1.2, oz - 4, 2.2, 2.4, 3.5, metalMat);
      this.addWallBox(ox + 5.5, oy + 1.2, oz - 4, 2.2, 2.4, 3.5, metalMat);
      const vaultDoor = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.1, 0.5, 16),
        new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.85, roughness: 0.3 })
      );
      vaultDoor.rotation.x = Math.PI * 0.5;
      vaultDoor.position.set(ox, oy + 2.1, oz - rd * 0.5 + 0.6);
      this.interiorGroup.add(vaultDoor);
      this.addInteriorNPC(2, -4, -0.4, 'Archivist Vance', 'You found the hidden Sunhaven Metro Vault! Inspect the vault terminal to claim the secret cache.', 0x34495e, 0x1c2833);
      this.interiorInteractables.push({
        id: 'bunker_secret_trigger',
        kind: 'secret',
        key: 'E',
        label: 'Inspect Smuggler Vault Terminal',
        position: new THREE.Vector3(ox, oy + 0.2, oz - 5.5),
        radius: 3.0,
        indoorOnly: true,
        onInteract: () => this.onSecretCallback('egg_subway_vault'),
      });
    } else if (b.category === 'cottage') {
      // Lighthouse Keeper's Cottage
      this.addWallBox(ox - 4, oy + 0.45, oz - 4, 2.8, 0.9, 1.8, woodMat);
      this.addWallBox(ox + 4, oy + 0.4, oz - 1, 2.2, 0.8, 2.2, woodMat);
      this.interiorInteractables.push({
        id: 'keeper_journal_trigger',
        kind: 'secret',
        key: 'E',
        label: "Read Keeper's Logbook",
        position: new THREE.Vector3(ox - 4, oy + 0.2, oz - 2.6),
        radius: 2.8,
        indoorOnly: true,
        onInteract: () => {
          this.onSecretCallback('egg_lighthouse_journal');
          this.onDialogueCallback("Keeper's Journal", 'Oct 14: Saw strange lights out near Coral Cove Island to the northwest. Marked it on the charts.');
        },
      });
    } else {
      // Apartments, Villas, Offices, Hotel, Motel, Terminal, Warehouse
      this.addWallBox(ox, oy + 0.5, oz - 4.5, 6.5, 1.0, 1.6, woodMat);
      this.addWallBox(ox - 5, oy + 0.45, oz + 1, 2.6, 0.9, 1.4, accentMat);
      this.addWallBox(ox + 5, oy + 0.45, oz + 1, 2.6, 0.9, 1.4, accentMat);
      this.addInteriorNPC(0, -6, 0, 'Concierge Maya', `Welcome inside ${b.name}! Feel free to explore Sunhaven at your own pace.`, 0x2c3e50, 0x1fd1c5);
    }
  }

  update(dt: number, elapsed: number): void {
    if (!this.isInside) return;
    for (const npc of this.interiorNpcs) {
      npc.anim.update(dt, 'idle', 0);
    }
    if (this.currentBuilding?.category === 'nightclub' && this.interiorLights.length > 0) {
      const hue = (elapsed * 0.25) % 1;
      this.interiorLights[0].color.setHSL(hue, 0.85, 0.55);
    }
  }
}
