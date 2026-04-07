// ========================================
// CombatManager - 对战流程控制
// ========================================

import { kernel } from '../kernel/GameKernel';
import { eventBus, Events } from '../kernel/EventBus';
import type { CardInstance } from '../models/Card';
import type { EnemyInstance } from '../models/Enemy';
import { CombatState, createCombatState } from './CombatState';
import { cardEffectResolver } from './CardEffectResolver';
import { enemyAI } from './EnemyAI';
import { enemyScaler } from '../systems/EnemyScaler';

export class CombatManager {
  private state: CombatState | null = null;

  getState(): CombatState | null {
    return this.state;
  }

  // 初始化对战
  initCombat(): void {
    const gameState = kernel.getState();
    const project = gameState.project!;
    const pData = kernel.getDataStore().projects.get(project.dataId);
    const context = gameState.combatContext;

    let enemies: EnemyInstance[];
    let combatDeck: CardInstance[];

    if (context?.isBossFight) {
      // Boss战：使用缩放后的Boss敌人
      const bossId =
        pData?.bossEnemies?.[project.currentMonth - 1] ||
        pData?.monthlyEnemies[project.currentMonth - 1]?.[
          (pData.monthlyEnemies[project.currentMonth - 1]?.length || 1) - 1
        ] ||
        'enemy_tech_debt_giant';

      if (context.isFinalBoss) {
        // 最终Boss：2倍强度
        enemies = enemyScaler.generateFinalBossEnemy(project.currentMonth, bossId);
      } else {
        enemies = enemyScaler.generateBossEnemy(project.currentMonth, bossId);
      }

      // Boss战使用锁定牌组（回退到完整牌组如果锁定为空）
      if (gameState.lockedDeck.length > 0) {
        combatDeck = [...gameState.lockedDeck];
      } else {
        combatDeck = [...gameState.deck];
      }
    } else {
      // 每周战斗：使用缩放后的普通敌人
      const weekNumber = context?.weekNumber || 1;
      enemies = enemyScaler.generateWeeklyEnemies(
        project.currentMonth,
        weekNumber,
        gameState.buffs,
      );

      // 每周战斗使用牌组（排除锁定的牌）
      const lockedUids = new Set(gameState.lockedDeck.map((c) => c.uid));
      combatDeck = gameState.deck.filter((c) => !lockedUids.has(c.uid));
    }

    // 创建对战状态
    this.state = createCombatState(combatDeck, project.health, project.maxHealth, enemies);

    // 洗牌
    this.state.drawPile = kernel.getRng().shuffle(this.state.drawPile);

    // 将经营层的 buff 复制到对战中（持续性 buff）
    for (const buff of gameState.buffs) {
      const bd = kernel.getDataStore().buffs.get(buff.dataId);
      if (bd && !bd.hidden) {
        this.state.playerBuffs.push({ ...buff });
      }
    }

    // 注入装备 buff
    const dataStore = kernel.getDataStore();
    for (const equip of gameState.equipments) {
      const eqData = dataStore.equipments.get(equip.dataId);
      if (!eqData) continue;
      cardEffectResolver.applyBuff(this.state.playerBuffs, eqData.buffId, eqData.buffStacks);
    }

    // 处理 ON_COMBAT_START 效果（护甲类、能量类装备）
    for (const buff of this.state.playerBuffs) {
      const bd = dataStore.buffs.get(buff.dataId);
      if (!bd) continue;
      for (const effect of bd.effects) {
        if (effect.trigger !== 'ON_COMBAT_START') continue;
        switch (effect.modifier) {
          case 'initial_block':
            this.state.playerBlock += buff.stacks;
            break;
          case 'max_energy_add':
            this.state.maxEnergy += buff.stacks;
            break;
        }
      }
    }

    // 开始第一回合
    this.startPlayerTurn();
  }

