import { LaserDirection, LaserMode } from '../entities/LaserEmitter';
import { PlateType } from '../entities/PressurePlate';
import { LogicGate } from '../entities/Door';
import { BoxType } from '../entities/ChronoBox';

export interface LevelData {
  id: string;
  number: number;
  name: string;
  mechanic: string;
  objective: string;
  energy: {
    maxEnergy: number;
    isStrictBudget: boolean;
  };
  spawn: { x: number; y: number };
  exit: { x: number; y: number; width: number; height: number };
  solids: { x: number; y: number; width: number; height: number }[];
  movingPlatforms?: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    waitDuration: number;
    waypoints: { x: number; y: number }[];
  }[];
  pressurePlates?: {
    id: string;
    x: number;
    y: number;
    plateType: PlateType;
  }[];
  lasers?: {
    id: string;
    x: number;
    y: number;
    direction: LaserDirection;
    mode: LaserMode;
    intervalOn?: number;
    intervalOff?: number;
  }[];
  doors?: {
    id: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    linkedTriggers: string[];
    logicGate: LogicGate;
  }[];
  boxes?: {
    id: string;
    x: number;
    y: number;
    boxType: BoxType;
  }[];
  checkpoints?: {
    id: string;
    x: number;
    y: number;
  }[];
  tutorialHints?: {
    x: number;
    y: number;
    text: string;
    subText?: string;
  }[];
}
