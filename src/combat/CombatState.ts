// ========================================
// CombatState - 对战状态管理
// ========================================

import type { CardInstance } from '../models/Card';
import type { BuffInstance } from '../models/Buff';
import type { EnemyInstance } from '../models/Enemy';

export interface CombatState {
  // 玩家
  playerHp: number;
  playerMaxHp: number;
  playerBlock: number;
  energy: number;
  maxEnergy: number;

  // 牌库
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];

  // Buff
  playerBuffs: BuffInstance[];

  // 敌人
  enemies: EnemyInstance[];

  // 回合信息
  turn: number;
  isPlayerTurn: boolean;

  // 状态
  combatOver: boolean;
  victory: boolean;
}

export function createCombatState(
  deck: CardInstance[],
  playerHp: number,
  playerMaxHp: number,
  enemies: EnemyInstance[],
): CombatState {
  return {
    playerHp,
    playerMaxHp,
    playerBlock: 0,
    energy: 3,
    maxEnergy: 3,
    drawPile: [...deck],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    playerBuffs: [],
    enemies,
    turn: 0,
    isPlayerTurn: false,
    combatOver: false,
    victory: false,
  };
}
