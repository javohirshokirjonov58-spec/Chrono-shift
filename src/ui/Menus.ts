import { SaveManager, GameSaveData } from '../storage/SaveManager';
import { SoundManager } from '../core/SoundManager';

export type ScreenState =
  | 'MAIN_MENU'
  | 'LEVEL_SELECT'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_COMPLETE'
  | 'SETTINGS';

export interface LevelInfo {
  index: number;
  name: string;
  mechanic: string;
  description: string;
}

export class Menus {
  public currentState: ScreenState = 'MAIN_MENU';
  private selectedLevelIndex: number = 1;

  // Level Complete summary stats
  public completeTime: number = 0;
  public completeEnergyUsed: number = 0;
  public completeRewinds: number = 0;
  public completeStars: number = 3;

  private levels: LevelInfo[] = [
    { index: 1, name: 'First Step', mechanic: 'Rewind', description: 'Step off the edge, trigger the switch, then rewind back to safety.' },
    { index: 2, name: 'Shattered Bridge', mechanic: 'Rewind', description: 'Cross a collapsing platform before it drops into the void.' },
    { index: 3, name: 'Bullet Time', mechanic: 'Slow-Motion', description: 'Slip through high-speed pulsing laser barriers and sliding bulkheads.' },
    { index: 4, name: 'Pendulum', mechanic: 'Slow-Mo + Platforms', description: 'Synchronize rapid moving platforms to scale the central conduit.' },
    { index: 5, name: 'Absolute Zero', mechanic: 'Time Freeze', description: 'Freeze a rapidly closing security gate while it is held open.' },
    { index: 6, name: 'Frozen Beam', mechanic: 'Freeze + Lasers', description: 'Halt time when intermittent beams turn off to cross the corridor.' },
    { index: 7, name: 'Mirror Self', mechanic: 'Echo / Ghost', description: 'Record your timeline to stand on a plate while you pass the open gate.' },
    { index: 8, name: 'Shadow Shield', mechanic: 'Echo + Lasers', description: 'Use your past self as a living shield against lethal laser fire.' },
    { index: 9, name: 'Paradox Crate', mechanic: 'Chrono-Anchored Box', description: 'Carry a time-immune purple crate up a elevator, then rewind yourself.' },
    { index: 10, name: 'Clockwork Chamber', mechanic: 'Slow-Mo + Freeze', description: 'Juggle three pressure plates and decaying door timers.' },
    { index: 11, name: 'Double Sync', mechanic: 'Echo + Moving Platforms', description: 'Send an Echo across a moving carrier to trigger distant switches.' },
    { index: 12, name: 'The Chrono Core', mechanic: 'All Mechanics (Finale)', description: 'The ultimate multi-level test combining Echo, Anchored Crate, Freeze and Rewind.' },
  ];

  public onStartLevel?: (levelIndex: number) => void;
  public onResume?: () => void;
  public onRestartLevel?: () => void;
  public onLoadCheckpoint?: () => void;
  public onNextLevel?: () => void;

  constructor() {}

  public handleClick(x: number, y: number): void {
    SoundManager.getInstance().resumeContext();

    switch (this.currentState) {
      case 'MAIN_MENU':
        this.handleMainMenuClick(x, y);
        break;
      case 'LEVEL_SELECT':
        this.handleLevelSelectClick(x, y);
        break;
      case 'PAUSED':
        this.handlePauseMenuClick(x, y);
        break;
      case 'LEVEL_COMPLETE':
        this.handleCompleteClick(x, y);
        break;
      case 'SETTINGS':
        this.handleSettingsClick(x, y);
        break;
    }
  }

  private handleMainMenuClick(x: number, y: number): void {
    // Buttons: Play (Center 1), Level Select (Center 2), Settings (Center 3)
    const centerX = 1280 / 2;
    const btnW = 260;
    const btnH = 50;

    // Play button
    if (this.isInBox(x, y, centerX - btnW / 2, 380, btnW, btnH)) {
      SoundManager.getInstance().playClick();
      const save = SaveManager.load();
      if (this.onStartLevel) this.onStartLevel(save.unlockedLevel || 1);
    }
    // Level Select button
    else if (this.isInBox(x, y, centerX - btnW / 2, 450, btnW, btnH)) {
      SoundManager.getInstance().playClick();
      this.currentState = 'LEVEL_SELECT';
    }
    // Settings button
    else if (this.isInBox(x, y, centerX - btnW / 2, 520, btnW, btnH)) {
      SoundManager.getInstance().playClick();
      this.currentState = 'SETTINGS';
    }
  }

