export interface TutorialHint {
  x: number;
  y: number;
  text: string;
  subText?: string;
}

export class TutorialOverlay {
  private hints: TutorialHint[] = [];

  constructor() {}

  public setHints(hints: TutorialHint[]): void {
    this.hints = [...hints];
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    if (this.hints.length === 0) return;

    ctx.save();
    for (const hint of this.hints) {
      const screenX = hint.x - cameraX;
      const screenY = hint.y - cameraY;

      // Draw diegetic hologram plaque
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px "JetBrains Mono"';
      const textMetrics = ctx.measureText(hint.text);
      const plaqueW = Math.max(160, textMetrics.width + 24);
      const plaqueH = hint.subText ? 44 : 32;

      ctx.fillStyle = 'rgba(10, 20, 32, 0.75)';
      ctx.fillRect(screenX - plaqueW / 2, screenY - plaqueH / 2, plaqueW, plaqueH);

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screenX - plaqueW / 2, screenY - plaqueH / 2, plaqueW, plaqueH);

      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.fillText(hint.text, screenX, hint.subText ? screenY - 4 : screenY + 5);

      if (hint.subText) {
        ctx.font = '11px "Chakra Petch"';
        ctx.fillStyle = '#aaccdd';
        ctx.shadowBlur = 0;
        ctx.fillText(hint.subText, screenX, screenY + 14);
      }
    }
    ctx.restore();
  }
}
