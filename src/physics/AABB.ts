/**
 * 2D Axis-Aligned Bounding Box (AABB) and Raycast Math
 */
export interface AABBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RayHit {
  distance: number;
  point: { x: number; y: number };
  normal: { x: number; y: number };
  hitBox: AABBBox | null;
}

export class AABB {
  public static overlaps(a: AABBBox, b: AABBBox): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  public static contains(box: AABBBox, x: number, y: number): boolean {
    return (
      x >= box.x &&
      x <= box.x + box.width &&
      y >= box.y &&
      y <= box.y + box.height
    );
  }

  /**
   * Calculates minimum translation vector to separate box `a` from static box `b`
   */
  public static getSeparation(a: AABBBox, b: AABBBox): { x: number; y: number } | null {
    if (!AABB.overlaps(a, b)) return null;

    const overlapLeft = (a.x + a.width) - b.x;
    const overlapRight = (b.x + b.width) - a.x;
    const overlapTop = (a.y + a.height) - b.y;
    const overlapBottom = (b.y + b.height) - a.y;

    const minX = overlapLeft < overlapRight ? -overlapLeft : overlapRight;
    const minY = overlapTop < overlapBottom ? -overlapTop : overlapBottom;

    if (Math.abs(minX) < Math.abs(minY)) {
      return { x: minX, y: 0 };
    } else {
      return { x: 0, y: minY };
    }
  }

  /**
   * Casts a ray along X or Y axis against an array of AABBs
   */
  public static raycast(
    startX: number,
    startY: number,
    dirX: number,
    dirY: number,
    maxDistance: number,
    obstacles: AABBBox[]
  ): RayHit {
    let closestDist = maxDistance;
    let hitNormal = { x: 0, y: 0 };
    let hitBox: AABBBox | null = null;

    // Normalize dir
    const length = Math.hypot(dirX, dirY);
    if (length === 0) {
      return {
        distance: 0,
        point: { x: startX, y: startY },
        normal: { x: 0, y: 0 },
        hitBox: null,
      };
    }
    const ndx = dirX / length;
    const ndy = dirY / length;

    for (const box of obstacles) {
      // Slab method for 2D AABB
      let tNear = -Infinity;
      let tFar = Infinity;
      let normalX = 0;
      let normalY = 0;

      // X slab
      if (Math.abs(ndx) < 1e-8) {
        if (startX < box.x || startX > box.x + box.width) continue;
      } else {
        let t1 = (box.x - startX) / ndx;
        let t2 = (box.x + box.width - startX) / ndx;
        let nx = -1;
        if (t1 > t2) {
          const tmp = t1; t1 = t2; t2 = tmp;
          nx = 1;
        }
        if (t1 > tNear) {
          tNear = t1;
          normalX = nx;
          normalY = 0;
        }
        if (t2 < tFar) tFar = t2;
        if (tNear > tFar || tFar < 0) continue;
      }

      // Y slab
      if (Math.abs(ndy) < 1e-8) {
        if (startY < box.y || startY > box.y + box.height) continue;
      } else {
        let t1 = (box.y - startY) / ndy;
        let t2 = (box.y + box.height - startY) / ndy;
        let ny = -1;
        if (t1 > t2) {
          const tmp = t1; t1 = t2; t2 = tmp;
          ny = 1;
        }
        if (t1 > tNear) {
          tNear = t1;
          normalX = 0;
          normalY = ny;
        }
        if (t2 < tFar) tFar = t2;
        if (tNear > tFar || tFar < 0) continue;
      }

      if (tNear >= 0 && tNear < closestDist) {
        closestDist = tNear;
        hitNormal = { x: normalX, y: normalY };
        hitBox = box;
      }
    }

    return {
      distance: closestDist,
      point: {
        x: startX + ndx * closestDist,
        y: startY + ndy * closestDist,
      },
      normal: hitNormal,
      hitBox,
    };
  }
}
