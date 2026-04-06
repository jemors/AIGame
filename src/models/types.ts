// ========================================
// 共享枚举和类型定义
// ========================================

// --- 游戏阶段 ---
export enum GamePhase {
  TITLE = 'TITLE',
  SETUP = 'SETUP',
  DAILY = 'DAILY',
  MONTH_END = 'MONTH_END',
  COMBAT = 'COMBAT',
  MONTH_RESULT = 'MONTH_RESULT',
  WEEK_RESULT = 'WEEK_RESULT',
  CARD_SELECTION = 'CARD_SELECTION',
  PROJECT_RESULT = 'PROJECT_RESULT',
  EQUIPMENT_SELECTION = 'EQUIPMENT_SELECTION',
  SHOP = 'SHOP',
  RECRUIT = 'RECRUIT',
  GAME_OVER = 'GAME_OVER',
}

// --- 时间段 ---
export enum TimeSlot {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
}

// --- 活动类型 ---
export enum ActivityType {
  CODING = 'CODING',
  ART_WORK = 'ART_WORK',
  MEETING = 'MEETING',
  BRAINSTORM = 'BRAINSTORM',
  TEAM_BUILDING = 'TEAM_BUILDING',
  OVERTIME = 'OVERTIME',
  REST = 'REST',
  COMMUNICATE = 'COMMUNICATE',
}

// --- 卡牌相关 ---
export enum CardType {
  ATTACK = 'ATTACK',
  SKILL = 'SKILL',
  POWER = 'POWER',
  STATUS = 'STATUS',
}

export enum CardRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  LEGENDARY = 'LEGENDARY',
}

export enum EffectType {
  DAMAGE = 'DAMAGE',
  BLOCK = 'BLOCK',
  DRAW = 'DRAW',
  BUFF = 'BUFF',
  DEBUFF = 'DEBUFF',
  HEAL = 'HEAL',
  DISCARD = 'DISCARD',
  EXHAUST = 'EXHAUST',
  SPECIAL = 'SPECIAL',
}

export enum TargetType {
  SELF = 'SELF',
  ENEMY = 'ENEMY',
  ALL_ENEMIES = 'ALL_ENEMIES',
  RANDOM_ENEMY = 'RANDOM_ENEMY',
}

// --- 员工相关 ---
export enum EmployeeRole {
  PROGRAMMER = 'PROGRAMMER',
  ARTIST = 'ARTIST',
  DESIGNER = 'DESIGNER',
  QA = 'QA',
}

// --- Buff 相关 ---
export enum BuffType {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  HIDDEN = 'HIDDEN',
}

export enum BuffTrigger {
  ON_TURN_START = 'ON_TURN_START',
  ON_TURN_END = 'ON_TURN_END',
  ON_CARD_PLAY = 'ON_CARD_PLAY',
  ON_DAMAGE_DEALT = 'ON_DAMAGE_DEALT',
  ON_DAMAGE_TAKEN = 'ON_DAMAGE_TAKEN',
  ON_COMBAT_START = 'ON_COMBAT_START',
  ON_COMBAT_END = 'ON_COMBAT_END',
  PASSIVE = 'PASSIVE',
}

// --- 敌人相关 ---
export enum EnemyIntentType {
  ATTACK = 'ATTACK',
  DEFEND = 'DEFEND',
  BUFF_SELF = 'BUFF_SELF',
  DEBUFF_PLAYER = 'DEBUFF_PLAYER',
  SUMMON = 'SUMMON',
  SPECIAL = 'SPECIAL',
}

// --- 事件相关 ---
export enum EventType {
  TIMELINE = 'TIMELINE',
  RANDOM = 'RANDOM',
  EMPLOYEE = 'EMPLOYEE',
  HIDDEN = 'HIDDEN',
}

// --- 难度 ---
export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}
