// ========================================
// 事件总线 - 发布/订阅模式
// UI 和逻辑层之间的通信桥梁
// ========================================

type EventHandler = (...args: unknown[]) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (e) {
        console.error(`[EventBus] Error in handler for "${event}":`, e);
      }
    });
  }

  once(event: string, handler: EventHandler): void {
    const wrapper: EventHandler = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };
    this.on(event, wrapper);
  }

  clear(): void {
    this.listeners.clear();
  }
}

// 全局单例
export const eventBus = new EventBus();

// 事件名常量
export const Events = {
  // 游戏阶段
  PHASE_CHANGED: 'phase:changed',
  GAME_STARTED: 'game:started',
  GAME_OVER: 'game:over',

  // 日常
  DAY_STARTED: 'daily:day_started',
  ACTIVITY_SELECTED: 'daily:activity_selected',
  ACTIVITY_COMPLETED: 'daily:activity_completed',
  TIME_SLOT_CHANGED: 'daily:time_slot_changed',
  DAY_ENDED: 'daily:day_ended',

  // 卡牌
  CARD_GAINED: 'card:gained',
  CARD_REMOVED: 'card:removed',
  DECK_UPDATED: 'card:deck_updated',

  // 对战
  COMBAT_STARTED: 'combat:started',
  COMBAT_ENDED: 'combat:ended',
  TURN_STARTED: 'combat:turn_started',
  TURN_ENDED: 'combat:turn_ended',
  CARD_PLAYED: 'combat:card_played',
  CARD_DRAWN: 'combat:card_drawn',
  DAMAGE_DEALT: 'combat:damage_dealt',
  BLOCK_GAINED: 'combat:block_gained',
  ENEMY_INTENT: 'combat:enemy_intent',
  ENEMY_ACTION: 'combat:enemy_action',
  PLAYER_HP_CHANGED: 'combat:player_hp_changed',
  ENEMY_HP_CHANGED: 'combat:enemy_hp_changed',
  ENERGY_CHANGED: 'combat:energy_changed',

  // Buff
  BUFF_APPLIED: 'buff:applied',
  BUFF_REMOVED: 'buff:removed',
  BUFF_REVEALED: 'buff:revealed',
  BUFF_TRIGGERED: 'buff:triggered',

  // 员工
  EMPLOYEE_HIRED: 'employee:hired',
  EMPLOYEE_STAT_CHANGED: 'employee:stat_changed',

  // 经济
  FUNDS_CHANGED: 'economy:funds_changed',

  // 事件
  EVENT_TRIGGERED: 'event:triggered',
  EVENT_CHOICE_MADE: 'event:choice_made',

  // 项目
  PROJECT_PROGRESS: 'project:progress',
  MONTH_ENDED: 'project:month_ended',
  WEEK_ENDED: 'daily:week_ended',

  // 卡牌锁定
  CARDS_LOCKED: 'card:cards_locked',

  // 装备
  EQUIPMENT_SELECTED: 'equipment:selected',
  BOSS_BUFF_GAINED: 'equipment:boss_buff_gained',

  // 发布 & 商店
  PUBLISH_MARKED: 'project:publish_marked',
  ITEM_PURCHASED: 'shop:item_purchased',
  ITEM_USED: 'item:used',
  EQUIPMENT_PURCHASED: 'shop:equipment_purchased',
  NEW_PROJECT_STARTED: 'project:new_started',

  // UI
  UI_SCREEN_CHANGE: 'ui:screen_change',
  UI_DIALOG_SHOW: 'ui:dialog_show',
  UI_DIALOG_HIDE: 'ui:dialog_hide',
  UI_NOTIFICATION: 'ui:notification',
} as const;
