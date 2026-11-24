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

export function buildHumanoidRig(appearance: HumanoidAppearance): HumanoidRig {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: appearance.skinColor,
    roughness: 0.56,
    metalness: 0.02,
  });
  const lipMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.skinColor).multiplyScalar(0.76),
    roughness: 0.5,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: appearance.shirtColor,
    roughness: 0.78,
    metalness: 0.03,
  });
  const jacketMat = new THREE.MeshStandardMaterial({
    color: appearance.jacketColor ?? appearance.shirtColor,
    roughness: 0.62,
    metalness: 0.06,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: appearance.pantsColor,
    roughness: 0.84,
    metalness: 0.02,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: appearance.shoeColor,
    roughness: 0.52,
    metalness: 0.08,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0xf2f3f5,
    roughness: 0.75,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: appearance.hairColor,
    roughness: 0.65,
    metalness: 0.08,
  });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.2 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x2f4b5e, roughness: 0.15 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.1 });

  // Pelvis / Hips (~0.93m above ground)
  const hips = new THREE.Group();
  hips.position.y = 0.93;
  root.add(hips);

  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), pantsMat);
  pelvis.scale.set(1.12, 0.78, 0.76);
  pelvis.castShadow = true;
  hips.add(pelvis);

  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.155, 0.162, 0.045, 18),
    new THREE.MeshStandardMaterial({ color: 0x1d1f24, roughness: 0.4, metalness: 0.3 })
  );
  belt.scale.set(1.06, 1, 0.74);
  belt.position.y = 0.065;
  hips.add(belt);

  // Spine (abdomen + chest)
  const spine = new THREE.Group();
  spine.position.y = 0.08;
  hips.add(spine);

  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.148, 0.22, 18), shirtMat);
  waist.scale.set(1.04, 1, 0.72);
  waist.position.y = 0.1;
  waist.castShadow = true;
  spine.add(waist);

  const chest = new THREE.Group();
  chest.position.y = 0.21;
  spine.add(chest);

  const ribcage = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.165, 0.28, 20), shirtMat);
  ribcage.scale.set(1.08, 1, 0.72);
  ribcage.position.y = 0.13;
  ribcage.castShadow = true;
  chest.add(ribcage);

  // Rounded shoulder-chest cap
  const shoulderBridge = new THREE.Mesh(
    new THREE.SphereGeometry(0.192, 18, 12),
    appearance.jacketColor !== undefined ? jacketMat : shirtMat
  );
  shoulderBridge.scale.set(1.14, 0.44, 0.74);
  shoulderBridge.position.y = 0.25;
  chest.add(shoulderBridge);

  if (appearance.jacketColor !== undefined) {
    // Open tailored jacket wrapping smoothly around back and sides, open in front (+Z)
    const jacketWrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.203, 0.172, 0.48, 22, 1, false, Math.PI * 0.18, Math.PI * 1.64),
      jacketMat
    );
    jacketWrap.scale.set(1.08, 1, 0.75);
    jacketWrap.position.y = 0.03;
    jacketWrap.castShadow = true;
    chest.add(jacketWrap);

    // Subtle open shirt chest panel in front (+Z)
    const shirtFront = new THREE.Mesh(
      new THREE.CylinderGeometry(0.196, 0.168, 0.46, 16, 1, false, -Math.PI * 0.17, Math.PI * 0.34),
      shirtMat
    );
    shirtFront.scale.set(1.06, 1, 0.74);
    shirtFront.position.y = 0.03;
    chest.add(shirtFront);
  }

  // Neck & Sculpted Organic Head
  const head = new THREE.Group();
  head.position.y = 0.31;
  chest.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.068, 0.12, 14), skinMat);
  neck.position.y = 0.03;
  neck.castShadow = true;
  head.add(neck);

  // Cranium + tapered jawline
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.115, 22, 18), skinMat);
  cranium.scale.set(0.92, 1.08, 0.98);
  cranium.position.set(0, 0.185, 0);
  cranium.castShadow = true;
  head.add(cranium);

  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.088, 18, 14), skinMat);
  jaw.scale.set(0.86, 0.85, 0.94);
  jaw.position.set(0, 0.135, 0.022);
  head.add(jaw);

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), skinMat);
    ear.scale.set(0.42, 1.15, 0.75);
    ear.position.set(side * 0.104, 0.175, -0.005);
    head.add(ear);
  }

  // Sculpted Nose
  const noseBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.017, 0.048, 8), skinMat);
  noseBridge.position.set(0, 0.178, 0.108);
  noseBridge.rotation.x = -0.35;
  head.add(noseBridge);
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), skinMat);
  noseTip.position.set(0, 0.16, 0.118);
  head.add(noseTip);

  // Lips
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), lipMat);
  mouth.scale.set(1.35, 0.35, 0.55);
  mouth.position.set(0, 0.126, 0.098);
  head.add(mouth);

  // Eyes & Eyebrows
  for (const side of [-1, 1]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), eyeWhiteMat);
    sclera.scale.set(1.1, 0.75, 0.65);
    sclera.position.set(side * 0.04, 0.194, 0.098);
    head.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.01, 10, 8), irisMat);
    iris.scale.set(1, 1, 0.5);
    iris.position.set(side * 0.04, 0.194, 0.106);
    head.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 8), pupilMat);
    pupil.position.set(side * 0.04, 0.194, 0.109);
    head.add(pupil);

    const brow = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.036, 6), hairMat);
    brow.rotation.z = Math.PI * 0.5 + side * -0.08;
    brow.position.set(side * 0.04, 0.214, 0.102);
    head.add(brow);
  }

  // Sculpted organic hair cap + front wave
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.121, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairCap.scale.set(0.94, 1.04, 1.02);
  hairCap.position.set(0, 0.192, -0.008);
  hairCap.rotation.x = -0.22;
  hairCap.castShadow = true;
  head.add(hairCap);

  const hairFront = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), hairMat);
  hairFront.scale.set(1.25, 0.48, 0.78);
  hairFront.position.set(0, 0.268, 0.048);
  head.add(hairFront);

  if (appearance.sunglasses) {
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x10141a,
      roughness: 0.1,
      metalness: 0.85,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x22262e, metalness: 0.7, roughness: 0.3 });
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.027, 12, 10), shadeMat);
      lens.scale.set(1.15, 0.72, 0.35);
      lens.position.set(side * 0.041, 0.194, 0.112);
      head.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 6), frameMat);
    bridge.rotation.z = Math.PI * 0.5;
    bridge.position.set(0, 0.198, 0.115);
    head.add(bridge);
  }

  if (appearance.hatColor !== undefined) {
    const hatMat = new THREE.MeshStandardMaterial({ color: appearance.hatColor, roughness: 0.72 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.016, 20), hatMat);
    brim.position.set(0, 0.275, 0.01);
    head.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, 0.09, 20), hatMat);
    crown.position.set(0, 0.315, 0);
    head.add(crown);
  }

  // Sculpted Arms (deltoid shoulder + tapered biceps + elbow sphere + tapered forearm + hand)
  const makeArm = (side: -1 | 1): [THREE.Group, THREE.Group] => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.228, 0.23, 0);
    chest.add(shoulder);

    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 12), jacketMat);
    deltoid.scale.set(0.95, 1.05, 0.95);
    deltoid.castShadow = true;
    shoulder.add(deltoid);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.26, 14), jacketMat);
    upper.position.y = -0.13;
    upper.castShadow = true;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.265;
    shoulder.add(elbow);

    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), skinMat);
    elbow.add(elbowJoint);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.24, 14), skinMat);
    forearm.position.y = -0.12;
    forearm.castShadow = true;
    elbow.add(forearm);

    // Sculpted palm & fingers
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), skinMat);
    hand.scale.set(0.75, 1.35, 0.95);
    hand.position.y = -0.265;
    elbow.add(hand);

    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.01, 0.04, 8), skinMat);
    thumb.position.set(-side * 0.022, -0.255, 0.025);
    thumb.rotation.z = side * 0.45;
    elbow.add(thumb);

    return [shoulder, elbow];
  };

  const [armL, forearmL] = makeArm(-1);
  const [armR, forearmR] = makeArm(1);

  // Sculpted Legs (hip joint + tapered thigh + knee + contoured calf + sneaker)
  const makeLeg = (side: -1 | 1): [THREE.Group, THREE.Group] => {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.098, -0.04, 0);
    hips.add(thigh);

    const hipCap = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 12), pantsMat);
    thigh.add(hipCap);

    const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.42, 16), pantsMat);
    upperLeg.position.y = -0.21;
    upperLeg.castShadow = true;
    thigh.add(upperLeg);

    const shin = new THREE.Group();
    shin.position.y = -0.43;
    thigh.add(shin);

    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), pantsMat);
    shin.add(kneeCap);

    const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.044, 0.4, 16), pantsMat);
    lowerLeg.position.y = -0.2;
    lowerLeg.castShadow = true;
    shin.add(lowerLeg);

    // Sculpted sneaker with rounded toe & white sole
    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(0, -0.42, 0.035);
    shin.add(shoeGroup);

    const shoeUpper = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), shoeMat);
    shoeUpper.scale.set(0.88, 0.68, 1.75);
    shoeUpper.position.y = 0.02;
    shoeUpper.castShadow = true;
    shoeGroup.add(shoeUpper);

    const sole = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.06, 0.028, 14), soleMat);
    sole.scale.set(0.92, 1, 1.85);
    sole.position.y = -0.02;
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

    let hipsY = 0.93 + Math.abs(c) * 0.05 * this.blendWeight;
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
