// ========================================
// DailySystem - 日常活动系统
// 核心：活动执行 → 效果计算 → 卡牌生成
// ========================================

import { kernel } from '../kernel/GameKernel';
import { eventBus, Events } from '../kernel/EventBus';
import { ActivityType, TimeSlot, EmployeeRole } from '../models/types';

export interface ActivityOption {
  type: ActivityType;
  name: string;
  description: string;
  icon: string;
  staminaCost: number;
  // 不同角色的体力消耗倍率（未指定的角色使用 0.5 倍基础消耗）
  roleStaminaWeight: Partial<Record<EmployeeRole, number>>;
  effects: {
    progress?: { programming?: number; art?: number; design?: number };
    morale?: number;
    creativity?: number;
    loyalty?: number;
    staminaRestore?: number; // 体力恢复（仅休息用）
    healthRestore?: number; // 项目健康值恢复
  };
  cardRewards: string[]; // 可能产出的 cardId 列表
  negativeCards?: string[]; // 负面状态牌
}

// 活动定义
export const ACTIVITIES: ActivityOption[] = [
  {
    type: ActivityType.CODING,
    name: '编程开发',
    description: '推进编程进度，产出攻击类卡牌',
    icon: '💻',
    staminaCost: 12,
    roleStaminaWeight: { [EmployeeRole.PROGRAMMER]: 1.0, [EmployeeRole.QA]: 0.7 },
    effects: { progress: { programming: 4 }, morale: -2 },
    cardRewards: ['card_code_sprint', 'card_debug', 'card_hotfix'],
  },
  {
    type: ActivityType.ART_WORK,
    name: '美术制作',
    description: '推进美术进度，产出技能类卡牌',
    icon: '🎨',
    staminaCost: 12,
    roleStaminaWeight: { [EmployeeRole.ARTIST]: 1.0 },
    effects: { progress: { art: 4 }, morale: -2 },
    cardRewards: ['card_visual_polish', 'card_ui_design'],
  },
  {
    type: ActivityType.MEETING,
    name: '开会讨论',
    description: '提高策划进度和沟通，恢复少量项目健康',
    icon: '📋',
    staminaCost: 6,
    roleStaminaWeight: { [EmployeeRole.DESIGNER]: 0.8, [EmployeeRole.PROGRAMMER]: 0.6 },
    effects: { progress: { design: 3 }, morale: 2, healthRestore: 3 },
    cardRewards: [
      'card_team_sync',
      'card_code_review',
      'card_emergency_meeting',
      'card_steady_progress',
    ],
  },
  {
    type: ActivityType.BRAINSTORM,
    name: '头脑风暴',
    description: '激发创意，可能产出稀有卡牌',
    icon: '💡',
    staminaCost: 14,
    roleStaminaWeight: { [EmployeeRole.DESIGNER]: 1.0, [EmployeeRole.ARTIST]: 0.8 },
    effects: { creativity: 15, progress: { design: 2 } },
    cardRewards: ['card_brainstorm', 'card_prototype', 'card_refactor'],
  },
  {
    type: ActivityType.TEAM_BUILDING,
    name: '团建活动',
    description: '恢复大量项目健康值，提升士气和忠诚度',
    icon: '🎉',
    staminaCost: 18,
    roleStaminaWeight: {
      [EmployeeRole.PROGRAMMER]: 0.8,
      [EmployeeRole.ARTIST]: 0.8,
      [EmployeeRole.DESIGNER]: 0.8,
      [EmployeeRole.QA]: 0.8,
    },
    effects: { morale: 12, loyalty: 5, healthRestore: 12 },
    cardRewards: ['card_team_sync', 'card_pair_programming', 'card_team_rally'],
  },
  {
    type: ActivityType.OVERTIME,
    name: '加班赶工',
    description: '大幅推进进度，但降低士气并获得负面卡',
    icon: '🌙',
    staminaCost: 22,
    roleStaminaWeight: { [EmployeeRole.PROGRAMMER]: 1.0, [EmployeeRole.ARTIST]: 0.9 },
    effects: { progress: { programming: 7, art: 5 }, morale: -10 },
    cardRewards: ['card_crunch', 'card_deadline_rush'],
    negativeCards: ['card_fatigue'],
  },
  {
    type: ActivityType.REST,
    name: '休息调整',
    description: '恢复体力20点，恢复少量项目健康，移除负面卡',
    icon: '☕',
    staminaCost: 0,
    roleStaminaWeight: {},
    effects: { morale: 5, staminaRestore: 20, healthRestore: 5 },
    cardRewards: ['card_team_rest'],
  },
  {
    type: ActivityType.COMMUNICATE,
    name: '员工交流',
    description: '提升忠诚度，恢复少量项目健康',
    icon: '💬',
    staminaCost: 4,
    roleStaminaWeight: { [EmployeeRole.DESIGNER]: 0.6 },
    effects: { loyalty: 10, morale: 3, healthRestore: 2 },
    cardRewards: ['card_tech_sharing', 'card_fortified_recovery'],
  },
];

