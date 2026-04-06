// ========================================
// EnemyScaler - 敌人难度缩放系统
// 根据月份、周数和环境buff自动生成缩放后的敌人
// ========================================

import { kernel } from '../kernel/GameKernel';
import type { EnemyData, EnemyInstance, EnemyIntent } from '../models/Enemy';
import type { BuffInstance } from '../models/Buff';

export class EnemyScaler {

  // 根据月份和周数生成每周战斗的敌人
  generateWeeklyEnemies(
    monthNumber: number,
    weekNumber: number,
    environmentBuffs: BuffInstance[],
  ): EnemyInstance[] {
    const dataStore = kernel.getDataStore();
    const rng = kernel.getRng();

    // 计算难度系数
    let difficultyMultiplier = 1 + (monthNumber - 1) * 0.5 + (weekNumber - 1) * 0.25;

    // 应用环境buff对难度的影响
    for (const buff of environmentBuffs) {
      const bd = dataStore.buffs.get(buff.dataId);
      if (bd && bd.id === 'buff_caotai') {
        // "草台班子"buff降低效率 → 敌人相对更强
        difficultyMultiplier *= 1.15;
      }
    }

    // 收集所有普通级敌人模板
    const normalEnemies: EnemyData[] = [];
    dataStore.enemies.forEach(e => {
      if (!e.tier || e.tier === 'normal') {
        normalEnemies.push(e);
      }
    });

    if (normalEnemies.length === 0) return [];

    // 根据进度决定敌人数量：1-3个
    const progression = (monthNumber - 1) * 4 + weekNumber;
    const enemyCount = Math.min(3, 1 + Math.floor(progression / 4));

    // 随机选择敌人模板
    const selectedEnemies: EnemyInstance[] = [];
    for (let i = 0; i < enemyCount; i++) {
      const template = normalEnemies[rng.nextInt(0, normalEnemies.length - 1)];
      selectedEnemies.push(this.createScaledEnemy(template, difficultyMultiplier));
    }

    return selectedEnemies;
  }

  // 生成Boss敌人
  generateBossEnemy(monthNumber: number, bossEnemyId: string): EnemyInstance[] {
    const dataStore = kernel.getDataStore();
    const bossData = dataStore.enemies.get(bossEnemyId);

    if (!bossData) {
      // 回退：使用任意boss级敌人
      const fallback: EnemyData[] = [];
      dataStore.enemies.forEach(e => {
        if (e.tier === 'boss') fallback.push(e);
      });
      if (fallback.length === 0) return [];
      const bossMultiplier = 1 + (monthNumber - 1) * 0.3;
      return [this.createScaledEnemy(fallback[0], bossMultiplier)];
    }

    const bossMultiplier = 1 + (monthNumber - 1) * 0.3;
    return [this.createScaledEnemy(bossData, bossMultiplier)];
  }

  // 生成最终Boss敌人（发布游戏时，2倍普通Boss强度）
  generateFinalBossEnemy(monthNumber: number, bossEnemyId: string): EnemyInstance[] {
    const dataStore = kernel.getDataStore();
    const bossData = dataStore.enemies.get(bossEnemyId);

    if (!bossData) {
      const fallback: EnemyData[] = [];
      dataStore.enemies.forEach(e => {
        if (e.tier === 'boss') fallback.push(e);
      });
      if (fallback.length === 0) return [];
      const finalMultiplier = (1 + (monthNumber - 1) * 0.3) * 2.0;
      return [this.createScaledEnemy(fallback[0], finalMultiplier)];
    }

    const finalMultiplier = (1 + (monthNumber - 1) * 0.3) * 2.0;
    return [this.createScaledEnemy(bossData, finalMultiplier)];
  }

  // 创建缩放后的敌人实例
  private createScaledEnemy(template: EnemyData, multiplier: number): EnemyInstance {
    const scaledHp = Math.round(template.maxHp * multiplier);

    // 缩放行为序列的数值
    const scaledIntents: EnemyIntent[] = template.intentPattern.map(intent => ({
      ...intent,
      value: Math.round(intent.value * multiplier),
    }));

    return {
      dataId: template.id,
      hp: scaledHp,
      maxHp: scaledHp,
      block: 0,
      intentIndex: 0,
      buffs: [],
      scaledIntentPattern: scaledIntents,
    };
  }
}

export const enemyScaler = new EnemyScaler();
