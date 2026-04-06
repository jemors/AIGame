// ========================================
// 数据加载器 - 从 JSON 文件加载游戏数据
// ========================================

import { kernel } from './kernel/GameKernel';
import cardsData from './data/cards.json';
import employeesData from './data/employees.json';
import enemiesData from './data/enemies.json';
import buffsData from './data/buffs.json';
import eventsData from './data/events.json';
import projectsData from './data/projects.json';
import equipmentsData from './data/equipments.json';
import bossRewardsData from './data/bossRewards.json';
import itemsData from './data/items.json';

export function loadAllGameData(): void {
  kernel.loadData({
    cards: cardsData as never[],
    employees: employeesData as never[],
    enemies: enemiesData as never[],
    buffs: buffsData as never[],
    events: eventsData as never[],
    projects: projectsData as never[],
    equipments: equipmentsData as never[],
    bossRewardBuffIds: bossRewardsData.rewardBuffIds,
    items: itemsData as never[],
  });

  console.log('[DataLoader] Loaded:', {
    cards: cardsData.length,
    employees: employeesData.length,
    enemies: enemiesData.length,
    buffs: buffsData.length,
    events: eventsData.length,
    projects: projectsData.length,
    equipments: equipmentsData.length,
    items: itemsData.length,
  });
}
