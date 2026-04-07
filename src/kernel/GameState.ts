// ========================================
// 游戏全局状态定义
// ========================================

import { produce } from 'immer';
import { GamePhase, TimeSlot, Difficulty } from '../models/types';
import { CardInstance } from '../models/Card';
import { EmployeeInstance } from '../models/Employee';
import { ProjectInstance } from '../models/Project';
import { StudioData } from '../models/Studio';
import { BuffInstance } from '../models/Buff';
import { EquipmentInstance } from '../models/Equipment';
import { ItemInstance } from '../models/Item';

export interface GameState {
  // 元信息
  phase: GamePhase;
  difficulty: Difficulty;
  seed: number;
  randomState: number;

  // 工作室
  studio: StudioData;

  // 员工
  employees: EmployeeInstance[];

  // 项目
  project: ProjectInstance | null;

  // 卡牌（经营层面的牌库）
  deck: CardInstance[];

  // 锁定牌组（Boss战专用）
  lockedDeck: CardInstance[];

  // 战斗上下文（战斗前设置，CombatManager 读取）
  combatContext: {
    isBossFight: boolean;
    isFinalBoss: boolean;
    weekNumber: number;
  } | null;

  // Buff（经营层面的 buff，影响日常和对战）
  buffs: BuffInstance[];

  // 装备（跨月保留，获得即永久生效）
  equipments: EquipmentInstance[];

  // 最近一次战斗是否胜利（用于决定是否展示装备选择）
  lastCombatVictory: boolean;

  // 发布标记（玩家点击发布游戏后，当月末Boss变为最终Boss）
  publishMarked: boolean;

  // 消耗品道具库存
  items: ItemInstance[];

  // 当前第几个项目（用于跨项目难度递增）
  projectNumber: number;

  // 日常状态
  daily: {
    currentDay: number; // 当月第几天
    currentWeek: number; // 当前第几周 (1-4)
    currentSlot: TimeSlot;
    activitiesThisDay: string[]; // 今天已执行的活动 ID
    cardsGainedToday: string[]; // 今天获得的卡牌 ID
  };

  // 已触发事件 ID
  triggeredEvents: string[];

  // 统计
  stats: {
    totalDays: number;
    totalCombats: number;
    totalCardsPlayed: number;
    totalDamageDealt: number;
  };
}

// 创建初始状态
export function createInitialState(seed: number, difficulty: Difficulty): GameState {
  return {
    phase: GamePhase.TITLE,
    difficulty,
    seed,
    randomState: seed,

    studio: {
      name: '',
      level: 1,
      reputation: 0,
      funds: 100000,
      monthlyRent: 3000,
      maxEmployees: 5,
      environment: {
        morale: 50,
        creativity: 50,
        efficiency: 50,
      },
    },

    employees: [],
    project: null,
    deck: [],
    lockedDeck: [],
    combatContext: null,
    buffs: [],
    equipments: [],
    lastCombatVictory: false,
    publishMarked: false,
    items: [],
    projectNumber: 1,

    daily: {
      currentDay: 1,
      currentWeek: 1,
      currentSlot: TimeSlot.MORNING,
      activitiesThisDay: [],
      cardsGainedToday: [],
    },

    triggeredEvents: [],

    stats: {
      totalDays: 0,
      totalCombats: 0,
      totalCardsPlayed: 0,
      totalDamageDealt: 0,
    },
  };
}

// 不可变状态更新器
export type StateUpdater = (state: GameState) => void;

export function updateState(state: GameState, updater: StateUpdater): GameState {
  return produce(state, updater);
}
