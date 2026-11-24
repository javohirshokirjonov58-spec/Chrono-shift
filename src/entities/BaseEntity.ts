import { AABBBox } from '../physics/AABB';

/**
 * Time Policy for determining how an entity reacts to time manipulation
 */
export interface TimePolicy {
  canRewind: boolean;
  slowMoScale: number; // multiplier during slow-motion (e.g. 0.25, 0.6)
  freezeScale: number; // multiplier during freeze (0.0 or 1.0)
  isImmune: boolean;   // true for Chrono-Anchored objects
}

export const TIME_POLICY_DEFAULT: TimePolicy = {
  canRewind: true,
  slowMoScale: 0.25,
  freezeScale: 0.0,
  isImmune: false,
};

export const TIME_POLICY_PLAYER: TimePolicy = {
  canRewind: true,
  slowMoScale: 0.6,
  freezeScale: 1.0, // player moves freely in frozen world
  isImmune: false,
};

export const TIME_POLICY_ANCHORED: TimePolicy = {
  canRewind: false, // does NOT rewind
  slowMoScale: 1.0,  // does NOT slow down
  freezeScale: 1.0,  // does NOT freeze
  isImmune: true,
};

/**
 * Snapshot structure for deterministic rewind
 */
export interface EntitySnapshot {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isActive: boolean;
  stateFlags: number;  // Bitmask for flags (grounded, active, open, pressed, etc.)
  customTimer: number; // Platform phase, laser cycle, door animation
}

export interface ITimeAware {
  timePolicy: TimePolicy;
  captureSnapshot(): EntitySnapshot;
  restoreSnapshot(snapshot: EntitySnapshot): void;
}

export abstract class BaseEntity implements ITimeAware {
  public id: string;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public vx: number = 0;
  public vy: number = 0;
  public isActive: boolean = true;
  public timePolicy: TimePolicy = { ...TIME_POLICY_DEFAULT };

  constructor(id: string, x: number, y: number, width: number, height: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  public getBox(): AABBBox {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  public abstract update(dt: number): void;
  public abstract render(ctx: CanvasRenderingContext2D, alpha: number): void;

  public captureSnapshot(): EntitySnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      isActive: this.isActive,
      stateFlags: 0,
      customTimer: 0,
    };
  }

  public restoreSnapshot(snapshot: EntitySnapshot): void {
    if (this.timePolicy.isImmune) {
      // Anchored objects do not restore their state!
      return;
    }
    this.x = snapshot.x;
    this.y = snapshot.y;
    this.vx = snapshot.vx;
    this.vy = snapshot.vy;
    this.isActive = snapshot.isActive;
  }
}
