/**
 * LocalStorage and JSON Save Persistence
 */
export interface LevelProgress {
  unlocked: boolean;
  stars: number;
  bestTime: number; // in seconds
  rewindsUsed: number;
}

export interface GameSaveData {
  unlockedLevel: number;
  levelData: { [levelIndex: number]: LevelProgress };
  volume: number;
  muted: boolean;
}

export class SaveManager {
  private static readonly STORAGE_KEY = 'chrono_shift_save_v1';

  private static defaultData: GameSaveData = {
    unlockedLevel: 1,
    levelData: {
      1: { unlocked: true, stars: 0, bestTime: 0, rewindsUsed: 0 },
    },
    volume: 0.7,
    muted: false,
  };

  public static load(): GameSaveData {
    try {
      const raw = localStorage.getItem(SaveManager.STORAGE_KEY);
      if (raw) {
        return { ...SaveManager.defaultData, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('LocalStorage load failed, using defaults', e);
    }
    return JSON.parse(JSON.stringify(SaveManager.defaultData));
  }

  public static save(data: GameSaveData): void {
    try {
      localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  public static recordLevelCompletion(
    levelIndex: number,
    time: number,
    rewinds: number,
    stars: number
  ): void {
    const data = SaveManager.load();

    if (!data.levelData[levelIndex]) {
      data.levelData[levelIndex] = {
        unlocked: true,
        stars,
        bestTime: time,
        rewindsUsed: rewinds,
      };
    } else {
      const prev = data.levelData[levelIndex];
      prev.stars = Math.max(prev.stars, stars);
      if (prev.bestTime === 0 || time < prev.bestTime) {
        prev.bestTime = time;
      }
      prev.rewindsUsed = Math.min(prev.rewindsUsed, rewinds);
    }

    // Unlock next level
    const nextLevel = levelIndex + 1;
    if (nextLevel <= 12) {
      data.unlockedLevel = Math.max(data.unlockedLevel, nextLevel);
      if (!data.levelData[nextLevel]) {
        data.levelData[nextLevel] = {
          unlocked: true,
          stars: 0,
          bestTime: 0,
          rewindsUsed: 0,
        };
      } else {
        data.levelData[nextLevel].unlocked = true;
      }
    }

    SaveManager.save(data);
  }

  public static isLevelUnlocked(levelIndex: number): boolean {
    if (levelIndex === 1) return true;
    const data = SaveManager.load();
    return !!data.levelData[levelIndex]?.unlocked || data.unlockedLevel >= levelIndex;
  }

  public static getLevelProgress(levelIndex: number): LevelProgress | null {
    const data = SaveManager.load();
    return data.levelData[levelIndex] || null;
  }
}
