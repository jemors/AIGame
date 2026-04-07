// ========================================
// EquipmentSelectionScreen - 装备3选1界面
// ========================================

import { kernel } from '../../kernel/GameKernel';
import type { EquipmentData } from '../../models/Equipment';
import type { Screen } from '../UIManager';

const TYPE_COLORS: Record<string, string> = {
  ARMOR: 'var(--highlight-blue)',
  ATTACK: 'var(--highlight-red)',
  RECOVERY: '#44aa66',
  ENERGY: 'var(--highlight-yellow)',
};

const TYPE_ICONS: Record<string, string> = {
  ARMOR: '\u{1F6E1}\uFE0F',
  ATTACK: '\u2694\uFE0F',
  RECOVERY: '\u{1F49A}',
  ENERGY: '\u26A1',
};

const TYPE_LABELS: Record<string, string> = {
  ARMOR: '\u62A4\u7532',
  ATTACK: '\u653B\u51FB',
  RECOVERY: '\u6062\u590D',
  ENERGY: '\u80FD\u91CF',
};

const RARITY_COLORS: Record<string, string> = {
  COMMON: 'var(--ink-light)',
  UNCOMMON: 'var(--highlight-blue)',
  RARE: 'var(--highlight-yellow)',
};

const RARITY_LABELS: Record<string, string> = {
  COMMON: '\u666E\u901A',
  UNCOMMON: '\u7A00\u6709',
  RARE: '\u7F55\u89C1',
};

export class EquipmentSelectionScreen implements Screen {
  id = 'equipment-selection';

  create(container: HTMLElement): void {
    const state = kernel.getState();
    const choices = kernel.generateEquipmentChoices(3);

    // 无装备可选时直接跳过
    if (choices.length === 0) {
      kernel.finishEquipmentSelection();
      return;
    }

    let selectedId: string | null = null;

    const screenDiv = document.createElement('div');
    screenDiv.className = 'screen';
    screenDiv.style.cssText =
      'text-align:center;overflow-y:auto;padding:24px 16px;justify-content:flex-start;';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'max-width:700px;margin:0 auto;';

    // 标题
    wrapper.innerHTML = `
      <h2 class="title-decoration" style="font-family:var(--font-title);font-size:32px;margin-bottom:8px;">
        \u2694\uFE0F \u6218\u5229\u54C1\u9009\u62E9
      </h2>
      <p style="font-size:14px;color:var(--ink-medium);margin-bottom:24px;">
        \u4ECE\u4EE5\u4E0B\u88C5\u5907\u4E2D\u9009\u62E9\u4E00\u4EF6\uFF08\u6C38\u4E45\u4FDD\u7559\uFF09
      </p>
    `;

    // 装备卡片容器
    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${Math.min(choices.length, 3)},1fr);gap:16px;margin-bottom:24px;`;

    const cardElements: HTMLElement[] = [];

    choices.forEach((eq: EquipmentData) => {
      const typeColor = TYPE_COLORS[eq.type] || 'var(--ink-medium)';
      const typeIcon = TYPE_ICONS[eq.type] || '';
      const typeLabel = TYPE_LABELS[eq.type] || eq.type;
      const rarityColor = RARITY_COLORS[eq.rarity] || 'var(--ink-light)';
      const rarityLabel = RARITY_LABELS[eq.rarity] || eq.rarity;

      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = `
        padding:20px 16px;border:2px solid var(--pencil-line);cursor:pointer;
        text-align:center;transition:all 0.2s;position:relative;
      `;

      card.innerHTML = `
        <div style="position:absolute;top:8px;right:8px;font-size:10px;color:${rarityColor};font-weight:bold;">
          ${rarityLabel}
        </div>
        <div style="font-size:32px;margin-bottom:8px;">${typeIcon}</div>
        <div style="font-size:16px;font-weight:bold;margin-bottom:4px;">${eq.name}</div>
        <div style="font-size:11px;color:${typeColor};font-weight:bold;margin-bottom:8px;">
          ${typeLabel}
        </div>
        <div style="font-size:12px;color:var(--ink-medium);line-height:1.6;">
          ${eq.description}
        </div>
      `;

      card.addEventListener('click', () => {
        // 取消之前的选择
        cardElements.forEach((el) => {
          el.style.borderColor = 'var(--pencil-line)';
          el.style.background = '';
          el.style.boxShadow = '';
        });
        // 选中当前
        selectedId = eq.id;
        card.style.borderColor = '#DAA520';
        card.style.background = 'rgba(218, 165, 32, 0.08)';
        card.style.boxShadow = '0 0 8px rgba(218, 165, 32, 0.3)';
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
      });

      cardElements.push(card);
      grid.appendChild(card);
    });

    wrapper.appendChild(grid);

    // 已拥有装备展示
    if (state.equipments.length > 0) {
      const ownedDiv = document.createElement('div');
      ownedDiv.style.cssText = 'margin-bottom:20px;font-size:12px;color:var(--ink-light);';
      const ownedNames = state.equipments
        .map((e) => {
          const d = kernel.getDataStore().equipments.get(e.dataId);
          return d ? `${TYPE_ICONS[d.type] || ''} ${d.name}` : e.dataId;
        })
        .join('\u3001');
      ownedDiv.textContent = `\u5DF2\u62E5\u6709\u88C5\u5907\uFF1A${ownedNames}`;
      wrapper.appendChild(ownedDiv);
    }

    // 确认按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.style.cssText = 'font-size:18px;padding:12px 32px;';
    confirmBtn.textContent = '\u786E\u8BA4\u9009\u62E9';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    confirmBtn.addEventListener('click', () => {
      if (!selectedId) return;
      kernel.selectEquipment(selectedId);
      kernel.finishEquipmentSelection();
    });
    wrapper.appendChild(confirmBtn);

    // 跳过按钮
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn';
    skipBtn.style.cssText =
      'font-size:13px;padding:8px 20px;margin-top:12px;display:block;margin-left:auto;margin-right:auto;color:var(--ink-light);';
    skipBtn.textContent = '\u8DF3\u8FC7';
    skipBtn.addEventListener('click', () => {
      kernel.finishEquipmentSelection();
    });
    wrapper.appendChild(skipBtn);

    screenDiv.appendChild(wrapper);
    container.appendChild(screenDiv);
  }
}
