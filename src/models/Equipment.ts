// ========================================
// 装备系统数据模型
// ========================================

export enum EquipmentType {
  ARMOR = 'ARMOR', // 护甲：战斗开始获得初始护甲
  ATTACK = 'ATTACK', // 攻击：力量加成
  RECOVERY = 'RECOVERY', // 恢复：每回合恢复HP
  ENERGY = 'ENERGY', // 能量：增加最大能量
}

// 装备静态数据（策划在 equipments.json 中配置）
export interface EquipmentData {
  id: string; // 如 "equip_iron_armor"
  name: string; // "铁甲"
  description: string; // "战斗开始时获得5点护甲"
  type: EquipmentType;
  rarity: string; // COMMON / UNCOMMON / RARE
  buffId: string; // 关联的 BuffData.id
  buffStacks: number; // 应用 buff 时的层数
  price: number; // 商店购买价格
  icon?: string;
}

// 运行时装备实例（存入 GameState）
export interface EquipmentInstance {
  dataId: string; // 引用 EquipmentData.id
}
