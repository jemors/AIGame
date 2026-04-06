// ========================================
// GameKernel - 核心调度器
// 管理全局状态、阶段转换、子系统协调
// ========================================

import { GamePhase, Difficulty, TimeSlot } from '../models/types';
import { GameState, createInitialState, updateState, StateUpdater } from './GameState';
import { eventBus, Events } from './EventBus';
import { RandomSeed } from './RandomSeed';
import { CardData } from '../models/Card';
import { EmployeeData } from '../models/Employee';
import { EnemyData } from '../models/Enemy';
import { BuffData } from '../models/Buff';
import { GameEventData } from '../models/GameEvent';
import { ProjectData } from '../models/Project';
import { EquipmentData } from '../models/Equipment';
import { ItemData } from '../models/Item';

// 游戏配置数据（从 JSON 加载）
export interface GameDataStore {
  cards: Map<string, CardData>;
  employees: Map<string, EmployeeData>;
  enemies: Map<string, EnemyData>;
  buffs: Map<string, BuffData>;
  events: GameEventData[];
  projects: Map<string, ProjectData>;
  equipments: Map<string, EquipmentData>;
  items: Map<string, ItemData>;
  bossRewardBuffIds: string[];
}

export class GameKernel {
  private state: GameState;
  private rng: RandomSeed;
  private dataStore: GameDataStore;

  constructor() {
    this.state = createInitialState(Date.now(), Difficulty.NORMAL);
    this.rng = new RandomSeed(this.state.seed);
    this.dataStore = {
      cards: new Map(),
      employees: new Map(),
      enemies: new Map(),
      buffs: new Map(),
      events: [],
      projects: new Map(),
      equipments: new Map(),
      items: new Map(),
      bossRewardBuffIds: [],
    };
  }

  // --- 数据加载 ---

  loadData(data: {
    cards: CardData[];
    employees: EmployeeData[];
    enemies: EnemyData[];
    buffs: BuffData[];
    events: GameEventData[];
    projects: ProjectData[];
    equipments?: EquipmentData[];
    items?: ItemData[];
    bossRewardBuffIds?: string[];
  }): void {
    data.cards.forEach(c => this.dataStore.cards.set(c.id, c));
    data.employees.forEach(e => this.dataStore.employees.set(e.id, e));
    data.enemies.forEach(e => this.dataStore.enemies.set(e.id, e));
    data.buffs.forEach(b => this.dataStore.buffs.set(b.id, b));
    this.dataStore.events = data.events;
    data.projects.forEach(p => this.dataStore.projects.set(p.id, p));
    if (data.equipments) {
      data.equipments.forEach(eq => this.dataStore.equipments.set(eq.id, eq));
    }
    if (data.items) {
      data.items.forEach(it => this.dataStore.items.set(it.id, it));
    }
    if (data.bossRewardBuffIds) {
      this.dataStore.bossRewardBuffIds = data.bossRewardBuffIds;
    }
  }

  getDataStore(): Readonly<GameDataStore> {
    return this.dataStore;
  }

  // --- 状态管理 ---

  getState(): Readonly<GameState> {
    return this.state;
  }

  dispatch(updater: StateUpdater): void {
    this.state = updateState(this.state, updater);
  }

  getRng(): RandomSeed {
    return this.rng;
  }

  // --- 游戏初始化 ---

  startNewGame(studioName: string, difficulty: Difficulty, employeeIds: string[]): void {
    const seed = Date.now();
    this.rng = new RandomSeed(seed);
    this.state = createInitialState(seed, difficulty);

    this.dispatch(s => {
      s.studio.name = studioName;
      s.phase = GamePhase.SETUP;

      // 根据难度调整初始资金
      if (difficulty === Difficulty.EASY) s.studio.funds = 150000;
      if (difficulty === Difficulty.HARD) s.studio.funds = 60000;

      // 添加初始员工
      for (const eid of employeeIds) {
        const eData = this.dataStore.employees.get(eid);
        if (eData) {
          s.employees.push({
            dataId: eid,
            stats: { ...eData.baseStats },
            level: 1,
            exp: 0,
            discoveredTraits: [],
          });
        }
      }

      // 为每个员工生成初始卡牌到牌库
      for (const emp of s.employees) {
        const eData = this.dataStore.employees.get(emp.dataId);
        if (eData) {
          for (const cardId of eData.cardIds) {
            s.deck.push({
              uid: `${cardId}_${this.rng.nextInt(1000, 9999)}`,
              dataId: cardId,
              upgraded: false,
            });
          }
        }
      }
    });

    eventBus.emit(Events.GAME_STARTED);
  }

