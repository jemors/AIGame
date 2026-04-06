// ========================================
// CardEffectResolver - 卡牌效果解析管线
// ========================================

import { kernel } from '../kernel/GameKernel';
import { eventBus, Events } from '../kernel/EventBus';
import { EffectType, TargetType } from '../models/types';
import type { CardData, CardEffect } from '../models/Card';
import type { CombatState } from './CombatState';
import type { EnemyInstance } from '../models/Enemy';
import type { BuffInstance } from '../models/Buff';

export class CardEffectResolver {

  // 解析并执行一张卡牌的所有效果
  resolveCard(cardData: CardData, state: CombatState, targetEnemyIndex: number): void {
    // 1. 触发 ON_CARD_PLAY buff
    this.triggerBuffs(state.playerBuffs, 'ON_CARD_PLAY', state, cardData);

    // 2. 逐个解析效果
    for (const effect of cardData.effects) {
      this.resolveEffect(effect, cardData, state, targetEnemyIndex);
    }

    // 3. 触发 AFTER_CARD_PLAY 相关处理
    // 如果灵感 buff 在攻击时触发了，消耗它
    this.consumeOnUseBuffs(state, cardData);

    eventBus.emit(Events.CARD_PLAYED, cardData.id, cardData.name);
    state.turn; // 保持引用
  }

  private resolveEffect(
    effect: CardEffect,
    cardData: CardData,
    state: CombatState,
    targetEnemyIndex: number,
  ): void {
    switch (effect.type) {
      case EffectType.DAMAGE:
        this.resolveDamage(effect, cardData, state, targetEnemyIndex);
        break;
      case EffectType.BLOCK:
        this.resolveBlock(effect, cardData, state);
        break;
      case EffectType.DRAW:
        this.resolveDraw(effect, state);
        break;
      case EffectType.BUFF:
        this.resolveBuff(effect, state, false);
        break;
      case EffectType.DEBUFF:
        this.resolveBuff(effect, state, true);
        break;
      case EffectType.HEAL:
        this.resolveHeal(effect, state);
        break;
    }
  }

  // --- 伤害 ---
  private resolveDamage(
    effect: CardEffect,
    cardData: CardData,
    state: CombatState,
    targetEnemyIndex: number,
  ): void {
    let damage = effect.value;

    // 力量加成
    const strength = this.getBuffStacks(state.playerBuffs, 'buff_strength');
    if (strength > 0) damage += strength;

    // 虚弱减伤
    const weak = this.getBuffStacks(state.playerBuffs, 'buff_weak');
    if (weak > 0) damage = Math.floor(damage * 0.75);

    // 灵感翻倍
    const inspired = this.getBuffStacks(state.playerBuffs, 'buff_inspired');
    if (inspired > 0) damage *= 2;

    damage = Math.max(0, damage);

    if (effect.target === TargetType.ALL_ENEMIES) {
      for (const enemy of state.enemies) {
        this.applyDamageToEnemy(enemy, damage, state);
      }
    } else {
      const enemy = state.enemies[targetEnemyIndex];
      if (enemy) {
        this.applyDamageToEnemy(enemy, damage, state);
      }
    }
  }

  private applyDamageToEnemy(enemy: EnemyInstance, damage: number, state: CombatState): void {
    // 易伤增伤（对敌人的易伤）
    const vulnerable = this.getBuffStacks(enemy.buffs, 'buff_vulnerable');
    if (vulnerable > 0) damage = Math.floor(damage * 1.5);

    // 护甲先减
    if (enemy.block > 0) {
      if (enemy.block >= damage) {
        enemy.block -= damage;
        damage = 0;
      } else {
        damage -= enemy.block;
        enemy.block = 0;
      }
    }

    enemy.hp = Math.max(0, enemy.hp - damage);
    eventBus.emit(Events.ENEMY_HP_CHANGED, enemy.dataId, enemy.hp, damage);
    eventBus.emit(Events.DAMAGE_DEALT, damage, 'enemy');

    // 检查死亡
    if (enemy.hp <= 0) {
      // 检查所有敌人是否都死了
      if (state.enemies.every(e => e.hp <= 0)) {
        state.combatOver = true;
        state.victory = true;
      }
    }
  }

  // --- 护甲 ---
  private resolveBlock(effect: CardEffect, cardData: CardData, state: CombatState): void {
    let block = effect.value;

    // 敏捷加成
    const dexterity = this.getBuffStacks(state.playerBuffs, 'buff_dexterity');
    if (dexterity > 0) block += dexterity;

    state.playerBlock += block;
    eventBus.emit(Events.BLOCK_GAINED, block);
  }

  // --- 抽牌 ---
  private resolveDraw(effect: CardEffect, state: CombatState): void {
    for (let i = 0; i < effect.value; i++) {
      this.drawOneCard(state);
    }
  }

