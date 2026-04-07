// ========================================
// DailyScreen - 日常经营主界面
// ========================================

import { kernel } from '../../kernel/GameKernel';
import { eventBus, Events } from '../../kernel/EventBus';
import { TimeSlot, EmployeeRole } from '../../models/types';
import { dailySystem, type ActivityOption } from '../../systems/DailySystem';
import type { Screen } from '../UIManager';

const SLOT_NAMES: Record<string, string> = {
  [TimeSlot.MORNING]: '上午',
  [TimeSlot.AFTERNOON]: '下午',
  [TimeSlot.EVENING]: '晚间',
};

const ROLE_LABELS: Record<string, string> = {
  [EmployeeRole.PROGRAMMER]: '程序',
  [EmployeeRole.ARTIST]: '美术',
  [EmployeeRole.DESIGNER]: '策划',
  [EmployeeRole.QA]: '测试',
};

export class DailyScreen implements Screen {
  id = 'daily';
  private container!: HTMLElement;
  private logMessages: string[] = [];

  create(container: HTMLElement): void {
    this.container = container;
    this.logMessages = [];
    this.renderShell();
    this.refreshView();
    this.container.addEventListener('click', this.onContainerClick);

    // 监听事件
    eventBus.on(Events.ACTIVITY_COMPLETED, this.onActivityCompleted);
    eventBus.on(Events.CARD_GAINED, this.onCardGained);
    eventBus.on(Events.CARD_REMOVED, this.onCardRemoved);
  }

  update(): void {
    this.refreshView();
  }

  destroy(): void {
    this.container.removeEventListener('click', this.onContainerClick);
    eventBus.off(Events.ACTIVITY_COMPLETED, this.onActivityCompleted);
    eventBus.off(Events.CARD_GAINED, this.onCardGained);
    eventBus.off(Events.CARD_REMOVED, this.onCardRemoved);
  }

  private onActivityCompleted = (_type: unknown, message: unknown) => {
    this.logMessages.push(message as string);
    this.refreshJournalPanel();
  };

  private onCardGained = (_id: unknown, name: unknown) => {
    this.showFloatingText(`+${name as string}`, 'var(--highlight-green)');
  };

  private onCardRemoved = (_id: unknown, name: unknown) => {
    this.showFloatingText(`-${name as string}`, 'var(--highlight-red)');
  };

