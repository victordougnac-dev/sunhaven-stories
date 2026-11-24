import type * as THREE from 'three';
import { DISTRICTS, ROAD_X, ROAD_Z } from './WorldManager';
import type { BuildingEntryDef, EasterEggDef, MissionDef } from './types';
import type { VehicleInstance } from './VehicleController';
import type { AircraftInstance } from './AircraftController';

export class MapUI {
  private miniCanvas: HTMLCanvasElement;
  private miniCtx: CanvasRenderingContext2D;
  private worldCanvas: HTMLCanvasElement;
  private worldCtx: CanvasRenderingContext2D;

  public waypoint: { x: number; z: number } | null = null;
  private panX = 0;
  private panZ = 0;
  private zoom = 0.62;
  private dragging = false;
  private dragMoved = false;
  private lastX = 0;
  private lastY = 0;

  constructor() {
    this.miniCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.miniCtx = this.miniCanvas.getContext('2d')!;
    this.worldCanvas = document.getElementById('world-map-canvas') as HTMLCanvasElement;
    this.worldCtx = this.worldCanvas.getContext('2d')!;
    this.bindWorldMapEvents();
  }

  private bindWorldMapEvents(): void {
    this.worldCanvas.addEventListener('mousedown', (e) => {
      this.dragging = true;
      this.dragMoved = false;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.dragMoved = true;
      this.panX -= dx / this.zoom;
      this.panZ -= dy / this.zoom;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    window.addEventListener('mouseup', (e) => {
      if (this.dragging && !this.dragMoved && e.target === this.worldCanvas) {
        const rect = this.worldCanvas.getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width * 0.5;
        const cy = e.clientY - rect.top - rect.height * 0.5;
        this.waypoint = {
          x: this.panX + cx / this.zoom,
          z: this.panZ + cy / this.zoom,
        };
      }
      this.dragging = false;
    });

    this.worldCanvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.14 : 0.88;
        this.zoom = Math.max(0.32, Math.min(2.6, this.zoom * factor));
      },
      { passive: false }
    );
  }