  drawOneCard(state: CombatState): boolean {
    // 牌库空则洗入弃牌堆
    if (state.drawPile.length === 0) {
      if (state.discardPile.length === 0) return false;
      state.drawPile = kernel.getRng().shuffle(state.discardPile);
      state.discardPile = [];
    }

    const card = state.drawPile.pop();
    if (card) {
      state.hand.push(card);
      eventBus.emit(Events.CARD_DRAWN, card.dataId);
      return true;
    }
    return false;
  }

  // --- Buff ---
  private resolveBuff(effect: CardEffect, state: CombatState, isDebuff: boolean): void {
    if (!effect.buffId) return;

    if (effect.target === TargetType.SELF) {
      this.applyBuff(state.playerBuffs, effect.buffId, effect.value);
      eventBus.emit(Events.BUFF_APPLIED, effect.buffId, effect.value, 'player');
    } else if (effect.target === TargetType.ENEMY) {
      // 对敌人施加buff（用于debuff敌人的场景）
      for (const enemy of state.enemies) {
        this.applyBuff(enemy.buffs, effect.buffId, effect.value);
      }
    }
  }

  applyBuff(buffs: BuffInstance[], buffId: string, stacks: number): void {
    const buffData = kernel.getDataStore().buffs.get(buffId);
    if (!buffData) return;

    const existing = buffs.find(b => b.dataId === buffId);
    if (existing && buffData.stackable) {
      existing.stacks = Math.min(buffData.maxStacks, existing.stacks + stacks);
    } else if (!existing) {
      buffs.push({
        dataId: buffId,
        remainingTurns: buffData.duration,
        stacks,
        revealed: !buffData.hidden,
      });
    }
  }

  // --- 治疗 ---
  private resolveHeal(effect: CardEffect, state: CombatState): void {
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + effect.value);
    eventBus.emit(Events.PLAYER_HP_CHANGED, state.playerHp);
  }

  // --- Buff 辅助 ---
  getBuffStacks(buffs: BuffInstance[], buffId: string): number {
    const b = buffs.find(b => b.dataId === buffId);
    return b ? b.stacks : 0;
  }

  private triggerBuffs(buffs: BuffInstance[], trigger: string, state: CombatState, cardData?: CardData): void {
    // 简化处理：通过 trigger 类型执行效果
    for (const buff of buffs) {
      const bd = kernel.getDataStore().buffs.get(buff.dataId);
      if (!bd) continue;
      for (const effect of bd.effects) {
        if (effect.trigger !== trigger) continue;
        // 在此处可以扩展更复杂的 buff 触发逻辑
      }
    }
  }

  private consumeOnUseBuffs(state: CombatState, cardData: CardData): void {
    // 灵感 buff：攻击后消耗
    if (cardData.type === 'ATTACK') {
      const idx = state.playerBuffs.findIndex(b => b.dataId === 'buff_inspired');
      if (idx >= 0) {
        state.playerBuffs.splice(idx, 1);
        eventBus.emit(Events.BUFF_REMOVED, 'buff_inspired');
      }
    }
  }

  // 回合开始时的 buff 处理
  processBuffsOnTurnStart(state: CombatState): void {
    for (const buff of state.playerBuffs) {
      const bd = kernel.getDataStore().buffs.get(buff.dataId);
      if (!bd) continue;
      for (const effect of bd.effects) {
        if (effect.trigger !== 'ON_TURN_START') continue;
        switch (effect.modifier) {
          case 'draw_add':
            for (let i = 0; i < buff.stacks; i++) this.drawOneCard(state);
            break;
          case 'auto_block':
            state.playerBlock += buff.stacks;
            eventBus.emit(Events.BLOCK_GAINED, buff.stacks);
            break;
          case 'energy_add':
            state.energy += buff.stacks;
            eventBus.emit(Events.ENERGY_CHANGED, state.energy);
            break;
          case 'heal':
            state.playerHp = Math.min(state.playerMaxHp, state.playerHp + buff.stacks);
            eventBus.emit(Events.PLAYER_HP_CHANGED, state.playerHp);
            break;
        }
      }
    }
  }

  // 回合结束时的 buff 处理
  processBuffsOnTurnEnd(state: CombatState): void {
    for (const buff of state.playerBuffs) {
      const bd = kernel.getDataStore().buffs.get(buff.dataId);
      if (!bd) continue;
      for (const effect of bd.effects) {
        if (effect.trigger !== 'ON_TURN_END') continue;
        switch (effect.modifier) {
          case 'self_damage':
            state.playerHp -= buff.stacks;
            eventBus.emit(Events.PLAYER_HP_CHANGED, state.playerHp);
            if (state.playerHp <= 0) {
              state.combatOver = true;
              state.victory = false;
            }
            break;
        }
      }
    }

    // 递减有时限的 buff
    for (let i = state.playerBuffs.length - 1; i >= 0; i--) {
      const buff = state.playerBuffs[i];
      if (buff.remainingTurns > 0) {
        buff.remainingTurns--;
        if (buff.remainingTurns === 0) {
          state.playerBuffs.splice(i, 1);
          eventBus.emit(Events.BUFF_REMOVED, buff.dataId);
        }
      }
    }
  }
}

export const cardEffectResolver = new CardEffectResolver();
