import * as THREE from 'three';
import type { MaterialPalette } from './TextureFactory';

export type BuildingArchetype =
  | 'art_deco'
  | 'l_apartment'
  | 'mural_loft'
  | 'mediterranean'
  | 'craftsman'
  | 'tower_octagonal'
  | 'tower_stepped'
  | 'tower_twin';

export interface BuiltStructure {
  group: THREE.Group;
  colliderBoxes: { cx: number; cy: number; cz: number; w: number; h: number; d: number }[];
}

export class BuildingArchitect {
  private palette: MaterialPalette;
  private neonSignMats: THREE.MeshStandardMaterial[];

  constructor(palette: MaterialPalette, neonSignMats: THREE.MeshStandardMaterial[]) {
    this.palette = palette;
    this.neonSignMats = neonSignMats;
  }

  buildTower(
    variant: 'octagonal' | 'stepped' | 'twin',
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    styleIdx: number
  ): BuiltStructure {
    const g = new THREE.Group();
    const mat = this.palette.glassTowerDay[styleIdx % this.palette.glassTowerDay.length];
    const trimMat = this.palette.concreteTrim;
    const lobbyGlassMat = new THREE.MeshStandardMaterial({
      color: 0x1b3344,
      roughness: 0.12,
      metalness: 0.85,
      envMapIntensity: 1.5,
    });
    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x6c7782, roughness: 0.5, metalness: 0.55 });
    const colliders: BuiltStructure['colliderBoxes'] = [];

    const podiumH = Math.min(9.5, h * 0.18);
    const podium = new THREE.Mesh(new THREE.BoxGeometry(w + 2.4, podiumH, d + 2.4), trimMat);
    podium.position.set(x, podiumH * 0.5 + 0.15, z);
    podium.castShadow = true;
    podium.receiveShadow = true;
    g.add(podium);

    const lobbyGlass = new THREE.Mesh(new THREE.BoxGeometry(w + 2.5, podiumH * 0.62, d + 2.5), lobbyGlassMat);
    lobbyGlass.position.set(x, podiumH * 0.42 + 0.15, z);
    g.add(lobbyGlass);

    if (variant === 'octagonal') {
      const rad = Math.min(w, d) * 0.56;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.92, rad, h, 8), mat);
      shaft.position.set(x, h * 0.5 + 0.15, z);
      shaft.rotation.y = Math.PI / 8;
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      g.add(shaft);

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.62, rad * 0.88, h * 0.2, 8), mat);
      crown.position.set(x, h + h * 0.1 + 0.15, z);
      crown.rotation.y = Math.PI / 8;
      g.add(crown);

      // Helipad ring on roof
      const topY = h + h * 0.2 + 0.2;
      const pad = new THREE.Mesh(
        new THREE.RingGeometry(rad * 0.28, rad * 0.38, 18),
        new THREE.MeshBasicMaterial({ color: 0xffb84d, side: THREE.DoubleSide })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, topY, z);
      g.add(pad);
    } else if (variant === 'twin') {
      // Twin-offset cantilevered tower volumes
      const wingW = w * 0.52;
      const wing1 = new THREE.Mesh(new THREE.BoxGeometry(wingW, h, d * 0.92), mat);
      wing1.position.set(x - w * 0.24, h * 0.5 + 0.15, z);
      wing1.castShadow = true;
      g.add(wing1);

      const wing2 = new THREE.Mesh(new THREE.BoxGeometry(wingW, h * 0.78, d * 0.92), mat);
      wing2.position.set(x + w * 0.24, h * 0.39 + 0.15, z);
      wing2.castShadow = true;
      g.add(wing2);

      // Skybridge connecting the two wings
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 4.2, d * 0.45), lobbyGlassMat);
      bridge.position.set(x, h * 0.56, z);
      g.add(bridge);

      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.38, 14, 6),
        new THREE.MeshStandardMaterial({ color: 0xd0d8e0, metalness: 0.75, roughness: 0.25 })
      );
      spire.position.set(x - w * 0.24, h + 7, z);
      g.add(spire);
    } else {
      // Stepped Art-Modern / Brickell Tower
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.75, d), mat);
      shaft.position.set(x, h * 0.375 + 0.15, z);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      g.add(shaft);

      const tier2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, h * 0.28, d * 0.78), mat);
      tier2.position.set(x, h * 0.89 + 0.15, z);
      tier2.castShadow = true;
      g.add(tier2);

      const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.52, h * 0.16, d * 0.52), mat);
      crown.position.set(x, h * 1.11 + 0.15, z);
      crown.castShadow = true;
      g.add(crown);

      for (let ly = 14; ly < h * 0.75; ly += 16) {
        const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.5, d + 0.7), trimMat);
        ledge.position.set(x, ly, z);
        g.add(ledge);
      }

      const hvac = new THREE.Mesh(new THREE.BoxGeometry(w * 0.25, 1.8, d * 0.2), hvacMat);
      hvac.position.set(x + w * 0.1, h * 1.19 + 1.0, z);
      g.add(hvac);
    }

    colliders.push({ cx: x, cy: h * 0.5, cz: z, w: w + 2.2, h: h + 14, d: d + 2.2 });
    return { group: g, colliderBoxes: colliders };
  }

  buildUniqueBuilding(
    archetype: Exclude<BuildingArchetype, 'tower_octagonal' | 'tower_stepped' | 'tower_twin'>,
    x: number,
    baseY: number,
    z: number,
    w: number,
    d: number,
    h: number,
    variantIdx: number,
    neonColor?: number
  ): BuiltStructure {
    const g = new THREE.Group();
    const colliders: BuiltStructure['colliderBoxes'] = [];
    const trimMat = this.palette.concreteTrim;
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x353c44, metalness: 0.65, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x224157,
      roughness: 0.12,
      metalness: 0.78,
      envMapIntensity: 1.45,
    });

    if (archetype === 'art_deco') {
      const mat = this.palette.artDecoMaterials[variantIdx % this.palette.artDecoMaterials.length];
      // Main stepped Art Deco body
      const main = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      main.position.set(x, baseY + h * 0.5, z);
      main.castShadow = true;
      main.receiveShadow = true;
      g.add(main);

      // Stepped ziggurat central tower crown
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w * 0.44, h * 0.34, d * 0.72), mat);
      tower.position.set(x, baseY + h + h * 0.17, z);
      tower.castShadow = true;
      g.add(tower);

      // Vertical fluted center fin & eyebrow marquee
      const fin = new THREE.Mesh(new THREE.BoxGeometry(1.4, h * 1.38, d * 0.85), trimMat);
      fin.position.set(x, baseY + h * 0.69, z);
      g.add(fin);

      const eyebrow = new THREE.Mesh(
        new THREE.BoxGeometry(w + 1.4, 0.32, d + 1.4),
        new THREE.MeshStandardMaterial({ color: 0xff7b6b, roughness: 0.5 })
      );
      eyebrow.position.set(x, baseY + 3.4, z);
      eyebrow.castShadow = true;
      g.add(eyebrow);

      // Neon Ocean Drive roofline strip
      const nCol = neonColor ?? (variantIdx % 2 === 0 ? 0x1fd1c5 : 0xff6b4a);
      const neonMat = new THREE.MeshStandardMaterial({
        color: nCol,
        emissive: nCol,
        emissiveIntensity: 1.4,
      });
      this.neonSignMats.push(neonMat);
      const neonTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.28, d + 0.3), neonMat);
      neonTrim.position.set(x, baseY + h + 0.15, z);
      g.add(neonTrim);

      colliders.push({ cx: x, cy: baseY + h * 0.5, cz: z, w, h: h + 5, d });
    } else if (archetype === 'l_apartment') {
      const mat =
        variantIdx % 3 === 0
          ? this.palette.loftBrickMaterials[0]
          : this.palette.stuccoMaterials[variantIdx % this.palette.stuccoMaterials.length];
      // L-shaped building (main wing + perpendicular courtyard wing)
      const wingA = new THREE.Mesh(new THREE.BoxGeometry(w, h, d * 0.55), mat);
      wingA.position.set(x, baseY + h * 0.5, z - d * 0.22);
      wingA.castShadow = true;
      wingA.receiveShadow = true;
      g.add(wingA);

      const wingB = new THREE.Mesh(new THREE.BoxGeometry(w * 0.52, h * 0.88, d * 0.5), mat);
      wingB.position.set(x - w * 0.24, baseY + h * 0.44, z + d * 0.25);
      wingB.castShadow = true;
      g.add(wingB);

      // Projecting balconies with railings on upper floors
      for (let fy = 4.2; fy < h - 1.5; fy += 3.4) {
        const balc = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 0.22, 1.3), trimMat);
        balc.position.set(x + w * 0.18, baseY + fy, z + d * 0.08);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 0.75, 0.08), glassMat);
        rail.position.set(x + w * 0.18, baseY + fy + 0.42, z + d * 0.08 + 0.6);
        g.add(balc, rail);
      }

      // Rooftop pergola & parapet
      const pergola = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.25, d * 0.3), metalMat);
      pergola.position.set(x, baseY + h + 2.2, z - d * 0.22);
      g.add(pergola);

      colliders.push({ cx: x, cy: baseY + h * 0.5, cz: z - d * 0.22, w, h: h + 4, d: d * 0.55 });
      colliders.push({
        cx: x - w * 0.24,
        cy: baseY + h * 0.44,
        cz: z + d * 0.25,
        w: w * 0.52,
        h: h + 4,
        d: d * 0.5,
      });
    } else if (archetype === 'mural_loft') {
      const muralMat = this.palette.muralMaterials[variantIdx % this.palette.muralMaterials.length];
      const brickMat = this.palette.loftBrickMaterials[variantIdx % this.palette.loftBrickMaterials.length];

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), brickMat);
      body.position.set(x, baseY + h * 0.5, z);
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      // Vibrant Wynwood mural accent facade panel
      const muralPanel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h * 0.85, d * 0.72), muralMat);
      muralPanel.position.set(x, baseY + h * 0.46, z);
      g.add(muralPanel);

      // Sawtooth industrial roof ridges
      for (let rx = -w * 0.3; rx <= w * 0.32; rx += w * 0.3) {
        const saw = new THREE.Mesh(new THREE.ConeGeometry(d * 0.52, 2.6, 3), this.palette.industrialMetal);
        saw.rotation.y = Math.PI * 0.5;
        saw.position.set(x + rx, baseY + h + 1.2, z);
        g.add(saw);
      }

      // Rooftop wooden water tower on stilts
      const wtLegs = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.2, 6), metalMat);
      wtLegs.position.set(x + w * 0.25, baseY + h + 1.1, z - d * 0.2);
      const wtTank = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.2, 12), this.palette.woodPlank);
      wtTank.position.set(x + w * 0.25, baseY + h + 3.0, z - d * 0.2);
      g.add(wtLegs, wtTank);

      colliders.push({ cx: x, cy: baseY + h * 0.5, cz: z, w, h: h + 4, d });
    } else if (archetype === 'mediterranean') {
      const medMat = this.palette.mediterraneanMaterials[variantIdx % this.palette.mediterraneanMaterials.length];
      const roofTileMat = new THREE.MeshStandardMaterial({ color: 0xb25138, roughness: 0.74 });

      const wingMain = new THREE.Mesh(new THREE.BoxGeometry(w, h, d * 0.65), medMat);
      wingMain.position.set(x, baseY + h * 0.5, z - d * 0.15);
      wingMain.castShadow = true;
      g.add(wingMain);

      const roof1 = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.66, h * 0.46, 4), roofTileMat);
      roof1.position.set(x, baseY + h + h * 0.22, z - d * 0.15);
      roof1.rotation.y = Math.PI * 0.25;
      roof1.castShadow = true;
      g.add(roof1);

      // Side guest wing + terracotta chimney
      const wingSide = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, h * 0.78, d * 0.42), medMat);
      wingSide.position.set(x + w * 0.28, baseY + h * 0.39, z + d * 0.3);
      wingSide.castShadow = true;
      g.add(wingSide);

      const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), trimMat);
      chimney.position.set(x - w * 0.32, baseY + h + 1.4, z - d * 0.15);
      g.add(chimney);

      colliders.push({ cx: x, cy: baseY + h * 0.5, cz: z, w, h: h + 4, d });
    } else {
      // Suburban Craftsman Porch Home
      const sidMat = this.palette.sidingMaterials[variantIdx % this.palette.sidingMaterials.length];
      const roofMat = new THREE.MeshStandardMaterial({
        color: variantIdx % 2 === 0 ? 0x455661 : 0x734b3c,
        roughness: 0.8,
      });

      const house = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, h, d * 0.82), sidMat);
      house.position.set(x - w * 0.12, baseY + h * 0.5, z);
      house.castShadow = true;
      house.receiveShadow = true;
      g.add(house);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.64, h * 0.48, 4), roofMat);
      roof.position.set(x - w * 0.12, baseY + h + h * 0.24, z);
      roof.rotation.y = Math.PI * 0.25;
      roof.castShadow = true;
      g.add(roof);

      // Attached Garage Wing
      const garage = new THREE.Mesh(new THREE.BoxGeometry(w * 0.36, h * 0.7, d * 0.65), sidMat);
      garage.position.set(x + w * 0.34, baseY + h * 0.35, z + 0.5);
      garage.castShadow = true;
      g.add(garage);

      const garageDoor = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.28, h * 0.48, 0.16),
        new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.65 })
      );
      garageDoor.position.set(x + w * 0.34, baseY + h * 0.24, z + 0.5 + d * 0.33);
      g.add(garageDoor);

      // Front Porch Canopy + Columns
      const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.52, 0.24, 2.4), roofMat);
      porchRoof.position.set(x - w * 0.12, baseY + 2.8, z + d * 0.41 + 1.1);
      g.add(porchRoof);
      for (const px of [-w * 0.34, w * 0.1]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.8, 8), trimMat);
        col.position.set(x + px, baseY + 1.4, z + d * 0.41 + 2.0);
        g.add(col);
      }

      colliders.push({ cx: x, cy: baseY + h * 0.5, cz: z, w, h: h + 4, d });
    }

    return { group: g, colliderBoxes: colliders };
  }
}