  // --- 项目管理 ---

  startProject(projectId: string, customName?: string): void {
    const pData = this.dataStore.projects.get(projectId);
    if (!pData) return;

    this.dispatch(s => {
      s.project = {
        dataId: projectId,
        name: customName || pData.name,
        currentMonth: 1,
        currentDay: 1,
        progress: {
          programming: 0,
          art: 0,
          design: 0,
          quality: 0,
          innovation: 0,
        },
        health: 80,
        maxHealth: 80,
      };
      s.daily = {
        currentDay: 1,
        currentWeek: 1,
        currentSlot: TimeSlot.MORNING,
        activitiesThisDay: [],
        cardsGainedToday: [],
      };
    });

    this.transition(GamePhase.DAILY);
  }

  // --- 阶段转换 ---

  transition(nextPhase: GamePhase): void {
    const prevPhase = this.state.phase;
    this.dispatch(s => {
      s.phase = nextPhase;
    });
    eventBus.emit(Events.PHASE_CHANGED, nextPhase, prevPhase);
  }

  // --- 周数计算 ---

  private getWeekForDay(day: number): number {
    if (day <= 7) return 1;
    if (day <= 14) return 2;
    if (day <= 21) return 3;
    return 4;
  }

  // --- 日常阶段 ---

  advanceTimeSlot(): void {
    const current = this.state.daily.currentSlot;
    if (current === TimeSlot.MORNING) {
      this.dispatch(s => { s.daily.currentSlot = TimeSlot.AFTERNOON; });
      eventBus.emit(Events.TIME_SLOT_CHANGED, TimeSlot.AFTERNOON);
    } else if (current === TimeSlot.AFTERNOON) {
      this.dispatch(s => { s.daily.currentSlot = TimeSlot.EVENING; });
      eventBus.emit(Events.TIME_SLOT_CHANGED, TimeSlot.EVENING);
    } else {
      // 晚间结束 → 日终结算
      this.endDay();
    }
  }

  endDay(): void {
    const oldDay = this.state.daily.currentDay;
    const oldWeek = this.getWeekForDay(oldDay);

    eventBus.emit(Events.DAY_ENDED);

    this.dispatch(s => {
      s.stats.totalDays++;
      s.daily.currentDay++;
      s.daily.activitiesThisDay = [];
      s.daily.cardsGainedToday = [];
      s.daily.currentSlot = TimeSlot.MORNING;
      s.daily.currentWeek = this.getWeekForDay(s.daily.currentDay);

      // 恢复员工体力（每日自动恢复）
      for (const emp of s.employees) {
        emp.stats.stamina = Math.min(emp.stats.maxStamina, emp.stats.stamina + 30);
      }

      // 进入新的一周时，清理过期的持续性buff
      const newWeek = s.daily.currentWeek;
      if (newWeek !== oldWeek && s.project) {
        const currentGlobalWeek = (s.project.currentMonth - 1) * 4 + newWeek;
        s.buffs = s.buffs.filter(b => {
          if (b.expiresAtGlobalWeek === undefined) return true;
          return currentGlobalWeek < b.expiresAtGlobalWeek;
        });
      }
    });

    // 检查周末边界：第7/14/21天结束时触发每周战斗
    if (oldDay === 7 || oldDay === 14 || oldDay === 21) {
      const weekNumber = this.getWeekForDay(oldDay);
      this.dispatch(s => {
        s.combatContext = { isBossFight: false, isFinalBoss: false, weekNumber };
      });
      eventBus.emit(Events.WEEK_ENDED, weekNumber);
      this.startCombat();
    } else if (this.state.daily.currentDay > 30) {
      // 月末：进入月末结算（Boss战准备）
      this.transition(GamePhase.MONTH_END);
      eventBus.emit(Events.MONTH_ENDED);
    } else {
      eventBus.emit(Events.DAY_STARTED, this.state.daily.currentDay);
    }
  }

  // --- 进入战斗 ---

  startCombat(): void {
    this.dispatch(s => {
      s.stats.totalCombats++;
    });
    this.transition(GamePhase.COMBAT);
    eventBus.emit(Events.COMBAT_STARTED);
  }

  // Boss战入口（从 MonthEndScreen 调用）
  startBossCombat(): void {
    const isFinalBoss = this.state.publishMarked;
    this.dispatch(s => {
      s.combatContext = { isBossFight: true, isFinalBoss, weekNumber: 4 };
    });
    this.startCombat();
  }

