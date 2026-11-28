import * as THREE from 'three';

export type CarBodyStyle = 'sports' | 'sedan' | 'suv' | 'pickup' | 'van';

export interface SculptedCarParts {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Mesh[];
  frontSteerPivots: THREE.Group[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
}

function buildBodyProfileShape(style: CarBodyStyle, length: number): THREE.Shape {
  const halfL = length * 0.5;
  const s = new THREE.Shape();

  if (style === 'sports') {
    // Low aggressive supercar silhouette (-x = front, +x = rear before Y-rotation)
    s.moveTo(-halfL, 0.24);
    s.lineTo(-halfL + 0.06, 0.44);
    s.quadraticCurveTo(-halfL + 0.45, 0.56, -halfL * 0.34, 0.62); // low sculpted hood
    s.lineTo(halfL * 0.06, 0.64);
    s.lineTo(halfL * 0.56, 0.68); // rear deck
    s.lineTo(halfL - 0.05, 0.64);
    s.lineTo(halfL, 0.32);
    s.lineTo(halfL - 0.14, 0.22);
    s.lineTo(-halfL + 0.12, 0.22);
    s.closePath();
  } else if (style === 'suv') {
    s.moveTo(-halfL, 0.28);
    s.lineTo(-halfL + 0.08, 0.62);
    s.quadraticCurveTo(-halfL + 0.35, 0.78, -halfL * 0.38, 0.84);
    s.lineTo(halfL - 0.08, 0.84);
    s.lineTo(halfL, 0.64);
    s.lineTo(halfL - 0.08, 0.28);
    s.closePath();
  } else if (style === 'pickup') {
    s.moveTo(-halfL, 0.28);
    s.lineTo(-halfL + 0.08, 0.62);
    s.quadraticCurveTo(-halfL + 0.35, 0.78, -halfL * 0.34, 0.84);
    s.lineTo(halfL - 0.04, 0.82);
    s.lineTo(halfL, 0.34);
    s.lineTo(halfL - 0.1, 0.28);
    s.closePath();
  } else if (style === 'van') {
    s.moveTo(-halfL, 0.26);
    s.lineTo(-halfL + 0.14, 0.72);
    s.lineTo(-halfL * 0.45, 1.38);
    s.lineTo(halfL - 0.12, 1.38);
    s.lineTo(halfL, 0.32);
    s.closePath();
  } else {
    // Sleek modern sports sedan
    s.moveTo(-halfL, 0.25);
    s.lineTo(-halfL + 0.07, 0.52);
    s.quadraticCurveTo(-halfL + 0.42, 0.66, -halfL * 0.36, 0.72);
    s.lineTo(halfL - 0.1, 0.74);
    s.lineTo(halfL, 0.52);
    s.lineTo(halfL - 0.08, 0.25);
    s.closePath();
  }
  return s;
}

function buildCabinProfileShape(style: CarBodyStyle, length: number): THREE.Shape | null {
  if (style === 'van') return null;
  const halfL = length * 0.5;
  const s = new THREE.Shape();

  if (style === 'sports') {
    s.moveTo(-halfL * 0.36, 0.61);
    s.lineTo(-halfL * 0.06, 1.07); // steeply raked windshield
    s.quadraticCurveTo(halfL * 0.18, 1.12, halfL * 0.48, 0.96); // fastback curve
    s.lineTo(halfL * 0.66, 0.65);
    s.closePath();
  } else if (style === 'suv') {
    s.moveTo(-halfL * 0.38, 0.82);
    s.lineTo(-halfL * 0.16, 1.38);
    s.lineTo(halfL * 0.78, 1.38);
    s.lineTo(halfL * 0.92, 0.82);
    s.closePath();
  } else if (style === 'pickup') {
    s.moveTo(-halfL * 0.36, 0.82);
    s.lineTo(-halfL * 0.15, 1.38);
    s.lineTo(halfL * 0.26, 1.38);
    s.lineTo(halfL * 0.32, 0.82);
    s.closePath();
  } else {
    // Sedan
    s.moveTo(-halfL * 0.36, 0.7);
    s.lineTo(-halfL * 0.12, 1.24);
    s.lineTo(halfL * 0.38, 1.24);
    s.lineTo(halfL * 0.68, 0.72);
    s.closePath();
  }
  return s;
}

export function createSculptedCarMesh(
  style: CarBodyStyle,
  color: number,
  length: number,
  width: number,
  options?: {
    isSecret?: boolean;
    lightweight?: boolean;
    headlightMatOff?: THREE.Material;
    taillightMatDim?: THREE.Material;
  }
): SculptedCarParts {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const isSecret = options?.isSecret ?? false;
  const lightweight = options?.lightweight ?? false;

  const paintMat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.14,
    metalness: 0.74,
    clearcoat: 1.0,
    clearcoatRoughness: 0.045,
    envMapIntensity: 1.85,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d1722,
    roughness: 0.04,
    metalness: 0.92,
    clearcoat: 1.0,
    transparent: true,
    opacity: lightweight ? 0.9 : 0.78,
    envMapIntensity: 2.1,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: isSecret ? 0x1fd1c5 : 0x16191f,
    roughness: 0.42,
    metalness: 0.55,
    emissive: isSecret ? 0x1fd1c5 : 0x000000,
    emissiveIntensity: isSecret ? 0.9 : 0,
  });

  const hlMat =
    options?.headlightMatOff ??
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff0c8,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });
  const tlMat =
    options?.taillightMatDim ??
    new THREE.MeshStandardMaterial({
      color: 0xcc1820,
      emissive: 0xff1e27,
      emissiveIntensity: 1.4,
      roughness: 0.15,
    });

  // 1. Extruded contoured lower body along X then rotated so front = -Z
  const bodyW = width - 0.12;
  const bodyShape = buildBodyProfileShape(style, length);
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: bodyW,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.055,
    bevelSegments: lightweight ? 1 : 3,
    curveSegments: lightweight ? 4 : 8,
  });
  bodyGeo.translate(0, 0, -bodyW * 0.5);
  bodyGeo.rotateY(-Math.PI * 0.5); // shape +X -> +Z, -X -> -Z (front!)

  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyGroup.add(bodyMesh);

  // 2. Sculpted tapered upper greenhouse / cabin
  const cabinShape = buildCabinProfileShape(style, length);
  if (cabinShape) {
    const cabinW = width * 0.78;
    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
      depth: cabinW,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.04,
      bevelSegments: lightweight ? 1 : 2,
      curveSegments: 6,
    });
    cabinGeo.translate(0, 0, -cabinW * 0.5);
    cabinGeo.rotateY(-Math.PI * 0.5);

    const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
    cabinMesh.castShadow = true;
    bodyGroup.add(cabinMesh);

    // Painted roof panel crown on top of cabin
    const roofLen = style === 'sports' ? length * 0.34 : style === 'pickup' ? length * 0.22 : length * 0.42;
    const roofY = style === 'sports' ? 1.07 : style === 'pickup' || style === 'suv' ? 1.385 : 1.245;
    const roofZ = style === 'sports' ? length * 0.08 : style === 'pickup' ? 0.05 : length * 0.1;
    const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(cabinW * 0.92, 0.055, roofLen), paintMat);
    roofPanel.position.set(0, roofY, roofZ);
    bodyGroup.add(roofPanel);
  }

  // Lower splitter / side rocker skirts & dark diffuser
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.08, length * 0.98), trimMat);
  splitter.position.set(0, style === 'suv' || style === 'pickup' ? 0.28 : 0.22, 0);
  bodyGroup.add(splitter);

  // Front grille + rear bumper trim
  const grilleY = style === 'suv' || style === 'pickup' ? 0.48 : 0.38;
  const grille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.56, 0.16, 0.08), trimMat);
  grille.position.set(0, grilleY, -length * 0.5 - 0.03);
  bodyGroup.add(grille);

  const headlights: THREE.Mesh[] = [];
  const taillights: THREE.Mesh[] = [];

  // Slim modern LED Headlights & Taillight Light Bars
  const hlY = style === 'suv' || style === 'pickup' ? 0.62 : 0.48;
  for (const sx of [-width * 0.34, width * 0.34]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.09), hlMat);
    hl.position.set(sx, hlY, -length * 0.5 - 0.02);
    bodyGroup.add(hl);
    headlights.push(hl);
  }

  // Full-width or dual LED taillights
  for (const sx of [-width * 0.33, width * 0.33]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.09), tlMat);
    tl.position.set(sx, hlY + 0.06, length * 0.5 + 0.02);
    bodyGroup.add(tl);
    taillights.push(tl);
  }

  if (!lightweight) {
    // Detailed interior silhouette, wing mirrors, license plate, dual exhausts, & spoiler
    const dash = new THREE.Mesh(new THREE.BoxGeometry(width * 0.68, 0.18, 0.35), trimMat);
    dash.position.set(0, hlY + 0.25, -length * 0.12);
    bodyGroup.add(dash);

    for (const side of [-1, 1]) {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.15), paintMat);
      mirror.position.set(side * (width * 0.49), hlY + 0.34, -length * 0.12);
      bodyGroup.add(mirror);

      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.055, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0xbac2cc, metalness: 0.9, roughness: 0.2 })
      );
      exhaust.rotation.x = Math.PI * 0.5;
      exhaust.position.set(side * (width * 0.28), 0.24, length * 0.5 + 0.02);
      bodyGroup.add(exhaust);
    }

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.14, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xf6f3e4, roughness: 0.35 })
    );
    plate.position.set(0, hlY - 0.08, length * 0.5 + 0.04);
    bodyGroup.add(plate);

    if (style === 'sports') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.06, 0.28), trimMat);
      wing.position.set(0, 0.78, length * 0.44);
      bodyGroup.add(wing);
      for (const sx of [-width * 0.28, width * 0.28]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.14), trimMat);
        strut.position.set(sx, 0.7, length * 0.44);
        bodyGroup.add(strut);
      }
    }
  }

  // Sculpted Wheels + Alloy Spokes + Brake Calipers
  const wheelRadius = style === 'suv' || style === 'pickup' ? 0.41 : 0.36;
  const tireW = style === 'sports' ? 0.28 : 0.24;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, tireW, lightweight ? 12 : 18);
  wheelGeo.rotateZ(Math.PI * 0.5);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x13151a, roughness: 0.82, metalness: 0.08 });

  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, tireW + 0.02, 12);
  rimGeo.rotateZ(Math.PI * 0.5);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd4dde6,
    metalness: 0.9,
    roughness: 0.18,
    envMapIntensity: 1.7,
  });

  const wheels: THREE.Mesh[] = [];
  const frontSteerPivots: THREE.Group[] = [];
  const wx = width * 0.46;
  const wzFront = -length * 0.31;
  const wzRear = length * 0.31;

  for (const [xPos, zPos, isFront] of [
    [-wx, wzFront, true],
    [wx, wzFront, true],
    [-wx, wzRear, false],
    [wx, wzRear, false],
  ] as [number, number, boolean][]) {
    const pivot = new THREE.Group();
    pivot.position.set(xPos, wheelRadius, zPos);
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    tire.add(rim);

    if (!lightweight) {
      // Cross-spoke detail so wheels visibly spin realistically
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(tireW + 0.03, wheelRadius * 1.15, 0.065),
        rimMat
      );
      tire.add(spoke);
    }

    pivot.add(tire);
    group.add(pivot);
    wheels.push(tire);
    if (isFront) frontSteerPivots.push(pivot);
  }

  return { group, bodyGroup, wheels, frontSteerPivots, headlights, taillights };
}