  renderMinimap(
    playerPos: THREE.Vector3,
    headingYaw: number,
    buildings: BuildingEntryDef[],
    vehicles: VehicleInstance[],
    missionTarget: THREE.Vector3 | null
  ): void {
    const ctx = this.miniCtx;
    const w = this.miniCanvas.width;
    const h = this.miniCanvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const scale = 0.52;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d2e45';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);

    const toMini = (wx: number, wz: number): [number, number] => [
      (wx - playerPos.x) * scale,
      (wz - playerPos.z) * scale,
    ];

    // Landmass block
    const [lx1, lz1] = toMini(-210, -540);
    const [lx2, lz2] = toMini(555, 260);
    ctx.fillStyle = '#203240';
    ctx.fillRect(lx1, lz1, lx2 - lx1, lz2 - lz1);

    // Beach strip
    const [bx1, bz1] = toMini(-265, -260);
    ctx.fillStyle = '#73654a';
    ctx.fillRect(bx1, bz1, 55 * scale, 510 * scale);

    // Airport runway
    const [ax, az] = toMini(428, -40);
    ctx.fillStyle = '#47525e';
    ctx.fillRect(ax, az, 34 * scale, 370 * scale);

    // Roads
    ctx.strokeStyle = '#536473';
    ctx.lineWidth = 6 * scale;
    for (const rx of ROAD_X) {
      const [x1, z1] = toMini(rx, -260);
      const [, z2] = toMini(rx, 270);
      ctx.beginPath();
      ctx.moveTo(x1, z1);
      ctx.lineTo(x1, z2);
      ctx.stroke();
    }
    for (const rz of ROAD_Z) {
      const [x1, z1] = toMini(-200, rz);
      const [x2] = toMini(350, rz);
      ctx.beginPath();
      ctx.moveTo(x1, z1);
      ctx.lineTo(x2, z1);
      ctx.stroke();
    }

    // Enterable buildings
    ctx.fillStyle = '#1fd1c5';
    for (const b of buildings) {
      const [bx, bz] = toMini(b.doorPos.x, b.doorPos.z);
      ctx.fillRect(bx - 2.5, bz - 2.5, 5, 5);
    }

    // Nearby vehicles
    ctx.fillStyle = '#64a8ff';
    for (const v of vehicles) {
      const [vx, vz] = toMini(v.position.x, v.position.z);
      ctx.beginPath();
      ctx.arc(vx, vz, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // GPS Waypoint or Mission target
    const target = missionTarget ?? (this.waypoint ? { x: this.waypoint.x, z: this.waypoint.z } : null);
    if (target) {
      const [tx, tz] = toMini(target.x, target.z);
      const d = Math.hypot(tx, tz);
      const clampedD = Math.min(d, cx - 10);
      const ang = Math.atan2(tz, tx);
      const px = Math.cos(ang) * clampedD;
      const py = Math.sin(ang) * clampedD;
      ctx.fillStyle = '#ffb84d';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player arrow
    ctx.save();
    ctx.rotate(-headingYaw);
    ctx.fillStyle = '#ff6b4a';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  renderWorldMap(
    playerPos: THREE.Vector3,
    buildings: BuildingEntryDef[],
    vehicles: VehicleInstance[],
    aircrafts: AircraftInstance[],
    missions: MissionDef[],
    secrets: EasterEggDef[],
    foundSecrets: Set<string>
  ): void {
    const rect = this.worldCanvas.getBoundingClientRect();
    if (rect.width > 10 && rect.height > 10) {
      if (this.worldCanvas.width !== Math.floor(rect.width)) {
        this.worldCanvas.width = Math.floor(rect.width);
      }
      if (this.worldCanvas.height !== Math.floor(rect.height)) {
        this.worldCanvas.height = Math.floor(rect.height);
      }
    }

    const ctx = this.worldCtx;
    const w = this.worldCanvas.width;
    const h = this.worldCanvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#092438';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.panX, -this.panZ);

    // Island landmass
    ctx.fillStyle = '#1b2c38';
    ctx.fillRect(-210, -540, 765, 800);
    // Beach
    ctx.fillStyle = '#b99f72';
    ctx.fillRect(-265, -260, 60, 510);
    // Secret Island
    ctx.beginPath();
    ctx.arc(-520, 120, 70, 0, Math.PI * 2);
    ctx.fill();

    // District tint labels
    for (const d of DISTRICTS) {
      ctx.fillStyle = `${d.color}22`;
      ctx.fillRect(
        d.bounds.minX,
        d.bounds.minZ,
        d.bounds.maxX - d.bounds.minX,
        d.bounds.maxZ - d.bounds.minZ
      );
    }

    // Airport Runway
    ctx.fillStyle = '#363f4a';
    ctx.fillRect(428, -40, 34, 370);

    // Roads
    ctx.strokeStyle = '#4f5e6e';
    ctx.lineWidth = 14;
    for (const rx of ROAD_X) {
      ctx.beginPath();
      ctx.moveTo(rx, -260);
      ctx.lineTo(rx, 270);
      ctx.stroke();
    }
    for (const rz of ROAD_Z) {
      ctx.beginPath();
      ctx.moveTo(-200, rz);
      ctx.lineTo(350, rz);
      ctx.stroke();
    }

    // District names
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (const d of DISTRICTS) {
      ctx.fillStyle = '#d7e6f5cc';
      const labelY =
        d.id === 'downtown'
          ? -180
          : d.id === 'bayside_shops'
          ? 28
          : (d.bounds.minZ + d.bounds.maxZ) * 0.5;
      ctx.fillText(
        d.name.toUpperCase(),
        (d.bounds.minX + d.bounds.maxX) * 0.5,
        labelY
      );
    }

    // Enterable Buildings
    ctx.fillStyle = '#1fd1c5';
    for (const b of buildings) {
      ctx.fillRect(b.doorPos.x - 6, b.doorPos.z - 6, 12, 12);
    }

    // Vehicles & Aircraft
    ctx.fillStyle = '#64a8ff';
    for (const v of vehicles) {
      ctx.beginPath();
      ctx.arc(v.position.x, v.position.z, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const a of aircrafts) {
      ctx.fillRect(a.position.x - 6, a.position.z - 6, 12, 12);
    }

    // Missions
    ctx.fillStyle = '#ffb84d';
    for (const m of missions) {
      ctx.beginPath();
      ctx.arc(m.startPos.x, m.startPos.z, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Discovered Secrets
    for (const s of secrets) {
      if (!foundSecrets.has(s.id)) continue;
      ctx.fillStyle = '#ff6b4a';
      ctx.beginPath();
      ctx.arc(s.position.x, s.position.z, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Custom Waypoint
    if (this.waypoint) {
      ctx.strokeStyle = '#ffb84d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.waypoint.x, this.waypoint.z, 13, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player marker
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ff6b4a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(playerPos.x, playerPos.z, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
