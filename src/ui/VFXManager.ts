import { TimeState } from '../core/TimeManager';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export class VFXManager {
  private particles: Particle[] = [];
  private glitchOffset: number = 0;
  private animTimer: number = 0;

  constructor() {}

  public addSparks(x: number, y: number, color: string = '#00f0ff', count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 1.5 + Math.random() * 2.5,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.3 + Math.random() * 0.3,
      });
    }
  }

  public update(dt: number, timeState: TimeState): void {
    this.animTimer += dt;

    if (timeState === 'REWIND') {
      this.glitchOffset = (Math.random() - 0.5) * 8;
      // Add rewind particles floating upwards/backwards
      if (Math.random() < 0.4) {
        this.particles.push({
          x: Math.random() * 1280,
          y: 720,
          vx: (Math.random() - 0.5) * 60,
          vy: -150 - Math.random() * 200,
          color: '#ffaa00',
          size: 2,
          life: 0.8,
          maxLife: 0.8,
        });
      }
    } else {
      this.glitchOffset = 0;
    }

    // Update particle lifetimes
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public renderParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  /**
   * Post-processing overlay effects applied on top of the canvas
   */
  public renderScreenOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeState: TimeState,
    isDeathWindow: boolean,
    deathTimer: number
  ): void {
    ctx.save();

    // 1. Slow-Motion effect: Cool cyan vignette + subtle scanlines
    if (timeState === 'SLOW_MO') {
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.7);
      grad.addColorStop(0, 'rgba(0, 180, 255, 0.0)');
      grad.addColorStop(1, 'rgba(0, 140, 255, 0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Cyan label
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 16px "JetBrains Mono"';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillText('◀◀ SLOW-MOTION (0.25x)', 32, height - 36);
    }

    // 2. Time Freeze effect: Icy blue frost border + desaturation tint
    if (timeState === 'FREEZE') {
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.75);
      grad.addColorStop(0, 'rgba(150, 220, 255, 0.0)');
      grad.addColorStop(1, 'rgba(120, 200, 255, 0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(200, 245, 255, 0.4)';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, width - 12, height - 12);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "JetBrains Mono"';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 10;
      ctx.fillText('❄ TIME FROZEN (0.00x)', 32, height - 36);
    }

    // 3. Rewind effect: VHS lines, amber chromatic scanlines & rewinding indicator
    if (timeState === 'REWIND') {
      // Amber/Gold scanlines
      ctx.fillStyle = 'rgba(255, 170, 0, 0.08)';
      ctx.fillRect(0, 0, width, height);

      // VHS horizontal tracking band
      const bandY = (this.animTimer * 200) % height;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(0, bandY, width, 18);

      // REWIND text
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 20px "JetBrains Mono"';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 12;
      ctx.fillText('◀◀ REWINDING TIME', 32, height - 36);
    }

    // 4. Death & Emergency "Rewind to Survive" Window
    if (isDeathWindow) {
      const pulse = (Math.sin(this.animTimer * 12) + 1) / 2;
      ctx.fillStyle = `rgba(255, 20, 50, ${0.2 + pulse * 0.25})`;
      ctx.fillRect(0, 0, width, height);

      // Warning text in center
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 16;
      ctx.font = 'bold 36px "Chakra Petch"';
      ctx.fillText('PARADOX DETECTED - LETHAL HIT', width / 2, height / 2 - 20);

      ctx.font = 'bold 22px "JetBrains Mono"';
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(`HOLD [ R ] TO REWIND AND SURVIVE (${deathTimer.toFixed(1)}s)`, width / 2, height / 2 + 25);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }
}
