// ========================================
// 道具系统数据模型
// ========================================

export type ItemEffectType =
  | 'HEAL_HP'
  | 'RESTORE_STAMINA'
  | 'ADD_BLOCK'
  | 'GAIN_BUFF'
  | 'REMOVE_DEBUFF';

export interface ItemEffect {
  type: ItemEffectType;
  value: number;
  buffId?: string; // GAIN_BUFF 时关联的 buffId
}

// 道具静态数据（策划在 items.json 中配置）
export interface ItemData {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string; // COMMON / UNCOMMON / RARE
  price: number;
  effects: ItemEffect[];
  maxStack: number;
}

// 运行时道具实例（存入 GameState）
export interface ItemInstance {
  dataId: string;
  quantity: number;
}