  private handleLevelSelectClick(x: number, y: number): void {
    // Back button
    if (this.isInBox(x, y, 40, 40, 120, 40)) {
      SoundManager.getInstance().playClick();
      this.currentState = 'MAIN_MENU';
      return;
    }

    // Grid of 12 levels (4 columns x 3 rows)
    const startX = 140;
    const startY = 140;
    const cardW = 220;
    const cardH = 140;
    const gapX = 30;
    const gapY = 30;

    for (let i = 0; i < 12; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const bx = startX + col * (cardW + gapX);
      const by = startY + row * (cardH + gapY);

      if (this.isInBox(x, y, bx, by, cardW, cardH)) {
        const levelNum = i + 1;
        if (SaveManager.isLevelUnlocked(levelNum)) {
          SoundManager.getInstance().playClick();
          if (this.onStartLevel) this.onStartLevel(levelNum);
        }
        break;
      }
    }
  }

  private handlePauseMenuClick(x: number, y: number): void {
    const centerX = 1280 / 2;
    const btnW = 240;
    const btnH = 46;

    // Resume
    if (this.isInBox(x, y, centerX - btnW / 2, 260, btnW, btnH)) {
      SoundManager.getInstance().playClick();
      if (this.onResume) this.onResume();
    }
    // Restart
    else if (this.isInBox(x, y, centerX - btnW / 2, 320, btnW, btnH)) {
      SoundManager.getInstance().playClick();
      if (this.onRestartLevel) this.onRestartLevel();
    }
    // Load Checkpoint
    else if (this.isInBox(x, y, centerX - btnW / 2, 380, btnW, btnH)) {
      SoundManager.getInstance().playClick();
      if (this.onLoadCheckpoint) this.onLoadCheckpoint();
    }
    // Level Select
    else if (this.isInBox(x, y, centerX - btnW / 2, 440, btnW, btnH)) {
      SoundManager.getInstance().playClick();
      this.currentState = 'LEVEL_SELECT';
    }
  }

  private handleCompleteClick(x: number, y: number): void {
    const centerX = 1280 / 2;
    const btnW = 200;
    const btnH = 48;

    // Next Level
    if (this.isInBox(x, y, centerX + 20, 500, btnW, btnH)) {
      SoundManager.getInstance().playClick();
      if (this.onNextLevel) this.onNextLevel();
    }
    // Level Select
    else if (this.isInBox(x, y, centerX - btnW - 20, 500, btnW, btnH)) {
      SoundManager.getInstance().playClick();
      this.currentState = 'LEVEL_SELECT';
    }
  }

  private handleSettingsClick(x: number, y: number): void {
    // Back button
    if (this.isInBox(x, y, 40, 40, 120, 40)) {
      SoundManager.getInstance().playClick();
      this.currentState = 'MAIN_MENU';
      return;
    }

    const sound = SoundManager.getInstance();
    // Mute toggle
    if (this.isInBox(x, y, 540, 300, 200, 40)) {
      sound.setMuted(!sound.getMuted());
      sound.playClick();
    }
    // Volume down
    if (this.isInBox(x, y, 500, 360, 40, 40)) {
      sound.setVolume(Math.max(0, sound.getVolume() - 0.1));
      sound.playClick();
    }
    // Volume up
    if (this.isInBox(x, y, 740, 360, 40, 40)) {
      sound.setVolume(Math.min(1, sound.getVolume() + 0.1));
      sound.playClick();
    }
  }

  private isInBox(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
    return px >= x && px <= x + w && py >= y && py <= y + h;
  }

  // --- RENDERING SCREENS ---

