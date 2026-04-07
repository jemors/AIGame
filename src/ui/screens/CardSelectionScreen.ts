// ========================================
// CardSelectionScreen - 锁卡选择界面
// 每周战斗后选择5张卡牌锁定到Boss战牌组
// ========================================

import { kernel } from '../../kernel/GameKernel';
import type { Screen } from '../UIManager';

export class CardSelectionScreen implements Screen {
  id = 'card-selection';

  create(container: HTMLElement): void {
    const state = kernel.getState();
    const deck = state.deck;
    const lockedCount = state.lockedDeck.length;
    const maxSelect = Math.min(5, deck.length);
    const selectedUids = new Set<string>();

    const screenDiv = document.createElement('div');
    screenDiv.className = 'screen';
    screenDiv.style.cssText =
      'text-align:center;overflow-y:auto;padding:24px 16px;justify-content:flex-start;';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'max-width:860px;margin:0 auto;padding-bottom:32px;';

    wrapper.innerHTML = `
      <h2 class="title-decoration" style="font-family:var(--font-title);font-size:28px;margin-bottom:8px;">
        选择卡牌锁定
      </h2>
      <p style="font-size:14px;color:var(--ink-medium);margin-bottom:4px;">
        选择 <strong>${maxSelect}</strong> 张卡牌锁定到Boss战牌组（已锁定: ${lockedCount}/15）
      </p>
      <p style="font-size:12px;color:var(--ink-light);margin-bottom:16px;">
        锁定的卡牌将从每周战斗牌库中移除，仅在月末Boss战中使用
      </p>
      <div id="selection-counter" style="font-size:16px;font-weight:bold;margin-bottom:16px;color:var(--highlight-blue);">
        已选择: 0 / ${maxSelect}
      </div>
      <div id="card-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;text-align:left;"></div>
      <button id="btn-confirm" class="btn btn-primary" style="font-size:18px;padding:12px 32px;" disabled>
        确认锁定
      </button>
    `;

    screenDiv.appendChild(wrapper);
    container.innerHTML = '';
    container.appendChild(screenDiv);

    const cardGrid = wrapper.querySelector('#card-grid')!;
    const counterEl = wrapper.querySelector('#selection-counter')!;
    const confirmBtn = wrapper.querySelector('#btn-confirm') as HTMLButtonElement;

    // 卡牌类型颜色映射
    const typeColors: Record<string, string> = {
      ATTACK: 'var(--highlight-red)',
      SKILL: 'var(--highlight-blue)',
      POWER: '#8B4513',
      STATUS: '#999',
      HEAL: '#44aa66',
    };

    // 按类型颜色排序：攻击 → 恢复 → 技能 → 能力 → 状态
    const typeOrder: Record<string, number> = { ATTACK: 0, HEAL: 1, SKILL: 2, POWER: 3, STATUS: 4 };
    const sortedDeck = [...deck].sort((a, b) => {
      const aData = kernel.getDataStore().cards.get(a.dataId);
      const bData = kernel.getDataStore().cards.get(b.dataId);
      const aIsHeal = aData?.effects.some((e) => e.type === 'HEAL') ?? false;
      const bIsHeal = bData?.effects.some((e) => e.type === 'HEAL') ?? false;
      const aType = aIsHeal ? 'HEAL' : (aData?.type ?? 'STATUS');
      const bType = bIsHeal ? 'HEAL' : (bData?.type ?? 'STATUS');
      return (typeOrder[aType] ?? 4) - (typeOrder[bType] ?? 4);
    });

    // 渲染每张卡牌
    for (const card of sortedDeck) {
      const cardData = kernel.getDataStore().cards.get(card.dataId);
      if (!cardData) continue;

      const isHeal = cardData.effects.some((e) => e.type === 'HEAL');
      const cardColor = isHeal ? typeColors.HEAL : typeColors[cardData.type] || '#999';
      const cardTypeLabel = isHeal
        ? '恢复'
        : cardData.type === 'ATTACK'
          ? '攻击'
          : cardData.type === 'SKILL'
            ? '技能'
            : cardData.type === 'POWER'
              ? '能力'
              : '状态';

      const cardEl = document.createElement('div');
      cardEl.className = 'card';
      cardEl.style.cssText = `
        cursor:pointer;padding:12px;border:2px solid var(--pencil-line);
        transition:all 0.2s;position:relative;min-height:100px;
      `;
      cardEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;
            border-radius:50%;background:${cardColor};color:white;font-size:12px;font-weight:bold;">
            ${cardData.cost}
          </span>
          <span style="font-size:13px;font-weight:bold;">${cardData.name}</span>
        </div>
        <div style="font-size:11px;color:var(--ink-light);line-height:1.4;">${cardData.description}</div>
        <div style="position:absolute;top:4px;right:4px;font-size:10px;color:${cardColor};">
          ${cardTypeLabel}
        </div>
      `;

      cardEl.addEventListener('click', () => {
        if (selectedUids.has(card.uid)) {
          // 取消选择
          selectedUids.delete(card.uid);
          cardEl.style.borderColor = 'var(--pencil-line)';
          cardEl.style.background = '';
          cardEl.style.boxShadow = '';
        } else if (selectedUids.size < maxSelect) {
          // 选中
          selectedUids.add(card.uid);
          cardEl.style.borderColor = '#DAA520';
          cardEl.style.background = 'rgba(218, 165, 32, 0.08)';
          cardEl.style.boxShadow = '0 0 8px rgba(218, 165, 32, 0.3)';
        }
        // 更新计数器和按钮状态
        counterEl.textContent = `已选择: ${selectedUids.size} / ${maxSelect}`;
        confirmBtn.disabled = selectedUids.size !== maxSelect;
      });

      cardGrid.appendChild(cardEl);
    }

    // 如果牌库为空
    if (deck.length === 0) {
      cardGrid.innerHTML =
        '<p style="color:var(--ink-light);grid-column:1/-1;text-align:center;">牌库为空</p>';
      confirmBtn.textContent = '跳过';
      confirmBtn.disabled = false;
    }

    // 确认按钮
    confirmBtn.addEventListener('click', () => {
      if (selectedUids.size > 0) {
        kernel.lockCards(Array.from(selectedUids));
      }
      kernel.finishCardSelection();
    });
  }
}
