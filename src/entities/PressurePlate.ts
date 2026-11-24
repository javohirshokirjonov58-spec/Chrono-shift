import { BaseEntity, EntitySnapshot, TIME_POLICY_DEFAULT } from './BaseEntity';
import { AABB, AABBBox } from '../physics/AABB';

export type PlateType = 'MOMENTARY' | 'LATCHED';

export class PressurePlate extends BaseEntity {
  public static readonly DEFAULT_WIDTH = 36;
  public static readonly DEFAULT_HEIGHT = 8;

  public plateType: PlateType;
  public isPressed: boolean = false;
  private depressProgress: number = 0; // 0 (unpressed) to 1 (fully down)

  constructor(
    id: string,
    x: number,
    y: number,
    plateType: PlateType = 'MOMENTARY',
    width: number = PressurePlate.DEFAULT_WIDTH,
    height: number = PressurePlate.DEFAULT_HEIGHT
  ) {
    super(id, x, y, width, height);
    this.plateType = plateType;
    this.timePolicy = { ...TIME_POLICY_DEFAULT };
  }

  public updateState(
    dt: number,
    activators: AABBBox[] // Player, Echo, Boxes
  ): void {
    // Check if any activator intersects the plate's trigger box
    const triggerBox: AABBBox = {
      x: this.x + 2,
      y: this.y - 4,
      width: this.width - 4,
      height: this.height + 4,
    };

    let hasContact = false;
    for (const act of activators) {
      if (AABB.overlaps(triggerBox, act)) {
        hasContact = true;
        break;
      }
    }

    if (this.plateType === 'LATCHED') {
      if (hasContact) {
        this.isPressed = true;
      }
      // Stays pressed until rewound
    } else {
      this.isPressed = hasContact;
    }

    // Animation progress
    const targetProgress = this.isPressed ? 1 : 0;
    const animSpeed = 10;
    if (this.depressProgress < targetProgress) {
      this.depressProgress = Math.min(targetProgress, this.depressProgress + animSpeed * dt);
    } else if (this.depressProgress > targetProgress) {
      this.depressProgress = Math.max(targetProgress, this.depressProgress - animSpeed * dt);
    }
  }

  public update(_dt: number): void {}

  public override captureSnapshot(): EntitySnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      vx: 0,
      vy: 0,
      isActive: this.isActive,
      stateFlags: (this.isPressed ? 1 : 0),
      customTimer: this.depressProgress,
    };
  }

  public override restoreSnapshot(snapshot: EntitySnapshot): void {
    super.restoreSnapshot(snapshot);
    this.isPressed = (snapshot.stateFlags & 1) !== 0;
    this.depressProgress = snapshot.customTimer;
  }

  public render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    if (!this.isActive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const plateColor = this.isPressed ? '#00ff88' : (this.plateType === 'LATCHED' ? '#ffaa00' : '#00f0ff');
    const baseHeight = 3;
    const buttonDepress = this.depressProgress * 4;

    // Base plate mount
    ctx.fillStyle = '#1a2333';
    ctx.fillRect(0, this.height - baseHeight, this.width, baseHeight);

    // Active button part
    ctx.shadowColor = plateColor;
    ctx.shadowBlur = this.isPressed ? 10 : 4;
    ctx.fillStyle = plateColor;
    ctx.fillRect(3, 1 + buttonDepress, this.width - 6, this.height - baseHeight - 1);

    // Neon center indicator
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.width / 2 - 4, 2 + buttonDepress, 8, 2);

    ctx.restore();
  }
}
