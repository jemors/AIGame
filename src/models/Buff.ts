import { BuffType, BuffTrigger } from './types';

export interface BuffEffect {
  trigger: BuffTrigger;
  modifier: string; // 效果标识，如 "energy_change", "draw_change", "damage_mult"
  value: number;
  condition?: string; // 额外触发条件 key
}

export interface BuffData {
  id: string;
  name: string;
  description: string;
  type: BuffType;
  duration: number; // 持续回合数（-1 = 永久）
  stackable: boolean;
  maxStacks: number;
  effects: BuffEffect[];
  hidden: boolean; // 隐蔽 buff
  revealCondition?: string; // 隐蔽 buff 揭示条件
  icon?: string;
}

// 运行时 Buff 实例
export interface BuffInstance {
  dataId: string;
  remainingTurns: number; // -1 = 永久
  stacks: number;
  revealed: boolean; // 隐蔽 buff 是否已揭示
  acquiredMonth?: number; // buff 获取时的项目月份（Boss奖励过期计算用）
  expiresAtGlobalWeek?: number; // 大地图持续buff过期的全局周数（(月-1)*4+周）
}
