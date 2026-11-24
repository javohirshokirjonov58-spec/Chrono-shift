import { PhysicsWorld } from '../physics/PhysicsWorld';
import { BaseEntity } from '../entities/BaseEntity';
import { Player } from '../entities/Player';
import { HistoryBuffer } from '../core/HistoryBuffer';
import { TimeManager } from '../core/TimeManager';

export class DebugView {
  public enabled: boolean = false;
  private fps: number = 60;
  private lastFpsUpdate: number = performance.now();
  private framesCount: number = 0;

  constructor() {}

  public toggle(): void {
    this.enabled = !this.enabled;
  }

  public update(): void {
    this.framesCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.fps = Math.round((this.framesCount * 1000) / (now - this.lastFpsUpdate));
      this.framesCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    physics: PhysicsWorld,
    entities: BaseEntity[],
    player: Player,
    timeManager: TimeManager,
    buffer: HistoryBuffer,
    currentTick: number
  ): void {
    if (!this.enabled) return;

    ctx.save();

    // 1. Draw Hitboxes
    // Static solids (green)
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.7)';
    ctx.lineWidth = 1;
    for (const solid of physics.getStaticSolids()) {
      ctx.strokeRect(solid.x, solid.y, solid.width, solid.height);
    }

    // Entities (cyan / orange / purple)
    for (const ent of entities) {
      ctx.strokeStyle = ent.timePolicy.isImmune ? '#c742ff' : 'rgba(0, 200, 255, 0.8)';
      ctx.strokeRect(ent.x, ent.y, ent.width, ent.height);
    }

    // Player (yellow)
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(player.x, player.y, player.width, player.height);

    // Player velocity vector
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y + player.height / 2);
    ctx.lineTo(
      player.x + player.width / 2 + player.vx * 0.15,
      player.y + player.height / 2 + player.vy * 0.15
    );
    ctx.stroke();

    // 2. Telemetry HUD panel (Top-Left under time meter)
    const panelX = 24;
    const panelY = 80;
    const panelW = 260;
    const panelH = 150;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.font = '11px "JetBrains Mono"';
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'left';

    const lines = [
      `[DEBUG OVERLAY ACTIVE (F3)]`,
      `FPS: ${this.fps} (Target: 60)`,
      `ENGINE TICK: ${currentTick}`,
      `TIME STATE: ${timeManager.getState()}`,
      `BUFFER: ${buffer.getCount()} / ${buffer.getCapacity()} frames (${(buffer.getFillRatio() * 100).toFixed(1)}%)`,
      `PLAYER POS: (${Math.round(player.x)}, ${Math.round(player.y)})`,
      `PLAYER VEL: (${Math.round(player.vx)}, ${Math.round(player.vy)})`,
      `GROUNDED: ${player.isGrounded} | DEAD: ${player.isDead}`,
      `ENTITIES COUNT: ${entities.length}`,
    ];

    lines.forEach((line, idx) => {
      ctx.fillText(line, panelX + 10, panelY + 18 + idx * 14);
    });

    ctx.restore();
  }
}
