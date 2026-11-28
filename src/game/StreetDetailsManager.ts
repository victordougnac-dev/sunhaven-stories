import * as THREE from 'three';
import { ROAD_X, ROAD_Z } from './WorldManager';
import type { QualityPreset } from './types';
import { createSculptedCarMesh, type CarBodyStyle } from './CarGeometry';

export class StreetDetailsManager {
  public group = new THREE.Group();
  private farDetailGroup = new THREE.Group();

  constructor(scene: THREE.Scene, getGroundHeight: (x: number, z: number) => number) {
    scene.add(this.group);
    this.group.add(this.farDetailGroup);
    this.buildCrosswalks();
    this.buildGroundMicroDetails(getGroundHeight);
    this.buildStreetFurniture(getGroundHeight);
    this.buildRestaurantTerraces(getGroundHeight);
    this.buildBusStopsAndConstruction(getGroundHeight);
    this.buildCoastalLandmarks(getGroundHeight);
    this.buildParkedAmbientCars(getGroundHeight);
    this.buildShadeTreesAndPlanters(getGroundHeight);
  }

  private buildCoastalLandmarks(getGroundHeight: (x: number, z: number) => number): void {
    // 1. Sunhaven Coastal Gas Station near Harbor/Suburbs corner (76, 136)
    const gy = getGroundHeight(76, 136);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.45 });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xff6b4a,
      emissive: 0xff6b4a,
      emissiveIntensity: 0.35,
    });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2c3642, metalness: 0.65, roughness: 0.35 });
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x1fd1c5, roughness: 0.35, metalness: 0.4 });

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(16, 0.9, 10), canopyMat);
    canopy.position.set(86, gy + 5.2, 146);
    canopy.castShadow = true;
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.32, 10.2), stripeMat);
    fascia.position.set(86, gy + 5.2, 146);
    this.farDetailGroup.add(canopy, fascia);

    for (const px of [81, 91]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 5.0, 10), metalMat);
      col.position.set(px, gy + 2.5, 146);
      const pump = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.7), pumpMat);
      pump.position.set(px + 2.2, gy + 0.9, 146);
      this.farDetailGroup.add(col, pump);
    }

    // 2. Palm Beach Volleyball Court (-228, 30)
    const vy = getGroundHeight(-228, 30);
    const netMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, wireframe: true });
    for (const nz of [24, 36]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6), metalMat);
      post.position.set(-228, vy + 1.25, nz);
      this.farDetailGroup.add(post);
    }
    const net = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 12), netMat);
    net.position.set(-228, vy + 1.9, 30);
    this.farDetailGroup.add(net);

    // 3. Overhead Highway Directional Sign Gantries along Causeway & Downtown
    for (const [gx, gz, ry] of [
      [355, -120, Math.PI * 0.5],
      [690, -120, Math.PI * 0.5],
      [-60, -205, 0],
    ] as [number, number, number][]) {
      const ggy = getGroundHeight(gx, gz);
      const gg = new THREE.Group();
      for (const sx of [-9.5, 9.5]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.8, 8), metalMat);
        leg.position.set(sx, 3.4, 0);
        gg.add(leg);
      }
      const truss = new THREE.Mesh(new THREE.BoxGeometry(19.5, 0.45, 0.45), metalMat);
      truss.position.y = 6.6;
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 2.1, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x1b6e49, roughness: 0.4 })
      );
      sign.position.y = 6.6;
      gg.add(truss, sign);
      gg.position.set(gx, ggy, gz);
      gg.rotation.y = ry;
      this.farDetailGroup.add(gg);
    }
  }

  private buildCrosswalks(): void {
    const stripeGeo = new THREE.PlaneGeometry(3.2, 0.72);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xe6e4dc,
      roughness: 0.78,
    });

    const positions: { x: number; z: number; rotY: number }[] = [];
    for (const rx of ROAD_X) {
      for (const rz of ROAD_Z) {
        if (rx > 200 && rz < -150) continue;
        // North & South crosswalks across N-S avenue
        for (const dz of [-9.5, 9.5]) {
          for (let ox = -5.2; ox <= 5.2; ox += 1.7) {
            positions.push({ x: rx + ox, z: rz + dz, rotY: Math.PI * 0.5 });
          }
        }
        // East & West crosswalks across E-W street
        for (const dx of [-9.5, 9.5]) {
          for (let oz = -5.2; oz <= 5.2; oz += 1.7) {
            positions.push({ x: rx + dx, z: rz + oz, rotY: 0 });
          }
        }
      }
    }

    const inst = new THREE.InstancedMesh(stripeGeo, stripeMat, positions.length);
    const dummy = new THREE.Object3D();
    positions.forEach((p, i) => {
      dummy.position.set(p.x, 0.252, p.z);
      dummy.rotation.set(-Math.PI / 2, 0, p.rotY);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    this.group.add(inst);
  }

  private buildGroundMicroDetails(getGroundHeight: (x: number, z: number) => number): void {
    const dummy = new THREE.Object3D();

    // 1. Cast-iron Manhole Covers along roadways
    const manholePositions: [number, number][] = [];
    for (const rx of ROAD_X) {
      for (let z = -220; z <= 220; z += 36) {
        manholePositions.push([rx + (z % 72 === 0 ? 2.2 : -2.2), z]);
      }
    }
    const manholeInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.04, 14),
      new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.65, metalness: 0.7 }),
      manholePositions.length
    );
    manholePositions.forEach(([x, z], i) => {
      dummy.position.set(x, 0.24, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      manholeInst.setMatrixAt(i, dummy.matrix);
    });
    this.group.add(manholeInst);

    // 2. Curb Storm Drainage Grates
    const drainPositions: [number, number, number][] = [];
    for (const rx of [-180, -60, 60, 180]) {
      for (let z = -210; z <= 210; z += 44) {
        drainPositions.push([rx - 6.7, z, 0]);
        drainPositions.push([rx + 6.7, z + 20, 0]);
      }
    }
    const drainInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.55, 0.04, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.7, metalness: 0.65 }),
      drainPositions.length
    );
    drainPositions.forEach(([x, z, r], i) => {
      dummy.position.set(x, 0.24, z);
      dummy.rotation.set(0, r, 0);
      dummy.updateMatrix();
      drainInst.setMatrixAt(i, dummy.matrix);
    });
    this.group.add(drainInst);

    // 3. Natural grass/weed tufts & pebbles near curbs, park edges, and beach transitions
    const tuftSpots: [number, number][] = [];
    for (let i = 0; i < 160; i++) {
      const rx = ROAD_X[i % ROAD_X.length];
      const side = i % 2 === 0 ? 10.2 : -10.2;
      const z = -230 + ((i * 37) % 450);
      tuftSpots.push([rx + side, z]);
    }
    const tuftInst = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.18, 0.28, 5),
      new THREE.MeshStandardMaterial({ color: 0x4b7c3b, roughness: 0.9 }),
      tuftSpots.length
    );
    tuftSpots.forEach(([x, z], i) => {
      const y = getGroundHeight(x, z);
      dummy.position.set(x, y + 0.14, z);
      dummy.rotation.set(0, i * 0.8, 0);
      dummy.scale.setScalar(0.7 + (i % 4) * 0.25);
      dummy.updateMatrix();
      tuftInst.setMatrixAt(i, dummy.matrix);
    });
    this.farDetailGroup.add(tuftInst);
  }

  private buildStreetFurniture(getGroundHeight: (x: number, z: number) => number): void {
    const dummy = new THREE.Object3D();

    // Corner Hydrants, Trash Bins, Bollards, Utility Boxes, Sign Posts
    const hydrants: [number, number][] = [];
    const bins: [number, number][] = [];
    const bollards: [number, number][] = [];
    const utilityBoxes: [number, number][] = [];
    const signPosts: [number, number][] = [];

    for (const rx of [-180, -60, 60, 180]) {
      for (const rz of [-240, -120, 0, 120, 240]) {
        hydrants.push([rx - 9.4, rz - 11.5]);
        utilityBoxes.push([rx + 9.6, rz - 12.2]);
        signPosts.push([rx - 8.2, rz + 10.5]);
        for (let b = -2; b <= 2; b++) {
          bollards.push([rx + b * 2.1, rz - 9.6]);
        }
      }
      for (let z = -205; z <= 205; z += 40) {
        if (ROAD_Z.some((rz) => Math.abs(z - rz) < 14)) continue;
        bins.push([rx - 7.8, z]);
        bins.push([rx + 7.8, z + 14]);
      }
    }

    // Fire Hydrants
    const hydMat = new THREE.MeshStandardMaterial({ color: 0xd63c2f, roughness: 0.45, metalness: 0.35 });
    const hydInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.78, 10), hydMat, hydrants.length);
    hydInst.castShadow = true;
    hydrants.forEach(([x, z], i) => {
      dummy.position.set(x, getGroundHeight(x, z) + 0.45, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      hydInst.setMatrixAt(i, dummy.matrix);
    });
    this.farDetailGroup.add(hydInst);

    // Trash / Recycling Bins
    const binMat = new THREE.MeshStandardMaterial({ color: 0x26353d, roughness: 0.55, metalness: 0.45 });
    const binInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.25, 0.92, 10), binMat, bins.length);
    binInst.castShadow = true;
    bins.forEach(([x, z], i) => {
      dummy.position.set(x, getGroundHeight(x, z) + 0.52, z);
      dummy.updateMatrix();
      binInst.setMatrixAt(i, dummy.matrix);
    });
    this.farDetailGroup.add(binInst);

    // Steel Bollards
    const bolMat = new THREE.MeshStandardMaterial({ color: 0x45505c, roughness: 0.35, metalness: 0.75 });
    const bolInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.1, 0.85, 8), bolMat, bollards.length);
    bollards.forEach(([x, z], i) => {
      dummy.position.set(x, getGroundHeight(x, z) + 0.48, z);
      dummy.updateMatrix();
      bolInst.setMatrixAt(i, dummy.matrix);
    });
    this.farDetailGroup.add(bolInst);

    // Utility Cabinets
    const utilMat = new THREE.MeshStandardMaterial({ color: 0x6c7a72, roughness: 0.65, metalness: 0.35 });
    const utilInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 1.35, 0.55), utilMat, utilityBoxes.length);
    utilInst.castShadow = true;
    utilityBoxes.forEach(([x, z], i) => {
      dummy.position.set(x, getGroundHeight(x, z) + 0.72, z);
      dummy.updateMatrix();
      utilInst.setMatrixAt(i, dummy.matrix);
    });
    this.farDetailGroup.add(utilInst);

    // Street Signs (Post + Signboard)
    const postInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.045, 0.05, 2.7, 6),
      bolMat,
      signPosts.length
    );
    const boardInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.62, 0.62, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xe84a3c, roughness: 0.4 }),
      signPosts.length
    );
    signPosts.forEach(([x, z], i) => {
      const y = getGroundHeight(x, z);
      dummy.position.set(x, y + 1.4, z);
      dummy.updateMatrix();
      postInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 2.55, z);
      dummy.rotation.set(0, (i % 2) * Math.PI * 0.5, 0);
      dummy.updateMatrix();
      boardInst.setMatrixAt(i, dummy.matrix);
      dummy.rotation.set(0, 0, 0);
    });
    this.farDetailGroup.add(postInst);
    this.farDetailGroup.add(boardInst);

    // Glowing Vending Machines & Newspaper Stands along Bayside & Neon Mile
    const vendSpots: [number, number, number][] = [
      [-136.5, -14, 0x1fd1c5],
      [-136.5, -34, 0xff6b4a],
      [-136, 149, 0xff477e],
      [-92, 155, 0x45b7d1],
    ];
    for (const [vx, vz, col] of vendSpots) {
      const vy = getGroundHeight(vx, vz);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.9, 0.75),
        new THREE.MeshStandardMaterial({ color: 0x222a33, roughness: 0.4, metalness: 0.5 })
      );
      body.position.set(vx, vy + 0.95, vz);
      body.castShadow = true;
      const front = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 1.35, 0.06),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.45 })
      );
      front.position.set(vx, vy + 1.05, vz + 0.39);
      this.farDetailGroup.add(body, front);
    }

    // Parked Bicycles chained to railings along Bayside & Park
    const bikeMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.4, metalness: 0.6 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.9 });
    for (const [bx, bz, ry] of [
      [-133, -46, 0.3],
      [-133, -44.8, 0.2],
      [-193, -8, 1.4],
      [-10, -50, 0.8],
    ] as [number, number, number][]) {
      const by = getGroundHeight(bx, bz);
      const bg = new THREE.Group();
      for (const wz of [-0.45, 0.45]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 16), tireMat);
        wheel.rotation.y = Math.PI * 0.5;
        wheel.position.set(0, 0.32, wz);
        bg.add(wheel);
      }
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.85), bikeMat);
      frame.position.set(0, 0.55, 0);
      bg.add(frame);
      bg.position.set(bx, by, bz);
      bg.rotation.y = ry;
      this.farDetailGroup.add(bg);
    }
  }

  private buildRestaurantTerraces(getGroundHeight: (x: number, z: number) => number): void {
    // Outdoor cafe patios beside Sunset Cafe (-135, -54) & Bayside boutiques (-136, 24)
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x8f623d, roughness: 0.6 });
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6 });
    const umbColors = [0xff6b4a, 0x1fd1c5, 0xffb84d];

    const patioSpots: [number, number][] = [
      [-132, -59], [-132, -50], [-128, -59], [-128, -50],
      [-132, 18], [-132, 27], [-128, 18],
      [-193, 18], [-193, 24],
    ];
    patioSpots.forEach(([tx, tz], i) => {
      const ty = getGroundHeight(tx, tz);
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 12), tableMat);
      top.position.y = 0.75;
      top.castShadow = true;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, 0.75, 8), chairMat);
      leg.position.y = 0.375;
      g.add(top, leg);

      for (const side of [-0.95, 0.95]) {
        const ch = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.42), chairMat);
        ch.position.set(side, 0.24, 0);
        g.add(ch);
      }

      if (i % 2 === 0) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6), chairMat);
        pole.position.y = 1.15;
        const shade = new THREE.Mesh(
          new THREE.ConeGeometry(1.45, 0.55, 8),
          new THREE.MeshStandardMaterial({ color: umbColors[i % umbColors.length], roughness: 0.7 })
        );
        shade.position.y = 2.3;
        shade.castShadow = true;
        g.add(pole, shade);
      }
      g.position.set(tx, ty, tz);
      this.farDetailGroup.add(g);
    });
  }

  private buildBusStopsAndConstruction(getGroundHeight: (x: number, z: number) => number): void {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.65, roughness: 0.35 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xaad8e6,
      transparent: true,
      opacity: 0.42,
      roughness: 0.1,
      metalness: 0.7,
    });

    const stops: [number, number, number][] = [
      [-170.5, -75, -Math.PI * 0.5],
      [-50.5, -165, -Math.PI * 0.5],
      [69.5, -55, -Math.PI * 0.5],
      [-115, 110.5, Math.PI],
    ];
    for (const [bx, bz, rotY] of stops) {
      const by = getGroundHeight(bx, bz);
      const sg = new THREE.Group();
      const roof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 1.8), steelMat);
      roof.position.y = 2.55;
      roof.castShadow = true;
      const backGlass = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.2, 0.08), glassMat);
      backGlass.position.set(0, 1.3, -0.78);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 0.55), steelMat);
      bench.position.set(0, 0.48, -0.35);
      for (const px of [-1.95, 1.95]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.55, 8), steelMat);
        post.position.set(px, 1.28, -0.78);
        sg.add(post);
      }
      sg.add(roof, backGlass, bench);
      sg.position.set(bx, by, bz);
      sg.rotation.y = rotY;
      this.farDetailGroup.add(sg);
    }

    // Small street maintenance / construction zone near Harbor (168, 160)
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6b2b, roughness: 0.5 });
    const barMat = new THREE.MeshStandardMaterial({ color: 0xf4b41a, roughness: 0.6 });
    for (let c = 0; c < 6; c++) {
      const cx = 169 + (c % 2) * 3.5;
      const cz = 152 + Math.floor(c / 2) * 5;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.68, 8), coneMat);
      cone.position.set(cx, 0.54, cz);
      cone.castShadow = true;
      this.farDetailGroup.add(cone);
    }
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.22), barMat);
    barrier.position.set(170.8, 0.65, 150);
    this.farDetailGroup.add(barrier);
  }

  private buildParkedAmbientCars(getGroundHeight: (x: number, z: number) => number): void {
    const colors = [0x2a4b72, 0xc43636, 0xdfe3dc, 0x202331, 0xe88b2e, 0x3b6e4c, 0x5c6670, 0x168d9e];
    const styles: CarBodyStyle[] = ['sports', 'sedan', 'suv', 'sedan', 'pickup'];

    const parkingSpots: [number, number, number][] = [
      // Bayside & Downtown curb parking
      [-174.5, -80, 0], [-174.5, -62, 0], [-174.5, 42, 0],
      [-65.5, -195, Math.PI], [-65.5, -160, Math.PI],
      [54.5, -170, 0], [54.5, 35, 0],
      // Neon Mile curb
      [-115, 125.5, Math.PI * 0.5], [-92, 125.5, Math.PI * 0.5], [-42, 125.5, Math.PI * 0.5],
      // Suburbs driveways
      [82, -195, Math.PI * 0.5], [126, -155, Math.PI * 0.5], [82, -75, Math.PI * 0.5], [202, -75, Math.PI * 0.5],
      // Airport & Harbor parking
      [338, 108, 0], [338, 120, 0], [338, 132, 0], [108, 250, Math.PI * 0.5],
    ];

    parkingSpots.forEach(([px, pz, yaw], idx) => {
      const py = getGroundHeight(px, pz);
      const style = styles[idx % styles.length];
      const parts = createSculptedCarMesh(
        style,
        colors[idx % colors.length],
        style === 'pickup' ? 4.8 : 4.4,
        style === 'suv' || style === 'pickup' ? 2.04 : 1.92,
        { lightweight: true }
      );
      parts.group.position.set(px, py, pz);
      parts.group.rotation.y = yaw;
      this.farDetailGroup.add(parts.group);
    });
  }

  private buildShadeTreesAndPlanters(getGroundHeight: (x: number, z: number) => number): void {
    const dummy = new THREE.Object3D();

    // 1. Lush Tropical Shade Trees along Parks, Suburbs, Coral Heights & Avenues
    const treeSpots: [number, number][] = [];
    for (let x = -45; x <= 45; x += 18) {
      for (let z = -105; z <= -15; z += 18) {
        if (Math.hypot(x, z + 60) > 13 && Math.abs(x) > 4 && Math.abs(z + 60) > 4) {
          treeSpots.push([x, z]);
        }
      }
    }
    for (let i = 0; i < 42; i++) {
      const tx = 75 + ((i * 47) % 235);
      const tz = -225 + ((i * 63) % 330);
      if (ROAD_X.every((rx) => Math.abs(tx - rx) > 15) && ROAD_Z.every((rz) => Math.abs(tz - rz) > 15)) {
        treeSpots.push([tx, tz]);
      }
    }

    const trunkInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.22, 0.36, 4.2, 7),
      new THREE.MeshStandardMaterial({ color: 0x6b4c35, roughness: 0.92 }),
      treeSpots.length
    );
    trunkInst.castShadow = true;

    const canopyInst = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(2.3, 1),
      new THREE.MeshStandardMaterial({ color: 0x3b7a38, roughness: 0.82 }),
      treeSpots.length * 2
    );
    canopyInst.castShadow = true;

    treeSpots.forEach(([x, z], i) => {
      const y = getGroundHeight(x, z);
      const s = 0.8 + (i % 5) * 0.14;
      dummy.position.set(x, y + 2.0 * s, z);
      dummy.rotation.set(0, i * 0.9, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 4.4 * s, z);
      dummy.scale.set(s * 1.1, s * 0.85, s * 1.1);
      dummy.updateMatrix();
      canopyInst.setMatrixAt(i * 2, dummy.matrix);

      dummy.position.set(x + 0.7 * s, y + 3.8 * s, z - 0.5 * s);
      dummy.scale.set(s * 0.75, s * 0.7, s * 0.75);
      dummy.updateMatrix();
      canopyInst.setMatrixAt(i * 2 + 1, dummy.matrix);
    });
    this.group.add(trunkInst);
    this.group.add(canopyInst);

    // 2. Sidewalk Stone Planters with Flowering Shrubs along Bayside & Downtown
    const planterSpots: [number, number][] = [];
    for (const rx of [-180, -60, 60]) {
      for (let z = -200; z <= 190; z += 32) {
        if (ROAD_Z.some((rz) => Math.abs(z - rz) < 15)) continue;
        planterSpots.push([rx - 7.6, z + 6]);
        planterSpots.push([rx + 7.6, z - 6]);
      }
    }

    const boxInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.15, 0.55, 1.15),
      new THREE.MeshStandardMaterial({ color: 0xbcb5a8, roughness: 0.85 }),
      planterSpots.length
    );
    const bushInst = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.58, 1),
      new THREE.MeshStandardMaterial({ color: 0x458b42, roughness: 0.8 }),
      planterSpots.length
    );
    const flowerInst = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.18, 0),
      new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.6 }),
      planterSpots.length
    );

    planterSpots.forEach(([x, z], i) => {
      const y = getGroundHeight(x, z);
      dummy.position.set(x, y + 0.34, z);
      dummy.rotation.set(0, i * 0.4, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      boxInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 0.82, z);
      dummy.scale.set(1.1, 0.85, 1.1);
      dummy.updateMatrix();
      bushInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x + 0.18, y + 1.08, z - 0.12);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      flowerInst.setMatrixAt(i, dummy.matrix);
    });

    this.farDetailGroup.add(boxInst, bushInst, flowerInst);
  }

  applyQuality(quality: QualityPreset): void {
    this.farDetailGroup.visible = quality !== 'low';
  }
}