  // 玩家回合开始
  startPlayerTurn(): void {
    if (!this.state || this.state.combatOver) return;

    this.state.turn++;
    this.state.isPlayerTurn = true;

    // 重置能量
    this.state.energy = this.state.maxEnergy;

    // 重置玩家护甲
    this.state.playerBlock = 0;

    // 处理回合开始 buff
    cardEffectResolver.processBuffsOnTurnStart(this.state);

    // 抽5张牌（减去沟通不畅等负面效果）
    let drawCount = 5;
    // 检查手中是否有"沟通不畅"状态牌
    const commBreakdown = this.state.hand.filter(
      (c) => c.dataId === 'card_communication_breakdown',
    );
    drawCount -= commBreakdown.length;
    drawCount = Math.max(1, drawCount);

    for (let i = 0; i < drawCount; i++) {
      cardEffectResolver.drawOneCard(this.state);
    }

    // 检查倦怠状态牌：减少能量
    const burnouts = this.state.hand.filter((c) => c.dataId === 'card_burnout');
    this.state.energy = Math.max(0, this.state.energy - burnouts.length);

    eventBus.emit(Events.TURN_STARTED, this.state.turn);
    eventBus.emit(Events.ENERGY_CHANGED, this.state.energy);
  }

  // 打出一张牌
  playCard(cardUid: string, targetEnemyIndex: number = 0): boolean {
    if (!this.state || !this.state.isPlayerTurn || this.state.combatOver) return false;

    const cardIdx = this.state.hand.findIndex((c) => c.uid === cardUid);
    if (cardIdx === -1) return false;

    const card = this.state.hand[cardIdx];
    const cardData = kernel.getDataStore().cards.get(card.dataId);
    if (!cardData) return false;

    // 不可打出的牌
    if (cardData.unplayable) return false;

    // 计算实际费用（需求蔓延+1）
    let cost = cardData.cost;
    const scopeCreep = this.state.hand.filter((c) => c.dataId === 'card_scope_creep');
    cost += scopeCreep.length;

    // 检查能量
    if (this.state.energy < cost) return false;

    // 消耗能量
    this.state.energy -= cost;

    // 从手牌移除
    this.state.hand.splice(cardIdx, 1);

    // 执行效果
    cardEffectResolver.resolveCard(cardData, this.state, targetEnemyIndex);

    // 卡牌去向
    if (cardData.exhaust) {
      this.state.exhaustPile.push(card);
    } else {
      this.state.discardPile.push(card);
    }

    // 更新统计
    kernel.dispatch((s) => {
      s.stats.totalCardsPlayed++;
    });

    eventBus.emit(Events.ENERGY_CHANGED, this.state.energy);
    return true;
  }

  // 结束玩家回合
  endPlayerTurn(): void {
    if (!this.state || !this.state.isPlayerTurn || this.state.combatOver) return;

    this.state.isPlayerTurn = false;

    // 回合结束 buff 处理
    cardEffectResolver.processBuffsOnTurnEnd(this.state);

    if (this.state.combatOver) {
      this.finishCombat();
      return;
    }

    // 虚无牌处理：ethereal 的牌在回合结束时消耗
    for (let i = this.state.hand.length - 1; i >= 0; i--) {
      const cd = kernel.getDataStore().cards.get(this.state.hand[i].dataId);
      if (cd?.ethereal) {
        this.state.exhaustPile.push(this.state.hand[i]);
        this.state.hand.splice(i, 1);
      }
    }

    // 弃牌
    while (this.state.hand.length > 0) {
      this.state.discardPile.push(this.state.hand.pop()!);
    }

    eventBus.emit(Events.TURN_ENDED, this.state.turn);

    // 敌人回合
    this.executeEnemyTurn();
  }

  // 敌人回合
  private executeEnemyTurn(): void {
    if (!this.state || this.state.combatOver) return;

    enemyAI.executeEnemyTurn(this.state);

    if (this.state.combatOver) {
      this.finishCombat();
      return;
    }

    // 下一玩家回合
    this.startPlayerTurn();
  }

  // 对战结束（public 供 CombatScene 在胜利/败北动画后调用）
  finishCombat(): void {
    if (!this.state) return;

    const victory = this.state.victory;

    // 更新项目健康度
    kernel.dispatch((s) => {
      if (s.project) {
        s.project.health = Math.max(0, this.state!.playerHp);
      }
    });

    kernel.endCombat(victory);
    this.state = null;
  }

  // 获取指定敌人的下一个意图
  getEnemyIntent(enemyIndex: number): { type: string; value: number; description: string } | null {
    if (!this.state) return null;
    const enemy = this.state.enemies[enemyIndex];
    if (!enemy || enemy.hp <= 0) return null;
    return enemyAI.getNextIntent(enemy);
  }
}

export const combatManager = new CombatManager();
