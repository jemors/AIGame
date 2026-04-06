import { EnemyIntentType } from './types';

export interface EnemyIntent {
  type: EnemyIntentType;
  value: number;
  buffId?: string;       // BUFF_SELF / DEBUFF_PLAYER 关联的 buffId
  description: string;
}

export interface EnemyData {
  id: string;
  name: string;
  maxHp: number;
  intentPattern: EnemyIntent[];  // 循环执行的行为序列
  passiveAbility?: string;
  art?: string;
  description?: string;
  tier?: 'normal' | 'boss' | 'final_boss';  // 敌人等级：普通/Boss/最终Boss
}

// 运行时敌人实例
export interface EnemyInstance {
  dataId: string;
  hp: number;
  maxHp: number;
  block: number;
  intentIndex: number;   // 当前行为序列索引
  buffs: import('./Buff').BuffInstance[];
  scaledIntentPattern?: EnemyIntent[];  // 缩放后的行为序列（覆盖静态数据）
}
