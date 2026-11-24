import { BaseEntity, EntitySnapshot, TIME_POLICY_DEFAULT, TIME_POLICY_ANCHORED } from './BaseEntity';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { AABB, AABBBox } from '../physics/AABB';
import { MovingPlatform } from './MovingPlatform';
import { Door } from './Door';

export type BoxType = 'NORMAL' | 'ANCHORED';

export class ChronoBox extends BaseEntity {
  public static readonly SIZE = 28;

  public boxType: BoxType;
  public isCarried: boolean = false;
  public isGrounded: boolean = false;
  public currentPlatform: MovingPlatform | null = null;

  constructor(id: string, x: number, y: number, boxType: BoxType = 'NORMAL') {
    super(id, x, y, ChronoBox.SIZE, ChronoBox.SIZE);
    this.boxType = boxType;

    if (boxType === 'ANCHORED') {
      this.timePolicy = { ...TIME_POLICY_ANCHORED };
    } else {
      this.timePolicy = { ...TIME_POLICY_DEFAULT };
    }
  }

  public updatePhysics(
    dt: number,
    physics: PhysicsWorld,
    otherBoxes: ChronoBox[] = [],
    platforms: MovingPlatform[] = [],
    doors: Door[] = []
  ): void {
    if (this.isCarried) {
      this.vx = 0;
      this.vy = 0;
      this.currentPlatform = null;
      return;
    }

    // Follow moving platform if resting on one
    if (this.currentPlatform) {
      this.x += this.currentPlatform.vx * dt;
      this.y += this.currentPlatform.vy * dt;
    }

    // Apply gravity
    this.vy = Math.min(
      PhysicsWorld.TERMINAL_VELOCITY,
      this.vy + PhysicsWorld.GRAVITY * dt
    );

    // Box friction
    if (this.vx > 0) {
      this.vx = Math.max(0, this.vx - 800 * dt);
    } else if (this.vx < 0) {
      this.vx = Math.min(0, this.vx + 800 * dt);
    }

    // Collide against other non-carried boxes + platforms + doors
    const solids: AABBBox[] = [];
    for (const b of otherBoxes) {
      if (b !== this && !b.isCarried) {
        solids.push(b.getBox());
      }
    }
    for (const p of platforms) {
      solids.push(p.getBox());
    }
    for (const d of doors) {
      const solid = d.getSolidBox();
      if (solid) solids.push(solid);
    }

    const res = physics.moveAndSlide(this.getBox(), this.vx, this.vy, dt, solids);
    this.x = res.x;
    this.y = res.y;
    this.vx = res.vx;
    this.vy = res.vy;
    this.isGrounded = res.isGrounded;

    // Check if resting on a moving platform
    this.currentPlatform = null;
    if (this.isGrounded) {
      const bottomBox: AABBBox = {
        x: this.x + 2,
        y: this.y + this.height,
        width: this.width - 4,
        height: 3,
      };
      for (const p of platforms) {
        if (AABB.overlaps(bottomBox, p.getBox())) {
          this.currentPlatform = p;
          break;
        }
      }
    }
  }

  public update(dt: number): void {
    // Basic fallback
  }

  public override captureSnapshot(): EntitySnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      isActive: this.isActive,
      stateFlags: (this.isCarried ? 1 : 0) | (this.isGrounded ? 2 : 0),
      customTimer: 0,
    };
  }

  public override restoreSnapshot(snapshot: EntitySnapshot): void {
    if (this.timePolicy.isImmune) {
      // Anchored boxes NEVER restore their position or state from snapshots!
      return;
    }
    super.restoreSnapshot(snapshot);
    this.isCarried = (snapshot.stateFlags & 1) !== 0;
    this.isGrounded = (snapshot.stateFlags & 2) !== 0;
  }

  public render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    if (!this.isActive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const isAnchored = this.boxType === 'ANCHORED';
    const mainColor = isAnchored ? '#c742ff' : '#00f0ff';
    const bgColor = isAnchored ? '#260a36' : '#082030';
    const innerColor = isAnchored ? '#e085ff' : '#6df7ff';

    // Outer glow
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = isAnchored ? 12 : 6;

    // Body
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // Neon Frame
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, this.width - 2, this.height - 2);

    // Inner Chrono Core glyph
    ctx.fillStyle = innerColor;
    ctx.shadowBlur = 4;
    const center = this.width / 2;
    if (isAnchored) {
      // Hourglass / Anchor diamond
      ctx.beginPath();
      ctx.moveTo(center, 5);
      ctx.lineTo(this.width - 5, center);
      ctx.lineTo(center, this.height - 5);
      ctx.lineTo(5, center);
      ctx.closePath();
      ctx.fill();

      // Anchor dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(center, center, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Normal chrono square with concentric lines
      ctx.fillRect(center - 4, center - 4, 8, 8);
      ctx.strokeStyle = innerColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(4, 4); ctx.lineTo(center - 4, center - 4);
      ctx.moveTo(this.width - 4, 4); ctx.lineTo(center + 4, center - 4);
      ctx.moveTo(4, this.height - 4); ctx.lineTo(center - 4, center + 4);
      ctx.moveTo(this.width - 4, this.height - 4); ctx.lineTo(center + 4, center + 4);
      ctx.stroke();
    }

    ctx.restore();
  }
}
