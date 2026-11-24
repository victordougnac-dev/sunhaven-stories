import type { CrazyGamesManager } from './CrazyGamesManager';
import type { GameSettings, SaveData } from './types';

const SAVE_KEY = 'sunhaven_stories_save_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  quality: 'high',
  volume: 0.7,
  sensitivity: 1.0,
  timeMode: 'cycle',
  weatherMode: 'auto',
  showHints: true,
  invertY: false,
};

export function createDefaultSave(): SaveData {
  return {
    version: 1,
    playerPos: { x: -135, y: 0.2, z: -20 },
    playerYaw: Math.PI * 0.5,
    cash: 500,
    discoveredDistricts: ['bayside_shops'],
    foundSecrets: [],
    completedMissions: [],
    unlockedVehicles: ['solaris_gt', 'bayfront_sedan'],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export class SaveManager {
  private cg: CrazyGamesManager;
  public data: SaveData;
  public hasExistingSave = false;

  constructor(cg: CrazyGamesManager) {
    this.cg = cg;
    this.data = this.load();
  }

  load(): SaveData {
    const raw = this.cg.getData(SAVE_KEY);
    if (!raw) {
      this.hasExistingSave = false;
      return createDefaultSave();
    }
    try {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const def = createDefaultSave();
      this.hasExistingSave = true;
      return {
        version: 1,
        playerPos: parsed.playerPos ?? def.playerPos,
        playerYaw: typeof parsed.playerYaw === 'number' ? parsed.playerYaw : def.playerYaw,
        cash: typeof parsed.cash === 'number' ? parsed.cash : def.cash,
        discoveredDistricts: Array.isArray(parsed.discoveredDistricts)
          ? parsed.discoveredDistricts
          : def.discoveredDistricts,
        foundSecrets: Array.isArray(parsed.foundSecrets) ? parsed.foundSecrets : def.foundSecrets,
        completedMissions: Array.isArray(parsed.completedMissions)
          ? parsed.completedMissions
          : def.completedMissions,
        unlockedVehicles: Array.isArray(parsed.unlockedVehicles)
          ? parsed.unlockedVehicles
          : def.unlockedVehicles,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings ?? {}),
        },
      };
    } catch {
      this.hasExistingSave = false;
      return createDefaultSave();
    }
  }

  save(): void {
    try {
      this.cg.setData(SAVE_KEY, JSON.stringify(this.data));
      this.hasExistingSave = true;
    } catch {
      // ignore
    }
  }

  reset(): SaveData {
    const keepSettings = { ...this.data.settings };
    this.data = createDefaultSave();
    this.data.settings = keepSettings;
    this.hasExistingSave = false;
    this.save();
    return this.data;
  }
}
