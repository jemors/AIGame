// ========================================
// EventSystem - 事件触发引擎
// 基于条件谓词检查和触发游戏事件
// ========================================

import { kernel } from '../kernel/GameKernel';
import { eventBus, Events } from '../kernel/EventBus';
import type { GameEventData, EventChoice } from '../models/GameEvent';

export class EventSystem {
  private pendingEvent: GameEventData | null = null;

  // 每日结束时检查是否有事件触发
  checkTriggers(): GameEventData | null {
    const state = kernel.getState();
    const project = state.project;
    if (!project) return null;

    const allEvents = kernel.getDataStore().events;
    const candidates: GameEventData[] = [];

    for (const evt of allEvents) {
      // 已触发过的跳过
      if (state.triggeredEvents.includes(evt.id)) continue;

      const cond = evt.triggerCondition;

      // 月份条件
      if (cond.month !== undefined && cond.month !== project.currentMonth) continue;

      // 天数条件
      if (cond.day !== undefined && cond.day !== state.daily.currentDay) continue;

      // 最低资金
      if (cond.minFunds !== undefined && state.studio.funds < cond.minFunds) continue;

      // 最高资金
      if (cond.maxFunds !== undefined && state.studio.funds > cond.maxFunds) continue;

      // 最低员工数
      if (cond.minEmployees !== undefined && state.employees.length < cond.minEmployees) continue;

      // 概率检查（随机事件）
      if (cond.probability !== undefined) {
        const roll = kernel.getRng().next();
        if (roll > cond.probability) continue;
      }

      candidates.push(evt);
    }

    if (candidates.length === 0) return null;

    // 按优先级排序，取最高优先级
    candidates.sort((a, b) => b.priority - a.priority);
    const selected = candidates[0];

    // 标记为已触发
    kernel.dispatch(s => {
      s.triggeredEvents.push(selected.id);
    });

    this.pendingEvent = selected;
    eventBus.emit(Events.EVENT_TRIGGERED, selected);
    return selected;
  }

  // 应用事件选择的效果
  applyChoiceEffects(choice: EventChoice): void {
    for (const effect of choice.effects) {
      switch (effect.type) {
        case 'funds':
          kernel.modifyFunds(effect.value);
          break;
        case 'morale':
          kernel.dispatch(s => {
            s.studio.environment.morale = Math.max(0, Math.min(100,
              s.studio.environment.morale + effect.value));
            for (const emp of s.employees) {
              emp.stats.morale = Math.max(0, Math.min(100, emp.stats.morale + effect.value));
            }
          });
          break;
        case 'reputation':
          kernel.dispatch(s => {
            s.studio.reputation = Math.max(0, Math.min(100,
              s.studio.reputation + effect.value));
          });
          break;
        case 'buff':
          if (effect.target) {
            kernel.dispatch(s => {
              // 计算大地图持续buff的过期全局周数
              let expiresAtGlobalWeek: number | undefined;
              if (effect.duration && effect.durationUnit) {
                const currentMonth = s.project?.currentMonth ?? 1;
                const currentWeek = s.daily?.currentWeek ?? 1;
                const currentGlobalWeek = (currentMonth - 1) * 4 + currentWeek;
                if (effect.durationUnit === 'week') {
                  expiresAtGlobalWeek = currentGlobalWeek + effect.duration;
                } else {
                  expiresAtGlobalWeek = currentGlobalWeek + effect.duration * 4;
                }
              }

              const existing = s.buffs.find(b => b.dataId === effect.target);
              if (existing) {
                existing.stacks += effect.value;
                // 如果新的持续时间更长，更新过期时间
                if (expiresAtGlobalWeek !== undefined) {
                  if (!existing.expiresAtGlobalWeek || expiresAtGlobalWeek > existing.expiresAtGlobalWeek) {
                    existing.expiresAtGlobalWeek = expiresAtGlobalWeek;
                  }
                }
              } else {
                const bd = kernel.getDataStore().buffs.get(effect.target!);
                s.buffs.push({
                  dataId: effect.target!,
                  remainingTurns: bd?.duration ?? -1,
                  stacks: effect.value,
                  revealed: !(bd?.hidden ?? false),
                  expiresAtGlobalWeek,
                });
              }
            });
          }
          break;
        case 'card':
          if (effect.target) {
            const rng = kernel.getRng();
            kernel.dispatch(s => {
              for (let i = 0; i < effect.value; i++) {
                s.deck.push({
                  uid: `${effect.target}_evt_${Date.now()}_${rng.nextInt(100, 999)}`,
                  dataId: effect.target!,
                  upgraded: false,
                });
              }
            });
            const cd = kernel.getDataStore().cards.get(effect.target);
            if (cd) eventBus.emit(Events.CARD_GAINED, effect.target, cd.name);
          }
          break;
      }
    }
  }

  // 应用事件的基础效果（非选择性效果）
  applyEventEffects(evt: GameEventData): void {
    for (const effect of evt.effects) {
      const fakeChoice: EventChoice = { text: '', effects: [effect] };
      this.applyChoiceEffects(fakeChoice);
    }
  }

  getPendingEvent(): GameEventData | null {
    return this.pendingEvent;
  }

  clearPendingEvent(): void {
    this.pendingEvent = null;
  }
}

export const eventSystem = new EventSystem();