  private showFloatingText(text: string, color: string): void {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      font-size:24px;font-family:var(--font-title);color:${color};
      pointer-events:none;z-index:250;animation:floatUp 1.5s ease-out forwards;
    `;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  private onContainerClick = (event: Event): void => {
    const target = (event.target as HTMLElement | null)?.closest(
      'button, [data-buff-id], [data-equip-id]',
    ) as HTMLElement | null;
    if (!target) return;

    if (target.id === 'btn-view-deck') {
      this.showDeckViewer();
      return;
    }
    if (target.id === 'btn-view-locked') {
      this.showLockedDeckViewer();
      return;
    }
    if (target.id === 'btn-shop') {
      this.showShopPopup();
      return;
    }
    if (target.id === 'btn-inventory') {
      this.showInventoryPopup();
      return;
    }
    if (target.id === 'btn-publish-game') {
      this.showPublishConfirm();
      return;
    }

    const buffId = target.dataset.buffId;
    if (buffId) {
      this.showBuffDetail(buffId);
      return;
    }

    const equipId = target.dataset.equipId;
    if (equipId) {
      this.showEquipmentDetail(equipId);
      return;
    }

    if (target.classList.contains('activity-btn')) {
      this.handleActivityClick(target);
    }
  };

  private handleActivityClick(target: HTMLElement): void {
    const state = kernel.getState();
    const activities = dailySystem.getAvailableActivities();
    const actType = target.dataset.activity!;
    const activity = activities.find((a) => a.type === actType);
    if (!activity) return;

    const minStamina = state.employees.reduce((min, e) => {
      const eData = kernel.getDataStore().employees.get(e.dataId);
      const role = eData?.role || EmployeeRole.PROGRAMMER;
      const weight = activity.roleStaminaWeight[role] ?? 0.5;
      const cost = Math.round(activity.staminaCost * weight);
      return Math.min(min, e.stats.stamina - cost);
    }, Infinity);

    if (minStamina < 0) {
      target.style.borderColor = 'var(--highlight-red)';
      target.style.animation = 'shake 0.3s';
      setTimeout(() => {
        target.style.borderColor = '';
        target.style.animation = '';
      }, 500);
      return;
    }

    dailySystem.executeActivity(activity);
    kernel.advanceTimeSlot();
  }

  private renderShell(): void {
    this.container.innerHTML = `
      <div class="screen daily-screen">
        <div class="daily-backdrop"></div>
        <div class="daily-overlay"></div>
        <div class="daily-shell fade-in">
          <header class="daily-topbar">
            <div class="studio-hero">
              <span class="panel-eyebrow">Studio Operations</span>
              <h1 id="daily-studio-name"></h1>
              <p id="daily-context"></p>
            </div>
            <div class="studio-toolbar">
              <span class="resource-bar">资金 <span id="daily-funds" class="value"></span></span>
              <span class="resource-bar">氛围 <span id="daily-morale" class="value"></span></span>
              <span class="resource-bar">创意 <span id="daily-creativity" class="value"></span></span>
              <button id="btn-view-deck" class="quick-action">牌库 <span id="daily-deck-count"></span></button>
              <button id="btn-view-locked" class="quick-action quick-action--gold">锁定 <span id="daily-locked-count"></span></button>
              <button id="btn-shop" class="quick-action quick-action--copper">商店</button>
              <button id="btn-inventory" class="quick-action quick-action--violet">背包 <span id="daily-item-count"></span></button>
            </div>
          </header>

          <div class="daily-layout">
            <main class="daily-main">
              <section id="daily-project-panel" class="ops-panel"></section>
              <section id="daily-task-panel" class="ops-panel" style="display:flex;flex-direction:column;min-height:0;"></section>
            </main>

            <aside class="daily-sidebar">
              <section id="daily-team-panel" class="ops-panel"></section>
              <section id="daily-assets-panel" class="ops-panel"></section>
              <section id="daily-journal-panel" class="ops-panel journal-panel scrollable"></section>
            </aside>
          </div>
        </div>
      </div>
      <style>
        @keyframes floatUp {
          0% { opacity:1; transform:translate(-50%,-50%); }
          100% { opacity:0; transform:translate(-50%,-100px); }
        }
      </style>
    `;
  }

  private refreshView(): void {
    this.refreshTopBar();
    this.refreshProjectPanel();
    this.refreshTaskPanel();
    this.refreshTeamPanel();
    this.refreshAssetsPanel();
    this.refreshJournalPanel();
  }

  private refreshTopBar(): void {
    const state = kernel.getState();
    const project = state.project!;
    const studio = state.studio;

    (this.container.querySelector('#daily-studio-name') as HTMLElement).textContent = studio.name;
    (this.container.querySelector('#daily-context') as HTMLElement).textContent =
      `第${project.currentMonth}月 · 第${state.daily.currentWeek}周 · 第${state.daily.currentDay}天 · ${SLOT_NAMES[state.daily.currentSlot]} · 当前项目 ${project.name}`;
    (this.container.querySelector('#daily-funds') as HTMLElement).textContent =
      studio.funds.toLocaleString();
    (this.container.querySelector('#daily-morale') as HTMLElement).textContent = String(
      studio.environment.morale,
    );
    (this.container.querySelector('#daily-creativity') as HTMLElement).textContent = String(
      studio.environment.creativity,
    );
    (this.container.querySelector('#daily-deck-count') as HTMLElement).textContent = String(
      state.deck.length,
    );
    (this.container.querySelector('#daily-locked-count') as HTMLElement).textContent = String(
      state.lockedDeck.length,
    );
    (this.container.querySelector('#daily-item-count') as HTMLElement).textContent = String(
      state.items.reduce((s, i) => s + i.quantity, 0),
    );
  }

  private refreshProjectPanel(): void {
    const state = kernel.getState();
    const project = state.project!;
    const healthRatio = project.health / project.maxHealth;
    const healthColor =
      healthRatio < 0.3
        ? 'var(--highlight-red)'
        : healthRatio < 0.6
          ? 'var(--highlight-yellow)'
          : 'var(--highlight-green)';
    const healthLabel =
      healthRatio < 0.3 ? '濒临失控' : healthRatio < 0.6 ? '承压推进' : '状态稳定';
    const panel = this.container.querySelector('#daily-project-panel') as HTMLElement;
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <span class="panel-eyebrow">Project Pulse</span>
          <h2>${project.name}</h2>
        </div>
        <div class="health-pill">
          <strong style="color:${healthColor};">健康 ${project.health}/${project.maxHealth}</strong>
          <span>${healthLabel}</span>
        </div>
      </div>

      <div class="project-summary">
        <div class="project-callout">
          <span class="panel-eyebrow" style="color:rgba(255,237,211,0.72);">Current Focus</span>
          <strong>${kernel.isPublishReady() ? '发布窗口已经打开' : `安排好${SLOT_NAMES[state.daily.currentSlot]}的唯一主任务`}</strong>
          <p>
            ${
              kernel.isPublishReady()
                ? '核心进度已经到位。现在的每次选择都会直接影响最终 Boss 战前的牌组、状态和资源储备。'
                : '经营阶段不是堆面板，而是在有限体力里选出今天最值得推进的动作。注意团队士气、项目健康与牌库积累之间的平衡。'
            }
          </p>
        </div>

        <div class="project-metrics">
          ${this.renderProgressBar('项目健康', healthRatio * 100, healthColor)}
          ${this.renderProgressBar('编程完成度', project.progress.programming, 'var(--highlight-blue)')}
          ${this.renderProgressBar('美术完成度', project.progress.art, 'var(--highlight-green)')}
          ${this.renderProgressBar('策划完成度', project.progress.design, 'var(--highlight-yellow)')}
          ${this.renderProgressBar('品质打磨', project.progress.quality, 'var(--highlight-copper)')}
        </div>
      </div>

      ${this.renderPublishSection(state)}
    `;
  }

