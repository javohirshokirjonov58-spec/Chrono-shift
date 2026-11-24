import { GameLoop } from './core/GameLoop';
import { InputManager } from './core/InputManager';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { TimeManager, TimeState } from './core/TimeManager';
import { SoundManager } from './core/SoundManager';
import { HistoryBuffer, WorldSnapshot } from './core/HistoryBuffer';
import { Player } from './entities/Player';
import { EchoGhost } from './entities/EchoGhost';
import { MovingPlatform } from './entities/MovingPlatform';
import { PressurePlate } from './entities/PressurePlate';
import { LaserEmitter } from './entities/LaserEmitter';
import { Door } from './entities/Door';
import { ChronoBox } from './entities/ChronoBox';
import { Checkpoint } from './entities/Checkpoint';
import { BaseEntity, EntitySnapshot } from './entities/BaseEntity';
import { HUD } from './ui/HUD';
import { Menus } from './ui/Menus';
import { VFXManager } from './ui/VFXManager';
import { TutorialOverlay } from './ui/TutorialOverlay';
import { DebugView } from './ui/DebugView';
import { SaveManager } from './storage/SaveManager';
import { ALL_LEVELS } from './levels/data';
import { LevelLoader } from './levels/LevelLoader';
import { PuzzleValidator } from './levels/PuzzleValidator';
import { AABB, AABBBox } from './physics/AABB';

class ChronoShiftGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private gameLoop: GameLoop;
  private input: InputManager;
  private physics: PhysicsWorld;
  private timeManager: TimeManager;
  private sound: SoundManager;
  private vfx: VFXManager;

  private player: Player;
  private echoGhost: EchoGhost;

  private platforms: MovingPlatform[] = [];
  private plates: PressurePlate[] = [];
  private lasers: LaserEmitter[] = [];
  private doors: Door[] = [];
  private boxes: ChronoBox[] = [];
  private checkpoints: Checkpoint[] = [];
  private exitBox: AABBBox = { x: 0, y: 0, width: 40, height: 60 };

  private hud: HUD;
  private menus: Menus;
  private tutorial: TutorialOverlay;
  private debug: DebugView;

  private currentLevelIndex: number = 1;
  private currentTick: number = 0;
  private levelTimer: number = 0;
  private rewindsUsedThisLevel: number = 0;
  private energyUsedThisLevel: number = 0;

  // Active checkpoint snapshot for respawning
  private activeCheckpointSnapshot: WorldSnapshot | null = null;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.input = InputManager.getInstance();
    this.physics = new PhysicsWorld();
    this.timeManager = TimeManager.getInstance();
    this.sound = SoundManager.getInstance();
    this.vfx = new VFXManager();

    this.player = new Player('player', 100, 100);
    this.echoGhost = new EchoGhost('echo_ghost');

    this.hud = new HUD();
    this.menus = new Menus();
    this.tutorial = new TutorialOverlay();
    this.debug = new DebugView();

    this.gameLoop = new GameLoop(this.update.bind(this), this.render.bind(this));

    this.setupWindow();
    this.setupMenuCallbacks();
    this.setupAudioAndVFXHooks();
  }

  public start(): void {
    this.gameLoop.start();
  }

  private setupWindow(): void {
    const resize = () => {
      const windowW = window.innerWidth;
      const windowH = window.innerHeight;
      const targetAspect = 16 / 9;

      let renderW = windowW;
      let renderH = windowW / targetAspect;

      if (renderH > windowH) {
        renderH = windowH;
        renderW = windowH * targetAspect;
      }

      this.canvas.style.width = `${Math.floor(renderW)}px`;
      this.canvas.style.height = `${Math.floor(renderH)}px`;
    };

    window.addEventListener('resize', resize);
    resize();

    // Canvas click handling
    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      this.menus.handleClick(clickX, clickY);
    });

    // Touch device detection to show on-screen controls
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const touchOverlay = document.getElementById('touch-controls');
    if (isTouch && touchOverlay) {
      touchOverlay.classList.remove('hidden');
    }
  }

  private setupMenuCallbacks(): void {
    this.menus.onStartLevel = (levelIndex: number) => {
      this.loadLevel(levelIndex);
      this.menus.currentState = 'PLAYING';
    };

    this.menus.onResume = () => {
      this.menus.currentState = 'PLAYING';
    };

    this.menus.onRestartLevel = () => {
      this.loadLevel(this.currentLevelIndex);
      this.menus.currentState = 'PLAYING';
    };

    this.menus.onLoadCheckpoint = () => {
      if (this.activeCheckpointSnapshot) {
        this.restoreWorldSnapshot(this.activeCheckpointSnapshot);
        this.player.revive();
        this.timeManager.clearDeath();
        this.timeManager.getHistoryBuffer().clear();
        this.echoGhost.cancel();
      } else {
        this.loadLevel(this.currentLevelIndex);
      }
      this.menus.currentState = 'PLAYING';
    };

    this.menus.onNextLevel = () => {
      const next = this.currentLevelIndex + 1;
      if (next <= 12) {
        this.loadLevel(next);
        this.menus.currentState = 'PLAYING';
      } else {
        this.menus.currentState = 'MAIN_MENU';
      }
    };
  }

  private setupAudioAndVFXHooks(): void {
    this.timeManager.onStateChange = (newState: TimeState, oldState: TimeState) => {
      if (newState === 'REWIND') {
        this.sound.setRewindLoop(true);
        this.rewindsUsedThisLevel++;
      } else if (oldState === 'REWIND') {
        this.sound.setRewindLoop(false);
      }

      if (newState === 'SLOW_MO') {
        this.sound.playSlowMo();
      } else if (newState === 'FREEZE') {
        this.sound.playFreeze();
      }
    };
  }

  private loadLevel(index: number): void {
    const levelData = ALL_LEVELS[index - 1];
    if (!levelData) return;

    this.currentLevelIndex = index;
    this.currentTick = 0;
    this.levelTimer = 0;
    this.rewindsUsedThisLevel = 0;
    this.energyUsedThisLevel = 0;
    this.activeCheckpointSnapshot = null;

    const loaded = LevelLoader.loadLevel(
      levelData,
      this.physics,
      this.player,
      this.timeManager,
      this.echoGhost,
      this.tutorial
    );

    this.platforms = loaded.platforms;
    this.plates = loaded.plates;
    this.lasers = loaded.lasers;
    this.doors = loaded.doors;
    this.boxes = loaded.boxes;
    this.checkpoints = loaded.checkpoints;
    this.exitBox = loaded.exitBox;

    // Capture initial frame into history
    this.captureWorldSnapshot();
  }

  private getAllEntities(): BaseEntity[] {
    return [
      ...this.platforms,
      ...this.plates,
      ...this.lasers,
      ...this.doors,
      ...this.boxes,
      ...this.checkpoints,
    ];
  }

  // --- SNAPSHOT CAPTURE & RESTORATION ---

  private captureWorldSnapshot(): WorldSnapshot {
    const snapshot: WorldSnapshot = {
      tick: this.currentTick,
      timeEnergy: this.timeManager.getEnergy(),
      player: {
        ...this.player.captureSnapshot(),
        facing: this.player.facing,
        carriedEntityId: this.player.carriedBox ? this.player.carriedBox.id : null,
        isDead: this.player.isDead,
      },
      entities: this.getAllEntities().map((e) => e.captureSnapshot()),
      echoState: {
        active: this.echoGhost.isActive,
        playbackIndex: this.echoGhost.playbackIndex,
      },
    };
    return snapshot;
  }

  private restoreWorldSnapshot(snapshot: WorldSnapshot): void {
    // 1. Restore Player
    this.player.restoreSnapshot(snapshot.player);
    if (snapshot.player.isDead) {
      this.player.kill();
    } else {
      this.player.revive();
    }

    // 2. Restore carried box reference
    if (snapshot.player.carriedEntityId) {
      const box = this.boxes.find((b) => b.id === snapshot.player.carriedEntityId);
      this.player.carriedBox = box || null;
      if (box) box.isCarried = true;
    } else {
      this.player.carriedBox = null;
    }

    // 3. Restore all entities
    const entMap = new Map<string, EntitySnapshot>();
    for (const es of snapshot.entities) {
      entMap.set(es.id, es);
    }
    for (const ent of this.getAllEntities()) {
      const s = entMap.get(ent.id);
      if (s) {
        ententRestore(ent, s);
      }
    }

    function ententRestore(ent: BaseEntity, s: EntitySnapshot) {
      ent.restoreSnapshot(s);
    }

    // 4. Restore Echo playback index
    this.echoGhost.playbackIndex = snapshot.echoState.playbackIndex;
    if (this.echoGhost.isPlaying && this.echoGhost.recordedFrames.length > 0) {
      const frame = this.echoGhost.recordedFrames[this.echoGhost.playbackIndex];
      if (frame) {
        this.echoGhost.x = frame.x;
        this.echoGhost.y = frame.y;
        this.echoGhost.facing = frame.facing;
      }
    }
  }

  // --- 60 HZ FIXED TIMESTEP UPDATE ---

  private update(dt: number): void {
    this.debug.update();

    if (this.menus.currentState !== 'PLAYING') {
      this.input.update(dt);
      return;
    }

    // Toggle Pause
    if (this.input.wasPressed('pause')) {
      this.menus.currentState = 'PAUSED';
      this.sound.playClick();
      this.input.update(dt);
      return;
    }

    // Toggle Debug (F3)
    if (this.input.wasPressed('debug')) {
      this.debug.toggle();
    }

    this.levelTimer += dt;
    this.currentTick++;

    // 1. Update Time Manager Inputs & Scales
    this.timeManager.updateInputs(this.input, this.player.isDead);
    const timeState = this.timeManager.getState();
    const { worldDtScale, playerDtScale } = this.timeManager.getTimeScales();

    const initialEnergy = this.timeManager.getEnergy();
    this.timeManager.updateEnergy(dt);
    if (initialEnergy > this.timeManager.getEnergy()) {
      this.energyUsedThisLevel += initialEnergy - this.timeManager.getEnergy();
    }

    // 2. REWIND LOGIC
    if (timeState === 'REWIND') {
      const pastSnapshot = this.timeManager.getHistoryBuffer().pop();
      if (pastSnapshot) {
        this.restoreWorldSnapshot(pastSnapshot);
        // If player was dead and rewinds before death, clear death state!
        if (!pastSnapshot.player.isDead && this.player.isDead) {
          this.player.revive();
          this.timeManager.clearDeath();
        }
      }
      this.vfx.update(dt, timeState);
      this.input.update(dt);
      return;
    }

    // 3. NORMAL / SLOW-MO / FREEZE SIMULATION
    // Check death window timeout
    if (this.player.isDead) {
      if (!this.timeManager.isDeathWindowActive()) {
        // Window expired without rewinding -> restart level or reload checkpoint
        if (this.activeCheckpointSnapshot) {
          this.restoreWorldSnapshot(this.activeCheckpointSnapshot);
          this.player.revive();
        } else {
          this.loadLevel(this.currentLevelIndex);
        }
      }
      this.vfx.update(dt, timeState);
      this.input.update(dt);
      return;
    }

    // Echo ghost toggle recording via E key (if level supports it)
    if (this.input.wasPressed('interact')) {
      if (this.echoGhost.isRecording) {
        this.echoGhost.finishRecording();
        this.sound.playClick();
      } else if (!this.echoGhost.isPlaying && !this.player.carriedBox) {
        // If not carrying a box, start Echo recording
        this.echoGhost.startRecording(this.player, 600);
        this.sound.playClick();
      }
    }

    // Record Echo frame if recording
    if (this.echoGhost.isRecording) {
      this.echoGhost.recordFrame(this.player, this.input.isDown('interact'));
    }

    // Update Echo playback
    if (this.echoGhost.isPlaying) {
      this.echoGhost.updatePlayback(worldDtScale);
    }

    // 4. Update Moving Platforms
    const worldDt = dt * worldDtScale;
    for (const plat of this.platforms) {
      plat.update(worldDt);
    }

    // 5. Update Boxes
    for (const box of this.boxes) {
      const boxDt = box.timePolicy.isImmune ? dt : worldDt;
      box.updatePhysics(boxDt, this.physics, this.boxes);
    }

    // 6. Update Player Controller
    const playerDt = dt * playerDtScale;
    this.player.updateController(playerDt, this.input, this.physics, this.boxes);

    // Dynamic Solid colliders: Closed doors
    for (const door of this.doors) {
      door.update(worldDt);
      // Anti-crush resolution
      const sep = door.resolveCrush(this.player.getBox());
      if (sep) {
        this.player.x += sep.x;
        this.player.y += sep.y;
      }
    }

    // 7. Update Pressure Plates
    // Gather activators (Player, Echo, non-carried Boxes)
    const activators: AABBBox[] = [this.player.getBox()];
    if (this.echoGhost.isActive && this.echoGhost.isPlaying) {
      activators.push(this.echoGhost.getBox());
    }
    for (const box of this.boxes) {
      if (!box.isCarried) {
        activators.push(box.getBox());
      }
    }

    for (const plate of this.plates) {
      const wasPressed = plate.isPressed;
      plate.updateState(worldDt, activators);
      if (!wasPressed && plate.isPressed) {
        this.sound.playClick();
        this.vfx.addSparks(plate.x + plate.width / 2, plate.y, '#00ff88', 6);
      }
    }

    // 8. Puzzle State Validator: evaluate plate triggers & update doors
    PuzzleValidator.evaluate(this.plates, this.doors);

    // 9. Update Lasers & Raycast Occlusion
    // Obstacles to laser raycast: static solids + closed doors + boxes + Echo + Player
    const rayObstacles: AABBBox[] = [
      ...this.physics.getStaticSolids(),
    ];
    for (const d of this.doors) {
      const solid = d.getSolidBox();
      if (solid) rayObstacles.push(solid);
    }
    for (const b of this.boxes) {
      rayObstacles.push(b.getBox());
    }
    if (this.echoGhost.isActive && this.echoGhost.isPlaying) {
      rayObstacles.push(this.echoGhost.getBox());
    }
    rayObstacles.push(this.player.getBox());

    for (const laser of this.lasers) {
      laser.update(worldDt);
      laser.castBeam(rayObstacles);

      // Check if laser beam hits player
      const beam = laser.getBeamBox();
      if (beam && AABB.overlaps(this.player.getBox(), beam)) {
        // Player hit by laser!
        this.player.kill();
        this.timeManager.triggerDeath();
        this.sound.playDeath();
        this.vfx.addSparks(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#ff3366', 20);
        break;
      }
    }

    // 10. Checkpoints
    for (const cp of this.checkpoints) {
      cp.update(worldDt);
      if (cp.checkActivation(this.player.getBox())) {
        this.sound.playVictory();
        this.vfx.addSparks(cp.x + cp.width / 2, cp.y + cp.height / 2, '#00ffaa', 16);
        this.activeCheckpointSnapshot = this.captureWorldSnapshot();
        this.timeManager.getHistoryBuffer().setCheckpointBoundary(this.currentTick);
      }
    }

    // 11. Exit Portal Check
    if (PuzzleValidator.checkExitReached(this.player, this.exitBox)) {
      this.sound.playVictory();
      this.vfx.addSparks(this.exitBox.x + this.exitBox.width / 2, this.exitBox.y + this.exitBox.height / 2, '#00ffaa', 30);

      // Calculate score & stars
      let stars = 3;
      if (this.levelTimer > 45 || this.rewindsUsedThisLevel > 5) stars = 2;
      if (this.levelTimer > 75 || this.rewindsUsedThisLevel > 10) stars = 1;

      SaveManager.recordLevelCompletion(
        this.currentLevelIndex,
        this.levelTimer,
        this.rewindsUsedThisLevel,
        stars
      );

      this.menus.completeTime = this.levelTimer;
      this.menus.completeEnergyUsed = this.energyUsedThisLevel;
      this.menus.completeRewinds = this.rewindsUsedThisLevel;
      this.menus.completeStars = stars;
      this.menus.currentState = 'LEVEL_COMPLETE';
    }

    // 12. Push Snapshot to Ring Buffer
    this.timeManager.getHistoryBuffer().push(this.captureWorldSnapshot());

    // 13. Update VFX & Input
    this.vfx.update(dt, timeState);
    this.input.update(dt);
  }

  // --- RENDER PASS ---

  private render(alpha: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear background
    this.ctx.fillStyle = '#080c14';
    this.ctx.fillRect(0, 0, width, height);

    if (this.menus.currentState === 'MAIN_MENU' || this.menus.currentState === 'LEVEL_SELECT' || this.menus.currentState === 'SETTINGS') {
      this.menus.render(this.ctx, width, height);
      return;
    }

    // --- GAMEPLAY WORLD RENDER ---
    // 1. Draw Static Solids & Platforms
    this.renderWorldBackground(this.ctx, width, height);

    // 2. Checkpoints
    for (const cp of this.checkpoints) cp.render(this.ctx, alpha);

    // 3. Pressure Plates
    for (const pl of this.plates) pl.render(this.ctx, alpha);

    // 4. Moving Platforms
    for (const plat of this.platforms) plat.render(this.ctx, alpha);

    // 5. Doors
    for (const d of this.doors) d.render(this.ctx, alpha);

    // 6. Chrono Boxes
    for (const b of this.boxes) b.render(this.ctx, alpha);

    // 7. Echo / Ghost
    this.echoGhost.render(this.ctx, alpha);

    // 8. Player
    this.player.render(this.ctx, alpha);

    // 9. Lasers (render beams on top)
    for (const l of this.lasers) l.render(this.ctx, alpha);

    // 10. Exit Portal
    this.renderExitPortal(this.ctx, this.exitBox);

    // 11. Tutorial Overlay Hints
    this.tutorial.render(this.ctx, 0, 0);

    // 12. Particles VFX
    this.vfx.renderParticles(this.ctx);

    // 13. Screen Post-processing Shader Effects
    this.vfx.renderScreenOverlay(
      this.ctx,
      width,
      height,
      this.timeManager.getState(),
      this.timeManager.isDeathWindowActive(),
      this.timeManager.getDeathRewindTimer()
    );

    // 14. HUD (Time Meter, Timeline, Objective)
    const levelData = ALL_LEVELS[this.currentLevelIndex - 1];
    this.hud.render(
      this.ctx,
      width,
      height,
      this.timeManager,
      this.echoGhost,
      this.currentLevelIndex,
      levelData ? levelData.objective : 'Reach the Chrono Portal'
    );

    // 15. Developer Debug View (F3)
    this.debug.render(
      this.ctx,
      this.physics,
      this.getAllEntities(),
      this.player,
      this.timeManager,
      this.timeManager.getHistoryBuffer(),
      this.currentTick
    );

    // 16. Modal Menus (Pause, Level Complete)
    if (this.menus.currentState === 'PAUSED' || this.menus.currentState === 'LEVEL_COMPLETE') {
      this.menus.render(this.ctx, width, height);
    }
  }

  private renderWorldBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Subtle cyber grid
    ctx.strokeStyle = 'rgba(20, 35, 55, 0.4)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Static solids (dark metallic tiles with glowing border)
    for (const s of this.physics.getStaticSolids()) {
      ctx.fillStyle = '#0c1422';
      ctx.fillRect(s.x, s.y, s.width, s.height);

      ctx.strokeStyle = '#1b2a40';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.width, s.height);

      // Top edge highlight
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.width, s.y);
      ctx.stroke();
    }
  }

  private renderExitPortal(ctx: CanvasRenderingContext2D, exit: AABBBox): void {
    ctx.save();
    const time = performance.now() * 0.003;

    // Portal arch
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#00261a';
    ctx.fillRect(exit.x, exit.y, exit.width, exit.height);

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.strokeRect(exit.x, exit.y, exit.width, exit.height);

    // Pulsing inner vortex
    const vortexH = exit.height - 8;
    const vortexW = exit.width - 8;
    const grad = ctx.createLinearGradient(exit.x, exit.y, exit.x, exit.y + exit.height);
    grad.addColorStop(0, '#00ffaa');
    grad.addColorStop(0.5, '#008855');
    grad.addColorStop(1, '#00ffaa');

    ctx.fillStyle = grad;
    ctx.fillRect(exit.x + 4, exit.y + 4, vortexW, vortexH);

    // Chrono rings inside portal
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    const ringY = exit.y + exit.height / 2 + Math.sin(time) * 10;
    ctx.beginPath();
    ctx.arc(exit.x + exit.width / 2, ringY, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

// Instantiate and start game on DOM load
window.addEventListener('DOMContentLoaded', () => {
  const game = new ChronoShiftGame();
  game.start();
});
