import { HistoryBuffer, WorldSnapshot } from './HistoryBuffer';
import { InputManager } from './InputManager';

export type TimeState = 'NORMAL' | 'REWIND' | 'SLOW_MO' | 'FREEZE';

export interface TimeManagerConfig {
  maxEnergy: number;
  rewindDrainRate: number;  // energy / sec (25)
  slowMoDrainRate: number;  // energy / sec (15)
  freezeDrainRate: number;  // energy / sec (35)
  regenRate: number;        // energy / sec (10)
  regenDelay: number;       // sec (1.5)
  isStrictBudget: boolean;  // level setting
}

export class TimeManager {
  private static instance: TimeManager | null = null;

  public static readonly DEFAULT_CONFIG: TimeManagerConfig = {
    maxEnergy: 100,
    rewindDrainRate: 25,
    slowMoDrainRate: 15,
    freezeDrainRate: 35,
    regenRate: 10,
    regenDelay: 1.5,
    isStrictBudget: false,
  };

  private config: TimeManagerConfig;
  private currentEnergy: number;
  private currentState: TimeState = 'NORMAL';
  private regenTimer: number = 0;
  private isFreezeToggled: boolean = false;
  private historyBuffer: HistoryBuffer;

  // Emergency Rewind to Survive (when dead)
  private deathRewindTimer: number = 0;
  public static readonly DEATH_REWIND_WINDOW: number = 1.5; // 1.5 seconds window

  // Event listeners for visual & sound FX
  public onStateChange?: (newState: TimeState, oldState: TimeState) => void;
  public onEnergyEmpty?: () => void;

  public static getInstance(): TimeManager {
    if (!TimeManager.instance) {
      TimeManager.instance = new TimeManager();
    }
    return TimeManager.instance;
  }

  constructor(config: Partial<TimeManagerConfig> = {}) {
    this.config = { ...TimeManager.DEFAULT_CONFIG, ...config };
    this.currentEnergy = this.config.maxEnergy;
    this.historyBuffer = new HistoryBuffer(900); // 15 seconds at 60Hz
  }

  public reset(config?: Partial<TimeManagerConfig>): void {
    if (config) {
      this.config = { ...TimeManager.DEFAULT_CONFIG, ...config };
    }
    this.currentEnergy = this.config.maxEnergy;
    this.currentState = 'NORMAL';
    this.isFreezeToggled = false;
    this.regenTimer = 0;
    this.deathRewindTimer = 0;
    this.historyBuffer.clear();
  }

  public getHistoryBuffer(): HistoryBuffer {
    return this.historyBuffer;
  }

  public getState(): TimeState {
    return this.currentState;
  }

  public getEnergy(): number {
    return this.currentEnergy;
  }

  public getMaxEnergy(): number {
    return this.config.maxEnergy;
  }

  public getEnergyRatio(): number {
    return this.config.maxEnergy > 0 ? this.currentEnergy / this.config.maxEnergy : 0;
  }

  public addEnergy(amount: number): void {
    this.currentEnergy = Math.min(this.config.maxEnergy, this.currentEnergy + amount);
  }

  public setStrictBudget(strict: boolean): void {
    this.config.isStrictBudget = strict;
  }

  public getDeathRewindTimer(): number {
    return this.deathRewindTimer;
  }

  public triggerDeath(): void {
    this.deathRewindTimer = TimeManager.DEATH_REWIND_WINDOW;
  }

  public clearDeath(): void {
    this.deathRewindTimer = 0;
  }

  public isDeathWindowActive(): boolean {
    return this.deathRewindTimer > 0;
  }

  /**
   * Determine active state based on inputs & energy
   */
  public updateInputs(input: InputManager, isPlayerDead: boolean): void {
    const prevState = this.currentState;

    // Toggle Freeze on press
    if (input.wasPressed('freeze')) {
      if (this.isFreezeToggled) {
        this.isFreezeToggled = false;
      } else if (this.currentEnergy > 5) {
        this.isFreezeToggled = true;
      }
    }

    if (isPlayerDead) {
      this.isFreezeToggled = false;
      // During death window, only rewind is allowed!
      if (input.isDown('rewind') && this.currentEnergy > 0 && this.historyBuffer.getCount() > 0) {
        this.currentState = 'REWIND';
      } else {
        this.currentState = 'NORMAL';
      }
      if (this.currentState !== prevState && this.onStateChange) {
        this.onStateChange(this.currentState, prevState);
      }
      return;
    }

    if (this.currentEnergy <= 0) {
      this.isFreezeToggled = false;
      if (this.currentState !== 'NORMAL') {
        this.currentState = 'NORMAL';
        if (this.onStateChange) this.onStateChange(this.currentState, prevState);
        if (this.onEnergyEmpty) this.onEnergyEmpty();
      }
      return;
    }

    // Priority: Rewind > Freeze > Slow-Mo
    // Rewind is active as long as player holds Rewind key and has energy & history frames
    if (input.isDown('rewind') && this.historyBuffer.getCount() > 0) {
      this.currentState = 'REWIND';
    } else if (this.isFreezeToggled || input.isDown('freeze')) {
      this.currentState = 'FREEZE';
    } else if (input.isDown('slowmo')) {
      this.currentState = 'SLOW_MO';
    } else {
      this.currentState = 'NORMAL';
    }

    if (this.currentState !== prevState && this.onStateChange) {
      this.onStateChange(this.currentState, prevState);
    }
  }

  /**
   * Update energy consumption and regeneration
   */
  public updateEnergy(dt: number): void {
    if (this.deathRewindTimer > 0) {
      this.deathRewindTimer -= dt;
      if (this.deathRewindTimer <= 0) {
        this.deathRewindTimer = 0;
      }
    }

    switch (this.currentState) {
      case 'REWIND':
        this.currentEnergy -= this.config.rewindDrainRate * dt;
        this.regenTimer = 0;
        break;
      case 'SLOW_MO':
        this.currentEnergy -= this.config.slowMoDrainRate * dt;
        this.regenTimer = 0;
        break;
      case 'FREEZE':
        this.currentEnergy -= this.config.freezeDrainRate * dt;
        this.regenTimer = 0;
        break;
      case 'NORMAL':
        if (!this.config.isStrictBudget) {
          this.regenTimer += dt;
          if (this.regenTimer >= this.config.regenDelay) {
            this.currentEnergy += this.config.regenRate * dt;
          }
        }
        break;
    }

    // Clamp energy
    if (this.currentEnergy <= 0) {
      this.currentEnergy = 0;
      if (this.currentState !== 'NORMAL') {
        const oldState = this.currentState;
        this.currentState = 'NORMAL';
        if (this.onStateChange) this.onStateChange('NORMAL', oldState);
        if (this.onEnergyEmpty) this.onEnergyEmpty();
      }
    } else if (this.currentEnergy > this.config.maxEnergy) {
      this.currentEnergy = this.config.maxEnergy;
    }
  }

  /**
   * Returns current time scale for world and player
   */
  public getTimeScales(): { worldDtScale: number; playerDtScale: number } {
    switch (this.currentState) {
      case 'SLOW_MO':
        return { worldDtScale: 0.25, playerDtScale: 0.6 };
      case 'FREEZE':
        return { worldDtScale: 0.0, playerDtScale: 1.0 };
      case 'REWIND':
        return { worldDtScale: -1.0, playerDtScale: -1.0 };
      case 'NORMAL':
      default:
        return { worldDtScale: 1.0, playerDtScale: 1.0 };
    }
  }
}
