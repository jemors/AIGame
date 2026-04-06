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
    this.render();

    // 监听事件
    eventBus.on(Events.ACTIVITY_COMPLETED, this.onActivityCompleted);
    eventBus.on(Events.CARD_GAINED, this.onCardGained);
    eventBus.on(Events.CARD_REMOVED, this.onCardRemoved);
  }

  update(): void {
    this.render();
  }

  destroy(): void {
    eventBus.off(Events.ACTIVITY_COMPLETED, this.onActivityCompleted);
    eventBus.off(Events.CARD_GAINED, this.onCardGained);
    eventBus.off(Events.CARD_REMOVED, this.onCardRemoved);
  }

  private onActivityCompleted = (_type: unknown, message: unknown) => {
    this.logMessages.push(message as string);
    this.render();
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

  private render(): void {
    const state = kernel.getState();
    const project = state.project!;
    const studio = state.studio;
    const activities = dailySystem.getAvailableActivities();

    this.container.innerHTML = `
      <div class="screen" style="justify-content:flex-start;padding:16px;overflow:hidden;background:url('./img/bg/workspace.png') center/cover no-repeat;">
        <div style="position:absolute;inset:0;background:rgba(245,240,232,0.65);pointer-events:none;"></div>
        <div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;">
        <!-- 顶部信息栏 -->
        <div style="width:100%;max-width:900px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div style="font-family:var(--font-title);font-size:24px;">
            ${studio.name}
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
            <span class="resource-bar">💰 <span class="value">${studio.funds.toLocaleString()}</span></span>
            <span class="resource-bar">📅 第${project.currentMonth}月 第${state.daily.currentWeek}周 第${state.daily.currentDay}天</span>
            <span class="resource-bar">🕐 ${SLOT_NAMES[state.daily.currentSlot]}</span>
            <button id="btn-view-deck" class="resource-bar" style="cursor:pointer;border:2px solid var(--pencil-line);background:var(--bg-paper);font-family:inherit;font-size:inherit;">🃏 牌库 <span class="value">${state.deck.length}</span></button>
            <button id="btn-view-locked" class="resource-bar" style="cursor:pointer;border:2px solid #DAA520;background:var(--bg-paper);font-family:inherit;font-size:inherit;color:#DAA520;">🔒 锁定 <span class="value">${state.lockedDeck.length}</span></button>
            <button id="btn-shop" class="resource-bar" style="cursor:pointer;border:2px solid #e67e22;background:var(--bg-paper);font-family:inherit;font-size:inherit;color:#e67e22;">🛒 商店</button>
            <button id="btn-inventory" class="resource-bar" style="cursor:pointer;border:2px solid #8e44ad;background:var(--bg-paper);font-family:inherit;font-size:inherit;color:#8e44ad;">🎒 背包 <span class="value">${state.items.reduce((s, i) => s + i.quantity, 0)}</span></button>
          </div>
        </div>

        <div style="width:100%;max-width:900px;display:grid;grid-template-columns:1fr 300px;gap:16px;flex:1;min-height:0;">
          <!-- 左侧：主要内容 -->
          <div style="display:flex;flex-direction:column;gap:12px;min-height:0;">
            <!-- 项目进度 -->
            <div class="card" style="padding:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h3 style="font-size:14px;color:var(--ink-medium);margin:0;">📊 ${project.name} - 开发进度</h3>
                <span style="font-size:13px;font-weight:bold;color:${project.health / project.maxHealth < 0.3 ? 'var(--highlight-red)' : project.health / project.maxHealth < 0.6 ? 'var(--highlight-yellow)' : 'var(--highlight-green)'};">
                  ❤️ ${project.health}/${project.maxHealth}
                </span>
              </div>
              <div style="margin-bottom:8px;">
                ${this.renderProgressBar('项目健康', (project.health / project.maxHealth) * 100, project.health / project.maxHealth < 0.3 ? 'var(--highlight-red)' : project.health / project.maxHealth < 0.6 ? 'var(--highlight-yellow)' : 'var(--highlight-green)')}
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                ${this.renderProgressBar('编程', project.progress.programming, 'var(--highlight-blue)')}
                ${this.renderProgressBar('美术', project.progress.art, 'var(--highlight-green)')}
                ${this.renderProgressBar('策划', project.progress.design, 'var(--highlight-yellow)')}
              </div>
              <div style="margin-top:8px;">
                ${this.renderProgressBar('品质', project.progress.quality, '#9b59b6')}
              </div>
              ${this.renderPublishSection(state)}
            </div>

            <!-- 活动选择 -->
            <div style="flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;">
              <h3 style="font-size:14px;color:var(--ink-medium);margin-bottom:8px;">
                选择${SLOT_NAMES[state.daily.currentSlot]}活动
              </h3>
              <div class="scrollable" style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                ${activities.map(a => this.renderActivity(a)).join('')}
              </div>
            </div>
          </div>

          <!-- 右侧：员工 + 日志 -->
          <div style="display:flex;flex-direction:column;gap:12px;min-height:0;">
            <!-- 团队状态 -->
            <div class="card" style="padding:12px;">
              <h3 style="font-size:14px;color:var(--ink-medium);margin-bottom:8px;">👥 团队状态</h3>
              <div style="font-size:13px;margin-bottom:8px;display:flex;gap:12px;">
                <span>氛围:${studio.environment.morale}</span>
                <span>创意:${studio.environment.creativity}</span>
              </div>
              ${state.employees.map(emp => {
                const eData = kernel.getDataStore().employees.get(emp.dataId);
                if (!eData) return '';
                const staminaRatio = emp.stats.stamina / emp.stats.maxStamina;
                const staminaColor = staminaRatio < 0.3 ? 'var(--highlight-red)' : staminaRatio < 0.6 ? 'var(--highlight-yellow)' : 'var(--ink-light)';
                return `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px dashed #ddd;font-size:13px;">
                    <span><strong>${eData.name}</strong> <span style="font-size:11px;color:var(--ink-light);">${ROLE_LABELS[eData.role] || eData.role}</span></span>
                    <span style="color:${staminaColor};">体力 ${emp.stats.stamina}/${emp.stats.maxStamina} | 士气 ${emp.stats.morale}</span>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Buff 列表 -->
            <div class="card" style="padding:12px;">
              <h3 style="font-size:14px;color:var(--ink-medium);margin-bottom:8px;">\u2728 \u56E2\u961F\u6548\u679C</h3>
              ${(() => {
                const visibleBuffs = state.buffs.filter(b => b.revealed || !kernel.getDataStore().buffs.get(b.dataId)?.hidden);
                if (visibleBuffs.length === 0) return '<span style="font-size:12px;color:var(--ink-light);">\u6682\u65E0\u6548\u679C</span>';
                return visibleBuffs.map(b => {
                  const bd = kernel.getDataStore().buffs.get(b.dataId);
                  if (!bd) return '';
                  const isNeg = bd.type === 'NEGATIVE';
                  return `<span class="tag ${isNeg ? 'negative' : 'positive'} clickable-tag" data-buff-id="${b.dataId}" style="margin:2px;cursor:pointer;">${bd.name}${b.stacks > 1 ? ' x' + b.stacks : ''}</span>`;
                }).join('');
              })()}
            </div>

            <!-- 装备列表 -->
            <div class="card" style="padding:12px;">
              <h3 style="font-size:14px;color:var(--ink-medium);margin-bottom:8px;">\u{1F392} \u88C5\u5907</h3>
              ${(() => {
                if (state.equipments.length === 0) return '<span style="font-size:12px;color:var(--ink-light);">\u6682\u65E0\u88C5\u5907</span>';
                const eqTypeIcons: Record<string, string> = { ARMOR: '\u{1F6E1}\uFE0F', ATTACK: '\u2694\uFE0F', RECOVERY: '\u{1F49A}', ENERGY: '\u26A1' };
                const eqTypeColors: Record<string, string> = { ARMOR: 'var(--highlight-blue)', ATTACK: 'var(--highlight-red)', RECOVERY: '#44aa66', ENERGY: 'var(--highlight-yellow)' };
                return state.equipments.map(e => {
                  const ed = kernel.getDataStore().equipments.get(e.dataId);
                  if (!ed) return '';
                  const icon = eqTypeIcons[ed.type] || '';
                  const color = eqTypeColors[ed.type] || 'var(--ink-medium)';
                  return `<span class="tag positive clickable-tag" data-equip-id="${e.dataId}" style="margin:2px;border-color:${color};cursor:pointer;">${icon} ${ed.name}</span>`;
                }).join('');
              })()}
            </div>

            <!-- 活动日志 -->
            <div class="card scrollable" style="padding:12px;flex:1;min-height:120px;">
              <h3 style="font-size:14px;color:var(--ink-medium);margin-bottom:8px;">📝 今日记录</h3>
              ${this.logMessages.length === 0
                ? '<p style="font-size:13px;color:var(--ink-light);">选择一个活动开始新的一天...</p>'
                : this.logMessages.map(msg => `<p style="font-size:12px;color:var(--ink-medium);margin-bottom:4px;padding:4px;background:var(--bg-paper);border-radius:2px;">${msg}</p>`).join('')
              }
            </div>
          </div>
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

    // 绑定活动按钮事件
    this.container.querySelectorAll('.activity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const actType = (btn as HTMLElement).dataset.activity!;
        const activity = activities.find(a => a.type === actType);
        if (!activity) return;

        // 检查所有员工是否有足够体力（检查最低体力员工）
        const minStamina = state.employees.reduce((min, e) => {
          const eData = kernel.getDataStore().employees.get(e.dataId);
          const role = eData?.role || EmployeeRole.PROGRAMMER;
          const weight = activity.roleStaminaWeight[role] ?? 0.5;
          const cost = Math.round(activity.staminaCost * weight);
          return Math.min(min, e.stats.stamina - cost);
        }, Infinity);

        if (minStamina < 0) {
          (btn as HTMLElement).style.borderColor = 'var(--highlight-red)';
          (btn as HTMLElement).style.animation = 'shake 0.3s';
          setTimeout(() => {
            (btn as HTMLElement).style.borderColor = '';
            (btn as HTMLElement).style.animation = '';
          }, 500);
          return;
        }

        // 执行活动
        dailySystem.executeActivity(activity);

        // 推进时间段
        kernel.advanceTimeSlot();
      });
    });

    // 绑定查看牌库按钮
    const deckBtn = this.container.querySelector('#btn-view-deck');
    deckBtn?.addEventListener('click', () => this.showDeckViewer());

    // 绑定查看锁定牌按钮
    const lockedBtn = this.container.querySelector('#btn-view-locked');
    lockedBtn?.addEventListener('click', () => this.showLockedDeckViewer());

    // 绑定 buff 点击查看详情
    this.container.querySelectorAll('[data-buff-id]').forEach(el => {
      el.addEventListener('click', () => {
        const buffId = (el as HTMLElement).dataset.buffId!;
        this.showBuffDetail(buffId);
      });
    });

    // 绑定装备点击查看详情
    this.container.querySelectorAll('[data-equip-id]').forEach(el => {
      el.addEventListener('click', () => {
        const equipId = (el as HTMLElement).dataset.equipId!;
        this.showEquipmentDetail(equipId);
      });
    });

    // 绑定发布游戏按钮
    const publishBtn = this.container.querySelector('#btn-publish-game');
    publishBtn?.addEventListener('click', () => this.showPublishConfirm());

    // 绑定商店按钮
    this.container.querySelector('#btn-shop')?.addEventListener('click', () => this.showShopPopup());

    // 绑定背包按钮
    this.container.querySelector('#btn-inventory')?.addEventListener('click', () => this.showInventoryPopup());
  }

  private renderProgressBar(label: string, value: number, color: string): string {
    return `
      <div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">
          <span>${label}</span><span class="value" style="font-family:var(--font-mono);">${Math.round(value)}%</span>
        </div>
        <div class="progress-bar">
          <div class="fill" style="width:${value}%;background:${color};"></div>
        </div>
      </div>
    `;
  }

  private renderPublishSection(state: ReturnType<typeof kernel.getState>): string {
    if (state.publishMarked) {
      return `<div style="margin-top:8px;padding:6px 12px;background:linear-gradient(135deg,#fff3cd,#ffeaa7);border:2px solid #DAA520;border-radius:6px;text-align:center;font-size:13px;font-weight:bold;color:#8B6914;">
        ⚡ 已准备发布 — 本月末将迎来最终Boss
      </div>`;
    }
    if (!kernel.isPublishReady()) return '';
    return `<div style="margin-top:8px;text-align:center;">
      <button id="btn-publish-game" class="btn btn-primary" style="font-size:14px;padding:8px 20px;background:linear-gradient(135deg,#f39c12,#e67e22);border:2px solid #d35400;color:#fff;cursor:pointer;">
        🎮 发布游戏
      </button>
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
      this.render();
    });
  }

  private renderActivity(a: ActivityOption): string {
    // 构建分角色体力消耗提示
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
    const staminaStr = a.staminaCost === 0
      ? (a.effects.staminaRestore ? `恢复体力 +${a.effects.staminaRestore}` : '无消耗')
      : roleCosts.join(' / ');

    return `
      <button class="card activity-btn" data-activity="${a.type}" style="cursor:pointer;text-align:left;border:2px solid var(--pencil-line);padding:10px;">
        <div style="font-size:20px;margin-bottom:4px;">${a.icon}</div>
        <div style="font-size:15px;font-weight:bold;">${a.name}</div>
        <div style="font-size:12px;color:var(--ink-light);margin-top:2px;">${a.description}</div>
        <div style="font-size:11px;color:var(--ink-light);margin-top:4px;">
          体力: ${staminaStr}${a.effects.healthRestore ? ` | <span style="color:var(--highlight-green);">❤️+${a.effects.healthRestore}</span>` : ''}
        </div>
      </button>
    `;
  }

  // ==================== Buff / 装备详情弹窗 ====================

  private showBuffDetail(buffId: string): void {
    const state = kernel.getState();
    const bd = kernel.getDataStore().buffs.get(buffId);
    if (!bd) return;
    const inst = state.buffs.find(b => b.dataId === buffId);
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

    this.showDetailPopup(bd.name, desc, [
      { label: '类型', value: isNeg ? '减益' : '增益' },
      { label: '层数', value: String(inst.stacks) },
      { label: '持续', value: durationText },
    ], color);
  }

  private showEquipmentDetail(equipId: string): void {
    const ed = kernel.getDataStore().equipments.get(equipId);
    if (!ed) return;

    const typeNames: Record<string, string> = { ARMOR: '护甲', ATTACK: '攻击', RECOVERY: '恢复', ENERGY: '能量' };
    const typeColors: Record<string, string> = { ARMOR: 'var(--highlight-blue)', ATTACK: 'var(--highlight-red)', RECOVERY: '#44aa66', ENERGY: 'var(--highlight-yellow)' };
    const rarityLabels: Record<string, string> = { common: '普通', uncommon: '优秀', rare: '稀有', legendary: '传说' };

    this.showDetailPopup(ed.name, ed.description, [
      { label: '类型', value: typeNames[ed.type] || ed.type },
      { label: '品质', value: rarityLabels[ed.rarity] || ed.rarity },
    ], typeColors[ed.type] || 'var(--ink-medium)');
  }

  private showDetailPopup(title: string, desc: string, stats: Array<{ label: string; value: string }>, accentColor: string): void {
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
          ${stats.map(s => `
            <div style="padding:4px 10px;background:#ebe5d9;border-radius:4px;border:1px solid #ddd;font-size:12px;">
              <span style="color:var(--ink-light);">${s.label}:</span> <strong>${s.value}</strong>
            </div>
          `).join('')}
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
    const groups: Record<string, Array<{ id: string; name: string; type: string; cost: number; desc: string; count: number }>> = {
      ATTACK: [],
      HEAL: [],
      SKILL: [],
      POWER: [],
      STATUS: [],
    };

    for (const [cardId, count] of cardCounts) {
      const cd = kernel.getDataStore().cards.get(cardId);
      if (!cd) continue;
      const isHeal = cd.effects.some(e => e.type === 'HEAL');
      const groupKey = isHeal ? 'HEAL' : cd.type;
      const group = groups[groupKey] || groups.ATTACK;
      group.push({ id: cardId, name: cd.name, type: cd.type, cost: cd.cost, desc: cd.description, count });
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
          ${cards.map(c => `
            <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--bg-paper);border-radius:4px;border-left:3px solid ${info.color};">
              <span style="background:${info.color};color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">${c.cost}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:bold;">${c.name}${c.count > 1 ? ` x${c.count}` : ''}</div>
                <div style="font-size:10px;color:var(--ink-light);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.desc}</div>
              </div>
            </div>
          `).join('')}
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
      const isHeal = cd.effects.some(e => e.type === 'HEAL');
      const info = isHeal ? typeLabels.HEAL : (typeLabels[cd.type] || typeLabels.ATTACK);
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
    overlay.querySelector('#close-locked-viewer')?.addEventListener('click', () => overlay.remove());
  }

  // ==================== 商店弹窗 ====================

  private showShopPopup(): void {
    const state = kernel.getState();
    const dataStore = kernel.getDataStore();
    const items = Array.from(dataStore.items.values());
    const equipments = Array.from(dataStore.equipments.values());
    const ownedEquipIds = new Set(state.equipments.map(e => e.dataId));

    const eqTypeIcons: Record<string, string> = { ARMOR: '\u{1F6E1}\uFE0F', ATTACK: '\u2694\uFE0F', RECOVERY: '\u{1F49A}', ENERGY: '\u26A1' };

    const equipHtml = equipments.map(eq => {
      const owned = ownedEquipIds.has(eq.id);
      const canAfford = state.studio.funds >= eq.price;
      const disabled = owned || !canAfford;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:var(--bg-paper);border-radius:4px;opacity:${disabled ? '0.5' : '1'};margin-bottom:4px;">
        <span style="font-size:12px;">${eqTypeIcons[eq.type] || ''} ${eq.name}</span>
        ${owned ? '<span style="font-size:10px;color:var(--ink-light);">已拥有</span>' : `<button class="shop-buy-equip" data-id="${eq.id}" style="font-size:10px;padding:1px 8px;cursor:pointer;border:1px solid var(--pencil-line);border-radius:3px;background:var(--bg-paper);${!canAfford ? 'pointer-events:none;' : ''}">\u{1F4B0}${eq.price}</button>`}
      </div>`;
    }).join('');

    const itemHtml = items.map(it => {
      const owned = state.items.find(i => i.dataId === it.id);
      const qty = owned?.quantity || 0;
      const maxed = qty >= it.maxStack;
      const canAfford = state.studio.funds >= it.price;
      const disabled = maxed || !canAfford;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:var(--bg-paper);border-radius:4px;opacity:${disabled ? '0.5' : '1'};margin-bottom:4px;">
        <span style="font-size:12px;">${it.icon} ${it.name} (${qty}/${it.maxStack})</span>
        ${maxed ? '<span style="font-size:10px;color:var(--ink-light);">已满</span>' : `<button class="shop-buy-item" data-id="${it.id}" style="font-size:10px;padding:1px 8px;cursor:pointer;border:1px solid var(--pencil-line);border-radius:3px;background:var(--bg-paper);${!canAfford ? 'pointer-events:none;' : ''}">\u{1F4B0}${it.price}</button>`}
      </div>`;
    }).join('');

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
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.shop-close-btn')?.addEventListener('click', () => overlay.remove());

    // 购买装备
    overlay.querySelectorAll('.shop-buy-equip').forEach(btn => {
      btn.addEventListener('click', () => {
        const eqId = (btn as HTMLElement).dataset.id!;
        if (kernel.purchaseEquipmentFromShop(eqId)) {
          overlay.remove();
          this.showShopPopup();
          this.render();
        }
      });
    });

    // 购买道具
    overlay.querySelectorAll('.shop-buy-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = (btn as HTMLElement).dataset.id!;
        if (kernel.purchaseItem(itemId)) {
          overlay.remove();
          this.showShopPopup();
          this.render();
        }
      });
    });
  }

  // ==================== 背包弹窗 ====================

  private showInventoryPopup(): void {
    const state = kernel.getState();
    const dataStore = kernel.getDataStore();

    const ownedItems = state.items.filter(i => i.quantity > 0);
    const itemHtml = ownedItems.length === 0
      ? '<p style="font-size:13px;color:var(--ink-light);text-align:center;">背包空空如也</p>'
      : ownedItems.map(i => {
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
      }).join('');

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
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.inv-close-btn')?.addEventListener('click', () => overlay.remove());

    // 使用道具
    overlay.querySelectorAll('.use-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = (btn as HTMLElement).dataset.id!;
        const itemData = dataStore.items.get(itemId);
        if (kernel.useItem(itemId)) {
          this.showFloatingText(`${itemData?.icon || ''} ${itemData?.name || ''}`, 'var(--highlight-green)');
          overlay.remove();
          this.showInventoryPopup();
          this.render();
        }
      });
    });
  }
}