  private refreshTaskPanel(): void {
    const state = kernel.getState();
    const activities = dailySystem.getAvailableActivities();
    const panel = this.container.querySelector('#daily-task-panel') as HTMLElement;
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <span class="panel-eyebrow">Task Queue</span>
          <h3>选择${SLOT_NAMES[state.daily.currentSlot]}活动</h3>
        </div>
        <span class="slot-pill">${SLOT_NAMES[state.daily.currentSlot]}</span>
      </div>
      <p class="panel-subtitle">每个时段只能推进一件最重要的事。动作越明确，团队与牌组的反馈越清晰。</p>
      <div class="activity-grid scrollable">
        ${activities.map((a) => this.renderActivity(a)).join('')}
      </div>
    `;
  }

  private refreshTeamPanel(): void {
    const state = kernel.getState();
    const studio = state.studio;
    const panel = this.container.querySelector('#daily-team-panel') as HTMLElement;
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <span class="panel-eyebrow">Team State</span>
          <h3>团队状态</h3>
        </div>
      </div>
      <div class="environment-row">
        <span class="ops-chip">氛围 <strong>${studio.environment.morale}</strong></span>
        <span class="ops-chip">创意 <strong>${studio.environment.creativity}</strong></span>
        <span class="ops-chip">成员 <strong>${state.employees.length}</strong></span>
      </div>
      <div class="team-list">
        ${state.employees
          .map((emp) => {
            const eData = kernel.getDataStore().employees.get(emp.dataId);
            if (!eData) return '';
            const staminaRatio = emp.stats.stamina / emp.stats.maxStamina;
            const staminaColor =
              staminaRatio < 0.3
                ? 'var(--highlight-red)'
                : staminaRatio < 0.6
                  ? 'var(--highlight-yellow)'
                  : 'var(--highlight-green)';
            return `
            <div class="team-row">
              <div class="team-row-header">
                <div>
                  <div class="team-name">${eData.name}</div>
                  <div class="team-role">${ROLE_LABELS[eData.role] || eData.role}</div>
                </div>
                <span class="tag info">Lv.${emp.level}</span>
              </div>
              <div class="team-stats">
                <span>体力 <strong style="color:${staminaColor};">${emp.stats.stamina}/${emp.stats.maxStamina}</strong></span>
                <span>士气 <strong>${emp.stats.morale}</strong></span>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    `;
  }

  private refreshAssetsPanel(): void {
    const state = kernel.getState();
    const visibleBuffs = state.buffs.filter(
      (b) => b.revealed || !kernel.getDataStore().buffs.get(b.dataId)?.hidden,
    );
    const panel = this.container.querySelector('#daily-assets-panel') as HTMLElement;
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <span class="panel-eyebrow">Assets</span>
          <h3>团队效果与装备</h3>
        </div>
      </div>
      <div class="asset-section">
        <div class="asset-title">团队效果</div>
        <div class="asset-tags">
          ${
            visibleBuffs.length === 0
              ? '<span class="journal-empty">暂无可见效果</span>'
              : visibleBuffs
                  .map((b) => {
                    const bd = kernel.getDataStore().buffs.get(b.dataId);
                    if (!bd) return '';
                    const isNeg = bd.type === 'NEGATIVE';
                    return `<span class="tag ${isNeg ? 'negative' : 'positive'} clickable-tag" data-buff-id="${b.dataId}" style="cursor:pointer;">${bd.name}${b.stacks > 1 ? ` x${b.stacks}` : ''}</span>`;
                  })
                  .join('')
          }
        </div>
      </div>

      <div class="asset-section">
        <div class="asset-title">装备</div>
        <div class="asset-tags">
          ${
            state.equipments.length === 0
              ? '<span class="journal-empty">暂无装备</span>'
              : (() => {
                  const eqTypeIcons: Record<string, string> = {
                    ARMOR: '\u{1F6E1}\uFE0F',
                    ATTACK: '\u2694\uFE0F',
                    RECOVERY: '\u{1F49A}',
                    ENERGY: '\u26A1',
                  };
                  const eqTypeColors: Record<string, string> = {
                    ARMOR: 'var(--highlight-blue)',
                    ATTACK: 'var(--highlight-red)',
                    RECOVERY: 'var(--highlight-green)',
                    ENERGY: 'var(--highlight-yellow)',
                  };
                  return state.equipments
                    .map((e) => {
                      const ed = kernel.getDataStore().equipments.get(e.dataId);
                      if (!ed) return '';
                      const color = eqTypeColors[ed.type] || 'var(--ink-medium)';
                      return `<span class="tag clickable-tag" data-equip-id="${e.dataId}" style="cursor:pointer;border-color:${color};color:${color};">${eqTypeIcons[ed.type] || ''} ${ed.name}</span>`;
                    })
                    .join('');
                })()
          }
        </div>
      </div>
    `;
  }

