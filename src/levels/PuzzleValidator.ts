import { PressurePlate } from '../entities/PressurePlate';
import { Door } from '../entities/Door';
import { AABB, AABBBox } from '../physics/AABB';
import { Player } from '../entities/Player';

export class PuzzleValidator {
  public static evaluate(
    plates: PressurePlate[],
    doors: Door[]
  ): void {
    // Gather all active triggers
    const activeTriggers = new Set<string>();

    for (const plate of plates) {
      if (plate.isPressed) {
        activeTriggers.add(plate.id);
      }
    }

    // Update each door's logic
    for (const door of doors) {
      door.evaluateTriggers(activeTriggers);
    }
  }

  public static checkExitReached(player: Player, exitBox: AABBBox): boolean {
    return !player.isDead && AABB.overlaps(player.getBox(), exitBox);
  }
}
