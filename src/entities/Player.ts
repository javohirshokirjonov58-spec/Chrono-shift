import { BaseEntity, EntitySnapshot, TIME_POLICY_PLAYER } from './BaseEntity';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { InputManager } from '../core/InputManager';
import { AABB, AABBBox } from '../physics/AABB';
import { ChronoBox } from './ChronoBox';
import { MovingPlatform } from './MovingPlatform';
import { Door } from './Door';

export class Player extends BaseEntity {
  public static readonly WIDTH = 24;
  public static readonly HEIGHT = 38;

  // Movement physics parameters (responsive & solid jump curve)
  public static readonly ACCELERATION = 1500; // px/s^2
  public static readonly FRICTION = 1200;     // px/s^2
  public static readonly MAX_SPEED = 260;     // px/s
  public static readonly JUMP_FORCE = -480;   // px/s (comfortable 117px jump height)
  public static readonly VARIABLE_JUMP_CUT = 0.5;

  public facing: 1 | -1 = 1;
  public isGrounded: boolean = false;
  public isDead: boolean = false;
  public carriedBox: ChronoBox | null = null;
  public currentPlatform: MovingPlatform | null = null;

  // Coyote time & Jump buffer
  private coyoteTimer: number = 0;
  private readonly COYOTE_DURATION: number = 0.12; // 120ms

  // Animation states
  private animTimer: number = 0;
  private isRunning: boolean = false;

  constructor(id: string = 'player', x: number = 100, y: number = 100) {
    super(id, x, y, Player.WIDTH, Player.HEIGHT);
    this.timePolicy = { ...TIME_POLICY_PLAYER };
  }

  public isNearBox(boxes: ChronoBox[]): boolean {
    if (this.carriedBox) return true;
    const reachBox: AABBBox = {
      x: this.x - 20,
      y: this.y - 10,
      width: this.width + 40,
      height: this.height + 20,
    };
    return boxes.some((b) => !b.isCarried && AABB.overlaps(reachBox, b.getBox()));
  }

