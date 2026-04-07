// ========================================
// EnemyAI - 敌人行为系统
// ========================================

import { kernel } from '../kernel/GameKernel';
import { eventBus, Events } from '../kernel/EventBus';
import { EnemyIntentType } from '../models/types';
import type { EnemyInstance } from '../models/Enemy';
import type { EnemyIntent } from '../models/Enemy';
import type { CombatState } from './CombatState';
import { cardEffectResolver } from './CardEffectResolver';

export class EnemyAI {
  // 获取敌人下一步意图
  getNextIntent(enemy: EnemyInstance): EnemyIntent | null {
    // 优先使用缩放后的行为序列
    const pattern =
      enemy.scaledIntentPattern || kernel.getDataStore().enemies.get(enemy.dataId)?.intentPattern;
    if (!pattern || pattern.length === 0) return null;
    return pattern[enemy.intentIndex % pattern.length];
  }

  // 执行敌人回合
  executeEnemyTurn(state: CombatState): void {
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;

      const intent = this.getNextIntent(enemy);
      if (!intent) continue;

      const eData = kernel.getDataStore().enemies.get(enemy.dataId);

      // 计算敌人力量加成
      const strength = this.getEnemyBuffStacks(enemy, 'buff_strength');

      switch (intent.type) {
        case EnemyIntentType.ATTACK: {
          let damage = intent.value + strength;

          // 玩家易伤
          const vulnerable = cardEffectResolver.getBuffStacks(state.playerBuffs, 'buff_vulnerable');
          if (vulnerable > 0) damage = Math.floor(damage * 1.5);

          // 护甲减伤
          if (state.playerBlock > 0) {
            if (state.playerBlock >= damage) {
              state.playerBlock -= damage;
              damage = 0;
            } else {
              damage -= state.playerBlock;
              state.playerBlock = 0;
            }
          }

          state.playerHp = Math.max(0, state.playerHp - damage);
          eventBus.emit(Events.ENEMY_ACTION, enemy.dataId, 'attack', damage);
          eventBus.emit(Events.PLAYER_HP_CHANGED, state.playerHp);

          if (state.playerHp <= 0) {
            state.combatOver = true;
            state.victory = false;
          }
          break;
        }

        case EnemyIntentType.DEFEND:
          enemy.block += intent.value;
          eventBus.emit(Events.ENEMY_ACTION, enemy.dataId, 'defend', intent.value);
          break;

        case EnemyIntentType.BUFF_SELF:
          if (intent.buffId) {
            cardEffectResolver.applyBuff(enemy.buffs, intent.buffId, intent.value);
          }
          eventBus.emit(Events.ENEMY_ACTION, enemy.dataId, 'buff', intent.value);
          break;

        case EnemyIntentType.DEBUFF_PLAYER:
          if (intent.buffId) {
            cardEffectResolver.applyBuff(state.playerBuffs, intent.buffId, intent.value);
            eventBus.emit(Events.BUFF_APPLIED, intent.buffId, intent.value, 'player');
          }
          eventBus.emit(Events.ENEMY_ACTION, enemy.dataId, 'debuff', intent.value);
          break;
      }

      // 推进意图索引
      enemy.intentIndex++;

      // Boss 被动能力：每回合获得力量
      if (eData?.passiveAbility && eData.passiveAbility.includes('力量')) {
        cardEffectResolver.applyBuff(enemy.buffs, 'buff_strength', 1);
      }
    }

    // 敌人 buff 回合递减
    for (const enemy of state.enemies) {
      for (let i = enemy.buffs.length - 1; i >= 0; i--) {
        const buff = enemy.buffs[i];
        if (buff.remainingTurns > 0) {
          buff.remainingTurns--;
          if (buff.remainingTurns === 0) {
            enemy.buffs.splice(i, 1);
          }
        }
      }
      // 敌人护甲每回合重置
      enemy.block = 0;
    }
  }

  private getEnemyBuffStacks(enemy: EnemyInstance, buffId: string): number {
    const b = enemy.buffs.find((b) => b.dataId === buffId);
    return b ? b.stacks : 0;
  }
}

export const enemyAI = new EnemyAI();
