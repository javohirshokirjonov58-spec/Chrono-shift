import { BaseEntity, EntitySnapshot, TIME_POLICY_DEFAULT } from './BaseEntity';
import { Player } from './Player';

export interface EchoFrame {
  x: number;
  y: number;
  facing: 1 | -1;
  isInteracting: boolean;
}

export class EchoGhost extends BaseEntity {
  public static readonly DEFAULT_MAX_FRAMES = 600; // 10 seconds at 60 Hz

  public isRecording: boolean = false;
  public isPlaying: boolean = false;
  public playbackIndex: number = 0;
  public recordedFrames: EchoFrame[] = [];
  public maxFrames: number = EchoGhost.DEFAULT_MAX_FRAMES;
  public loopPlayback: boolean = true;
  public facing: 1 | -1 = 1;

  constructor(id: string = 'echo_ghost') {
    super(id, 0, 0, Player.WIDTH, Player.HEIGHT);
    this.isActive = false;
    this.timePolicy = { ...TIME_POLICY_DEFAULT };
  }

  public startRecording(player: Player, maxFrames: number = EchoGhost.DEFAULT_MAX_FRAMES): void {
    this.isRecording = true;
    this.isPlaying = false;
    this.isActive = false;
    this.recordedFrames = [];
    this.maxFrames = maxFrames;
    this.playbackIndex = 0;

    // Record initial frame
    this.recordFrame(player, false);
  }

  public recordFrame(player: Player, isInteracting: boolean): void {
    if (!this.isRecording) return;

    this.recordedFrames.push({
      x: player.x,
      y: player.y,
      facing: player.facing,
      isInteracting,
    });

    if (this.recordedFrames.length >= this.maxFrames) {
      this.finishRecording();
    }
  }

  public finishRecording(): void {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.recordedFrames.length > 0) {
      this.isPlaying = true;
      this.isActive = true;
      this.playbackIndex = 0;
      this.applyFrame(0);
    }
  }

  public cancel(): void {
    this.isRecording = false;
    this.isPlaying = false;
    this.isActive = false;
    this.recordedFrames = [];
    this.playbackIndex = 0;
  }

  public updatePlayback(dtScale: number): void {
    if (!this.isPlaying || this.recordedFrames.length === 0) return;

    // If rewinding, playback goes backward
    if (dtScale < 0) {
      this.playbackIndex = Math.max(0, this.playbackIndex - 1);
      this.applyFrame(this.playbackIndex);
      return;
    }

    if (dtScale === 0) {
      // Frozen
      return;
    }

    this.playbackIndex++;
    if (this.playbackIndex >= this.recordedFrames.length) {
      if (this.loopPlayback) {
        this.playbackIndex = 0;
      } else {
        this.playbackIndex = this.recordedFrames.length - 1;
      }
    }

    this.applyFrame(this.playbackIndex);
  }

  private applyFrame(index: number): void {
    const frame = this.recordedFrames[index];
    if (frame) {
      this.x = frame.x;
      this.y = frame.y;
      this.facing = frame.facing;
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
      stateFlags: (this.isPlaying ? 1 : 0) | (this.isRecording ? 2 : 0) | (this.facing === 1 ? 4 : 0),
      customTimer: this.playbackIndex,
    };
  }

  public override restoreSnapshot(snapshot: EntitySnapshot): void {
    super.restoreSnapshot(snapshot);
    this.isPlaying = (snapshot.stateFlags & 1) !== 0;
    this.isRecording = (snapshot.stateFlags & 2) !== 0;
    this.facing = (snapshot.stateFlags & 4) !== 0 ? 1 : -1;
    this.playbackIndex = snapshot.customTimer;
    if (this.isPlaying && this.recordedFrames.length > 0) {
      this.applyFrame(this.playbackIndex);
    }
  }

  public render(ctx: CanvasRenderingContext2D, _alpha: number): void {
    if (!this.isActive || !this.isPlaying) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Ethereal Echo / Ghost appearance (cyan translucent hologram)
    ctx.globalAlpha = 0.65;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;

    // Outer silhouette
    ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.fillRect(2, 6, this.width - 4, this.height - 12);

    // Core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 12, this.width - 16, 8);

    // Helmet
    ctx.fillStyle = 'rgba(0, 255, 200, 0.6)';
    ctx.fillRect(4, 0, this.width - 8, 10);

    // Scanlines across Echo body
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    for (let y = 0; y < this.height; y += 4) {
      ctx.fillRect(0, y, this.width, 1.5);
    }

    // Ghost glow outline
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(2, 6, this.width - 4, this.height - 12);

    ctx.restore();
  }
}
