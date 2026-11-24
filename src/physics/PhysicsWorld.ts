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

    // 1. Move horizontally
    newX += vx * dt;
    const testBoxX: AABBBox = { x: newX, y: box.y, width: box.width, height: box.height };

    for (const solid of allSolids) {
      if (AABB.overlaps(testBoxX, solid)) {
        if (vx > 0) {
          // moving right -> hit left side of solid
          newX = solid.x - box.width;
          newVx = 0;
          hitWall = true;
        } else if (vx < 0) {
          // moving left -> hit right side of solid
          newX = solid.x + solid.width;
          newVx = 0;
          hitWall = true;
        }
        testBoxX.x = newX;
      }
    }

    // 2. Move vertically
    newY += vy * dt;
    const testBoxY: AABBBox = { x: newX, y: newY, width: box.width, height: box.height };

    for (const solid of allSolids) {
      if (AABB.overlaps(testBoxY, solid)) {
        if (vy > 0) {
          // falling -> hit floor
          newY = solid.y - box.height;
          newVy = 0;
          isGrounded = true;
        } else if (vy < 0) {
          // jumping -> hit ceiling
          newY = solid.y + solid.height;
          newVy = 0;
          hitCeiling = true;
        }
        testBoxY.y = newY;
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
