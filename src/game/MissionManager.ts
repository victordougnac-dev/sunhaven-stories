import * as THREE from 'three';
import type { Interactable, MissionDef } from './types';

export class MissionManager {
  public missions: MissionDef[] = [];
  public completedSet = new Set<string>();
  public activeMission: MissionDef | null = null;
  public waypointIndex = 0;
  public timeLeft = 0;
  public interactables: Interactable[] = [];

  private beaconGroup = new THREE.Group();
  private activeMarker: THREE.Mesh;
  private startPillars: Map<string, THREE.Mesh> = new Map();

  private onComplete: (m: MissionDef) => void;
  private onFail: (m: MissionDef) => void;
  private onStart: (m: MissionDef) => void;

  constructor(
    scene: THREE.Scene,
    initialCompleted: string[],
    callbacks: {
      onStart: (m: MissionDef) => void;
      onComplete: (m: MissionDef) => void;
      onFail: (m: MissionDef) => void;
    }
  ) {
    this.onStart = callbacks.onStart;
    this.onComplete = callbacks.onComplete;
    this.onFail = callbacks.onFail;
    for (const id of initialCompleted) this.completedSet.add(id);

    scene.add(this.beaconGroup);

    // Active glowing checkpoint ring
    this.activeMarker = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.38, 12, 28),
      new THREE.MeshBasicMaterial({ color: 0xffb84d })
    );
    this.activeMarker.visible = false;
    this.beaconGroup.add(this.activeMarker);

    this.initMissions();
  }

  private initMissions(): void {
    this.missions = [
      {
        id: 'mission_street_race',
        title: 'Downtown Coastal Sprint',
        description: 'Race through 6 street checkpoints around Downtown & Ocean Drive.',
        kind: 'race',
        startPos: new THREE.Vector3(-156, 0.3, -12),
        rewardCash: 650,
        timeLimit: 75,
        waypoints: [
          new THREE.Vector3(-180, 1.5, -120),
          new THREE.Vector3(-60, 1.5, -240),
          new THREE.Vector3(60, 1.5, -120),
          new THREE.Vector3(60, 1.5, 120),
          new THREE.Vector3(-180, 1.5, 120),
          new THREE.Vector3(-180, 1.5, 0),
        ],
      },
      {
        id: 'mission_delivery',
        title: 'Bayside Express Delivery',
        description: 'Deliver chilled coastal supplies from Bayside Market to Coral Heights Villa.',
        kind: 'delivery',
        startPos: new THREE.Vector3(-128, 0.3, -24),
        rewardCash: 550,
        timeLimit: 85,
        waypoints: [
          new THREE.Vector3(-60, 1.5, -120),
          new THREE.Vector3(180, 1.5, -120),
          new THREE.Vector3(265, 6.5, -195),
        ],
      },
      {
        id: 'mission_air_rings',
        title: 'Sunhaven Sky Rings',
        description: 'Fly any aircraft through 5 aerial rings over the city and beach!',
        kind: 'flight',
        startPos: new THREE.Vector3(415, 0.3, 275),
        rewardCash: 900,
        timeLimit: 130,
        waypoints: [
          new THREE.Vector3(445, 38, 60),
          new THREE.Vector3(180, 75, -120),
          new THREE.Vector3(-30, 90, -120),
          new THREE.Vector3(-230, 65, 20),
          new THREE.Vector3(120, 55, 200),
        ],
      },
      {
        id: 'mission_boat_slalom',
        title: 'Marina Bay Boat Slalom',
        description: 'Pilot a speedboat through 5 ocean buoys past the Lighthouse!',
        kind: 'boat',
        startPos: new THREE.Vector3(-235, 0.8, 305),
        rewardCash: 600,
        timeLimit: 95,
        waypoints: [
          new THREE.Vector3(-290, 1.5, 340),
          new THREE.Vector3(-410, 1.5, 320),
          new THREE.Vector3(-460, 1.5, 190),
          new THREE.Vector3(-360, 1.5, 60),
          new THREE.Vector3(-285, 1.5, 260),
        ],
      },
      {
        id: 'mission_photo_safari',
        title: 'Sunhaven Photo Safari',
        description: 'Press [C] for Camera & Left Click to photograph 4 iconic landmarks.',
        kind: 'photo',
        startPos: new THREE.Vector3(-12, 0.3, -60),
        rewardCash: 500,
        timeLimit: 240,
        waypoints: [
          new THREE.Vector3(0, 2, -60),
          new THREE.Vector3(-235, 2, -40),
          new THREE.Vector3(-375, 3, 365),
          new THREE.Vector3(360, 2, 40),
        ],
        landmarkNames: [
          'Central Park Fountain',
          'Palm Beach Lifeguard Tower',
          'Sunhaven Marina Lighthouse',
          'Airport Control Tower',
        ],
      },
    ];

    const pillarGeo = new THREE.CylinderGeometry(1.1, 1.1, 6, 16, 1, true);
    for (const m of this.missions) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffb84d,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      });
      const pillar = new THREE.Mesh(pillarGeo, mat);
      pillar.position.set(m.startPos.x, m.startPos.y + 3, m.startPos.z);
      this.beaconGroup.add(pillar);
      this.startPillars.set(m.id, pillar);

      this.interactables.push({
        id: m.id,
        kind: 'mission',
        key: 'E',
        label: `Start: ${m.title}`,
        position: m.startPos.clone(),
        radius: 4.5,
        onInteract: () => this.startMission(m.id),
      });
    }
  }

  startMission(id: string): void {
    const m = this.missions.find((x) => x.id === id);
    if (!m) return;
    this.activeMission = m;
    this.waypointIndex = 0;
    this.timeLeft = m.timeLimit;
    this.updateMarkerPosition();
    this.onStart(m);
  }

  abortMission(): void {
    if (!this.activeMission) return;
    const m = this.activeMission;
    this.activeMission = null;
    this.activeMarker.visible = false;
    this.onFail(m);
  }

  private updateMarkerPosition(): void {
    if (!this.activeMission) {
      this.activeMarker.visible = false;
      return;
    }
    const wp = this.activeMission.waypoints[this.waypointIndex];
    this.activeMarker.visible = true;
    this.activeMarker.position.copy(wp);
    const scale = this.activeMission.kind === 'flight' ? 3.2 : 1.3;
    this.activeMarker.scale.setScalar(scale);
  }

  onPhotoTaken(playerPos: THREE.Vector3): boolean {
    if (!this.activeMission || this.activeMission.kind !== 'photo') return false;
    const wp = this.activeMission.waypoints[this.waypointIndex];
    if (playerPos.distanceTo(wp) < 38) {
      this.advanceWaypoint();
      return true;
    }
    return false;
  }

  private advanceWaypoint(): void {
    if (!this.activeMission) return;
    this.waypointIndex++;
    if (this.waypointIndex >= this.activeMission.waypoints.length) {
      const done = this.activeMission;
      this.completedSet.add(done.id);
      this.activeMission = null;
      this.activeMarker.visible = false;
      this.onComplete(done);
    } else {
      this.updateMarkerPosition();
    }
  }

  getActiveTargetPos(): THREE.Vector3 | null {
    if (!this.activeMission) return null;
    return this.activeMission.waypoints[this.waypointIndex] ?? null;
  }

  getObjectiveText(): string {
    if (!this.activeMission) return '';
    const total = this.activeMission.waypoints.length;
    if (this.activeMission.kind === 'photo') {
      const lm = this.activeMission.landmarkNames?.[this.waypointIndex] ?? 'Landmark';
      return `Photograph ${lm} (${this.waypointIndex + 1}/${total})`;
    }
    return `Reach checkpoint ${this.waypointIndex + 1}/${total}`;
  }

  update(dt: number, elapsed: number, playerPos: THREE.Vector3, isInside: boolean): void {
    this.beaconGroup.visible = !isInside;
    if (isInside) return;

    this.startPillars.forEach((pillar) => {
      pillar.rotation.y = elapsed * 1.2;
    });

    if (!this.activeMission) return;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.abortMission();
      return;
    }

    this.activeMarker.rotation.y = elapsed * 2.2;

    if (this.activeMission.kind !== 'photo') {
      const wp = this.activeMission.waypoints[this.waypointIndex];
      const radius = this.activeMission.kind === 'flight' ? 18 : 9;
      if (playerPos.distanceTo(wp) < radius) {
        this.advanceWaypoint();
      }
    }
  }
}
