import type * as THREE from 'three';

export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';
export type WeatherMode = 'auto' | 'sunny' | 'cloudy' | 'rain' | 'storm';
export type WeatherState = 'sunny' | 'cloudy' | 'rain' | 'storm';
export type TimeMode = 'cycle' | 'sunrise' | 'noon' | 'sunset' | 'night';

export type DistrictId =
  | 'downtown'
  | 'palm_beach'
  | 'marina'
  | 'coral_heights'
  | 'suburbs'
  | 'neon_mile'
  | 'bayside_shops'
  | 'airport'
  | 'harbor_port'
  | 'emerald_hills'
  | 'central_park'
  | 'secret_island';

export interface DistrictDef {
  id: DistrictId;
  name: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  color: string;
}

export interface AABBCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  tag?: string;
}

export type InteractableKind =
  | 'building'
  | 'vehicle'
  | 'aircraft'
  | 'npc'
  | 'bench'
  | 'atm'
  | 'mission'
  | 'secret'
  | 'elevator'
  | 'shop_counter';

export interface Interactable {
  id: string;
  kind: InteractableKind;
  key: 'E' | 'F';
  label: string;
  position: THREE.Vector3;
  radius: number;
  indoorOnly?: boolean;
  buildingId?: string;
  onInteract: () => void;
}

export type VehicleKind = 'sports' | 'sedan' | 'suv' | 'pickup' | 'moto' | 'van' | 'boat';
export type AircraftKind = 'prop' | 'jet' | 'heli';

export interface VehicleSpec {
  id: string;
  name: string;
  kind: VehicleKind;
  maxSpeed: number;
  accel: number;
  brake: number;
  reverseSpeed: number;
  turnSpeed: number;
  grip: number;
  length: number;
  width: number;
  height: number;
  color: number;
}

export interface AircraftSpec {
  id: string;
  name: string;
  kind: AircraftKind;
  maxSpeed: number;
  takeoffSpeed: number;
  liftFactor: number;
  pitchRate: number;
  rollRate: number;
  yawRate: number;
  color: number;
}

export interface BuildingEntryDef {
  id: string;
  name: string;
  category:
    | 'apartment'
    | 'cafe'
    | 'nightclub'
    | 'store'
    | 'garage'
    | 'warehouse'
    | 'office'
    | 'surf_shop'
    | 'terminal'
    | 'villa'
    | 'motel'
    | 'bunker'
    | 'cottage'
    | 'skybar';
  doorPos: THREE.Vector3;
  doorYaw: number;
  district: DistrictId;
  isRooftopTeleport?: boolean;
  rooftopPos?: THREE.Vector3;
}

export interface EasterEggDef {
  id: string;
  title: string;
  clue: string;
  district: DistrictId;
  position: THREE.Vector3;
  rewardCash: number;
  type: 'object' | 'location' | 'npc' | 'vehicle';
}

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  kind: 'race' | 'delivery' | 'flight' | 'photo' | 'boat';
  startPos: THREE.Vector3;
  rewardCash: number;
  timeLimit: number;
  waypoints: THREE.Vector3[];
  landmarkNames?: string[];
}

export interface GameSettings {
  quality: QualityPreset;
  volume: number;
  sensitivity: number;
  timeMode: TimeMode;
  weatherMode: WeatherMode;
  showHints: boolean;
  invertY: boolean;
}

export interface SaveData {
  version: number;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  cash: number;
  discoveredDistricts: DistrictId[];
  foundSecrets: string[];
  completedMissions: string[];
  unlockedVehicles: string[];
  settings: GameSettings;
}