  private refreshJournalPanel(): void {
    const panel = this.container.querySelector('#daily-journal-panel') as HTMLElement;
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <span class="panel-eyebrow">Journal</span>
          <h3>今日记录</h3>
        </div>
      </div>
      ${
        this.logMessages.length === 0
          ? '<p class="journal-empty">选择一个活动，今天的第一条记录就会出现。</p>'
          : `<div class="journal-list">${this.logMessages.map((msg) => `<p class="journal-entry">${msg}</p>`).join('')}</div>`
      }
    `;
  }

  private renderProgressBar(label: string, value: number, color: string): string {
    return `
      <div class="metric-stack">
        <div class="metric-label">
          <span>${label}</span>
          <span class="metric-value">${Math.round(value)}%</span>
        </div>
        <div class="progress-bar">
          <div class="fill" style="width:${value}%;background:${color};"></div>
        </div>
      </div>
    `;
  }

  private renderPublishSection(state: ReturnType<typeof kernel.getState>): string {
    if (state.publishMarked) {
      return `<div class="publish-banner">
        <strong>已准备发布</strong>
        本月末将迎来最终 Boss。请把剩余时段用于强化牌组、恢复状态和储备资源。
      </div>`;
    }
    if (!kernel.isPublishReady()) return '';
    return `<div class="publish-banner">
      <strong>发布窗口已开启</strong>
      编程、美术和策划目标已经满足。你可以现在锁定发布，让本月末升级为最终 Boss 战。
      <div>
        <button id="btn-publish-game" class="btn btn-primary">
          发布游戏
        </button>
      </div>
    </div>`;
  }

  private showPublishConfirm(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;`;
    overlay.innerHTML = `
      <div style="background:#f5f0e8;border:2px solid #DAA520;border-radius:8px;padding:24px;max-width:400px;width:85%;box-shadow:0 4px 20px rgba(0,0,0,0.3);text-align:center;">
        <h3 style="font-size:20px;font-family:var(--font-title);color:#DAA520;margin-bottom:12px;">⚡ 发布游戏</h3>
        <p style="font-size:14px;color:var(--ink-medium);margin-bottom:16px;line-height:1.6;">
          确认发布游戏？本月末Boss将升级为<strong style="color:#cc0000;">最终Boss</strong>（强度翻倍），击败后项目结算获得收入。
        </p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button id="publish-cancel" class="btn" style="padding:8px 20px;">取消</button>
          <button id="publish-confirm" class="btn btn-primary" style="padding:8px 20px;background:#DAA520;border-color:#B8860B;">确认发布</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#publish-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.querySelector('#publish-confirm')?.addEventListener('click', () => {
      overlay.remove();
      kernel.markPublish();
      this.refreshView();
    });
  }

  private renderActivity(a: ActivityOption): string {
    const state = kernel.getState();
    const roleCosts: string[] = [];
    const seenRoles = new Set<string>();
    for (const emp of state.employees) {
      const eData = kernel.getDataStore().employees.get(emp.dataId);
      if (!eData || seenRoles.has(eData.role)) continue;
      seenRoles.add(eData.role);
      const weight = a.roleStaminaWeight[eData.role] ?? 0.5;
      const cost = Math.round(a.staminaCost * weight);
      if (cost > 0) {
        roleCosts.push(`${ROLE_LABELS[eData.role] || eData.role}:${cost}`);
      }
    }
    const staminaStr =
      a.staminaCost === 0
        ? a.effects.staminaRestore
          ? `恢复体力 +${a.effects.staminaRestore}`
          : '无消耗'
        : roleCosts.join(' / ');

    return `
      <button class="activity-btn" data-activity="${a.type}">
        <div class="activity-icon">${a.icon}</div>
        <div>
          <div class="activity-title-row">
            <div class="activity-title">${a.name}</div>
            <span class="tag info">${a.staminaCost === 0 ? '恢复' : '推进'}</span>
          </div>
          <p class="activity-desc">${a.description}</p>
          <div class="activity-meta">
            <span>体力 ${staminaStr}</span>
            ${a.effects.healthRestore ? `<span style="color:var(--highlight-green);">项目健康 +${a.effects.healthRestore}</span>` : ''}
          </div>
        </div>
      </button>
    `;
  }

  // ==================== Buff / 装备详情弹窗 ====================

  private showBuffDetail(buffId: string): void {
    const state = kernel.getState();
    const bd = kernel.getDataStore().buffs.get(buffId);
    if (!bd) return;
    const inst = state.buffs.find((b) => b.dataId === buffId);
    if (!inst) return;

    const isNeg = bd.type === 'NEGATIVE';
    const color = isNeg ? 'var(--highlight-red)' : 'var(--highlight-green)';
    const desc = bd.description.replace(/\{stacks\}/g, String(inst.stacks));

    // 持续时间描述
    let durationText = '永久';
    if (inst.expiresAtGlobalWeek !== undefined && state.project) {
      const currentGW = (state.project.currentMonth - 1) * 4 + state.daily.currentWeek;
      const remaining = inst.expiresAtGlobalWeek - currentGW;
      durationText = remaining > 0 ? `剩余 ${remaining} 周` : '即将过期';
    } else if (inst.acquiredMonth !== undefined) {
      const bossRewardIds = new Set(kernel.getDataStore().bossRewardBuffIds);
      if (bossRewardIds.has(buffId)) {
        const expiresMonth = inst.acquiredMonth + 2;
        const currentMonth = state.project?.currentMonth ?? 1;
        const remaining = expiresMonth - currentMonth;
        durationText = remaining > 0 ? `剩余 ${remaining} 月` : '即将过期';
      }
    }

    this.showDetailPopup(
      bd.name,
      desc,
      [
        { label: '类型', value: isNeg ? '减益' : '增益' },
        { label: '层数', value: String(inst.stacks) },
        { label: '持续', value: durationText },
      ],
      color,
    );
  }

  private showEquipmentDetail(equipId: string): void {
    const ed = kernel.getDataStore().equipments.get(equipId);
    if (!ed) return;

    const typeNames: Record<string, string> = {
      ARMOR: '护甲',
      ATTACK: '攻击',
      RECOVERY: '恢复',
      ENERGY: '能量',
    };
    const typeColors: Record<string, string> = {
      ARMOR: 'var(--highlight-blue)',
      ATTACK: 'var(--highlight-red)',
      RECOVERY: '#44aa66',
      ENERGY: 'var(--highlight-yellow)',
    };
    const rarityLabels: Record<string, string> = {
      common: '普通',
      uncommon: '优秀',
      rare: '稀有',
      legendary: '传说',
    };

    this.showDetailPopup(
      ed.name,
      ed.description,
      [
        { label: '类型', value: typeNames[ed.type] || ed.type },
        { label: '品质', value: rarityLabels[ed.rarity] || ed.rarity },
      ],
      typeColors[ed.type] || 'var(--ink-medium)',
    );
  }

  private showDetailPopup(
    title: string,
    desc: string,
    stats: Array<{ label: string; value: string }>,
    accentColor: string,
  ): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:300;display:flex;align-items:center;justify-content:center;`;
    overlay.innerHTML = `
      <div style="background:#f5f0e8;border:2px solid ${accentColor};border-radius:8px;padding:20px;max-width:360px;width:85%;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:18px;font-family:var(--font-title);color:${accentColor};margin:0;">${title}</h3>
          <button class="detail-close-btn" style="cursor:pointer;border:2px solid var(--pencil-line);background:#ebe5d9;padding:2px 10px;border-radius:4px;font-family:inherit;font-size:14px;">×</button>
        </div>
        <p style="font-size:14px;color:var(--ink-medium);margin-bottom:12px;line-height:1.5;">${desc}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${stats
            .map(
              (s) => `
            <div style="padding:4px 10px;background:#ebe5d9;border-radius:4px;border:1px solid #ddd;font-size:12px;">
              <span style="color:var(--ink-light);">${s.label}:</span> <strong>${s.value}</strong>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('.detail-close-btn')?.addEventListener('click', () => overlay.remove());
  }

