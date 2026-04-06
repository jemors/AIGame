import { EmployeeRole } from './types';

export interface EmployeeStats {
  coding: number;        // 编程能力 1-100
  art: number;           // 美术能力 1-100
  design: number;        // 策划能力 1-100
  creativity: number;    // 创意 1-100
  stamina: number;       // 体力 0-100（当前）
  maxStamina: number;    // 体力上限
  loyalty: number;       // 忠诚度 0-100
  morale: number;        // 士气 0-100
}

export interface EmployeeTrait {
  id: string;
  name: string;
  description: string;
  hidden: boolean;
  cardIds?: string[];    // 该特质解锁的额外卡牌
}

export interface EmployeeData {
  id: string;
  name: string;
  role: EmployeeRole;
  rarity: number;        // 1-5 星
  baseStats: EmployeeStats;
  traits: EmployeeTrait[];
  cardIds: string[];     // 该员工贡献到牌库的卡牌 ID 列表
  salary: number;        // 月薪
  portrait?: string;     // 立绘资源路径
  bio?: string;          // 简介
}

// 运行时员工实例
export interface EmployeeInstance {
  dataId: string;
  stats: EmployeeStats;
  level: number;
  exp: number;
  discoveredTraits: string[];   // 已发现的隐藏特质 ID
}
