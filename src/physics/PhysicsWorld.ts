import { AABB, AABBBox } from './AABB';

/**
 * Deterministic 2D Physics World
 */
export interface StaticSolid extends AABBBox {
  id?: string;
  isOneWay?: boolean;
}

export class PhysicsWorld {
  public static readonly GRAVITY: number = 980; // px / s^2
  public static readonly TERMINAL_VELOCITY: number = 750;

  private staticSolids: StaticSolid[] = [];

  constructor() {}

  public setStaticSolids(solids: StaticSolid[]): void {
    this.staticSolids = [...solids];
  }

  public addSolid(solid: StaticSolid): void {
    this.staticSolids.push(solid);
  }

  public removeSolid(id: string): void {
    this.staticSolids = this.staticSolids.filter((s) => s.id !== id);
  }

  public getStaticSolids(): StaticSolid[] {
    return this.staticSolids;
  }

  /**
   * Sweeps a moving AABB through static geometry and resolves collisions on X and Y axes independently.
   * Returns final position, remaining velocity, and collision flags.
   */
  public moveAndSlide(
    box: AABBBox,
    vx: number,
    vy: number,
    dt: number,
    customSolids: AABBBox[] = []
  ): {
    x: number;
    y: number;
    vx: number;
    vy: number;
    isGrounded: boolean;
    hitCeiling: boolean;
    hitWall: boolean;
  } {
    const allSolids: AABBBox[] = [...this.staticSolids, ...customSolids];
    let newX = box.x;
    let newY = box.y;
    let newVx = vx;
    let newVy = vy;

    let isGrounded = false;
    let hitCeiling = false;
    let hitWall = false;

    const skin = 2; // Inset skin to prevent false collisions with adjacent orthogonal surfaces

    // 1. Move horizontally
    if (Math.abs(vx) > 0.0001) {
      const dx = vx * dt;
      let targetX = box.x + dx;
      const testY = box.y + skin;
      const testH = Math.max(1, box.height - skin * 2);

      if (vx > 0) {
        for (const solid of allSolids) {
          // Check vertical overlap with torso
          if (testY < solid.y + solid.height && testY + testH > solid.y) {
            // Must be starting to the left of the solid and moving into it
            if (box.x + box.width <= solid.x + Math.max(2, Math.abs(dx) + 1)) {
              if (targetX + box.width > solid.x) {
                targetX = Math.min(targetX, solid.x - box.width);
                newVx = 0;
                hitWall = true;
              }
            }
          }
        }
      } else {
        // vx < 0
        for (const solid of allSolids) {
          // Check vertical overlap with torso
          if (testY < solid.y + solid.height && testY + testH > solid.y) {
            // Must be starting to the right of the solid and moving into it
            if (box.x >= solid.x + solid.width - Math.max(2, Math.abs(dx) + 1)) {
              if (targetX < solid.x + solid.width) {
                targetX = Math.max(targetX, solid.x + solid.width);
                newVx = 0;
                hitWall = true;
              }
            }
          }
        }
      }
      newX = targetX;
    }

    // 2. Move vertically
    if (Math.abs(vy) > 0.0001) {
      const dy = vy * dt;
      let targetY = box.y + dy;
      const testX = newX + skin;
      const testW = Math.max(1, box.width - skin * 2);

      if (vy > 0) {
        // Falling downwards
        for (const solid of allSolids) {
          // Check horizontal overlap with torso
          if (testX < solid.x + solid.width && testX + testW > solid.x) {
            // Must be starting above the solid and falling onto it
            if (box.y + box.height <= solid.y + Math.max(2, Math.abs(dy) + 1)) {
              if (targetY + box.height > solid.y) {
                targetY = Math.min(targetY, solid.y - box.height);
                newVy = 0;
                isGrounded = true;
              }
            }
          }
        }
      } else {
        // Jumping upwards
        for (const solid of allSolids) {
          // Check horizontal overlap with torso
          if (testX < solid.x + solid.width && testX + testW > solid.x) {
            // Must be starting below the solid and hitting ceiling
            if (box.y >= solid.y + solid.height - Math.max(2, Math.abs(dy) + 1)) {
              if (targetY < solid.y + solid.height) {
                targetY = Math.max(targetY, solid.y + solid.height);
                newVy = 0;
                hitCeiling = true;
              }
            }
          }
        }
      }
      newY = targetY;
    }

    // 3. Grounded stability check
    if (!isGrounded && newVy >= 0) {
      if (this.checkGrounded({ x: newX, y: newY, width: box.width, height: box.height }, customSolids, 2)) {
        isGrounded = true;
        newVy = 0;
      }
    }

    return {
      x: newX,
      y: newY,
      vx: newVx,
      vy: newVy,
      isGrounded,
      hitCeiling,
      hitWall,
    };
  }

  /**
   * Check if an entity at (x, y) would be grounded
   */
  public checkGrounded(box: AABBBox, customSolids: AABBBox[] = [], tolerance: number = 2): boolean {
    const feetBox: AABBBox = {
      x: box.x + 2,
      y: box.y + box.height,
      width: box.width - 4,
      height: tolerance,
    };

    const allSolids = [...this.staticSolids, ...customSolids];
    for (const solid of allSolids) {
      if (AABB.overlaps(feetBox, solid)) {
        return true;
      }
    }
    return false;
  }
}