  // ==================== 牌库查看器 ====================

  private showDeckViewer(): void {
    const state = kernel.getState();
    const deck = state.deck;

    // 统计卡牌
    const cardCounts = new Map<string, number>();
    for (const card of deck) {
      cardCounts.set(card.dataId, (cardCounts.get(card.dataId) || 0) + 1);
    }

    // 按类型分组
    const groups: Record<
      string,
      Array<{ id: string; name: string; type: string; cost: number; desc: string; count: number }>
    > = {
      ATTACK: [],
      HEAL: [],
      SKILL: [],
      POWER: [],
      STATUS: [],
    };

    for (const [cardId, count] of cardCounts) {
      const cd = kernel.getDataStore().cards.get(cardId);
      if (!cd) continue;
      const isHeal = cd.effects.some((e) => e.type === 'HEAL');
      const groupKey = isHeal ? 'HEAL' : cd.type;
      const group = groups[groupKey] || groups.ATTACK;
      group.push({
        id: cardId,
        name: cd.name,
        type: cd.type,
        cost: cd.cost,
        desc: cd.description,
        count,
      });
    }

    const typeLabels: Record<string, { label: string; color: string }> = {
      ATTACK: { label: '攻击', color: '#cc4444' },
      HEAL: { label: '恢复', color: '#44aa66' },
      SKILL: { label: '技能', color: '#4488aa' },
      POWER: { label: '能力', color: '#bb8833' },
      STATUS: { label: '状态', color: '#888888' },
    };

    let html = '';
    for (const [type, cards] of Object.entries(groups)) {
      if (cards.length === 0) continue;
      const info = typeLabels[type];
      html += `<div style="margin-bottom:12px;">
        <h4 style="font-size:14px;color:${info.color};margin-bottom:6px;border-bottom:1px solid ${info.color}33;padding-bottom:4px;">${info.label} (${cards.reduce((s, c) => s + c.count, 0)}张)</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${cards
            .map(
              (c) => `
            <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--bg-paper);border-radius:4px;border-left:3px solid ${info.color};">
              <span style="background:${info.color};color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">${c.cost}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:bold;">${c.name}${c.count > 1 ? ` x${c.count}` : ''}</div>
                <div style="font-size:10px;color:var(--ink-light);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.desc}</div>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>`;
    }

