import { LevelData } from './LevelSchema';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Player } from '../entities/Player';
import { MovingPlatform } from '../entities/MovingPlatform';
import { PressurePlate } from '../entities/PressurePlate';
import { LaserEmitter } from '../entities/LaserEmitter';
import { Door } from '../entities/Door';
import { ChronoBox } from '../entities/ChronoBox';
import { Checkpoint } from '../entities/Checkpoint';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { TimeManager } from '../core/TimeManager';
import { EchoGhost } from '../entities/EchoGhost';
import { AABBBox } from '../physics/AABB';

export class LevelLoader {
  public static loadLevel(
    data: LevelData,
    physics: PhysicsWorld,
    player: Player,
    timeManager: TimeManager,
    echoGhost: EchoGhost,
    tutorialOverlay: TutorialOverlay
  ): {
    platforms: MovingPlatform[];
    plates: PressurePlate[];
    lasers: LaserEmitter[];
    doors: Door[];
    boxes: ChronoBox[];
    checkpoints: Checkpoint[];
    exitBox: AABBBox;
  } {
    // 1. Reset Physics & Entities
    physics.setStaticSolids(data.solids);

    // 2. Setup Player
    player.x = data.spawn.x;
    player.y = data.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.isGrounded = false;
    player.revive();
    if (player.carriedBox) {
      player.carriedBox.isCarried = false;
      player.carriedBox = null;
    }

    // 3. Reset Time Manager & Echo
    timeManager.reset({
      maxEnergy: data.energy.maxEnergy,
      isStrictBudget: data.energy.isStrictBudget,
    });
    echoGhost.cancel();

    // 4. Create Moving Platforms
    const platforms: MovingPlatform[] = [];
    if (data.movingPlatforms) {
      for (const p of data.movingPlatforms) {
        platforms.push(
          new MovingPlatform(
            p.id,
            p.x,
            p.y,
            p.width,
            p.height,
            p.waypoints,
            p.speed,
            p.waitDuration
          )
        );
      }
    }

    // 5. Create Pressure Plates
    const plates: PressurePlate[] = [];
    if (data.pressurePlates) {
      for (const pl of data.pressurePlates) {
        plates.push(new PressurePlate(pl.id, pl.x, pl.y, pl.plateType));
      }
    }

    // 6. Create Lasers
    const lasers: LaserEmitter[] = [];
    if (data.lasers) {
      for (const l of data.lasers) {
        lasers.push(
          new LaserEmitter(
            l.id,
            l.x,
            l.y,
            l.direction,
            l.mode,
            l.intervalOn || 2.0,
            l.intervalOff || 2.0
          )
        );
      }
    }

    // 7. Create Doors
    const doors: Door[] = [];
    if (data.doors) {
      for (const d of data.doors) {
        doors.push(
          new Door(
            d.id,
            d.x,
            d.y,
            d.width || Door.DEFAULT_WIDTH,
            d.height || Door.DEFAULT_HEIGHT,
            d.linkedTriggers,
            d.logicGate
          )
        );
      }
    }

    // 8. Create Boxes
    const boxes: ChronoBox[] = [];
    if (data.boxes) {
      for (const b of data.boxes) {
        boxes.push(new ChronoBox(b.id, b.x, b.y, b.boxType));
      }
    }

    // 9. Create Checkpoints
    const checkpoints: Checkpoint[] = [];
    if (data.checkpoints) {
      for (const cp of data.checkpoints) {
        checkpoints.push(new Checkpoint(cp.id, cp.x, cp.y));
      }
    }

    // 10. Tutorial Hints
    tutorialOverlay.setHints(data.tutorialHints || []);

    const exitBox: AABBBox = { ...data.exit };

    return {
      platforms,
      plates,
      lasers,
      doors,
      boxes,
      checkpoints,
      exitBox,
    };
  }
}