export class DailySystem {
  // 获取当前时段可用的活动列表
  getAvailableActivities(): ActivityOption[] {
    const state = kernel.getState();
    const slot = state.daily.currentSlot;

    // 晚间可以加班，白天不行
    if (slot !== TimeSlot.EVENING) {
      return ACTIVITIES.filter((a) => a.type !== ActivityType.OVERTIME);
    }
    return [...ACTIVITIES];
  }

  // 计算某员工在某活动中的实际体力消耗
  private getStaminaCostForEmployee(activity: ActivityOption, role: EmployeeRole): number {
    const weight = activity.roleStaminaWeight[role];
    if (weight !== undefined) {
      return Math.round(activity.staminaCost * weight);
    }
    // 未指定角色使用 0.5 倍
    return Math.round(activity.staminaCost * 0.5);
  }

  // 执行一个活动
  executeActivity(activity: ActivityOption): { cardsGained: string[]; message: string } {
    const rng = kernel.getRng();
    const state = kernel.getState();
    const cardsGained: string[] = [];

    // 记录进度推进前的值（用于检测是否首次达到100%）
    const prevProg = state.project ? { ...state.project.progress } : null;

    // 1. 应用即时效果
    kernel.dispatch((s) => {
      // 推进项目进度
      if (activity.effects.progress && s.project) {
        const p = activity.effects.progress;
        if (p.programming) {
          s.project.progress.programming = Math.min(
            100,
            s.project.progress.programming + p.programming,
          );
        }
        if (p.art) {
          s.project.progress.art = Math.min(100, s.project.progress.art + p.art);
        }
        if (p.design) {
          s.project.progress.design = Math.min(100, s.project.progress.design + p.design);
        }
      }

      // 更新工作室环境
      if (activity.effects.morale) {
        s.studio.environment.morale = Math.max(
          0,
          Math.min(100, s.studio.environment.morale + activity.effects.morale),
        );
      }
      if (activity.effects.creativity) {
        s.studio.environment.creativity = Math.max(
          0,
          Math.min(100, s.studio.environment.creativity + activity.effects.creativity),
        );
      }

      // 更新员工状态（按角色差异化消耗体力）
      for (const emp of s.employees) {
        const empData = kernel.getDataStore().employees.get(emp.dataId);
        const role = empData?.role || EmployeeRole.PROGRAMMER;
        const cost = this.getStaminaCostForEmployee(activity, role);
        emp.stats.stamina = Math.max(0, emp.stats.stamina - cost);

        // 休息时额外恢复体力
        if (activity.effects.staminaRestore) {
          emp.stats.stamina = Math.min(
            emp.stats.maxStamina,
            emp.stats.stamina + activity.effects.staminaRestore,
          );
        }

        if (activity.effects.loyalty) {
          emp.stats.loyalty = Math.max(
            0,
            Math.min(100, emp.stats.loyalty + activity.effects.loyalty),
          );
        }
        if (activity.effects.morale) {
          emp.stats.morale = Math.max(0, Math.min(100, emp.stats.morale + activity.effects.morale));
        }
      }

      // 恢复项目健康值
      if (activity.effects.healthRestore && s.project) {
        s.project.health = Math.min(
          s.project.maxHealth,
          s.project.health + activity.effects.healthRestore,
        );
      }

      // 记录活动
      s.daily.activitiesThisDay.push(activity.type);
    });

    // 1.5 检测进度首次达到100%，激活对应buff
    if (prevProg) {
      const newState = kernel.getState();
      const newProg = newState.project?.progress;
      if (newProg) {
        const progressBuffMap: Array<{
          key: keyof typeof prevProg;
          buffId: string;
          label: string;
        }> = [
          { key: 'programming', buffId: 'buff_progress_programming', label: '代码完备' },
          { key: 'art', buffId: 'buff_progress_art', label: '视觉精良' },
          { key: 'design', buffId: 'buff_progress_design', label: '设计成熟' },
        ];
        for (const { key, buffId, label } of progressBuffMap) {
          if (prevProg[key] < 100 && newProg[key] >= 100) {
            // 仅在尚未拥有该buff时添加
            if (!newState.buffs.some((b) => b.dataId === buffId)) {
              kernel.dispatch((s) => {
                const bd = kernel.getDataStore().buffs.get(buffId);
                s.buffs.push({
                  dataId: buffId,
                  remainingTurns: bd?.duration ?? -1,
                  stacks: 1,
                  revealed: true,
                });
              });
              eventBus.emit(Events.BUFF_APPLIED, buffId, 1, 'player');
              eventBus.emit(Events.UI_NOTIFICATION, `${label} - 进度完成奖励！`);
            }
          }
        }
      }
    }

    // 2. 生成卡牌（基于活动和员工属性）
    if (activity.cardRewards.length > 0) {
      // 随机从候选卡中选一张
      const cardId = rng.pick(activity.cardRewards);
      const uid = `${cardId}_${Date.now()}_${rng.nextInt(100, 999)}`;
      cardsGained.push(cardId);

      kernel.dispatch((s) => {
        s.deck.push({ uid, dataId: cardId, upgraded: false });
        s.daily.cardsGainedToday.push(cardId);
      });

      const cardData = kernel.getDataStore().cards.get(cardId);
      eventBus.emit(Events.CARD_GAINED, cardId, cardData?.name);
    }

    // 3. 负面卡牌
    if (activity.negativeCards) {
      for (const negId of activity.negativeCards) {
        const uid = `${negId}_${Date.now()}_${rng.nextInt(100, 999)}`;
        cardsGained.push(negId);
        kernel.dispatch((s) => {
          s.deck.push({ uid, dataId: negId, upgraded: false });
        });
      }
    }

    // 4. 休息特殊效果：移除一张负面状态卡
    if (activity.type === ActivityType.REST) {
      const deck = kernel.getState().deck;
      const statusCards = deck.filter((c) => {
        const cd = kernel.getDataStore().cards.get(c.dataId);
        return cd?.type === 'STATUS';
      });
      if (statusCards.length > 0) {
        const toRemove = rng.pick(statusCards);
        kernel.dispatch((s) => {
          s.deck = s.deck.filter((c) => c.uid !== toRemove.uid);
        });
        const removedCard = kernel.getDataStore().cards.get(toRemove.dataId);
        eventBus.emit(Events.CARD_REMOVED, toRemove.dataId, removedCard?.name);
      }
    }

    // 5. 构造反馈消息
    const cardNames = cardsGained
      .map((id) => kernel.getDataStore().cards.get(id)?.name || id)
      .join('、');
    const progressStr = activity.effects.progress
      ? Object.entries(activity.effects.progress)
          .filter(([, v]) => v && v > 0)
          .map(([k, v]) => `${k === 'programming' ? '编程' : k === 'art' ? '美术' : '策划'}+${v}`)
          .join(' ')
      : '';

    const message = [
      progressStr && `进度: ${progressStr}`,
      cardNames && `获得卡牌: ${cardNames}`,
      activity.effects.healthRestore && `项目健康+${activity.effects.healthRestore}`,
      activity.effects.morale &&
        `士气${activity.effects.morale > 0 ? '+' : ''}${activity.effects.morale}`,
    ]
      .filter(Boolean)
      .join(' | ');

    eventBus.emit(Events.ACTIVITY_COMPLETED, activity.type, message);
    return { cardsGained, message };
  }
}

export const dailySystem = new DailySystem();
