/**
 * Fixed Timestep Game Loop (60 Hz deterministic)
 */
export class GameLoop {
  public static readonly FIXED_TIMESTEP: number = 1 / 60; // 60 Hz = ~16.666ms
  private static readonly MAX_ACCUMULATOR: number = 0.25; // 250ms limit prevents spiral of death

  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private animationFrameId: number | null = null;

  private onUpdate: (dt: number) => void;
  private onRender: (alpha: number) => void;

  constructor(
    onUpdate: (dt: number) => void,
    onRender: (alpha: number) => void
  ) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (!paused) {
      this.lastTime = performance.now();
      this.accumulator = 0;
    }
  }

  public getPaused(): boolean {
    return this.isPaused;
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    let frameTime = (currentTime - this.lastTime) / 1000;
    if (frameTime > GameLoop.MAX_ACCUMULATOR) {
      frameTime = GameLoop.MAX_ACCUMULATOR;
    }
    this.lastTime = currentTime;

    if (!this.isPaused) {
      this.accumulator += frameTime;

      while (this.accumulator >= GameLoop.FIXED_TIMESTEP) {
        this.onUpdate(GameLoop.FIXED_TIMESTEP);
        this.accumulator -= GameLoop.FIXED_TIMESTEP;
      }
    }

    const alpha = this.accumulator / GameLoop.FIXED_TIMESTEP;
    this.onRender(alpha);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
