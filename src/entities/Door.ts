import { BaseEntity, EntitySnapshot, TIME_POLICY_DEFAULT } from './BaseEntity';
import { AABB, AABBBox } from '../physics/AABB';

export type LogicGate = 'AND' | 'OR' | 'XOR';

export class Door extends BaseEntity {
  public static readonly DEFAULT_WIDTH = 16;
  public static readonly DEFAULT_HEIGHT = 64;

  public linkedTriggers: string[];
  public logicGate: LogicGate;
  public isOpen: boolean = false;
  public targetOpen: boolean = false;
  public openProgress: number = 0; // 0 = fully closed (solid), 1 = fully open (passable)

  constructor(
    id: string,
    x: number,
    y: number,
    width: number = Door.DEFAULT_WIDTH,
    height: number = Door.DEFAULT_HEIGHT,
    linkedTriggers: string[] = [],
    logicGate: LogicGate = 'AND'
  ) {
    super(id, x, y, width, height);
    this.linkedTriggers = linkedTriggers;
    this.logicGate = logicGate;
    this.timePolicy = { ...TIME_POLICY_DEFAULT };
  }

  public evaluateTriggers(activeTriggerIds: Set<string>): void {
    if (this.linkedTriggers.length === 0) {
      this.targetOpen = false;
      return;
    }

    const states = this.linkedTriggers.map((id) => activeTriggerIds.has(id));

    switch (this.logicGate) {
      case 'AND':
        this.targetOpen = states.every((s) => s);
        break;
      case 'OR':
        this.targetOpen = states.some((s) => s);
        break;
      case 'XOR':
        this.targetOpen = states.filter((s) => s).length === 1;
        break;
    }
  }

  public update(dt: number): void {
    const speed = 4.0; // opens/closes in 0.25 seconds
    if (this.targetOpen && this.openProgress < 1) {
      this.openProgress = Math.min(1, this.openProgress + speed * dt);
    } else if (!this.targetOpen && this.openProgress > 0) {
      this.openProgress = Math.max(0, this.openProgress - speed * dt);
    }

    this.isOpen = this.openProgress >= 0.85;
  }

  /**
   * Returns solid collision box when door is closing or closed.
   * Decreases height as door retracts upwards.
   */
  public getSolidBox(): AABBBox | null {
    if (this.isOpen) return null;

    const remainingHeight = this.height * (1 - this.openProgress);
    if (remainingHeight <= 2) return null;

    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: remainingHeight,
    };
  }

  /**
   * Anti-crush check: if player is caught inside closing door, push player out
   */
  public resolveCrush(playerBox: AABBBox): { x: number; y: number } | null {
    const solid = this.getSolidBox();
    if (!solid) return null;
    return AABB.getSeparation(playerBox, solid);
  }

  public override captureSnapshot(): EntitySnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      vx: 0,
      vy: 0,
      isActive: this.isActive,
      stateFlags: (this.isOpen ? 1 : 0) | (this.targetOpen ? 2 : 0),
      customTimer: this.openProgress,
    };
  }

  public override restoreSnapshot(snapshot: EntitySnapshot): void {
    super.restoreSnapshot(snapshot);
    this.isOpen = (snapshot.stateFlags & 1) !== 0;
    this.targetOpen = (snapshot.stateFlags & 2) !== 0;
    this.openProgress = snapshot.customTimer;
  }

  public render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    if (!this.isActive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const doorColor = this.targetOpen ? '#00ff88' : '#00f0ff';
    const remainingH = this.height * (1 - this.openProgress);

    // Frame rail
    ctx.fillStyle = '#111824';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = '#2b3952';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, this.width, this.height);

    // Retracting Barrier
    if (remainingH > 2) {
      ctx.shadowColor = doorColor;
      ctx.shadowBlur = 8;
      ctx.fillStyle = this.targetOpen ? '#003322' : '#0a2538';
      ctx.fillRect(2, 0, this.width - 4, remainingH);

      ctx.strokeStyle = doorColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 0, this.width - 4, remainingH);

      // Energy bar glyphs
      ctx.fillStyle = doorColor;
      for (let y = 8; y < remainingH - 4; y += 12) {
        ctx.fillRect(4, y, this.width - 8, 3);
      }
    }

    ctx.restore();
  }
}
