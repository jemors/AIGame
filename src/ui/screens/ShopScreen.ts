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
    const ownedEquipIds = new Set(state.equipments.map(e => e.dataId));

    // 道具列表
    const items = Array.from(dataStore.items.values());

    const rarityColors: Record<string, string> = {
      COMMON: '#888', UNCOMMON: 'var(--highlight-blue)', RARE: '#DAA520',
    };
    const eqTypeIcons: Record<string, string> = {
      ARMOR: '\u{1F6E1}\uFE0F', ATTACK: '\u2694\uFE0F', RECOVERY: '\u{1F49A}', ENERGY: '\u26A1',
    };

    const equipHtml = equipments.map(eq => {
      const owned = ownedEquipIds.has(eq.id);
      const canAfford = state.studio.funds >= eq.price;
      const disabled = owned || !canAfford;
      const borderColor = rarityColors[eq.rarity] || '#888';
      return `
        <div class="card" style="padding:10px;border-left:4px solid ${borderColor};opacity:${disabled ? '0.5' : '1'};">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:14px;font-weight:bold;">${eqTypeIcons[eq.type] || ''} ${eq.name}</div>
              <div style="font-size:11px;color:var(--ink-light);margin-top:2px;">${eq.description}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px;font-weight:bold;color:${canAfford ? 'var(--highlight-green)' : 'var(--highlight-red)'};">
                \u{1F4B0} ${eq.price.toLocaleString()}
              </div>
              ${owned
                ? '<span style="font-size:11px;color:var(--ink-light);">已拥有</span>'
                : `<button class="btn buy-equip-btn" data-equip-id="${eq.id}" style="font-size:11px;padding:2px 10px;margin-top:4px;${!canAfford ? 'pointer-events:none;' : ''}">购买</button>`
              }
            </div>
          </div>
        </div>`;
    }).join('');

    const itemHtml = items.map(it => {
      const owned = state.items.find(i => i.dataId === it.id);
      const qty = owned?.quantity || 0;
      const maxed = qty >= it.maxStack;
      const canAfford = state.studio.funds >= it.price;
      const disabled = maxed || !canAfford;
      return `
        <div class="card" style="padding:10px;opacity:${disabled ? '0.5' : '1'};">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:14px;font-weight:bold;">${it.icon} ${it.name} <span style="font-size:11px;color:var(--ink-light);">(${qty}/${it.maxStack})</span></div>
              <div style="font-size:11px;color:var(--ink-light);margin-top:2px;">${it.description}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px;font-weight:bold;color:${canAfford ? 'var(--highlight-green)' : 'var(--highlight-red)'};">
                \u{1F4B0} ${it.price.toLocaleString()}
              </div>
              ${maxed
                ? '<span style="font-size:11px;color:var(--ink-light);">已满</span>'
                : `<button class="btn buy-item-btn" data-item-id="${it.id}" style="font-size:11px;padding:2px 10px;margin-top:4px;${!canAfford ? 'pointer-events:none;' : ''}">购买</button>`
              }
            </div>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="screen" style="justify-content:flex-start;padding:24px;overflow-y:auto;">
        <div style="max-width:800px;width:100%;margin:0 auto;">
          <h2 class="title-decoration" style="font-family:var(--font-title);font-size:32px;margin-bottom:8px;text-align:center;">
            \u{1F6D2} 商店
          </h2>
          <p style="text-align:center;font-size:14px;color:var(--ink-light);margin-bottom:16px;">
            项目间歇 \u2014 \u{1F4B0} 当前资金: <strong style="color:var(--highlight-green);">${state.studio.funds.toLocaleString()}</strong>
          </p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
            <!-- 装备 -->
            <div>
              <h3 style="font-size:16px;margin-bottom:8px;color:var(--ink-medium);">\u2694\uFE0F 装备（永久）</h3>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${equipHtml}
              </div>
            </div>

            <!-- 消耗品 -->
            <div>
              <h3 style="font-size:16px;margin-bottom:8px;color:var(--ink-medium);">\u{1F9EA} 消耗品（一次性）</h3>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${itemHtml}
              </div>
            </div>
          </div>

          <div style="text-align:center;">
            <button id="btn-to-recruit" class="btn btn-primary" style="font-size:18px;padding:12px 32px;">
              完成购物 \u2192 招募员工
            </button>
          </div>
        </div>
      </div>
    `;

    // 绑定装备购买
    container.querySelectorAll('.buy-equip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const eqId = (btn as HTMLElement).dataset.equipId!;
        if (kernel.purchaseEquipmentFromShop(eqId)) {
          this.render(container);
        }
      });
    });

    // 绑定道具购买
    container.querySelectorAll('.buy-item-btn').forEach(btn => {
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
