import * as THREE from 'three';

export type AnimState = 'idle' | 'walk' | 'run' | 'sprint' | 'jump' | 'fall' | 'swim' | 'sit';

export interface HumanoidAppearance {
  skinColor: number;
  shirtColor: number;
  jacketColor?: number;
  pantsColor: number;
  shoeColor: number;
  hairColor: number;
  sunglasses?: boolean;
  hatColor?: number;
}

export interface HumanoidRig {
  root: THREE.Group;
  hips: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  forearmL: THREE.Group;
  armR: THREE.Group;
  forearmR: THREE.Group;
  thighL: THREE.Group;
  shinL: THREE.Group;
  thighR: THREE.Group;
  shinR: THREE.Group;
}

/**
 * Creates a smooth contoured anatomical limb/torso geometry with elliptical cross-section.
 */
function createContouredProfile(
  rings: { y: number; rx: number; rz: number; ox?: number; oz?: number }[],
  radialSegs = 16
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    const ox = ring.ox ?? 0;
    const oz = ring.oz ?? 0;
    for (let s = 0; s <= radialSegs; s++) {
      const theta = (s / radialSegs) * Math.PI * 2;
      const x = ox + Math.cos(theta) * ring.rx;
      const z = oz + Math.sin(theta) * ring.rz;
      positions.push(x, ring.y, z);
    }
  }

  const stride = radialSegs + 1;
  for (let r = 0; r < rings.length - 1; r++) {
    for (let s = 0; s < radialSegs; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = (r + 1) * stride + s;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Vertex-sculpts a realistic anatomical head (brow ridge, cheekbones, tapered jaw & chin).
 */
function createSculptedHeadGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.112, 26, 22);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Narrow temple/jaw width subtly
    x *= 0.88;
    // Elongate cranium vertically
    y *= 1.12;

    // Taper lower face into realistic jawline & chin
    if (y < 0.01) {
      const jawT = Math.min(1, (-y + 0.01) / 0.13);
      x *= 1 - jawT * 0.32;
      if (z > 0) {
        z *= 1 - jawT * 0.14;
        // Subtle chin protrusion
        if (y < -0.06 && Math.abs(x) < 0.04) {
          z += 0.012;
        }
      } else {
        // Back of skull curve into neck
        z *= 1 - jawT * 0.38;
      }
    }

    // Cheekbone & brow contour on front face (+Z)
    if (z > 0.04) {
      if (y > 0.015 && y < 0.045) z += 0.008; // brow ridge
      if (y > -0.025 && y < 0.008 && Math.abs(x) > 0.03 && Math.abs(x) < 0.075) z += 0.009; // cheekbones
      if (y > -0.01 && y < 0.025 && Math.abs(x) > 0.018 && Math.abs(x) < 0.055) z -= 0.007; // eye sockets
    }

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function buildHumanoidRig(appearance: HumanoidAppearance): HumanoidRig {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: appearance.skinColor,
    roughness: 0.52,
    metalness: 0.02,
  });
  const lipMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.skinColor).multiplyScalar(0.74),
    roughness: 0.45,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: appearance.shirtColor,
    roughness: 0.78,
    metalness: 0.02,
  });
  const jacketMat = new THREE.MeshStandardMaterial({
    color: appearance.jacketColor ?? appearance.shirtColor,
    roughness: 0.62,
    metalness: 0.05,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: appearance.pantsColor,
    roughness: 0.85,
    metalness: 0.02,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: appearance.shoeColor,
    roughness: 0.48,
    metalness: 0.08,
  });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xefefef, roughness: 0.75 });
  const hairMat = new THREE.MeshStandardMaterial({
    color: appearance.hairColor,
    roughness: 0.58,
    metalness: 0.1,
  });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.18 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x2b4d5e, roughness: 0.15 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.1 });

  // Pelvis / Hips (~0.94m)
  const hips = new THREE.Group();
  hips.position.y = 0.94;
  root.add(hips);

  const pelvisGeo = createContouredProfile([
    { y: -0.1, rx: 0.165, rz: 0.115 },
    { y: -0.02, rx: 0.175, rz: 0.12 },
    { y: 0.06, rx: 0.162, rz: 0.112 },
    { y: 0.11, rx: 0.152, rz: 0.105 },
  ]);
  const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
  pelvis.castShadow = true;
  hips.add(pelvis);

  const belt = new THREE.Mesh(
    createContouredProfile([
      { y: 0.065, rx: 0.165, rz: 0.115 },
      { y: 0.105, rx: 0.158, rz: 0.11 },
    ]),
    new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.4, metalness: 0.35 })
  );
  hips.add(belt);

  // Spine & Seamless V-Tapered Athletic Torso
  const spine = new THREE.Group();
  spine.position.y = 0.09;
  hips.add(spine);

  const abdomenGeo = createContouredProfile([
    { y: 0.0, rx: 0.15, rz: 0.105 },
    { y: 0.09, rx: 0.154, rz: 0.108, oz: 0.004 },
    { y: 0.19, rx: 0.168, rz: 0.118, oz: 0.008 },
  ]);
  const abdomen = new THREE.Mesh(abdomenGeo, appearance.jacketColor !== undefined ? jacketMat : shirtMat);
  abdomen.castShadow = true;
  spine.add(abdomen);

  const chest = new THREE.Group();
  chest.position.y = 0.18;
  spine.add(chest);

  // Muscular upper torso / ribcage / broad shoulders
  const torsoMat = appearance.jacketColor !== undefined ? jacketMat : shirtMat;
  const chestGeo = createContouredProfile([
    { y: 0.0, rx: 0.168, rz: 0.118, oz: 0.008 },
    { y: 0.12, rx: 0.198, rz: 0.132, oz: 0.012 },
    { y: 0.23, rx: 0.218, rz: 0.125, oz: 0.006 },
    { y: 0.295, rx: 0.185, rz: 0.102, oz: 0.0 },
    { y: 0.33, rx: 0.072, rz: 0.072, oz: 0.0 },
  ], 20);
  const chestMesh = new THREE.Mesh(chestGeo, torsoMat);
  chestMesh.castShadow = true;
  chest.add(chestMesh);

  // Inner open-collar shirt V-panel on chest (+Z)
  if (appearance.jacketColor !== undefined) {
    const vShirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.05, 0.27, 12, 1, false, -0.55, 1.1),
      shirtMat
    );
    vShirt.position.set(0, 0.17, 0.068);
    chest.add(vShirt);

    // Rolled collar around neck
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.016, 8, 16), jacketMat);
    collar.rotation.x = Math.PI * 0.5 + 0.15;
    collar.position.set(0, 0.315, 0.004);
    chest.add(collar);
  }

  // Anatomical Neck + Vertex-Sculpted Head
  const head = new THREE.Group();
  head.position.y = 0.32;
  chest.add(head);

  const neckGeo = createContouredProfile([
    { y: -0.01, rx: 0.064, rz: 0.062 },
    { y: 0.04, rx: 0.055, rz: 0.056, oz: 0.004 },
    { y: 0.09, rx: 0.054, rz: 0.058, oz: 0.006 },
  ], 14);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.castShadow = true;
  head.add(neck);

  const cranium = new THREE.Mesh(createSculptedHeadGeometry(), skinMat);
  cranium.position.set(0, 0.175, 0.006);
  cranium.castShadow = true;
  head.add(cranium);

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), skinMat);
    ear.scale.set(0.38, 1.2, 0.72);
    ear.position.set(side * 0.096, 0.175, -0.004);
    ear.rotation.z = side * -0.1;
    head.add(ear);
  }

  // Sculpted Nose
  const noseBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.015, 0.044, 8), skinMat);
  noseBridge.position.set(0, 0.178, 0.105);
  noseBridge.rotation.x = -0.34;
  head.add(noseBridge);
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), skinMat);
  noseTip.position.set(0, 0.159, 0.114);
  head.add(noseTip);

  // Lips
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.021, 10, 8), lipMat);
  mouth.scale.set(1.35, 0.32, 0.48);
  mouth.position.set(0, 0.124, 0.095);
  head.add(mouth);

  // Realistic Eyes & Brows
  for (const side of [-1, 1]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), eyeWhiteMat);
    sclera.scale.set(1.15, 0.72, 0.6);
    sclera.position.set(side * 0.036, 0.192, 0.095);
    head.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), irisMat);
    iris.scale.set(1, 1, 0.5);
    iris.position.set(side * 0.036, 0.192, 0.102);
    head.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 8), pupilMat);
    pupil.position.set(side * 0.036, 0.192, 0.105);
    head.add(pupil);

    const brow = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.032, 6), hairMat);
    brow.rotation.z = Math.PI * 0.5 + side * -0.1;
    brow.position.set(side * 0.036, 0.21, 0.099);
    head.add(brow);
  }

  // Layered Natural Hair (fitted cap + textured front/side locks)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hairCap.scale.set(0.91, 1.09, 1.01);
  hairCap.position.set(0, 0.184, -0.004);
  hairCap.rotation.x = -0.24;
  hairCap.castShadow = true;
  head.add(hairCap);

  const hairLockMain = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 10), hairMat);
  hairLockMain.scale.set(1.18, 0.42, 0.72);
  hairLockMain.position.set(0.008, 0.272, 0.044);
  hairLockMain.rotation.z = -0.12;
  head.add(hairLockMain);

  const hairBackNape = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.062, 0.08, 14, 1, false, Math.PI * 0.65, Math.PI * 0.7), hairMat);
  hairBackNape.position.set(0, 0.125, -0.015);
  head.add(hairBackNape);

  if (appearance.sunglasses) {
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 0.08, metalness: 0.88 });
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), shadeMat);
      lens.scale.set(1.18, 0.7, 0.3);
      lens.position.set(side * 0.037, 0.192, 0.109);
      head.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.026, 6), shadeMat);
    bridge.rotation.z = Math.PI * 0.5;
    bridge.position.set(0, 0.195, 0.111);
    head.add(bridge);
  }

  if (appearance.hatColor !== undefined) {
    const hatMat = new THREE.MeshStandardMaterial({ color: appearance.hatColor, roughness: 0.72 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.185, 0.014, 20), hatMat);
    brim.position.set(0, 0.27, 0.012);
    head.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.118, 0.085, 20), hatMat);
    crown.position.set(0, 0.308, 0);
    head.add(crown);
  }

  // Seamless Contoured Arms (no bulky ball joints!)
  const makeArm = (side: -1 | 1): [THREE.Group, THREE.Group] => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.212, 0.235, 0.002);
    chest.add(shoulder);

    const upperArmGeo = createContouredProfile([
      { y: 0.02, rx: 0.052, rz: 0.052 },
      { y: -0.02, rx: 0.056, rz: 0.056 }, // smooth deltoid taper
      { y: -0.14, rx: 0.048, rz: 0.049 }, // bicep
      { y: -0.265, rx: 0.039, rz: 0.04 }, // elbow
    ], 14);
    const upper = new THREE.Mesh(upperArmGeo, torsoMat);
    upper.castShadow = true;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.265;
    shoulder.add(elbow);

    const forearmGeo = createContouredProfile([
      { y: 0.01, rx: 0.039, rz: 0.04 },
      { y: -0.07, rx: 0.041, rz: 0.042 }, // forearm muscle
      { y: -0.23, rx: 0.028, rz: 0.03 }, // wrist
    ], 14);
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.castShadow = true;
    elbow.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), skinMat);
    hand.scale.set(0.68, 1.38, 0.92);
    hand.position.y = -0.265;
    elbow.add(hand);

    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.038, 8), skinMat);
    thumb.position.set(-side * 0.02, -0.252, 0.024);
    thumb.rotation.z = side * 0.42;
    elbow.add(thumb);

    return [shoulder, elbow];
  };

  const [armL, forearmL] = makeArm(-1);
  const [armR, forearmR] = makeArm(1);

  // Seamless Contoured Legs (natural thigh -> knee -> calf -> ankle -> sculpted sneaker)
  const makeLeg = (side: -1 | 1): [THREE.Group, THREE.Group] => {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.095, -0.035, 0);
    hips.add(thigh);

    const thighGeo = createContouredProfile([
      { y: 0.02, rx: 0.084, rz: 0.088 },
      { y: -0.14, rx: 0.078, rz: 0.082 },
      { y: -0.32, rx: 0.064, rz: 0.066 },
      { y: -0.43, rx: 0.056, rz: 0.058 },
    ], 16);
    const upperLeg = new THREE.Mesh(thighGeo, pantsMat);
    upperLeg.castShadow = true;
    thigh.add(upperLeg);

    const shin = new THREE.Group();
    shin.position.y = -0.43;
    thigh.add(shin);

    const shinGeo = createContouredProfile([
      { y: 0.01, rx: 0.056, rz: 0.058 },
      { y: -0.14, rx: 0.059, rz: 0.064, oz: -0.006 }, // calf curve
      { y: -0.34, rx: 0.044, rz: 0.048 }, // ankle
      { y: -0.42, rx: 0.041, rz: 0.045 },
    ], 16);
    const lowerLeg = new THREE.Mesh(shinGeo, pantsMat);
    lowerLeg.castShadow = true;
    shin.add(lowerLeg);

    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(0, -0.435, 0.035);
    shin.add(shoeGroup);

    const shoeUpper = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 10), shoeMat);
    shoeUpper.scale.set(0.84, 0.65, 1.78);
    shoeUpper.position.y = 0.02;
    shoeUpper.castShadow = true;
    shoeGroup.add(shoeUpper);

    const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.026, 14), soleMat);
    sole.scale.set(0.88, 1, 1.88);
    sole.position.y = -0.018;
    shoeGroup.add(sole);

    return [thigh, shin];
  };

  const [thighL, shinL] = makeLeg(-1);
  const [thighR, shinR] = makeLeg(1);

  return {
    root,
    hips,
    spine,
    chest,
    head,
    armL,
    forearmL,
    armR,
    forearmR,
    thighL,
    shinL,
    thighR,
    shinR,
  };
}

