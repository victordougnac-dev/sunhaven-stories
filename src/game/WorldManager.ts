import * as THREE from 'three';
import type { AABBCollider, BuildingEntryDef, DistrictDef, QualityPreset } from './types';
import type { MaterialPalette } from './TextureFactory';
import type { SurfaceType } from './AudioManager';

export const ROAD_X = [-180, -60, 60, 180, 320];
export const ROAD_Z = [-240, -120, 0, 120, 240];

export const DISTRICTS: DistrictDef[] = [
  { id: 'downtown', name: 'Downtown Sunhaven', bounds: { minX: -120, maxX: 120, minZ: -180, maxZ: 60 }, color: '#45b7d1' },
  { id: 'central_park', name: 'Central Palm Park', bounds: { minX: -55, maxX: 55, minZ: -115, maxZ: -5 }, color: '#4ecdc4' },
  { id: 'bayside_shops', name: 'Bayside Promenade', bounds: { minX: -175, maxX: -65, minZ: -115, maxZ: 115 }, color: '#ffbe76' },
  { id: 'palm_beach', name: 'Palm Beach', bounds: { minX: -310, maxX: -185, minZ: -260, maxZ: 235 }, color: '#f6e58d' },
  { id: 'neon_mile', name: 'Neon Mile', bounds: { minX: -175, maxX: 55, minZ: 65, maxZ: 235 }, color: '#ff6b6b' },
  { id: 'marina', name: 'Sunhaven Marina', bounds: { minX: -395, maxX: -60, minZ: 235, maxZ: 430 }, color: '#22a6b3' },
  { id: 'harbor_port', name: 'Harbor Port & Industrial', bounds: { minX: 60, maxX: 300, minZ: 125, maxZ: 360 }, color: '#95afc0' },
  { id: 'suburbs', name: 'Sunset Suburbs', bounds: { minX: 65, maxX: 305, minZ: -235, maxZ: 115 }, color: '#badc58' },
  { id: 'coral_heights', name: 'Coral Heights', bounds: { minX: 190, maxX: 410, minZ: -380, maxZ: -120 }, color: '#f0932b' },
  { id: 'airport', name: 'Sunhaven Int. Airport', bounds: { minX: 305, maxX: 580, minZ: -70, maxZ: 360 }, color: '#7ed6df' },
  { id: 'emerald_hills', name: 'Emerald Hills', bounds: { minX: -240, maxX: 390, minZ: -560, maxZ: -245 }, color: '#6ab04c' },
  { id: 'secret_island', name: 'Coral Cove Island', bounds: { minX: -600, maxX: -440, minZ: 40, maxZ: 200 }, color: '#ff7979' },
];

export interface TrafficSignalState {
  x: number;
  z: number;
  nsGreen: boolean;
  matNS: THREE.MeshBasicMaterial;
  matEW: THREE.MeshBasicMaterial;
}

export class WorldManager {
  public group = new THREE.Group();
  public colliders: AABBCollider[] = [];
  public buildingEntries: BuildingEntryDef[] = [];
  public benchSpots: { pos: THREE.Vector3; yaw: number }[] = [];
  public atmSpots: THREE.Vector3[] = [];
  public trafficSignals: TrafficSignalState[] = [];

  private waterMesh!: THREE.Mesh;
  private waterNormalTex: THREE.CanvasTexture;
  private palette: MaterialPalette;

  private palmFrondsInstanced!: THREE.InstancedMesh;
  private palmBaseMatrices: THREE.Matrix4[] = [];
  private palmPositions: THREE.Vector3[] = [];

  private streetLampBulbMat!: THREE.MeshStandardMaterial;
  private neonSignMats: THREE.MeshStandardMaterial[] = [];
  private runwayLightMat!: THREE.MeshStandardMaterial;
  private oceanBirds: THREE.Mesh[] = [];
  private clouds: THREE.Group[] = [];

