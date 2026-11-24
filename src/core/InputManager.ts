/**
 * Centralized Input Manager with buffering and rebindable keys
 */
export type InputAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'slowmo'
  | 'rewind'
  | 'freeze'
  | 'interact'
  | 'pause'
  | 'debug';

export interface KeyBindings {
  [action: string]: string[];
}

export class InputManager {
  private static instance: InputManager | null = null;

  public static readonly DEFAULT_KEY_BINDINGS: KeyBindings = {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    jump: ['Space', 'KeyW', 'ArrowUp'],
    slowmo: ['ShiftLeft', 'ShiftRight'],
    rewind: ['KeyR'],
    freeze: ['KeyF', 'KeyQ'],
    interact: ['KeyE'],
    pause: ['Escape', 'KeyP'],
    debug: ['F3'],
  };

  private bindings: KeyBindings;
  private keyStates: Map<string, boolean> = new Map();
  private justPressed: Map<InputAction, boolean> = new Map();
  private justReleased: Map<InputAction, boolean> = new Map();
  private buffers: Map<InputAction, number> = new Map();

  // Jump buffer duration: 100 ms (0.1 sec)
  private readonly BUFFER_DURATION: number = 0.1;

  public static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  private constructor() {
    this.bindings = JSON.parse(JSON.stringify(InputManager.DEFAULT_KEY_BINDINGS));
    this.initListeners();
    this.initTouchControls();
  }

  private initListeners(): void {
    window.addEventListener('keydown', (e) => {
      // Prevent default scrolling for game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }

      if (!this.keyStates.get(e.code)) {
        this.keyStates.set(e.code, true);

        // Check which action this corresponds to
        for (const [action, keys] of Object.entries(this.bindings)) {
          if (keys.includes(e.code)) {
            const act = action as InputAction;
            this.justPressed.set(act, true);
            this.buffers.set(act, this.BUFFER_DURATION);
          }
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keyStates.set(e.code, false);

      for (const [action, keys] of Object.entries(this.bindings)) {
        if (keys.includes(e.code)) {
          const act = action as InputAction;
          // Only release if no other bound key for this action is down
          const anyOtherDown = keys.some((k) => k !== e.code && this.keyStates.get(k));
          if (!anyOtherDown) {
            this.justReleased.set(act, true);
          }
        }
      }
    });

    window.addEventListener('blur', () => {
      this.clearAll();
    });
  }

  private initTouchControls(): void {
    const bindTouch = (id: string, action: InputAction) => {
      const el = document.getElementById(id);
      if (!el) return;

      const press = (e: Event) => {
        e.preventDefault();
        this.touchSet(action, true);
      };
      const release = (e: Event) => {
        e.preventDefault();
        this.touchSet(action, false);
      };

      el.addEventListener('pointerdown', press);
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('pointerleave', release);
    };

    bindTouch('btn-touch-left', 'left');
    bindTouch('btn-touch-right', 'right');
    bindTouch('btn-touch-jump', 'jump');
    bindTouch('btn-touch-interact', 'interact');
    bindTouch('btn-touch-slowmo', 'slowmo');
    bindTouch('btn-touch-freeze', 'freeze');
    bindTouch('btn-touch-rewind', 'rewind');
  }

  private touchSet(action: InputAction, down: boolean): void {
    const fakeKey = `Touch_${action}`;
    const wasDown = !!this.keyStates.get(fakeKey);
    this.keyStates.set(fakeKey, down);

    if (down && !wasDown) {
      this.justPressed.set(action, true);
      this.buffers.set(action, this.BUFFER_DURATION);
    } else if (!down && wasDown) {
      this.justReleased.set(action, true);
    }
  }

  public isDown(action: InputAction): boolean {
    const keys = this.bindings[action] || [];
    const keyActive = keys.some((k) => !!this.keyStates.get(k));
    const touchActive = !!this.keyStates.get(`Touch_${action}`);
    return keyActive || touchActive;
  }

  public wasPressed(action: InputAction): boolean {
    return !!this.justPressed.get(action);
  }

  public wasReleased(action: InputAction): boolean {
    return !!this.justReleased.get(action);
  }

  public hasBuffered(action: InputAction): boolean {
    const time = this.buffers.get(action);
    return time !== undefined && time > 0;
  }

  public consumeBuffered(action: InputAction): boolean {
    if (this.hasBuffered(action)) {
      this.buffers.set(action, 0);
      this.justPressed.set(action, false);
      return true;
    }
    return false;
  }

  public update(dt: number): void {
    // Decrement buffers
    for (const [action, time] of this.buffers.entries()) {
      if (time > 0) {
        const next = time - dt;
        this.buffers.set(action, next > 0 ? next : 0);
      }
    }

    // Clear one-frame pressed/released states
    this.justPressed.clear();
    this.justReleased.clear();
  }

  public clearAll(): void {
    this.keyStates.clear();
    this.justPressed.clear();
    this.justReleased.clear();
    this.buffers.clear();
  }

  public getBindings(): KeyBindings {
    return JSON.parse(JSON.stringify(this.bindings));
  }

  public setBinding(action: InputAction, keys: string[]): void {
    this.bindings[action] = keys;
  }
}