export class CharacterAnimationController {
  private rig: HumanoidRig;
  private cycle = 0;
  private idleTime = 0;
  private blendWeight = 0;

  constructor(rig: HumanoidRig) {
    this.rig = rig;
  }

  update(dt: number, state: AnimState, speed: number): void {
    this.idleTime += dt;

    const isMoving = state === 'walk' || state === 'run' || state === 'sprint';
    const targetMoveWeight = isMoving ? 1 : 0;
    this.blendWeight = THREE.MathUtils.lerp(this.blendWeight, targetMoveWeight, Math.min(1, dt * 11));

    if (isMoving) {
      const freq = state === 'sprint' ? 11.5 : state === 'run' ? 9.0 : 6.4;
      this.cycle += dt * freq * Math.max(0.55, Math.min(1.4, speed / 5.5));
    }

    const strideAmp = state === 'sprint' ? 0.85 : state === 'run' ? 0.68 : 0.48;
    const armAmp = state === 'sprint' ? 0.92 : state === 'run' ? 0.72 : 0.44;
    const s = Math.sin(this.cycle);
    const c = Math.cos(this.cycle);

    let thighLX = s * strideAmp * this.blendWeight;
    let thighRX = -s * strideAmp * this.blendWeight;
    let shinLX = Math.max(0, -c * 0.75 + 0.12) * this.blendWeight;
    let shinRX = Math.max(0, c * 0.75 + 0.12) * this.blendWeight;

    let armLX = -s * armAmp * this.blendWeight;
    let armRX = s * armAmp * this.blendWeight;
    let forearmLX = (-0.35 - Math.max(0, s) * 0.45) * this.blendWeight;
    let forearmRX = (-0.35 - Math.max(0, -s) * 0.45) * this.blendWeight;

    let hipsY = 0.94 + Math.abs(c) * 0.05 * this.blendWeight;
    let spineX = (state === 'sprint' ? 0.2 : state === 'run' ? 0.1 : 0.03) * this.blendWeight;
    let chestY = s * 0.09 * this.blendWeight;
    let headY = Math.sin(this.idleTime * 0.75) * 0.11 * (1 - this.blendWeight);

    const breathe = Math.sin(this.idleTime * 2.1);
    armLX += (1 - this.blendWeight) * (0.04 + breathe * 0.02);
    armRX += (1 - this.blendWeight) * (-0.04 - breathe * 0.02);
    forearmLX += (1 - this.blendWeight) * -0.18;
    forearmRX += (1 - this.blendWeight) * -0.18;

    if (state === 'jump' || state === 'fall') {
      thighLX = -0.35;
      thighRX = 0.22;
      shinLX = 0.55;
      shinRX = 0.25;
      armLX = -0.85;
      armRX = -0.65;
      forearmLX = -0.5;
      forearmRX = -0.5;
      spineX = 0.1;
    } else if (state === 'swim') {
      const swimSin = Math.sin(this.idleTime * 6.0);
      hipsY = 0.55;
      spineX = 1.15;
      thighLX = swimSin * 0.45;
      thighRX = -swimSin * 0.45;
      armLX = -1.3 + Math.cos(this.idleTime * 6.0) * 0.7;
      armRX = -1.3 - Math.cos(this.idleTime * 6.0) * 0.7;
      headY = 0;
    } else if (state === 'sit') {
      hipsY = 0.54;
      thighLX = -1.45;
      thighRX = -1.45;
      shinLX = 1.45;
      shinRX = 1.45;
      armLX = -0.25;
      armRX = -0.25;
      forearmLX = -0.65;
      forearmRX = -0.65;
      spineX = -0.05;
    }

    const lerpRate = Math.min(1, dt * 14);
    this.rig.hips.position.y = THREE.MathUtils.lerp(this.rig.hips.position.y, hipsY, lerpRate);
    this.rig.spine.rotation.x = THREE.MathUtils.lerp(this.rig.spine.rotation.x, spineX, lerpRate);
    this.rig.chest.rotation.y = THREE.MathUtils.lerp(this.rig.chest.rotation.y, chestY, lerpRate);
    this.rig.head.rotation.y = THREE.MathUtils.lerp(this.rig.head.rotation.y, headY, lerpRate);

    this.rig.thighL.rotation.x = THREE.MathUtils.lerp(this.rig.thighL.rotation.x, thighLX, lerpRate);
    this.rig.thighR.rotation.x = THREE.MathUtils.lerp(this.rig.thighR.rotation.x, thighRX, lerpRate);
    this.rig.shinL.rotation.x = THREE.MathUtils.lerp(this.rig.shinL.rotation.x, shinLX, lerpRate);
    this.rig.shinR.rotation.x = THREE.MathUtils.lerp(this.rig.shinR.rotation.x, shinRX, lerpRate);

    this.rig.armL.rotation.x = THREE.MathUtils.lerp(this.rig.armL.rotation.x, armLX, lerpRate);
    this.rig.armR.rotation.x = THREE.MathUtils.lerp(this.rig.armR.rotation.x, armRX, lerpRate);
    this.rig.forearmL.rotation.x = THREE.MathUtils.lerp(this.rig.forearmL.rotation.x, forearmLX, lerpRate);
    this.rig.forearmR.rotation.x = THREE.MathUtils.lerp(this.rig.forearmR.rotation.x, forearmRX, lerpRate);
  }
}