  private signalTimer = 0;
  private nsPhase = true;
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, palette: MaterialPalette) {
    this.palette = palette;
    this.waterNormalTex = palette.waterNormal;
    scene.add(this.group);
    this.buildWorld();
  }

  getGroundHeight(x: number, z: number): number {
    // Secret Coral Cove Island
    const dxIsl = x + 520;
    const dzIsl = z - 120;
    const distIsl = Math.hypot(dxIsl, dzIsl);
    if (distIsl < 75) {
      const h = Math.max(0, (1 - distIsl / 75) * 7.2);
      return -0.8 + h;
    }

    // Lighthouse rocky point
    const dxLight = x + 375;
    const dzLight = z - 385;
    const distLight = Math.hypot(dxLight, dzLight);
    if (distLight < 48) {
      return Math.max(-0.5, 2.8 * (1 - distLight / 48) + 0.3);
    }

    // Wooden Marina Piers
    if (z >= 255 && z <= 355) {
      for (const px of [-240, -175, -110]) {
        if (Math.abs(x - px) < 5.2) return 0.72;
      }
    }

    // Ocean & Beach slope on West side
    if (x < -205) {
      const t = THREE.MathUtils.clamp((-205 - x) / 110, 0, 1);
      return THREE.MathUtils.lerp(0.15, -6.5, t);
    }

    // South Marina Bay water
    if (z > 250 && x < 40) {
      const t = THREE.MathUtils.clamp((z - 250) / 85, 0, 1);
      return THREE.MathUtils.lerp(0.15, -5.5, t);
    }

    // East outer ocean past airport/hills
    if (x > 555) {
      const t = THREE.MathUtils.clamp((x - 555) / 85, 0, 1);
      return THREE.MathUtils.lerp(0.15, -6.0, t);
    }

    // Emerald Hills mountain region in the North
    if (z < -255 && x > -210 && x < 420) {
      const northT = THREE.MathUtils.clamp((-255 - z) / 240, 0, 1);
      const ridge =
        Math.sin(x * 0.015) * 4.5 +
        Math.cos(z * 0.018) * 3.5 +
        northT * 32;
      // Flatten slightly near mountain road centerline x ~ 60..140
      const roadDist = Math.abs(x - (60 + Math.sin(z * 0.015) * 45));
      if (roadDist < 12) {
        return Math.max(0.2, northT * 26);
      }
      return Math.max(0.2, ridge);
    }

    // Coral Heights gentle hillside terrace
    if (x > 205 && x < 400 && z > -360 && z < -125) {
      const tx = THREE.MathUtils.clamp((x - 205) / 160, 0, 1);
      return 0.2 + tx * 9.5;
    }

    // City / Airport flat coastal shelf
    if (z > 360 || z < -540) {
      const edgeDist = z > 360 ? z - 360 : -540 - z;
      return THREE.MathUtils.lerp(0.15, -6.0, THREE.MathUtils.clamp(edgeDist / 80, 0, 1));
    }

    return 0.15;
  }

  getSurfaceType(x: number, z: number): SurfaceType {
    if (z >= 255 && z <= 355) {
      for (const px of [-240, -175, -110]) {
        if (Math.abs(x - px) < 5.2) return 'wood';
      }
    }
    if (x < -192 && x > -290 && z > -260 && z < 245) return 'sand';
    if (Math.hypot(x + 520, z - 120) < 75) return 'sand';
    for (const rx of ROAD_X) {
      if (Math.abs(x - rx) < 10) return 'asphalt';
    }
    for (const rz of ROAD_Z) {
      if (Math.abs(z - rz) < 10) return 'asphalt';
    }
    if (x > 330 && x < 530 && z > -40 && z < 340) return 'asphalt';
    if (Math.abs(x) < 55 && z > -115 && z < -5) return 'grass';
    if (z < -255) return 'grass';
    return 'asphalt';
  }

  getDistrictAt(x: number, z: number): DistrictDef {
    for (const d of DISTRICTS) {
      if (
        x >= d.bounds.minX &&
        x <= d.bounds.maxX &&
        z >= d.bounds.minZ &&
        z <= d.bounds.maxZ
      ) {
        return d;
      }
    }
    return DISTRICTS[0];
  }

  private addCollider(
    cx: number,
    cy: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    tag?: string
  ): void {
    this.colliders.push({
      minX: cx - w * 0.5,
      maxX: cx + w * 0.5,
      minY: cy - h * 0.5,
      maxY: cy + h * 0.5,
      minZ: cz - d * 0.5,
      maxZ: cz + d * 0.5,
      tag,
    });
  }

  private buildWorld(): void {
    this.buildTerrainAndOcean();
    this.buildRoadNetwork();
    this.buildDowntownAndBayside();
    this.buildNeonMile();
    this.buildSuburbsAndCoralHeights();
    this.buildCentralPark();
    this.buildPalmBeachAndMarina();
    this.buildHarborPort();
    this.buildAirport();
    this.buildEmeraldHillsAndIsland();
    this.buildVegetationAndLights();
    this.buildSkyDetails();
  }

  private buildTerrainAndOcean(): void {
    // Displaced high-detail terrain mesh covering [-650..650]
    const segs = 96;
    const size = 1360;
    const terrainGeo = new THREE.PlaneGeometry(size, size, segs, segs);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const colSand = new THREE.Color(0xe6ce9c);
    const colGrass = new THREE.Color(0x47773f);
    const colCity = new THREE.Color(0x7d807b);
    const colRock = new THREE.Color(0x61665e);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getGroundHeight(x, z);
      pos.setY(i, y);

      let c = colCity;
      if (x < -190 || Math.hypot(x + 520, z - 120) < 78 || y < 0.05) {
        c = colSand;
      } else if (z < -250 || (Math.abs(x) < 55 && z > -115 && z < -5) || x > 195) {
        c = y > 16 ? colRock : colGrass;
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.02,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    this.group.add(terrain);

    // Tropical Ocean Plane
    const waterGeo = new THREE.PlaneGeometry(4200, 4200, 32, 32);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0d7a94,
      normalMap: this.waterNormalTex,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.14,
      metalness: 0.58,
      transparent: true,
      opacity: 0.9,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = -0.35;
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);
  }

  private buildRoadNetwork(): void {
    const roadGroup = new THREE.Group();
    const minX = -200;
    const maxX = 350;
    const minZ = -260;
    const maxZ = 270;

    // N-S Roads + sidewalks
    for (const x of ROAD_X) {
      const len = maxZ - minZ;
      const cz = (minZ + maxZ) * 0.5;
      const road = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, len), this.palette.asphalt);
      road.position.set(x, 0.17, cz);
      road.receiveShadow = true;
      roadGroup.add(road);

      for (const side of [-1, 1]) {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.24, len), this.palette.sidewalk);
        sw.position.set(x + side * 8.6, 0.17, cz);
        sw.receiveShadow = true;
        roadGroup.add(sw);
      }

      // Dashed yellow center line
      for (let z = minZ + 8; z < maxZ - 8; z += 12) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(0.28, 5.5),
          new THREE.MeshBasicMaterial({ color: 0xf4c44e })
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, 0.24, z);
        roadGroup.add(dash);
      }
    }

    // E-W Roads + sidewalks
    for (const z of ROAD_Z) {
      const len = maxX - minX;
      const cx = (minX + maxX) * 0.5;
      const road = new THREE.Mesh(new THREE.BoxGeometry(len, 0.13, 14), this.palette.asphalt);
      road.position.set(cx, 0.175, z);
      road.receiveShadow = true;
      roadGroup.add(road);

      for (const side of [-1, 1]) {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(len, 0.23, 3.2), this.palette.sidewalk);
        sw.position.set(cx, 0.17, z + side * 8.6);
        sw.receiveShadow = true;
        roadGroup.add(sw);
      }

      for (let x = minX + 8; x < maxX - 8; x += 12) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(5.5, 0.28),
          new THREE.MeshBasicMaterial({ color: 0xf4c44e })
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, 0.245, z);
        roadGroup.add(dash);
      }
    }

    // Intersections: Crosswalks + Traffic Lights
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x263038, metalness: 0.6, roughness: 0.4 });
    for (const rx of ROAD_X) {
      for (const rz of ROAD_Z) {
        if (rx > 200 && rz < -150) continue;
        const matNS = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
        const matEW = new THREE.MeshBasicMaterial({ color: 0xe74c3c });

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 5.5, 8), poleMat);
        pole.position.set(rx + 8.5, 2.9, rz + 8.5);
        roadGroup.add(pole);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 0.16), poleMat);
        arm.position.set(rx + 7.1, 5.4, rz + 8.5);
        roadGroup.add(arm);

        const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.2, 0.55), poleMat);
        box.position.set(rx + 6.0, 5.2, rz + 8.5);
        roadGroup.add(box);

        const lightNS = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), matNS);
        lightNS.position.set(rx + 6.0, 5.4, rz + 8.8);
        roadGroup.add(lightNS);

        const lightEW = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), matEW);
        lightEW.position.set(rx + 5.7, 5.0, rz + 8.5);
        roadGroup.add(lightEW);

        this.trafficSignals.push({ x: rx, z: rz, nsGreen: true, matNS, matEW });
      }
    }

    this.group.add(roadGroup);
  }

  private addSkyscraper(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    styleIdx: number,
    entry?: Omit<BuildingEntryDef, 'doorPos' | 'doorYaw'> & { doorSide: 'N' | 'S' | 'E' | 'W' }
  ): void {
    const g = new THREE.Group();
    const mat = this.palette.glassTowerDay[styleIdx % this.palette.glassTowerDay.length];

    // Podium base
    const podiumH = Math.min(8, h * 0.2);
    const podium = new THREE.Mesh(new THREE.BoxGeometry(w + 2, podiumH, d + 2), mat);
    podium.position.set(x, podiumH * 0.5 + 0.15, z);
    podium.castShadow = true;
    podium.receiveShadow = true;
    g.add(podium);

    // Main shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    shaft.position.set(x, h * 0.5 + 0.15, z);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    g.add(shaft);

    // Upper setback crown
    if (h > 36) {
      const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, h * 0.22, d * 0.72), mat);
      crown.position.set(x, h + h * 0.11 + 0.15, z);
      crown.castShadow = true;
      g.add(crown);

      // Rooftop HVAC & spire
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.35, 10, 6),
        new THREE.MeshStandardMaterial({ color: 0xbac7d5, metalness: 0.7, roughness: 0.3 })
      );
      spire.position.set(x, h + h * 0.22 + 5, z);
      g.add(spire);
    }

    this.addCollider(x, h * 0.5, z, w + 1.8, h + 12, d + 1.8, 'building');

    if (entry) {
      const { pos, yaw } = this.attachEntranceMarker(g, x, 0.18, z, w + 2, d + 2, entry.doorSide, entry.name);
      this.buildingEntries.push({
        id: entry.id,
        name: entry.name,
        category: entry.category,
        district: entry.district,
        doorPos: pos,
        doorYaw: yaw,
        isRooftopTeleport: entry.isRooftopTeleport,
        rooftopPos: entry.rooftopPos,
      });
    }

    this.group.add(g);
  }

  private addCoastalBuilding(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    stuccoIdx: number,
    pitchedRoof: boolean,
    neonColor?: number,
    entry?: Omit<BuildingEntryDef, 'doorPos' | 'doorYaw'> & { doorSide: 'N' | 'S' | 'E' | 'W' }
  ): void {
    const baseY = this.getGroundHeight(x, z);
    const g = new THREE.Group();
    const mat = this.palette.stuccoMaterials[stuccoIdx % this.palette.stuccoMaterials.length];

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.set(x, baseY + h * 0.5, z);
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    if (pitchedRoof) {
      const roofMat = new THREE.MeshStandardMaterial({
        color: stuccoIdx % 2 === 0 ? 0xb5543c : 0x455a64,
        roughness: 0.75,
      });
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.76, h * 0.42, 4), roofMat);
      roof.position.set(x, baseY + h + h * 0.21, z);
      roof.rotation.y = Math.PI * 0.25;
      roof.castShadow = true;
      g.add(roof);
    } else {
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.8, 0.6, d + 0.8),
        new THREE.MeshStandardMaterial({ color: 0xe6e0d4, roughness: 0.6 })
      );
      trim.position.set(x, baseY + h + 0.3, z);
      g.add(trim);
    }

    if (neonColor !== undefined) {
      const signMat = new THREE.MeshStandardMaterial({
        color: neonColor,
        emissive: new THREE.Color(neonColor),
        emissiveIntensity: 1.5,
      });
      this.neonSignMats.push(signMat);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 1.3, 0.35), signMat);
      sign.position.set(x, baseY + h * 0.72, z + d * 0.5 + 0.25);
      g.add(sign);
    }

    this.addCollider(x, baseY + h * 0.5, z, w, h + 4, d, 'building');

    if (entry) {
      const { pos, yaw } = this.attachEntranceMarker(g, x, baseY, z, w, d, entry.doorSide, entry.name);
      this.buildingEntries.push({
        id: entry.id,
        name: entry.name,
        category: entry.category,
        district: entry.district,
        doorPos: pos,
        doorYaw: yaw,
      });
    }

    this.group.add(g);
  }

  private attachEntranceMarker(
    g: THREE.Group,
    cx: number,
    baseY: number,
    cz: number,
    w: number,
    d: number,
    side: 'N' | 'S' | 'E' | 'W',
    _name: string
  ): { pos: THREE.Vector3; yaw: number } {
    let dx = 0;
    let dz = 0;
    let yaw = 0;
    if (side === 'S') {
      dz = d * 0.5 + 0.15;
      yaw = 0;
    } else if (side === 'N') {
      dz = -d * 0.5 - 0.15;
      yaw = Math.PI;
    } else if (side === 'E') {
      dx = w * 0.5 + 0.15;
      yaw = Math.PI * 0.5;
    } else {
      dx = -w * 0.5 - 0.15;
      yaw = -Math.PI * 0.5;
    }

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x263238,
      roughness: 0.4,
      metalness: 0.7,
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.25, 0.36), frameMat);
    frame.position.set(cx + dx, baseY + 1.62, cz + dz);
    frame.rotation.y = yaw;
    g.add(frame);

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x203a4c,
      emissive: 0xffd29d,
      emissiveIntensity: 0.25,
      roughness: 0.15,
      metalness: 0.75,
    });
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.95, 0.4), doorMat);
    door.position.set(cx + dx, baseY + 1.5, cz + dz);
    door.rotation.y = yaw;
    g.add(door);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.24, 1.5),
      new THREE.MeshStandardMaterial({ color: 0xff6b4a, roughness: 0.5 })
    );
    canopy.position.set(
      cx + dx + Math.sin(yaw) * 0.7,
      baseY + 3.15,
      cz + dz + Math.cos(yaw) * 0.7
    );
    canopy.rotation.y = yaw;
    g.add(canopy);

    // Glowing floor ring right outside door
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.05, 20),
      new THREE.MeshBasicMaterial({ color: 0x1fd1c5, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    const promptPos = new THREE.Vector3(
      cx + dx + Math.sin(yaw) * 1.9,
      baseY + 0.08,
      cz + dz + Math.cos(yaw) * 1.9
    );
    ring.position.copy(promptPos);
    g.add(ring);

    return { pos: promptPos, yaw };
  }

  private buildDowntownAndBayside(): void {
    // Downtown block (x in [-45..45], z in [-225..-135] & [15..105], and [75..165] west)
    this.addSkyscraper(-26, -180, 26, 26, 78, 0, {
      id: 'downtown_tower',
      name: 'Sunhaven Apex Tower',
      category: 'office',
      district: 'downtown',
      doorSide: 'S',
    });
    // Rooftop Skybar elevator right beside Apex Tower!
    this.addSkyscraper(22, -180, 24, 24, 64, 1, {
      id: 'skybar_elevator',
      name: 'Apex Rooftop Skybar',
      category: 'skybar',
      district: 'downtown',
      doorSide: 'S',
      isRooftopTeleport: true,
      rooftopPos: new THREE.Vector3(-26, 95.5, -180),
    });

    // Build actual rooftop lounge deck atop Apex Tower (-26, 95.5, -180)
    const roofDeck = new THREE.Mesh(
      new THREE.BoxGeometry(19, 0.6, 19),
      new THREE.MeshStandardMaterial({ color: 0x333c48, roughness: 0.5 })
    );
    roofDeck.position.set(-26, 95.3, -180);
    this.group.add(roofDeck);

    // More varied downtown towers
    this.addSkyscraper(-96, -180, 26, 24, 58, 2, {
      id: 'grand_hotel',
      name: 'Sunhaven Grand Hotel',
      category: 'apartment',
      district: 'downtown',
      doorSide: 'S',
    });
    this.addSkyscraper(-140, -176, 22, 22, 42, 3);
    this.addSkyscraper(24, 56, 24, 24, 52, 0);
    this.addSkyscraper(-24, 56, 24, 24, 68, 2);
    this.addSkyscraper(-96, -60, 24, 24, 46, 3);

    // Bayside Promenade shops & cafes (x in [-165..-75], z in [-105..105])
    this.addCoastalBuilding(-146, -54, 18, 15, 8.5, 1, false, 0x1fd1c5, {
      id: 'sunset_cafe',
      name: 'Sunset Cafe & Bistro',
      category: 'cafe',
      district: 'bayside_shops',
      doorSide: 'E',
    });
    this.addCoastalBuilding(-146, -24, 16, 14, 7.5, 2, false, 0xffb84d, {
      id: 'bayside_store',
      name: 'Bayside Market',
      category: 'store',
      district: 'bayside_shops',
      doorSide: 'E',
    });
    this.addCoastalBuilding(-146, 24, 17, 15, 9, 0, true);
    this.addCoastalBuilding(-96, 28, 18, 16, 11, 4, false);
    this.addCoastalBuilding(-96, -22, 16, 14, 9.5, 5, false);

    // Downtown Subway / Underground Bunker Stairs near (-72, -62)
    this.addCoastalBuilding(-72, -64, 8, 8, 4.2, 6, false, 0x1fd1c5, {
      id: 'subway_bunker',
      name: 'Underground Metro & Bunker',
      category: 'bunker',
      district: 'downtown',
      doorSide: 'W',
    });

    // ATMs along Bayside & Downtown
    for (const pos of [
      new THREE.Vector3(-135, 0.2, -38),
      new THREE.Vector3(-50, 0.2, -135),
      new THREE.Vector3(-135, 0.2, 138),
    ]) {
      const atm = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.9, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1b4f72, emissive: 0x1fd1c5, emissiveIntensity: 0.4 })
      );
      atm.position.set(pos.x, 1.1, pos.z);
      this.group.add(atm);
      this.atmSpots.push(pos);
    }
  }

  private buildNeonMile(): void {
    // Nightlife strip (x in [-165..45], z in [75..225])
    this.addCoastalBuilding(-142, 162, 24, 20, 11, 6, false, 0xff477e, {
      id: 'neon_pulse_club',
      name: 'Neon Pulse Nightclub',
      category: 'nightclub',
      district: 'neon_mile',
      doorSide: 'N',
    });
    this.addCoastalBuilding(-96, 168, 22, 16, 10, 7, false, 0x1fd1c5, {
      id: 'motel_sol',
      name: 'Motel Sol Lobby',
      category: 'motel',
      district: 'neon_mile',
      doorSide: 'N',
    });
    this.addCoastalBuilding(-24, 165, 22, 18, 13, 3, false, 0xffb84d);
    this.addCoastalBuilding(24, 165, 20, 18, 12, 1, false, 0xff6b4a);
    this.addCoastalBuilding(-142, 205, 18, 16, 9, 5, false, 0x45b7d1);
  }

  private buildSuburbsAndCoralHeights(): void {
    // Sunset Suburbs (x in [80..295], z in [-220..100])
    const houseSpots: [number, number, number][] = [
      [95, -200, 0], [140, -200, 1], [95, -158, 2], [140, -158, 3],
      [95, -80, 4], [140, -80, 5], [95, -35, 6], [140, -35, 7],
      [95, 36, 0], [140, 36, 1], [95, 82, 2], [140, 82, 3],
      [215, -80, 4], [260, -80, 5], [215, -35, 6], [260, -35, 7],
      [215, 36, 0], [260, 36, 2],
    ];
    houseSpots.forEach(([hx, hz, idx], i) => {
      this.addCoastalBuilding(
        hx,
        hz,
        14 + (i % 3) * 2,
        12 + (i % 2) * 2,
        5.5 + (i % 2) * 1.5,
        idx,
        true,
        undefined,
        i === 0
          ? {
              id: 'suburban_home',
              name: 'Palm Lane Residence',
              category: 'villa',
              district: 'suburbs',
              doorSide: 'S',
            }
          : undefined
      );
    });

    // Coral Heights Luxury Villas (elevated hillside)
    this.addCoastalBuilding(275, -200, 24, 18, 8.5, 0, false, undefined, {
      id: 'coral_villa',
      name: 'Coral Heights Villa',
      category: 'villa',
      district: 'coral_heights',
      doorSide: 'W',
    });
    // Infinity pool next to Coral Villa
    const poolY = this.getGroundHeight(275, -176);
    const pool = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x26d0ce, roughness: 0.12, metalness: 0.4 })
    );
    pool.position.set(275, poolY + 0.18, -176);
    this.group.add(pool);

    this.addCoastalBuilding(330, -290, 22, 18, 9, 2, false);
    this.addCoastalBuilding(245, -300, 20, 16, 8, 1, true);
  }

  private buildCentralPark(): void {
    // Central Palm Park (x in [-48..48], z in [-108..-12])
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.8 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.2, 0.9, 24), stoneMat);
    basin.position.set(0, 0.6, -60);
    basin.receiveShadow = true;
    this.group.add(basin);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 6.8, 0.75, 24),
      new THREE.MeshStandardMaterial({ color: 0x23b5d3, roughness: 0.15, metalness: 0.4 })
    );
    water.position.set(0, 0.75, -60);
    this.group.add(water);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 3.6, 12), stoneMat);
    pillar.position.set(0, 2.2, -60);
    pillar.castShadow = true;
    this.group.add(pillar);
    this.addCollider(0, 2, -60, 15, 5, 15, 'fountain');

    // Park walking cross paths
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xc7bea9, roughness: 0.9 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(92, 0.08, 4.2), pathMat);
    p1.position.set(0, 0.2, -60);
    this.group.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 92), pathMat);
    p2.position.set(0, 0.2, -60);
    this.group.add(p2);

    // Park benches
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.8 });
    const benchCoords: [number, number, number][] = [
      [-14, -52, 0], [14, -52, 0], [-14, -68, Math.PI], [14, -68, Math.PI],
      [-196, -30, Math.PI * 0.5], [-196, 30, Math.PI * 0.5],
    ];
    for (const [bx, bz, yaw] of benchCoords) {
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.7), benchMat);
      seat.position.y = 0.5;
      bench.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 0.12), benchMat);
      back.position.set(0, 0.85, -0.3);
      bench.add(back);
      bench.position.set(bx, 0.18, bz);
      bench.rotation.y = yaw;
      this.group.add(bench);
      this.benchSpots.push({ pos: new THREE.Vector3(bx, 0.2, bz), yaw });
    }
  }

  private buildPalmBeachAndMarina(): void {
    // Beachside Surf Shop along boardwalk (-202, 10)
    this.addCoastalBuilding(-198, 12, 12, 10, 5.2, 3, true, 0x1fd1c5, {
      id: 'surf_shop',
      name: 'Palm Beach Surf Shop',
      category: 'surf_shop',
      district: 'palm_beach',
      doorSide: 'W',
    });

    // Lifeguard tower on the sand (-235, -40)
    const lgBase = this.getGroundHeight(-235, -40);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.6 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe64833, roughness: 0.6 });
    const stilts = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 3.2), towerMat);
    stilts.position.set(-235, lgBase + 1.6, -40);
    this.group.add(stilts);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.4, 4), redMat);
    roof.position.set(-235, lgBase + 4.1, -40);
    roof.rotation.y = Math.PI * 0.25;
    this.group.add(roof);
    this.addCollider(-235, lgBase + 2, -40, 3.4, 5, 3.4, 'lifeguard');

    // Beach umbrellas
    const umbrellaColors = [0xff6b4a, 0x1fd1c5, 0xffb84d, 0x45b7d1];
    for (let i = 0; i < 16; i++) {
      const ux = -238 + (i % 2) * 14;
      const uz = -180 + i * 24;
      const uy = this.getGroundHeight(ux, uz);
      if (uy < 0.05) continue;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6),
        new THREE.MeshStandardMaterial({ color: 0xdddddd })
      );
      pole.position.set(ux, uy + 1.3, uz);
      this.group.add(pole);

      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(2.1, 0.75, 8),
        new THREE.MeshStandardMaterial({ color: umbrellaColors[i % umbrellaColors.length], roughness: 0.7 })
      );
      canopy.position.set(ux, uy + 2.55, uz);
      canopy.castShadow = true;
      this.group.add(canopy);
    }

    // Marina Wooden Piers
    for (const px of [-240, -175, -110]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 100), this.palette.woodPlank);
      pier.position.set(px, 0.48, 305);
      pier.castShadow = true;
      pier.receiveShadow = true;
      this.group.add(pier);
    }

    // Lighthouse at (-375, 385)
    const ly = this.getGroundHeight(-375, 385);
    const lhTower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 4.2, 28, 12),
      new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.7 })
    );
    lhTower.position.set(-375, ly + 14, 385);
    lhTower.castShadow = true;
    this.group.add(lhTower);
    const lhBand = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.6, 7, 12),
      new THREE.MeshStandardMaterial({ color: 0xd94336, roughness: 0.7 })
    );
    lhBand.position.set(-375, ly + 16, 385);
    this.group.add(lhBand);
    const lhLamp = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffd166, emissiveIntensity: 2.0 })
    );
    lhLamp.position.set(-375, ly + 29, 385);
    this.group.add(lhLamp);
    this.addCollider(-375, ly + 14, 385, 8.5, 30, 8.5, 'lighthouse');

    // Lighthouse Keeper's Cottage (enterable)
    this.addCoastalBuilding(-355, 368, 10, 9, 4.8, 4, true, undefined, {
      id: 'lighthouse_cottage',
      name: "Keeper's Cottage",
      category: 'cottage',
      district: 'marina',
      doorSide: 'E',
    });
  }

  private buildHarborPort(): void {
    // Shipping containers & cranes (x in [85..265], z in [150..320])
    const containerColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xd35400, 0x34495e];
    for (let i = 0; i < 16; i++) {
      const cx = 105 + (i % 4) * 32;
      const cz = 165 + Math.floor(i / 4) * 24;
      const stack = i % 3 === 0 ? 2 : 1;
      for (let s = 0; s < stack; s++) {
        const cont = new THREE.Mesh(
          new THREE.BoxGeometry(12, 3.2, 3.4),
          new THREE.MeshStandardMaterial({
            color: containerColors[(i + s) % containerColors.length],
            roughness: 0.65,
            metalness: 0.35,
          })
        );
        cont.position.set(cx, 1.8 + s * 3.25, cz);
        cont.castShadow = true;
        cont.receiveShadow = true;
        this.group.add(cont);
      }
      this.addCollider(cx, 3, cz, 12, stack * 3.4, 3.4, 'container');
    }

    // Enterable Harbor Warehouse
    this.addCoastalBuilding(235, 180, 26, 20, 10, 6, false, undefined, {
      id: 'harbor_warehouse',
      name: 'Harbor Logistics Warehouse',
      category: 'warehouse',
      district: 'harbor_port',
      doorSide: 'W',
    });

    // Enterable Sunhaven Motors Garage
    this.addCoastalBuilding(120, 285, 22, 16, 7.5, 4, false, 0xffb84d, {
      id: 'sunhaven_garage',
      name: 'Sunhaven Motors Garage',
      category: 'garage',
      district: 'harbor_port',
      doorSide: 'N',
    });

    // Harbor Crane
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.5, metalness: 0.4 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 30, 3.2), craneMat);
    tower.position.set(220, 15, 295);
    tower.castShadow = true;
    this.group.add(tower);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(36, 2.2, 2.6), craneMat);
    boom.position.set(212, 29, 295);
    boom.castShadow = true;
    this.group.add(boom);
    this.addCollider(220, 15, 295, 4, 30, 4, 'crane');
  }

  private buildAirport(): void {
    // Runway (N-S oriented at x = 445, z in [-40..330], width 34m, length 370m)
    const runway = new THREE.Mesh(new THREE.BoxGeometry(34, 0.16, 370), this.palette.runway);
    runway.position.set(445, 0.18, 145);
    runway.receiveShadow = true;
    this.group.add(runway);

    // Apron & taxiways connecting to hangars at x = 365
    const apron = new THREE.Mesh(new THREE.BoxGeometry(95, 0.14, 240), this.palette.asphalt);
    apron.position.set(385, 0.17, 145);
    apron.receiveShadow = true;
    this.group.add(apron);

    // Runway edge lights
    this.runwayLightMat = new THREE.MeshStandardMaterial({
      color: 0x8ef9f3,
      emissive: 0x1fd1c5,
      emissiveIntensity: 0.5,
    });
    for (let z = -30; z <= 320; z += 25) {
      for (const side of [-18, 18]) {
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), this.runwayLightMat);
        light.position.set(445 + side, 0.38, z);
        this.group.add(light);
      }
    }

    // Airport Control Tower
    const towerShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 4.4, 28, 10),
      this.palette.stuccoMaterials[0]
    );
    towerShaft.position.set(360, 14.2, 40);
    towerShaft.castShadow = true;
    this.group.add(towerShaft);

    const towerCab = new THREE.Mesh(
      new THREE.CylinderGeometry(6.5, 4.6, 5, 10),
      this.palette.glassTowerDay[0]
    );
    towerCab.position.set(360, 29.5, 40);
    towerCab.castShadow = true;
    this.group.add(towerCab);
    this.addCollider(360, 15, 40, 8.8, 32, 8.8, 'atc_tower');

    // Enterable Airport Terminal
    this.addCoastalBuilding(355, 120, 32, 22, 11, 5, false, 0x45b7d1, {
      id: 'airport_terminal',
      name: 'Sunhaven Airport Terminal',
      category: 'terminal',
      district: 'airport',
      doorSide: 'W',
    });

    // Two Open Hangars (side walls + curved roof, open toward runway)
    for (const hz of [205, 255]) {
      const hRoof = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 14, 28, 12, 1, false, 0, Math.PI),
        this.palette.industrialMetal
      );
      hRoof.rotation.z = Math.PI * 0.5;
      hRoof.rotation.y = Math.PI * 0.5;
      hRoof.position.set(365, 10, hz);
      hRoof.castShadow = true;
      this.group.add(hRoof);

      for (const sz of [-13.5, 13.5]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(28, 10, 1), this.palette.industrialMetal);
        wall.position.set(365, 5, hz + sz);
        this.group.add(wall);
        this.addCollider(365, 5, hz + sz, 28, 10, 1.2, 'hangar_wall');
      }
      const back = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 28), this.palette.industrialMetal);
      back.position.set(351, 5, hz);
      this.group.add(back);
      this.addCollider(351, 5, hz, 1.2, 10, 28, 'hangar_wall');
    }
  }

  private buildEmeraldHillsAndIsland(): void {
    // Winding scenic mountain road markers & overlook platform at (95, -455)
    const ovY = this.getGroundHeight(95, -455);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 14), this.palette.woodPlank);
    deck.position.set(95, ovY + 0.5, -455);
    deck.castShadow = true;
    deck.receiveShadow = true;
    this.group.add(deck);

    // Mysterious Signal Dish in Countryside (-120, -390)
    const dishY = this.getGroundHeight(-120, -390);
    const dishBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 2.2, 9, 8),
      this.palette.industrialMetal
    );
    dishBase.position.set(-120, dishY + 4.5, -390);
    this.group.add(dishBase);
    const dishBowl = new THREE.Mesh(
      new THREE.SphereGeometry(6.5, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
      new THREE.MeshStandardMaterial({ color: 0xeaf0f6, side: THREE.DoubleSide, roughness: 0.4 })
    );
    dishBowl.position.set(-120, dishY + 10.5, -390);
    dishBowl.rotation.x = 0.6;
    this.group.add(dishBowl);
    this.addCollider(-120, dishY + 5, -390, 4.5, 10, 4.5, 'dish');

    // Abandoned Cottage in Emerald Hills (-155, -320)
    this.addCoastalBuilding(-155, -320, 11, 9, 5.0, 4, true);

    // Coral Cove Secret Island ruins & palm cluster (-520, 120)
    const islY = this.getGroundHeight(-520, 120);
    const ruinPillar = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 5.5, 3.2),
      new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.9 })
    );
    ruinPillar.position.set(-520, islY + 2.5, 120);
    this.group.add(ruinPillar);
  }

  private buildVegetationAndLights(): void {
    // Collect palm tree coordinates along beach, park, suburbs, roads, island
    const spots: THREE.Vector3[] = [];
    for (let z = -230; z <= 220; z += 26) {
      spots.push(new THREE.Vector3(-196, 0, z));
      spots.push(new THREE.Vector3(-214, 0, z + 10));
    }
    for (let x = -42; x <= 42; x += 22) {
      for (let z = -102; z <= -18; z += 24) {
        if (Math.hypot(x, z + 60) > 14) {
          spots.push(new THREE.Vector3(x, 0, z));
        }
      }
    }
    for (let i = 0; i < 45; i++) {
      const px = 75 + ((i * 53) % 240);
      const pz = -230 + ((i * 71) % 340);
      if (ROAD_X.every((rx) => Math.abs(px - rx) > 14) && ROAD_Z.every((rz) => Math.abs(pz - rz) > 14)) {
        spots.push(new THREE.Vector3(px, 0, pz));
      }
    }
    // Secret island palms
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      spots.push(new THREE.Vector3(-520 + Math.cos(a) * 26, 0, 120 + Math.sin(a) * 26));
    }

    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 8.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5b41, roughness: 0.9 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
    trunks.castShadow = true;

    const frondGeo = new THREE.ConeGeometry(3.2, 2.2, 6);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x3b8c3e, roughness: 0.75 });
    this.palmFrondsInstanced = new THREE.InstancedMesh(frondGeo, frondMat, spots.length);
    this.palmFrondsInstanced.castShadow = true;

    spots.forEach((p, idx) => {
      const y = this.getGroundHeight(p.x, p.z);
      const scale = 0.85 + ((idx * 17) % 10) * 0.04;
      this.dummy.position.set(p.x, y + 4.1 * scale, p.z);
      this.dummy.rotation.set(0.05, idx * 1.1, 0.04);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      trunks.setMatrixAt(idx, this.dummy.matrix);

      this.dummy.position.set(p.x + 0.3, y + 8.3 * scale, p.z);
      this.dummy.rotation.set(Math.PI, idx * 0.9, 0);
      this.dummy.scale.set(scale * 1.15, scale * 0.85, scale * 1.15);
      this.dummy.updateMatrix();
      this.palmFrondsInstanced.setMatrixAt(idx, this.dummy.matrix);
      this.palmBaseMatrices.push(this.dummy.matrix.clone());
      this.palmPositions.push(new THREE.Vector3(p.x, y + 8.3 * scale, p.z));
    });
    this.group.add(trunks);
    this.group.add(this.palmFrondsInstanced);

    // Instanced Streetlamps
    const lampSpots: [number, number][] = [];
    for (const rx of [-180, -60, 60, 180]) {
      for (let z = -220; z <= 220; z += 48) {
        lampSpots.push([rx + 9.5, z]);
      }
    }
    const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, 6.4, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c3642, metalness: 0.6, roughness: 0.4 });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);

    const bulbGeo = new THREE.SphereGeometry(0.32, 8, 6);
    this.streetLampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xffdf9e,
      emissive: 0xffb347,
      emissiveIntensity: 0.0,
    });
    const bulbs = new THREE.InstancedMesh(bulbGeo, this.streetLampBulbMat, lampSpots.length);

    lampSpots.forEach(([lx, lz], i) => {
      const ly = this.getGroundHeight(lx, lz);
      this.dummy.position.set(lx, ly + 3.2, lz);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      poles.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set(lx, ly + 6.5, lz);
      this.dummy.updateMatrix();
      bulbs.setMatrixAt(i, this.dummy.matrix);
    });
    this.group.add(poles);
    this.group.add(bulbs);
  }

  private buildSkyDetails(): void {
    // Stylized moving clouds
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      transparent: true,
      opacity: 0.86,
    });
    for (let i = 0; i < 18; i++) {
      const cg = new THREE.Group();
      for (let b = 0; b < 3; b++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(16 + b * 4, 10, 8), cloudMat);
        puff.position.set((b - 1) * 18, (b % 2) * 4, (b % 2) * 6);
        puff.scale.set(1.6, 0.55, 1.1);
        cg.add(puff);
      }
      cg.position.set((Math.random() - 0.5) * 1400, 175 + Math.random() * 55, (Math.random() - 0.5) * 1400);
      this.clouds.push(cg);
      this.group.add(cg);
    }

    // Coastal seagulls circling beach & marina
    const birdMat = new THREE.MeshBasicMaterial({ color: 0xf7f9fb });
    for (let i = 0; i < 16; i++) {
      const bird = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 3), birdMat);
      bird.rotation.x = Math.PI * 0.5;
      bird.position.set(-280 + Math.random() * 140, 28 + Math.random() * 24, -150 + Math.random() * 480);
      this.oceanBirds.push(bird);
      this.group.add(bird);
    }
  }

  applyQuality(quality: QualityPreset, renderer: THREE.WebGLRenderer, sun: THREE.DirectionalLight): void {
    if (quality === 'low') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      sun.castShadow = false;
    } else if (quality === 'medium') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
    } else if (quality === 'high') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
    }
  }

  update(dt: number, elapsed: number, nightFactor: number, windStrength: number): void {
    // Animate ocean water waves & UV scroll
    this.waterNormalTex.offset.x = (elapsed * 0.025) % 1;
    this.waterNormalTex.offset.y = (elapsed * 0.018) % 1;
    this.waterMesh.position.y = -0.35 + Math.sin(elapsed * 1.15) * 0.14;

    // Night illumination on skyscrapers, streetlights, runway & neon
    const glow = THREE.MathUtils.clamp((nightFactor - 0.35) / 0.45, 0, 1);
    for (const mat of this.palette.glassTowerDay) {
      mat.emissiveIntensity = glow * 1.15;
    }
    this.streetLampBulbMat.emissiveIntensity = glow * 2.2;
    this.runwayLightMat.emissiveIntensity = 0.4 + glow * 2.0;
    for (const n of this.neonSignMats) {
      n.emissiveIntensity = 0.7 + glow * 1.6;
    }

    // Wind sway on palm fronds
    const sway = Math.sin(elapsed * (1.8 + windStrength)) * 0.08 * windStrength;
    for (let i = 0; i < this.palmBaseMatrices.length; i++) {
      const m = this.palmBaseMatrices[i];
      this.dummy.matrix.copy(m);
      this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);
      this.dummy.rotation.z = sway * ((i % 3) + 0.5);
      this.dummy.updateMatrix();
      this.palmFrondsInstanced.setMatrixAt(i, this.dummy.matrix);
    }
    this.palmFrondsInstanced.instanceMatrix.needsUpdate = true;

    // Drifting clouds
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.position.x += dt * (2.5 + (i % 4) * 0.6) * windStrength;
      if (c.position.x > 760) c.position.x = -760;
    }

    // Circling coastal birds
    for (let i = 0; i < this.oceanBirds.length; i++) {
      const b = this.oceanBirds[i];
      const a = elapsed * (0.35 + (i % 3) * 0.1) + i;
      b.position.x += Math.cos(a) * dt * 7;
      b.position.z += Math.sin(a) * dt * 7;
      b.rotation.y = -a;
    }

    // Cycle traffic lights every 10s
    this.signalTimer += dt;
    if (this.signalTimer > 10) {
      this.signalTimer = 0;
      this.nsPhase = !this.nsPhase;
      for (const sig of this.trafficSignals) {
        sig.nsGreen = this.nsPhase;
        sig.matNS.color.setHex(this.nsPhase ? 0x2ecc71 : 0xe74c3c);
        sig.matEW.color.setHex(this.nsPhase ? 0xe74c3c : 0x2ecc71);
      }
    }
  }
}
