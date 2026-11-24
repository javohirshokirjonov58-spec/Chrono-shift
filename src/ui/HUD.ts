import { TimeManager } from '../core/TimeManager';
import { HistoryBuffer } from '../core/HistoryBuffer';
import { EchoGhost } from '../entities/EchoGhost';

export class HUD {
  constructor() {}

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeManager: TimeManager,
    echoGhost: EchoGhost,
    currentLevelNum: number,
    objectiveText: string
  ): void {
    ctx.save();

    // 1. Time Meter (Top-Left)
    this.renderTimeMeter(ctx, 24, 20, timeManager);

    // 2. Objective & Level Indicator (Top-Right)
    this.renderObjective(ctx, width - 24, 20, currentLevelNum, objectiveText);

    // 3. Rewind Timeline & Buffer Bar (Bottom-Center)
    this.renderTimeline(ctx, width, height, timeManager.getHistoryBuffer(), echoGhost);

    ctx.restore();
  }

  private renderTimeMeter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    timeManager: TimeManager
  ): void {
    const barWidth = 220;
    const barHeight = 16;
    const energy = timeManager.getEnergy();
    const maxEnergy = timeManager.getMaxEnergy();
    const ratio = Math.max(0, Math.min(1, energy / maxEnergy));
    const state = timeManager.getState();

    // Container panel
    ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
    ctx.fillRect(x - 8, y - 6, barWidth + 16, 44);
    ctx.strokeStyle = '#1e3048';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 8, y - 6, barWidth + 16, 44);

    // Label & State
    ctx.font = 'bold 12px "JetBrains Mono"';
    ctx.fillStyle = '#88aacc';
    ctx.fillText('TIME ENERGY', x, y + 8);

    // Active state indicator badge
    let stateColor = '#00f0ff';
    let stateText = 'STABLE';
    if (state === 'REWIND') {
      stateColor = '#ffaa00';
      stateText = 'REWINDING';
    } else if (state === 'SLOW_MO') {
      stateColor = '#00aaff';
      stateText = 'SLOW-MO';
    } else if (state === 'FREEZE') {
      stateColor = '#c742ff';
      stateText = 'FROZEN';
    }

    ctx.fillStyle = stateColor;
    ctx.shadowColor = stateColor;
    ctx.shadowBlur = 6;
    ctx.fillText(stateText, x + barWidth - ctx.measureText(stateText).width, y + 8);
    ctx.shadowBlur = 0;

    // Energy Bar Background
    const barY = y + 14;
    ctx.fillStyle = '#060a10';
    ctx.fillRect(x, barY, barWidth, barHeight);

    // Energy Bar Fill
    const fillGrad = ctx.createLinearGradient(x, barY, x + barWidth, barY);
    if (ratio < 0.25) {
      fillGrad.addColorStop(0, '#ff3366');
      fillGrad.addColorStop(1, '#ff6699');
    } else {
      fillGrad.addColorStop(0, '#0088ff');
      fillGrad.addColorStop(1, '#00f0ff');
    }

    ctx.fillStyle = fillGrad;
    ctx.fillRect(x + 1, barY + 1, (barWidth - 2) * ratio, barHeight - 2);

    // Frame
    ctx.strokeStyle = ratio < 0.25 ? '#ff3366' : '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, barY, barWidth, barHeight);

    // Value percentage
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "JetBrains Mono"';
    const valText = `${Math.round(energy)}%`;
    ctx.fillText(valText, x + barWidth / 2 - ctx.measureText(valText).width / 2, barY + 12);
  }

  private renderObjective(
    ctx: CanvasRenderingContext2D,
    rightX: number,
    y: number,
    levelNum: number,
    objective: string
  ): void {
    const textWidth = Math.max(220, ctx.measureText(objective).width + 30);
    const x = rightX - textWidth;

    // Panel
    ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
    ctx.fillRect(x, y - 6, textWidth, 44);
    ctx.strokeStyle = '#1e3048';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y - 6, textWidth, 44);

    // Level Header
    ctx.font = 'bold 11px "JetBrains Mono"';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`CHAMBER ${levelNum < 10 ? '0' + levelNum : levelNum}`, x + 10, y + 10);

    // Objective Text
    ctx.font = '13px "Chakra Petch"';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(objective, x + 10, y + 28);
  }

  private renderTimeline(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    buffer: HistoryBuffer,
    echoGhost: EchoGhost
  ): void {
    const barWidth = 460;
    const barHeight = 8;
    const x = width / 2 - barWidth / 2;
    const y = height - 20;

    // Background track
    ctx.fillStyle = 'rgba(14, 22, 34, 0.9)';
    ctx.fillRect(x - 20, y - 10, barWidth + 40, 24);
    ctx.strokeStyle = '#223850';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 20, y - 10, barWidth + 40, 24);

    // Buffer fullness bar
    const ratio = buffer.getFillRatio();
    ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Active buffer fill
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(x, y, barWidth * ratio, barHeight);

    // Checkpoint marker
    const checkpointTick = buffer.getCheckpointBoundary();
    if (checkpointTick > 0 && buffer.getCount() > 0) {
      const cpRatio = Math.max(0, Math.min(1, 0.5)); // Marker
      const cpX = x + barWidth * cpRatio;
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(cpX - 2, y - 3, 4, barHeight + 6);
    }

    // Echo ghost playback marker
    if (echoGhost.isPlaying && echoGhost.recordedFrames.length > 0) {
      const echoRatio = echoGhost.playbackIndex / echoGhost.recordedFrames.length;
      const echoX = x + barWidth * echoRatio;
      ctx.fillStyle = '#c742ff';
      ctx.shadowColor = '#c742ff';
      ctx.shadowBlur = 6;
      ctx.fillRect(echoX - 2, y - 4, 4, barHeight + 8);
      ctx.shadowBlur = 0;
    }

    // Timeline labels
    ctx.font = '9px "JetBrains Mono"';
    ctx.fillStyle = '#7799bb';
    ctx.fillText('-15s', x - 18, y + 7);
    ctx.fillText('NOW', x + barWidth + 4, y + 7);
  }
}