  // --- 对战结束 ---

  endCombat(victory: boolean): void {
    const context = this.state.combatContext;
    eventBus.emit(Events.COMBAT_ENDED, victory);

    // 记录胜负结果 + 清除战斗上下文
    this.dispatch(s => {
      s.lastCombatVictory = victory;
      s.combatContext = null;
    });

    if (context?.isBossFight) {
      this.transition(GamePhase.MONTH_RESULT);
    } else {
      this.transition(GamePhase.WEEK_RESULT);
    }
  }

  // --- 卡牌锁定 ---

  lockCards(cardUids: string[]): void {
    this.dispatch(s => {
      for (const uid of cardUids) {
        const idx = s.deck.findIndex(c => c.uid === uid);
        if (idx !== -1) {
          s.lockedDeck.push(s.deck[idx]);
          s.deck.splice(idx, 1);
        }
      }
    });
    eventBus.emit(Events.CARDS_LOCKED, cardUids.length);
  }

  // 锁卡选择完成 → 回到日常
  finishCardSelection(): void {
    this.transition(GamePhase.DAILY);
    eventBus.emit(Events.DAY_STARTED, this.state.daily.currentDay);
  }

  // --- 装备系统 ---

  generateEquipmentChoices(count: number = 3): EquipmentData[] {
    const all = Array.from(this.dataStore.equipments.values());
    if (all.length === 0) return [];
    const shuffled = this.rng.shuffle([...all]);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  selectEquipment(equipmentId: string): void {
    const eqData = this.dataStore.equipments.get(equipmentId);
    if (!eqData) return;
    this.dispatch(s => {
      s.equipments.push({ dataId: equipmentId });
    });
    eventBus.emit(Events.EQUIPMENT_SELECTED, equipmentId);
  }

  finishEquipmentSelection(): void {
    this.transition(GamePhase.CARD_SELECTION);
  }

  // --- Boss 奖励 Buff ---

  generateBossRewardBuff(): string | null {
    const pool = this.dataStore.bossRewardBuffIds;
    if (pool.length === 0) return null;

    const idx = this.rng.nextInt(0, pool.length - 1);
    const buffId = pool[idx];
    const buffData = this.dataStore.buffs.get(buffId);
    if (!buffData) return null;

    const currentMonth = this.state.project?.currentMonth || 1;

    this.dispatch(s => {
      const existing = s.buffs.find(b => b.dataId === buffId);
      if (existing && buffData.stackable) {
        existing.stacks = Math.min(buffData.maxStacks, existing.stacks + 1);
      } else if (!existing) {
        s.buffs.push({
          dataId: buffId,
          remainingTurns: -1,
          stacks: 1,
          revealed: true,
          acquiredMonth: currentMonth,
        });
      }
    });

    eventBus.emit(Events.BOSS_BUFF_GAINED, buffId);
    return buffId;
  }

  // --- 月度结算完成 → 下月或项目结束 ---

  advanceMonth(): void {
    const project = this.state.project;
    if (!project) return;

    const pData = this.dataStore.projects.get(project.dataId);
    if (!pData) return;

    if (project.currentMonth >= pData.totalMonths || this.state.publishMarked) {
      // 项目结束（自然结束 或 玩家发布后击败最终Boss）
      this.transition(GamePhase.PROJECT_RESULT);
    } else {
      // 进入下月：重置牌组，从员工基础卡重新构筑
      this.dispatch(s => {
        if (s.project) {
          s.project.currentMonth++;
          s.project.currentDay = 1;
        }

        // 清除过期的 Boss 奖励 buff（持续到下月末）
        const bossRewardIds = new Set(this.dataStore.bossRewardBuffIds);
        const newMonth = s.project!.currentMonth;
        s.buffs = s.buffs.filter(b => {
          // Boss 奖励 buff 过期检查
          if (bossRewardIds.has(b.dataId)) {
            if (b.acquiredMonth && b.acquiredMonth + 1 < newMonth) return false;
          }
          // 持续性 buff 过期检查（新月第1周）
          if (b.expiresAtGlobalWeek !== undefined) {
            const newGlobalWeek = (newMonth - 1) * 4 + 1;
            if (newGlobalWeek >= b.expiresAtGlobalWeek) return false;
          }
          return true;
        });

        // 月度牌组重置
        s.deck = [];
        s.lockedDeck = [];

        // 重新生成员工基础卡牌
        for (const emp of s.employees) {
          const eData = this.dataStore.employees.get(emp.dataId);
          if (eData) {
            for (const cardId of eData.cardIds) {
              s.deck.push({
                uid: `${cardId}_${this.rng.nextInt(1000, 9999)}`,
                dataId: cardId,
                upgraded: false,
              });
            }
          }
        }

        s.daily = {
          currentDay: 1,
          currentWeek: 1,
          currentSlot: TimeSlot.MORNING,
          activitiesThisDay: [],
          cardsGainedToday: [],
        };
      });
      this.transition(GamePhase.DAILY);
      eventBus.emit(Events.DAY_STARTED, 1);
    }
  }

  // --- 发布游戏 ---

  isPublishReady(): boolean {
    const p = this.state.project;
    if (!p) return false;
    return p.progress.programming >= 100 && p.progress.art >= 100 && p.progress.design >= 100;
  }

  markPublish(): void {
    this.dispatch(s => { s.publishMarked = true; });
    eventBus.emit(Events.PUBLISH_MARKED);
  }

  // --- 新项目循环 ---

  startNewProject(projectId: string, customName?: string): void {
    const pData = this.dataStore.projects.get(projectId);
    if (!pData) return;

    this.dispatch(s => {
      // 重置项目相关状态（保留 studio/employees/equipments/items）
      s.project = {
        dataId: projectId,
        name: customName || pData.name,
        currentMonth: 1,
        currentDay: 1,
        progress: { programming: 0, art: 0, design: 0, quality: 0, innovation: 0 },
        health: 80 + (s.projectNumber - 1) * 10,
        maxHealth: 80 + (s.projectNumber - 1) * 10,
      };
      s.projectNumber++;
      s.publishMarked = false;
      s.deck = [];
      s.lockedDeck = [];
      s.buffs = [];
      s.triggeredEvents = [];
      s.lastCombatVictory = false;
      s.combatContext = null;

      // 从当前员工重建牌库
      for (const emp of s.employees) {
        const eData = this.dataStore.employees.get(emp.dataId);
        if (eData) {
          for (const cardId of eData.cardIds) {
            s.deck.push({
              uid: `${cardId}_${this.rng.nextInt(1000, 9999)}`,
              dataId: cardId,
              upgraded: false,
            });
          }
        }
      }

      // 恢复全员体力和士气
      for (const emp of s.employees) {
        emp.stats.stamina = emp.stats.maxStamina;
        emp.stats.morale = Math.max(emp.stats.morale, 50);
      }

      s.daily = {
        currentDay: 1,
        currentWeek: 1,
        currentSlot: TimeSlot.MORNING,
        activitiesThisDay: [],
        cardsGainedToday: [],
      };
    });

    this.transition(GamePhase.DAILY);
    eventBus.emit(Events.NEW_PROJECT_STARTED);
    eventBus.emit(Events.DAY_STARTED, 1);
  }

  // --- 道具系统 ---

  purchaseItem(itemId: string): boolean {
    const itemData = this.dataStore.items.get(itemId);
    if (!itemData) return false;
    if (this.state.studio.funds < itemData.price) return false;

    const existing = this.state.items.find(i => i.dataId === itemId);
    if (existing && existing.quantity >= itemData.maxStack) return false;

    this.dispatch(s => {
      s.studio.funds -= itemData.price;
      const item = s.items.find(i => i.dataId === itemId);
      if (item) {
        item.quantity++;
      } else {
        s.items.push({ dataId: itemId, quantity: 1 });
      }
    });

    eventBus.emit(Events.ITEM_PURCHASED, itemId);
    eventBus.emit(Events.FUNDS_CHANGED, this.state.studio.funds);
    return true;
  }

  useItem(itemId: string): boolean {
    const itemData = this.dataStore.items.get(itemId);
    if (!itemData) return false;

    const existingItem = this.state.items.find(i => i.dataId === itemId);
    if (!existingItem || existingItem.quantity <= 0) return false;

    // 应用效果
    this.dispatch(s => {
      const item = s.items.find(i => i.dataId === itemId);
      if (item) item.quantity--;

      for (const effect of itemData.effects) {
        switch (effect.type) {
          case 'HEAL_HP':
            if (s.project) {
              s.project.health = Math.min(s.project.maxHealth, s.project.health + effect.value);
            }
            break;
          case 'RESTORE_STAMINA':
            for (const emp of s.employees) {
              emp.stats.stamina = Math.min(emp.stats.maxStamina, emp.stats.stamina + effect.value);
            }
            break;
          case 'ADD_BLOCK': {
            const blockBuffId = 'buff_item_block_temp';
            const existBuff = s.buffs.find(b => b.dataId === blockBuffId);
            if (existBuff) {
              existBuff.stacks += effect.value;
            } else {
              s.buffs.push({
                dataId: blockBuffId,
                remainingTurns: -1,
                stacks: effect.value,
                revealed: true,
              });
            }
            break;
          }
          case 'GAIN_BUFF':
            if (effect.buffId === 'buff_morale_boost_item') {
              for (const emp of s.employees) {
                emp.stats.morale = Math.min(100, emp.stats.morale + effect.value);
              }
            } else if (effect.buffId === 'buff_inspiration_item') {
              if (s.project) {
                s.project.progress.quality = Math.min(100, s.project.progress.quality + 5);
              }
              s.studio.environment.creativity = Math.min(100, s.studio.environment.creativity + effect.value);
            }
            break;
          case 'REMOVE_DEBUFF': {
            const debuffIdx = s.buffs.findIndex(b => {
              const bd = this.dataStore.buffs.get(b.dataId);
              return bd?.type === 'NEGATIVE';
            });
            if (debuffIdx !== -1) s.buffs.splice(debuffIdx, 1);
            break;
          }
        }
      }
    });

    eventBus.emit(Events.ITEM_USED, itemId);
    return true;
  }

  purchaseEquipmentFromShop(equipmentId: string): boolean {
    const eqData = this.dataStore.equipments.get(equipmentId);
    if (!eqData) return false;
    if (this.state.studio.funds < eqData.price) return false;

    this.dispatch(s => {
      s.studio.funds -= eqData.price;
      s.equipments.push({ dataId: equipmentId });
    });

    eventBus.emit(Events.EQUIPMENT_PURCHASED, equipmentId);
    eventBus.emit(Events.FUNDS_CHANGED, this.state.studio.funds);
    return true;
  }

  // --- 招募员工 ---

  recruitEmployee(employeeId: string): void {
    const eData = this.dataStore.employees.get(employeeId);
    if (!eData) return;
    if (this.state.employees.length >= this.state.studio.maxEmployees) return;

    this.dispatch(s => {
      s.employees.push({
        dataId: employeeId,
        stats: { ...eData.baseStats },
        level: 1,
        exp: 0,
        discoveredTraits: [],
      });
    });

    eventBus.emit(Events.EMPLOYEE_HIRED, employeeId);
  }

  // --- 经济 ---

  modifyFunds(amount: number): void {
    this.dispatch(s => {
      s.studio.funds += amount;
    });
    eventBus.emit(Events.FUNDS_CHANGED, this.state.studio.funds);
  }

  // --- 存档 ---

  saveToStorage(): void {
    this.dispatch(s => {
      s.randomState = this.rng.getState();
    });
    localStorage.setItem('game_save', JSON.stringify(this.state));
  }

  loadFromStorage(): boolean {
    const raw = localStorage.getItem('game_save');
    if (!raw) return false;
    try {
      this.state = JSON.parse(raw) as GameState;
      this.rng = new RandomSeed(0);
      this.rng.setState(this.state.randomState);

      // 存档迁移：添加新版本字段的默认值
      if (this.state.daily.currentWeek === undefined) {
        this.dispatch(s => {
          s.daily.currentWeek = this.getWeekForDay(s.daily.currentDay);
        });
      }
      if (!this.state.lockedDeck) {
        this.dispatch(s => { s.lockedDeck = []; });
      }
      if (this.state.combatContext === undefined) {
        this.dispatch(s => { s.combatContext = null; });
      }
      if (!this.state.equipments) {
        this.dispatch(s => { s.equipments = []; });
      }
      if (this.state.lastCombatVictory === undefined) {
        this.dispatch(s => { s.lastCombatVictory = false; });
      }
      if (this.state.publishMarked === undefined) {
        this.dispatch(s => { s.publishMarked = false; });
      }
      if (!this.state.items) {
        this.dispatch(s => { s.items = []; });
      }
      if (this.state.projectNumber === undefined) {
        this.dispatch(s => { s.projectNumber = 1; });
      }

      return true;
    } catch {
      return false;
    }
  }

  hasSave(): boolean {
    return localStorage.getItem('game_save') !== null;
  }

  clearSave(): void {
    localStorage.removeItem('game_save');
  }
}

// 全局单例
export const kernel = new GameKernel();
