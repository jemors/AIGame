// ========================================
// ShopScreen - 项目间歇商店界面
// ========================================

import { kernel } from '../../kernel/GameKernel';
import { GamePhase } from '../../models/types';
import type { Screen } from '../UIManager';

export class ShopScreen implements Screen {
  id = 'shop';

  create(container: HTMLElement): void {
    this.render(container);
  }

  private render(container: HTMLElement): void {
    const state = kernel.getState();
    const dataStore = kernel.getDataStore();

    // 装备列表
    const equipments = Array.from(dataStore.equipments.values());
    const ownedEquipIds = new Set(state.equipments.map((e) => e.dataId));

    // 道具列表
    const items = Array.from(dataStore.items.values());

    const rarityColors: Record<string, string> = {
      COMMON: '#888',
      UNCOMMON: 'var(--highlight-blue)',
      RARE: '#DAA520',
    };
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
        const borderColor = rarityColors[eq.rarity] || '#888';
        return `
        <div class="store-card ${disabled ? 'is-disabled' : ''}" style="border-left:4px solid ${borderColor};">
          <div class="store-card-head">
            <div>
              <div class="store-card-title">${eqTypeIcons[eq.type] || ''} ${eq.name}</div>
              <div class="store-card-desc">${eq.description}</div>
            </div>
            <div style="text-align:right;">
              <div class="store-price" style="color:${canAfford ? 'var(--highlight-green)' : 'var(--highlight-red)'};">
                \u{1F4B0} ${eq.price.toLocaleString()}
              </div>
              ${
                owned
                  ? '<span class="flow-section-note">已拥有</span>'
                  : `<button class="btn buy-equip-btn" data-equip-id="${eq.id}" style="margin-top:8px;font-size:12px;padding:6px 14px;${!canAfford ? 'pointer-events:none;' : ''}">购买</button>`
              }
            </div>
          </div>
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
        return `
        <div class="store-card ${disabled ? 'is-disabled' : ''}">
          <div class="store-card-head">
            <div>
              <div class="store-card-title">${it.icon} ${it.name} <span style="font-size:11px;color:var(--ink-light);">(${qty}/${it.maxStack})</span></div>
              <div class="store-card-desc">${it.description}</div>
            </div>
            <div style="text-align:right;">
              <div class="store-price" style="color:${canAfford ? 'var(--highlight-green)' : 'var(--highlight-red)'};">
                \u{1F4B0} ${it.price.toLocaleString()}
              </div>
              ${
                maxed
                  ? '<span class="flow-section-note">已满</span>'
                  : `<button class="btn buy-item-btn" data-item-id="${it.id}" style="margin-top:8px;font-size:12px;padding:6px 14px;${!canAfford ? 'pointer-events:none;' : ''}">购买</button>`
              }
            </div>
          </div>
        </div>`;
      })
      .join('');

    container.innerHTML = `
      <div class="screen flow-screen">
        <div class="flow-shell">
          <aside class="flow-side">
            <section class="flow-panel flow-hero">
              <span class="panel-eyebrow" style="color:rgba(255,237,211,0.72);">Intermission Market</span>
              <h1>项目间歇商店</h1>
              <p>
                这一页不是把钱花完，而是决定下一个项目的战斗节奏和容错。永久装备影响长期强度，消耗品补的是短期缺口。
              </p>
              <div class="flow-hero-metrics">
                <span class="ops-chip">当前资金 <strong>${state.studio.funds.toLocaleString()}</strong></span>
                <span class="ops-chip">已拥有装备 <strong>${state.equipments.length}</strong></span>
                <span class="ops-chip">背包道具 <strong>${state.items.reduce((sum, item) => sum + item.quantity, 0)}</strong></span>
              </div>
            </section>

            <section class="flow-panel">
              <div class="flow-section-head" style="margin-bottom:10px;">
                <div>
                  <span class="panel-eyebrow">Buying Rules</span>
                  <h3>采购建议</h3>
                </div>
              </div>
              <div class="candidate-meta" style="margin-top:0;">
                <span>装备优先考虑能长期触发的收益</span>
                <span>消耗品更适合补健康、体力与临时缺口</span>
                <span>别在低资金时同时追求所有方向</span>
              </div>
            </section>
          </aside>

          <main class="flow-main">
            <section class="flow-panel">
              <div class="flow-section-head">
                <div>
                  <span class="panel-eyebrow">Permanent Gear</span>
                  <h2>装备</h2>
                </div>
                <span class="tag info">长期收益</span>
              </div>
              <div class="store-list">
                ${equipHtml}
              </div>
            </section>

            <section class="flow-panel">
              <div class="flow-section-head">
                <div>
                  <span class="panel-eyebrow">Consumables</span>
                  <h2>消耗品</h2>
                </div>
                <span class="tag info">短期补给</span>
              </div>
              <div class="store-list">
                ${itemHtml}
              </div>
            </section>

            <section class="flow-panel">
              <div class="flow-cta-row">
                <div>
                  <div class="panel-eyebrow">Next Step</div>
                  <p class="flow-cta-hint">购物完成后进入招募阶段，补齐下一项目的人手结构。</p>
                </div>
                <button id="btn-to-recruit" class="btn btn-primary" style="min-width:240px;">
                  完成购物 → 招募员工
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    `;

    // 绑定装备购买
    container.querySelectorAll('.buy-equip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const eqId = (btn as HTMLElement).dataset.equipId!;
        if (kernel.purchaseEquipmentFromShop(eqId)) {
          this.render(container);
        }
      });
    });

    // 绑定道具购买
    container.querySelectorAll('.buy-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = (btn as HTMLElement).dataset.itemId!;
        if (kernel.purchaseItem(itemId)) {
          this.render(container);
        }
      });
    });

    container.querySelector('#btn-to-recruit')!.addEventListener('click', () => {
      kernel.transition(GamePhase.RECRUIT);
    });
  }
}
