import { BaseEntity, EntitySnapshot, TIME_POLICY_DEFAULT } from './BaseEntity';
import { AABB, AABBBox, RayHit } from '../physics/AABB';

export type LaserDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type LaserMode = 'CONTINUOUS' | 'PULSATING';

export class LaserEmitter extends BaseEntity {
  public static readonly SIZE = 24;

  public direction: LaserDirection;
  public mode: LaserMode;
  public intervalOn: number;
  public intervalOff: number;
  public isEmitting: boolean = true;
  public maxRange: number = 800;

  public cycleTimer: number = 0;
  public currentRayHit: RayHit | null = null;

  constructor(
    id: string,
    x: number,
    y: number,
    direction: LaserDirection = 'RIGHT',
    mode: LaserMode = 'CONTINUOUS',
    intervalOn: number = 2.0,
    intervalOff: number = 2.0
  ) {
    super(id, x, y, LaserEmitter.SIZE, LaserEmitter.SIZE);
    this.direction = direction;
    this.mode = mode;
    this.intervalOn = intervalOn;
    this.intervalOff = intervalOff;
    this.timePolicy = { ...TIME_POLICY_DEFAULT };
  }

  public update(dt: number): void {
    if (this.mode === 'PULSATING') {
      this.cycleTimer += dt;
      const totalCycle = this.intervalOn + this.intervalOff;
      const currentInCycle = this.cycleTimer % totalCycle;
      this.isEmitting = currentInCycle < this.intervalOn;
    } else {
      this.isEmitting = true;
    }
  }

  /**
   * Recalculates raycast beam endpoint against obstacles
   */
  public castBeam(obstacles: AABBBox[]): RayHit | null {
    if (!this.isEmitting) {
      this.currentRayHit = null;
      return null;
    }

    let startX = this.x + this.width / 2;
    let startY = this.y + this.height / 2;
    let dirX = 0;
    let dirY = 0;

    switch (this.direction) {
      case 'RIGHT':
        startX = this.x + this.width;
        dirX = 1;
        break;
      case 'LEFT':
        startX = this.x;
        dirX = -1;
        break;
      case 'DOWN':
        startY = this.y + this.height;
        dirY = 1;
        break;
      case 'UP':
        startY = this.y;
        dirY = -1;
        break;
    }

    this.currentRayHit = AABB.raycast(
      startX,
      startY,
      dirX,
      dirY,
      this.maxRange,
      obstacles
    );

    return this.currentRayHit;
  }

  /**
   * Returns a thin AABB representing the active beam for collision
   */
  public getBeamBox(): AABBBox | null {
    if (!this.isEmitting || !this.currentRayHit) return null;

    let startX = this.x + this.width / 2;
    let startY = this.y + this.height / 2;
    const hit = this.currentRayHit.point;
    const thickness = 4;

    switch (this.direction) {
      case 'RIGHT':
        return {
          x: this.x + this.width,
          y: startY - thickness / 2,
          width: Math.max(0, hit.x - (this.x + this.width)),
          height: thickness,
        };
      case 'LEFT':
        return {
          x: hit.x,
          y: startY - thickness / 2,
          width: Math.max(0, this.x - hit.x),
          height: thickness,
        };
      case 'DOWN':
        return {
          x: startX - thickness / 2,
          y: this.y + this.height,
          width: thickness,
          height: Math.max(0, hit.y - (this.y + this.height)),
        };
      case 'UP':
        return {
          x: startX - thickness / 2,
          y: hit.y,
          width: thickness,
          height: Math.max(0, this.y - hit.y),
        };
    }
  }

  public override captureSnapshot(): EntitySnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      vx: 0,
      vy: 0,
      isActive: this.isActive,
      stateFlags: this.isEmitting ? 1 : 0,
      customTimer: this.cycleTimer,
    };
  }

  public override restoreSnapshot(snapshot: EntitySnapshot): void {
    super.restoreSnapshot(snapshot);
    this.isEmitting = (snapshot.stateFlags & 1) !== 0;
    this.cycleTimer = snapshot.customTimer;
  }

  public render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    if (!this.isActive) return;

    // 1. Draw Emitter housing
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = '#191f2e';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = this.isEmitting ? '#ff3366' : '#555566';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, this.width - 2, this.height - 2);

    // Emitter lens
    ctx.fillStyle = this.isEmitting ? '#ff0044' : '#333344';
    ctx.shadowColor = this.isEmitting ? '#ff0044' : 'transparent';
    ctx.shadowBlur = this.isEmitting ? 8 : 0;
    const center = this.width / 2;
    ctx.beginPath();
    ctx.arc(center, center, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 2. Draw Beam if active
    if (this.isEmitting && this.currentRayHit) {
      let startX = this.x + this.width / 2;
      let startY = this.y + this.height / 2;
      if (this.direction === 'RIGHT') startX = this.x + this.width;
      if (this.direction === 'LEFT') startX = this.x;
      if (this.direction === 'DOWN') startY = this.y + this.height;
      if (this.direction === 'UP') startY = this.y;

      const hit = this.currentRayHit.point;

      ctx.save();
      // Outer red glow
      ctx.shadowColor = '#ff1155';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(255, 30, 80, 0.8)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(hit.x, hit.y);
      ctx.stroke();

      // Inner white core
      ctx.shadowBlur = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(hit.x, hit.y);
      ctx.stroke();

      // Hit spark effect
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}