  public updateController(
    dt: number,
    input: InputManager,
    physics: PhysicsWorld,
    boxes: ChronoBox[] = [],
    platforms: MovingPlatform[] = [],
    doors: Door[] = []
  ): void {
    if (this.isDead) return;

    // 0. Passenger Physics: If standing on a moving platform, follow its movement
    if (this.currentPlatform) {
      this.x += this.currentPlatform.vx * dt;
      this.y += this.currentPlatform.vy * dt;
    }

    // 1. Horizontal movement
    const left = input.isDown('left');
    const right = input.isDown('right');

    if (left && !right) {
      this.vx = Math.max(-Player.MAX_SPEED, this.vx - Player.ACCELERATION * dt);
      this.facing = -1;
      this.isRunning = true;
    } else if (right && !left) {
      this.vx = Math.min(Player.MAX_SPEED, this.vx + Player.ACCELERATION * dt);
      this.facing = 1;
      this.isRunning = true;
    } else {
      // Apply friction
      this.isRunning = false;
      if (this.vx > 0) {
        this.vx = Math.max(0, this.vx - Player.FRICTION * dt);
      } else if (this.vx < 0) {
        this.vx = Math.min(0, this.vx + Player.FRICTION * dt);
      }
    }

    // 2. Coyote Time
    if (this.isGrounded) {
      this.coyoteTimer = this.COYOTE_DURATION;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    // 3. Jump handling (buffered + coyote)
    if (input.hasBuffered('jump') && this.coyoteTimer > 0) {
      input.consumeBuffered('jump');
      this.vy = Player.JUMP_FORCE;
      this.coyoteTimer = 0;
      this.isGrounded = false;
      this.currentPlatform = null;
    }

    // Variable jump height: cut jump short if space is released
    if (input.wasReleased('jump') && this.vy < 0) {
      this.vy *= Player.VARIABLE_JUMP_CUT;
    }

    // 4. Gravity
    this.vy = Math.min(
      PhysicsWorld.TERMINAL_VELOCITY,
      this.vy + PhysicsWorld.GRAVITY * dt
    );

    // 5. Box carrying / picking up
    if (input.wasPressed('interact')) {
      if (this.carriedBox) {
        // Drop box in front
        this.carriedBox.isCarried = false;
        this.carriedBox.x = this.x + (this.facing === 1 ? this.width + 4 : -this.carriedBox.width - 4);
        this.carriedBox.y = this.y + (this.height - this.carriedBox.height);
        this.carriedBox.vx = this.vx + this.facing * 80;
        this.carriedBox.vy = -100;
        this.carriedBox = null;
      } else {
        // Try pick up nearby box
        const reachBox: AABBBox = {
          x: this.x - 20,
          y: this.y - 10,
          width: this.width + 40,
          height: this.height + 20,
        };
        for (const box of boxes) {
          if (!box.isCarried && AABB.overlaps(reachBox, box.getBox())) {
            this.carriedBox = box;
            box.isCarried = true;
            break;
          }
        }
      }
    }

    // 6. Solid colliders: static geometry + uncarried boxes + moving platforms + closed doors
    const customSolids: AABBBox[] = [];
    for (const box of boxes) {
      if (box !== this.carriedBox && !box.isCarried) {
        customSolids.push(box.getBox());
      }
    }
    for (const plat of platforms) {
      customSolids.push(plat.getBox());
    }
    for (const door of doors) {
      const solid = door.getSolidBox();
      if (solid) {
        customSolids.push(solid);
      }
    }

    // 7. Move and resolve collisions
    const result = physics.moveAndSlide(
      this.getBox(),
      this.vx,
      this.vy,
      dt,
      customSolids
    );

    this.x = result.x;
    this.y = result.y;
    this.vx = result.vx;
    this.vy = result.vy;
    this.isGrounded = result.isGrounded;

    // Check if grounded on a moving platform
    this.currentPlatform = null;
    if (this.isGrounded) {
      const feetBox: AABBBox = {
        x: this.x + 2,
        y: this.y + this.height,
        width: this.width - 4,
        height: 3,
      };
      for (const plat of platforms) {
        if (AABB.overlaps(feetBox, plat.getBox())) {
          this.currentPlatform = plat;
          break;
        }
      }
    }

    // Update carried box position above player head
    if (this.carriedBox) {
      this.carriedBox.x = this.x + (this.width - this.carriedBox.width) / 2;
      this.carriedBox.y = this.y - this.carriedBox.height - 4;
      this.carriedBox.vx = this.vx;
      this.carriedBox.vy = this.vy;
    }

    // Animation timer
    if (this.isRunning && this.isGrounded) {
      this.animTimer += dt * 10;
    } else {
      this.animTimer = 0;
    }
  }

  public update(dt: number): void {
    // Basic fallback if updateController not called
  }

  public kill(): void {
    this.isDead = true;
    this.vx = 0;
    this.vy = 0;
    if (this.carriedBox) {
      this.carriedBox.isCarried = false;
      this.carriedBox = null;
    }
  }

  public revive(): void {
    this.isDead = false;
  }

  public override captureSnapshot(): EntitySnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      isActive: this.isActive,
      stateFlags: (this.isGrounded ? 1 : 0) | (this.isDead ? 2 : 0) | (this.facing === 1 ? 4 : 0),
      customTimer: this.coyoteTimer,
    };
  }

  public override restoreSnapshot(snapshot: EntitySnapshot): void {
    super.restoreSnapshot(snapshot);
    this.isGrounded = (snapshot.stateFlags & 1) !== 0;
    this.isDead = (snapshot.stateFlags & 2) !== 0;
    this.facing = (snapshot.stateFlags & 4) !== 0 ? 1 : -1;
    this.coyoteTimer = snapshot.customTimer;
  }

  public render(ctx: CanvasRenderingContext2D, alpha: number): void {
    if (!this.isActive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isDead) {
      // Glitched red silhouette on death
      ctx.fillStyle = 'rgba(255, 51, 102, 0.7)';
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 12;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
      return;
    }

    // Character drawing: Cybernetic Chrono-Suit
    const walkBob = Math.sin(this.animTimer) * 2;
    const bodyWidth = this.width;
    const bodyHeight = this.height;

    // Outer glow
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;

    // Main body armor (deep dark cyan/blue suit)
    ctx.fillStyle = '#0f293d';
    ctx.fillRect(2, 6 + walkBob, bodyWidth - 4, bodyHeight - 12);

    // Glowing Chrono Core (chest piece)
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(8, 12 + walkBob, bodyWidth - 16, 8);

    // Visor / Helmet
    ctx.fillStyle = '#1a3c5a';
    ctx.fillRect(4, 0 + walkBob, bodyWidth - 8, 10);
    // Visor glow line facing forward
    ctx.fillStyle = '#00ffcc';
    if (this.facing === 1) {
      ctx.fillRect(bodyWidth - 10, 3 + walkBob, 6, 3);
    } else {
      ctx.fillRect(4, 3 + walkBob, 6, 3);
    }

    // Legs / Boots
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a1a29';
    if (this.isGrounded && this.isRunning) {
      const legOffset = Math.sin(this.animTimer) * 4;
      ctx.fillRect(3, bodyHeight - 8, 7, 8 + legOffset);
      ctx.fillRect(bodyWidth - 10, bodyHeight - 8, 7, 8 - legOffset);
    } else {
      ctx.fillRect(3, bodyHeight - 6, 7, 6);
      ctx.fillRect(bodyWidth - 10, bodyHeight - 6, 7, 6);
    }

    // Suit Accents (neon stripes)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(2, 6 + walkBob, bodyWidth - 4, bodyHeight - 12);

    ctx.restore();
  }
}
