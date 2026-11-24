import { BaseEntity, EntitySnapshot, TIME_POLICY_DEFAULT } from './BaseEntity';

export interface Waypoint {
  x: number;
  y: number;
}

export class MovingPlatform extends BaseEntity {
  public waypoints: Waypoint[];
  public speed: number;
  public waitDuration: number;

  private currentTargetIndex: number = 0;
  private waitTimer: number = 0;
  private isReversed: boolean = false;

  constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    waypoints: Waypoint[] = [],
    speed: number = 80,
    waitDuration: number = 0.5
  ) {
    super(id, x, y, width, height);
    this.waypoints = waypoints.length > 0 ? waypoints : [{ x, y }];
    this.speed = speed;
    this.waitDuration = waitDuration;
    this.timePolicy = { ...TIME_POLICY_DEFAULT };
  }

  public update(dt: number): void {
    if (this.waypoints.length <= 1) return;

    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      this.vx = 0;
      this.vy = 0;
      return;
    }

    const target = this.waypoints[this.currentTargetIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    const step = this.speed * dt;
    if (dist <= step) {
      // Arrived at waypoint
      this.x = target.x;
      this.y = target.y;
      this.vx = 0;
      this.vy = 0;
      this.waitTimer = this.waitDuration;

      // Ping-pong between waypoints
      if (!this.isReversed) {
        if (this.currentTargetIndex < this.waypoints.length - 1) {
          this.currentTargetIndex++;
        } else {
          this.isReversed = true;
          this.currentTargetIndex = Math.max(0, this.waypoints.length - 2);
        }
      } else {
        if (this.currentTargetIndex > 0) {
          this.currentTargetIndex--;
        } else {
          this.isReversed = false;
          this.currentTargetIndex = Math.min(1, this.waypoints.length - 1);
        }
      }
    } else {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
  }

  public override captureSnapshot(): EntitySnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      isActive: this.isActive,
      stateFlags: (this.isReversed ? 1 : 0) | (this.currentTargetIndex << 4),
      customTimer: this.waitTimer,
    };
  }

  public override restoreSnapshot(snapshot: EntitySnapshot): void {
    super.restoreSnapshot(snapshot);
    this.isReversed = (snapshot.stateFlags & 1) !== 0;
    this.currentTargetIndex = (snapshot.stateFlags >> 4) & 0x0f;
    this.waitTimer = snapshot.customTimer;
  }

  public render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    if (!this.isActive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Platform Body
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#102235';
    ctx.fillRect(0, 0, this.width, this.height);

    // Metallic frame
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, this.width - 2, this.height - 2);

    // Hazard stripes or techno arrows
    ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
    const arrowSpacing = 20;
    for (let px = 10; px < this.width - 10; px += arrowSpacing) {
      ctx.fillRect(px, 3, 6, this.height - 6);
    }

    // Waypoint trail indicator
    ctx.restore();
  }
}
