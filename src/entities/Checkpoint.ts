import { BaseEntity, EntitySnapshot, TIME_POLICY_DEFAULT } from './BaseEntity';
import { AABB, AABBBox } from '../physics/AABB';

export class Checkpoint extends BaseEntity {
  public static readonly WIDTH = 32;
  public static readonly HEIGHT = 48;

  public isActivated: boolean = false;
  private animTimer: number = 0;

  constructor(id: string, x: number, y: number) {
    super(id, x, y, Checkpoint.WIDTH, Checkpoint.HEIGHT);
    this.timePolicy = { ...TIME_POLICY_DEFAULT };
  }

  public checkActivation(playerBox: AABBBox): boolean {
    if (!this.isActivated && AABB.overlaps(this.getBox(), playerBox)) {
      this.isActivated = true;
      return true;
    }
    return false;
  }

  public update(dt: number): void {
    this.animTimer += dt * 3;
  }

  public override captureSnapshot(): EntitySnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      vx: 0,
      vy: 0,
      isActive: this.isActive,
      stateFlags: this.isActivated ? 1 : 0,
      customTimer: 0,
    };
  }

  public override restoreSnapshot(snapshot: EntitySnapshot): void {
    super.restoreSnapshot(snapshot);
    this.isActivated = (snapshot.stateFlags & 1) !== 0;
  }

  public render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    if (!this.isActive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const glowColor = this.isActivated ? '#00ff88' : '#556677';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = this.isActivated ? 12 : 2;

    // Base pedestal
    ctx.fillStyle = '#162235';
    ctx.fillRect(0, this.height - 8, this.width, 8);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, this.height - 8, this.width, 8);

    // Floating Chrono Ring
    const floatY = this.height / 2 - 4 + Math.sin(this.animTimer) * 4;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.width / 2, floatY, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Center Core Gem
    ctx.fillStyle = this.isActivated ? '#00ffaa' : '#334455';
    ctx.beginPath();
    ctx.arc(this.width / 2, floatY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
