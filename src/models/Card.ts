import { CardType, CardRarity, EffectType, TargetType } from './types';

export interface CardEffect {
  type: EffectType;
  target: TargetType;
  value: number;
  buffId?: string; // BUFF/DEBUFF 效果关联的 buffId
  condition?: string; // 条件表达式 key
}

export interface CardData {
  id: string;
  name: string;
  type: CardType;
  rarity: CardRarity;
  cost: number;
  effects: CardEffect[];
  description: string;
  art?: string;
  tags: string[];
  exhaust?: boolean; // 使用后消耗（不进入弃牌堆）
  ethereal?: boolean; // 回合结束时消耗
  unplayable?: boolean; // 不可主动打出（状态牌）
}

// 运行时卡牌实例（带唯一ID，用于区分同名卡）
export interface CardInstance {
  uid: string; // 唯一实例 ID
  dataId: string; // 引用 CardData.id
  upgraded: boolean;
}
