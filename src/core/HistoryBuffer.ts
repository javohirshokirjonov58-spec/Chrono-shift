import { EntitySnapshot } from '../entities/BaseEntity';

/**
 * Complete snapshot of the world at a single fixed tick
 */
export interface WorldSnapshot {
  tick: number;
  timeEnergy: number;
  player: EntitySnapshot & {
    facing: 1 | -1;
    carriedEntityId: string | null;
    isDead: boolean;
  };
  entities: EntitySnapshot[];
  echoState: {
    active: boolean;
    playbackIndex: number;
  };
}

/**
 * Ring Buffer for deterministic rewind history
 * Maintains fixed capacity (e.g. 600 - 900 frames) with O(1) push and pop.
 */
export class HistoryBuffer {
  private buffer: (WorldSnapshot | null)[];
  private capacity: number;
  private head: number = 0; // points to next write slot
  private count: number = 0;
  private checkpointBoundaryTick: number = 0;

  constructor(capacity: number = 900) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(null);
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getCount(): number {
    return this.count;
  }

  public getFillRatio(): number {
    return this.count / this.capacity;
  }

  public push(snapshot: WorldSnapshot): void {
    this.buffer[this.head] = snapshot;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  /**
   * Pops the most recent snapshot for rewinding.
   * Respects checkpoint boundary so rewinding won't bypass checkpoints.
   */
  public pop(): WorldSnapshot | null {
    if (this.count === 0) return null;
    if (this.count === 1) {
      // Hold on to the earliest snapshot so holding Rewind keeps holding the position without dropping to 0
      const prevIndex = (this.head - 1 + this.capacity) % this.capacity;
      return this.buffer[prevIndex];
    }

    const prevIndex = (this.head - 1 + this.capacity) % this.capacity;
    const snapshot = this.buffer[prevIndex];

    if (!snapshot) return null;

    // Boundary check for checkpoint
    if (this.checkpointBoundaryTick > 0 && snapshot.tick <= this.checkpointBoundaryTick) {
      return snapshot; // Hold at checkpoint boundary
    }

    this.head = prevIndex;
    this.count--;
    return snapshot;
  }

  public peek(): WorldSnapshot | null {
    if (this.count === 0) return null;
    const prevIndex = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[prevIndex];
  }

  public clear(): void {
    this.buffer.fill(null);
    this.head = 0;
    this.count = 0;
    this.checkpointBoundaryTick = 0;
  }

  public setCheckpointBoundary(tick: number): void {
    this.checkpointBoundaryTick = tick;
  }

  public getCheckpointBoundary(): number {
    return this.checkpointBoundaryTick;
  }
}