  public render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    switch (this.currentState) {
      case 'MAIN_MENU':
        this.renderMainMenu(ctx, width, height);
        break;
      case 'LEVEL_SELECT':
        this.renderLevelSelect(ctx, width, height);
        break;
      case 'PAUSED':
        this.renderPauseMenu(ctx, width, height);
        break;
      case 'LEVEL_COMPLETE':
        this.renderLevelComplete(ctx, width, height);
        break;
      case 'SETTINGS':
        this.renderSettings(ctx, width, height);
        break;
    }
  }

  private renderMainMenu(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();

    // Background gradient & chrono grid
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#060a12');
    grad.addColorStop(1, '#0c1524');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Glowing Logo
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 24;
    ctx.font = 'bold 76px "Chakra Petch"';
    ctx.fillText('CHRONO SHIFT', width / 2, 220);

    ctx.font = '600 20px "JetBrains Mono"';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fillText('2D DETERMINISTIC TIME-MANIPULATION PUZZLE ENGINE', width / 2, 270);

    // Menu Buttons
    const centerX = width / 2;
    const btnW = 260;
    const btnH = 50;

    this.drawButton(ctx, centerX - btnW / 2, 380, btnW, btnH, 'INITIATE / PLAY', '#00f0ff');
    this.drawButton(ctx, centerX - btnW / 2, 450, btnW, btnH, 'CHAMBER ARCHIVES', '#00aaff');
    this.drawButton(ctx, centerX - btnW / 2, 520, btnW, btnH, 'SYSTEM SETTINGS', '#88bbdd');

    // Footer info
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#446688';
    ctx.font = '12px "JetBrains Mono"';
    ctx.fillText('V1.0.0 • FIXED 60 HZ RING-BUFFER DETERMINISM • HTML5 CANVAS & WEB AUDIO', width / 2, height - 30);

    ctx.restore();
  }

  private renderLevelSelect(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, width, height);

    // Header
    this.drawButton(ctx, 40, 40, 120, 40, '◀ BACK', '#88bbdd');

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 16;
    ctx.font = 'bold 36px "Chakra Petch"';
    ctx.fillText('CHAMBER SELECT (12 LEVELS)', width / 2, 70);

    // Grid of cards
    const startX = 140;
    const startY = 120;
    const cardW = 220;
    const cardH = 140;
    const gapX = 30;
    const gapY = 30;

    for (let i = 0; i < 12; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const bx = startX + col * (cardW + gapX);
      const by = startY + row * (cardH + gapY);
      const level = this.levels[i];
      const levelNum = i + 1;
      const isUnlocked = SaveManager.isLevelUnlocked(levelNum);
      const progress = SaveManager.getLevelProgress(levelNum);

      ctx.save();
      ctx.translate(bx, by);

      // Card Background
      ctx.fillStyle = isUnlocked ? 'rgba(16, 26, 42, 0.9)' : 'rgba(10, 14, 20, 0.7)';
      ctx.fillRect(0, 0, cardW, cardH);

      ctx.strokeStyle = isUnlocked ? '#00f0ff' : '#223344';
      ctx.lineWidth = isUnlocked ? 2 : 1;
      if (isUnlocked) {
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
      }
      ctx.strokeRect(0, 0, cardW, cardH);
      ctx.shadowBlur = 0;

      // Card Header
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px "JetBrains Mono"';
      ctx.fillStyle = isUnlocked ? '#00f0ff' : '#445566';
      ctx.fillText(`CHAMBER ${levelNum < 10 ? '0' + levelNum : levelNum}`, 14, 26);

      // Level Name
      ctx.font = 'bold 16px "Chakra Petch"';
      ctx.fillStyle = isUnlocked ? '#ffffff' : '#556677';
      ctx.fillText(level.name, 14, 52);

      // Mechanic Badge
      ctx.font = '11px "JetBrains Mono"';
      ctx.fillStyle = isUnlocked ? '#ffaa00' : '#445566';
      ctx.fillText(isUnlocked ? level.mechanic : 'LOCKED', 14, 76);

      // Stars
      if (isUnlocked && progress) {
        const starCount = progress.stars || 0;
        let starStr = '';
        for (let s = 0; s < 3; s++) {
          starStr += s < starCount ? '★ ' : '☆ ';
        }
        ctx.fillStyle = '#ffcc00';
        ctx.font = '16px "JetBrains Mono"';
        ctx.fillText(starStr, 14, 104);

        if (progress.bestTime > 0) {
          ctx.fillStyle = '#88aacc';
          ctx.font = '10px "JetBrains Mono"';
          ctx.fillText(`BEST: ${progress.bestTime.toFixed(1)}s`, 14, 124);
        }
      } else if (!isUnlocked) {
        ctx.fillStyle = '#ff3366';
        ctx.font = '18px "JetBrains Mono"';
        ctx.fillText('🔒', cardW / 2 - 10, 110);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private renderPauseMenu(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    // Dim background
    ctx.fillStyle = 'rgba(5, 8, 14, 0.75)';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Panel
    const panelW = 380;
    const panelH = 340;
    ctx.fillStyle = 'rgba(12, 18, 30, 0.95)';
    ctx.fillRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.strokeRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Chakra Petch"';
    ctx.fillText('CHRONO PAUSED', centerX, centerY - 100);

    const btnW = 240;
    const btnH = 44;
    this.drawButton(ctx, centerX - btnW / 2, 260, btnW, btnH, 'RESUME', '#00f0ff');
    this.drawButton(ctx, centerX - btnW / 2, 320, btnW, btnH, 'RESTART LEVEL', '#ffaa00');
    this.drawButton(ctx, centerX - btnW / 2, 380, btnW, btnH, 'LOAD CHECKPOINT', '#00ff88');
    this.drawButton(ctx, centerX - btnW / 2, 440, btnW, btnH, 'LEVEL SELECT', '#88bbdd');

    ctx.restore();
  }

  private renderLevelComplete(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 14, 0.85)';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const panelW = 500;
    const panelH = 380;

    // Victory frame
    ctx.fillStyle = 'rgba(10, 20, 32, 0.98)';
    ctx.fillRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 16;
    ctx.strokeRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH);

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 36px "Chakra Petch"';
    ctx.fillText('CHAMBER SYNCHRONIZED', centerX, centerY - 120);

    // Stars rating
    let starStr = '';
    for (let s = 0; s < 3; s++) {
      starStr += s < this.completeStars ? '★ ' : '☆ ';
    }
    ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 38px "JetBrains Mono"';
    ctx.fillText(starStr, centerX, centerY - 65);
    ctx.shadowBlur = 0;

    // Stats
    ctx.font = '16px "JetBrains Mono"';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`COMPLETION TIME: ${this.completeTime.toFixed(2)}s`, centerX, centerY - 15);
    ctx.fillText(`ENERGY CONSUMED: ${Math.round(this.completeEnergyUsed)} UNITS`, centerX, centerY + 20);
    ctx.fillText(`REWINDS PERFORMED: ${this.completeRewinds}`, centerX, centerY + 55);

    // Action buttons
    const btnW = 200;
    const btnH = 48;
    this.drawButton(ctx, centerX - btnW - 20, 500, btnW, btnH, 'CHAMBERS', '#88bbdd');
    this.drawButton(ctx, centerX + 20, 500, btnW, btnH, 'NEXT CHAMBER ▶', '#00ff88');

    ctx.restore();
  }

  private renderSettings(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, width, height);

    this.drawButton(ctx, 40, 40, 120, 40, '◀ BACK', '#88bbdd');

    const centerX = width / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 16;
    ctx.font = 'bold 38px "Chakra Petch"';
    ctx.fillText('AUDIO & CONTROL SETTINGS', centerX, 100);

    const sound = SoundManager.getInstance();

    // Volume controls
    ctx.font = 'bold 20px "Chakra Petch"';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`MASTER VOLUME: ${Math.round(sound.getVolume() * 100)}%`, centerX, 240);

    this.drawButton(ctx, 500, 270, 50, 40, '-', '#00f0ff');
    this.drawButton(ctx, 730, 270, 50, 40, '+', '#00f0ff');
    this.drawButton(ctx, 570, 270, 140, 40, sound.getMuted() ? 'UNMUTE' : 'MUTE', sound.getMuted() ? '#ff3366' : '#00ff88');

    // Controls overview
    ctx.font = 'bold 18px "JetBrains Mono"';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('DEFAULT KEYBOARD CONTROLS:', centerX, 380);

    ctx.font = '14px "JetBrains Mono"';
    ctx.fillStyle = '#aaccdd';
    const controls = [
      'A / D / Arrow Keys : Move Left / Right',
      'SPACE / W / Up Arrow : Jump (Variable Height + Buffer)',
      'HOLD R : Rewind Time (Reverse History Buffer)',
      'HOLD SHIFT : Slow-Motion (World 0.25x, Player 0.6x)',
      'PRESS F / Q : Time Freeze (World 0.0x, Player 1.0x)',
      'E : Interact / Pick Crate / Record Echo Ghost',
      'ESC / P : Pause Menu',
      'F3 : Toggle Developer Debug Overlay',
    ];
    controls.forEach((line, idx) => {
      ctx.fillText(line, centerX, 420 + idx * 26);
    });

    ctx.restore();
  }

  private drawButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    accentColor: string
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(14, 22, 34, 0.9)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "JetBrains Mono"';
    ctx.fillText(text, x + w / 2, y + h / 2 + 5);
    ctx.restore();
  }
}