    // 创建弹窗
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;`;
    overlay.innerHTML = `
      <div style="background:var(--bg-main);border:2px solid var(--pencil-line);border-radius:8px;padding:20px;max-width:600px;width:90%;max-height:80vh;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:18px;font-family:var(--font-title);">🃏 我的牌库 (${deck.length}张)</h3>
          <button id="close-deck-viewer" style="cursor:pointer;border:2px solid var(--pencil-line);background:var(--bg-paper);padding:4px 12px;border-radius:4px;font-family:inherit;">关闭</button>
        </div>
        <div class="scrollable" style="flex:1;overflow-y:auto;padding-right:8px;">
          ${html || '<p style="color:var(--ink-light);">牌库为空</p>'}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('#close-deck-viewer')?.addEventListener('click', () => overlay.remove());
  }

  private showLockedDeckViewer(): void {
    const state = kernel.getState();
    const locked = state.lockedDeck;

    const cardCounts = new Map<string, number>();
    for (const card of locked) {
      cardCounts.set(card.dataId, (cardCounts.get(card.dataId) || 0) + 1);
    }

    const typeLabels: Record<string, { label: string; color: string }> = {
      ATTACK: { label: '攻击', color: '#cc4444' },
      HEAL: { label: '恢复', color: '#44aa66' },
      SKILL: { label: '技能', color: '#4488aa' },
      POWER: { label: '能力', color: '#bb8833' },
      STATUS: { label: '状态', color: '#888888' },
    };

    let html = '';
    for (const [cardId, count] of cardCounts) {
      const cd = kernel.getDataStore().cards.get(cardId);
      if (!cd) continue;
      const isHeal = cd.effects.some((e) => e.type === 'HEAL');
      const info = isHeal ? typeLabels.HEAL : typeLabels[cd.type] || typeLabels.ATTACK;
      html += `
        <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--bg-paper);border-radius:4px;border-left:3px solid ${info.color};">
          <span style="background:${info.color};color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">${cd.cost}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:bold;">${cd.name}${count > 1 ? ` x${count}` : ''}</div>
            <div style="font-size:10px;color:var(--ink-light);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${cd.description}</div>
          </div>
        </div>`;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;`;
    overlay.innerHTML = `
      <div style="background:var(--bg-main);border:2px solid #DAA520;border-radius:8px;padding:20px;max-width:500px;width:90%;max-height:60vh;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:18px;font-family:var(--font-title);color:#DAA520;">🔒 Boss战锁定牌 (${locked.length}/15)</h3>
          <button id="close-locked-viewer" style="cursor:pointer;border:2px solid var(--pencil-line);background:var(--bg-paper);padding:4px 12px;border-radius:4px;font-family:inherit;">关闭</button>
        </div>
        <div class="scrollable" style="flex:1;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${html || '<p style="color:var(--ink-light);grid-column:1/-1;text-align:center;">暂无锁定卡牌</p>'}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay
      .querySelector('#close-locked-viewer')
      ?.addEventListener('click', () => overlay.remove());
  }

  // ==================== 商店弹窗 ====================

  private showShopPopup(): void {
    const state = kernel.getState();
    const dataStore = kernel.getDataStore();
    const items = Array.from(dataStore.items.values());
    const equipments = Array.from(dataStore.equipments.values());
    const ownedEquipIds = new Set(state.equipments.map((e) => e.dataId));

    const eqTypeIcons: Record<string, string> = {
      ARMOR: '\u{1F6E1}\uFE0F',
      ATTACK: '\u2694\uFE0F',
      RECOVERY: '\u{1F49A}',
      ENERGY: '\u26A1',
    };

    const equipHtml = equipments
      .map((eq) => {
        const owned = ownedEquipIds.has(eq.id);
        const canAfford = state.studio.funds >= eq.price;
        const disabled = owned || !canAfford;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:var(--bg-paper);border-radius:4px;opacity:${disabled ? '0.5' : '1'};margin-bottom:4px;">
        <span style="font-size:12px;">${eqTypeIcons[eq.type] || ''} ${eq.name}</span>
        ${owned ? '<span style="font-size:10px;color:var(--ink-light);">已拥有</span>' : `<button class="shop-buy-equip" data-id="${eq.id}" style="font-size:10px;padding:1px 8px;cursor:pointer;border:1px solid var(--pencil-line);border-radius:3px;background:var(--bg-paper);${!canAfford ? 'pointer-events:none;' : ''}">\u{1F4B0}${eq.price}</button>`}
      </div>`;
      })
      .join('');

    const itemHtml = items
      .map((it) => {
        const owned = state.items.find((i) => i.dataId === it.id);
        const qty = owned?.quantity || 0;
        const maxed = qty >= it.maxStack;
        const canAfford = state.studio.funds >= it.price;
        const disabled = maxed || !canAfford;
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:var(--bg-paper);border-radius:4px;opacity:${disabled ? '0.5' : '1'};margin-bottom:4px;">
        <span style="font-size:12px;">${it.icon} ${it.name} (${qty}/${it.maxStack})</span>
        ${maxed ? '<span style="font-size:10px;color:var(--ink-light);">已满</span>' : `<button class="shop-buy-item" data-id="${it.id}" style="font-size:10px;padding:1px 8px;cursor:pointer;border:1px solid var(--pencil-line);border-radius:3px;background:var(--bg-paper);${!canAfford ? 'pointer-events:none;' : ''}">\u{1F4B0}${it.price}</button>`}
      </div>`;
      })
      .join('');

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;`;
    overlay.innerHTML = `
      <div style="background:#f5f0e8;border:2px solid #e67e22;border-radius:8px;padding:20px;max-width:550px;width:90%;max-height:75vh;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 style="font-size:18px;font-family:var(--font-title);color:#e67e22;">\u{1F6D2} 商店</h3>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:13px;">\u{1F4B0} <strong>${state.studio.funds.toLocaleString()}</strong></span>
            <button class="shop-close-btn" style="cursor:pointer;border:2px solid var(--pencil-line);background:#ebe5d9;padding:2px 10px;border-radius:4px;font-family:inherit;font-size:14px;">\u00D7</button>
          </div>
        </div>
        <div class="scrollable" style="flex:1;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>
            <h4 style="font-size:13px;color:var(--ink-medium);margin-bottom:6px;">\u2694\uFE0F 装备</h4>
            ${equipHtml}
          </div>
          <div>
            <h4 style="font-size:13px;color:var(--ink-medium);margin-bottom:6px;">\u{1F9EA} 消耗品</h4>
            ${itemHtml}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('.shop-close-btn')?.addEventListener('click', () => overlay.remove());

    // 购买装备
    overlay.querySelectorAll('.shop-buy-equip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const eqId = (btn as HTMLElement).dataset.id!;
        if (kernel.purchaseEquipmentFromShop(eqId)) {
          overlay.remove();
          this.showShopPopup();
          this.refreshView();
        }
      });
    });

    // 购买道具
    overlay.querySelectorAll('.shop-buy-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = (btn as HTMLElement).dataset.id!;
        if (kernel.purchaseItem(itemId)) {
          overlay.remove();
          this.showShopPopup();
          this.refreshView();
        }
      });
    });
  }

  // ==================== 背包弹窗 ====================

  private showInventoryPopup(): void {
    const state = kernel.getState();
    const dataStore = kernel.getDataStore();

    const ownedItems = state.items.filter((i) => i.quantity > 0);
    const itemHtml =
      ownedItems.length === 0
        ? '<p style="font-size:13px;color:var(--ink-light);text-align:center;">背包空空如也</p>'
        : ownedItems
            .map((i) => {
              const itemData = dataStore.items.get(i.dataId);
              if (!itemData) return '';
              return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--bg-paper);border-radius:4px;margin-bottom:6px;">
          <div>
            <div style="font-size:14px;font-weight:bold;">${itemData.icon} ${itemData.name} <span style="font-size:11px;color:var(--ink-light);">x${i.quantity}</span></div>
            <div style="font-size:11px;color:var(--ink-light);margin-top:2px;">${itemData.description}</div>
          </div>
          <button class="use-item-btn" data-id="${i.dataId}" style="cursor:pointer;border:2px solid var(--highlight-green);background:#f0fff0;padding:4px 12px;border-radius:4px;font-size:12px;font-family:inherit;color:var(--highlight-green);font-weight:bold;">
            使用
          </button>
        </div>`;
            })
            .join('');

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;`;
    overlay.innerHTML = `
      <div style="background:#f5f0e8;border:2px solid #8e44ad;border-radius:8px;padding:20px;max-width:400px;width:85%;max-height:60vh;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:18px;font-family:var(--font-title);color:#8e44ad;">\u{1F392} 背包</h3>
          <button class="inv-close-btn" style="cursor:pointer;border:2px solid var(--pencil-line);background:#ebe5d9;padding:2px 10px;border-radius:4px;font-family:inherit;font-size:14px;">\u00D7</button>
        </div>
        <div class="scrollable" style="flex:1;overflow-y:auto;">
          ${itemHtml}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('.inv-close-btn')?.addEventListener('click', () => overlay.remove());

    // 使用道具
    overlay.querySelectorAll('.use-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = (btn as HTMLElement).dataset.id!;
        const itemData = dataStore.items.get(itemId);
        if (kernel.useItem(itemId)) {
          this.showFloatingText(
            `${itemData?.icon || ''} ${itemData?.name || ''}`,
            'var(--highlight-green)',
          );
          overlay.remove();
          this.showInventoryPopup();
          this.refreshView();
        }
      });
    });
  }
}
