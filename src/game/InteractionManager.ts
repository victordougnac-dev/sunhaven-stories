import type * as THREE from 'three';
import type { Interactable } from './types';

export class InteractionManager {
  public currentPrompt: Interactable | null = null;

  findNearest(
    playerPos: THREE.Vector3,
    isInside: boolean,
    inVehicle: boolean,
    candidates: Interactable[]
  ): Interactable | null {
    if (inVehicle) {
      this.currentPrompt = null;
      return null;
    }

    let best: Interactable | null = null;
    let bestDist = Infinity;

    for (let i = 0; i < candidates.length; i++) {
      const item = candidates[i];
      if (isInside && !item.indoorOnly) continue;
      if (!isInside && item.indoorOnly) continue;
      const d = playerPos.distanceTo(item.position);
      if (d <= item.radius && d < bestDist) {
        bestDist = d;
        best = item;
      }
    }

    this.currentPrompt = best;
    return best;
  }
}
