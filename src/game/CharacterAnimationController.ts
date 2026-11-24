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
    roughness: 0.68,
    metalness: 0.02,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: appearance.shirtColor,
    roughness: 0.76,
    metalness: 0.04,
  });
  const jacketMat = new THREE.MeshStandardMaterial({
    color: appearance.jacketColor ?? appearance.shirtColor,
    roughness: 0.65,
    metalness: 0.08,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: appearance.pantsColor,
    roughness: 0.82,
    metalness: 0.02,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: appearance.shoeColor,
    roughness: 0.6,
    metalness: 0.1,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: appearance.hairColor,
    roughness: 0.85,
  });

  // Hips / pelvis (height ~0.92m above ground)
  const hips = new THREE.Group();
  hips.position.y = 0.92;
  root.add(hips);

  const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), pantsMat);
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  // Spine & torso
  const spine = new THREE.Group();
  spine.position.y = 0.08;
  hips.add(spine);

  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.23), shirtMat);
  torsoMesh.position.y = 0.24;
  torsoMesh.castShadow = true;
  spine.add(torsoMesh);

  if (appearance.jacketColor !== undefined) {
    const jacketL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.49, 0.25), jacketMat);
    jacketL.position.set(-0.14, 0.24, 0);
    jacketL.castShadow = true;
    spine.add(jacketL);

    const jacketR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.49, 0.25), jacketMat);
    jacketR.position.set(0.14, 0.24, 0);
    jacketR.castShadow = true;
    spine.add(jacketR);

    const jacketBack = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.49, 0.09), jacketMat);
    jacketBack.position.set(0, 0.24, -0.09);
    jacketBack.castShadow = true;
    spine.add(jacketBack);
  }

  // Neck + Head
  const head = new THREE.Group();
  head.position.y = 0.52;
  spine.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.1, 8), skinMat);
  neck.position.y = 0.03;
  head.add(neck);

  const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.23), skinMat);
  cranium.position.y = 0.18;
  cranium.castShadow = true;
  head.add(cranium);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.055, 0.05), skinMat);
  nose.position.set(0, 0.17, 0.12);
  head.add(nose);

  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.25), hairMat);
  hairTop.position.set(0, 0.29, -0.01);
  hairTop.castShadow = true;
  head.add(hairTop);

  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.16, 0.07), hairMat);
  hairBack.position.set(0, 0.2, -0.1);
  head.add(hairBack);

  if (appearance.sunglasses) {
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x11151c,
      roughness: 0.15,
      metalness: 0.85,
    });
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.052, 0.04), glassMat);
    shades.position.set(0, 0.2, 0.11);
    head.add(shades);
  }

  if (appearance.hatColor !== undefined) {
    const hatMat = new THREE.MeshStandardMaterial({ color: appearance.hatColor, roughness: 0.7 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.02, 12), hatMat);
    brim.position.set(0, 0.31, 0.02);
    head.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.1, 12), hatMat);
    crown.position.set(0, 0.36, 0);
    head.add(crown);
  }

  // Arms
  const makeArm = (side: -1 | 1): [THREE.Group, THREE.Group] => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.25, 0.45, 0);
    spine.add(shoulder);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28, 0.11), jacketMat);
    upper.position.y = -0.12;
    upper.castShadow = true;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.26;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.26, 0.095), skinMat);
    forearm.position.y = -0.12;
    forearm.castShadow = true;
    elbow.add(forearm);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.08), skinMat);
    hand.position.y = -0.27;
    elbow.add(hand);

    return [shoulder, elbow];
  };

  const [armL, forearmL] = makeArm(-1);
  const [armR, forearmR] = makeArm(1);

  // Legs
  const makeLeg = (side: -1 | 1): [THREE.Group, THREE.Group] => {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.105, -0.05, 0);
    hips.add(thigh);

    const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.44, 0.15), pantsMat);
    upperLeg.position.y = -0.21;
    upperLeg.castShadow = true;
    thigh.add(upperLeg);

    const shin = new THREE.Group();
    shin.position.y = -0.43;
    thigh.add(shin);

    const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.42, 0.13), pantsMat);
    lowerLeg.position.y = -0.2;
    lowerLeg.castShadow = true;
    shin.add(lowerLeg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.09, 0.23), shoeMat);
    shoe.position.set(0, -0.41, 0.045);
    shoe.castShadow = true;
    shin.add(shoe);

    return [thigh, shin];
  };

  const [thighL, shinL] = makeLeg(-1);
  const [thighR, shinR] = makeLeg(1);

  return {
    root,
    hips,
    spine,
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

    // Default target angles
    let thighLX = s * strideAmp * this.blendWeight;
    let thighRX = -s * strideAmp * this.blendWeight;
    let shinLX = Math.max(0, -c * 0.75 + 0.15) * this.blendWeight;
    let shinRX = Math.max(0, c * 0.75 + 0.15) * this.blendWeight;

    let armLX = -s * armAmp * this.blendWeight;
    let armRX = s * armAmp * this.blendWeight;
    let forearmLX = (-0.35 - Math.max(0, s) * 0.45) * this.blendWeight;
    let forearmRX = (-0.35 - Math.max(0, -s) * 0.45) * this.blendWeight;

    let hipsY = 0.92 + Math.abs(c) * 0.055 * this.blendWeight;
    let spineX = (state === 'sprint' ? 0.22 : state === 'run' ? 0.12 : 0.04) * this.blendWeight;
    let spineY = s * 0.09 * this.blendWeight;
    let headY = Math.sin(this.idleTime * 0.7) * 0.08 * (1 - this.blendWeight);

    // Idle breathing
    const breathe = Math.sin(this.idleTime * 2.1);
    armLX += (1 - this.blendWeight) * (0.04 + breathe * 0.02);
    armRX += (1 - this.blendWeight) * (-0.04 - breathe * 0.02);
    forearmLX += (1 - this.blendWeight) * -0.15;
    forearmRX += (1 - this.blendWeight) * -0.15;

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
    this.rig.spine.rotation.y = THREE.MathUtils.lerp(this.rig.spine.rotation.y, spineY, lerpRate);
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
