// ========================================
// WeekResultScreen - 每周战斗结算界面
// ========================================

import { kernel } from '../../kernel/GameKernel';
import { GamePhase } from '../../models/types';
import type { Screen } from '../UIManager';

export class WeekResultScreen implements Screen {
  id = 'week-result';

  create(container: HTMLElement): void {
    const state = kernel.getState();
    const project = state.project!;
    const weekNumber = state.daily.currentWeek - 1 || 1; // 刚过去的周数

    container.innerHTML = `
      <div class="screen" style="text-align:center;">
        <div style="max-width:500px;">
          <h2 class="title-decoration" style="font-family:var(--font-title);font-size:36px;margin-bottom:16px;">
            第${weekNumber}周战斗结束
          </h2>
          <p style="font-size:16px;color:var(--ink-medium);margin-bottom:24px;">
            ${project.health > 40
              ? '顺利通过了本周的挑战！'
              : project.health > 0
                ? '勉强撑过了这周，需要注意项目健康度。'
                : '项目受到了重创...'}
          </p>

          <div class="card" style="margin-bottom:20px;text-align:left;">
            <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px;">
              <span>项目健康度</span>
              <span class="value" style="color:${project.health > 40 ? 'var(--highlight-green)' : 'var(--highlight-red)'};">
                ${project.health} / ${project.maxHealth}
              </span>
            </div>
            <div class="progress-bar">
              <div class="fill" style="width:${(project.health / project.maxHealth) * 100}%;background:${project.health > 40 ? 'var(--highlight-green)' : 'var(--highlight-red)'};"></div>
            </div>
          </div>

          <div class="card" style="margin-bottom:20px;text-align:left;">
            <div style="font-size:14px;line-height:1.8;">
              <div>🃏 当前牌库: <strong>${state.deck.length}</strong> 张</div>
              <div>🔒 已锁定牌: <strong>${state.lockedDeck.length}</strong> 张 (Boss战用)</div>
            </div>
          </div>

          <button id="btn-next-step" class="btn btn-primary" style="font-size:18px;padding:12px 32px;">
            ${state.lastCombatVictory ? '\u9009\u62E9\u6218\u5229\u54C1 \u2192' : '\u9009\u62E9\u9501\u5B9A\u5361\u724C \u2192'}
          </button>
        </div>
      </div>
    `;

    container.querySelector('#btn-next-step')!.addEventListener('click', () => {
      if (state.lastCombatVictory) {
        kernel.transition(GamePhase.EQUIPMENT_SELECTION);
      } else {
        kernel.transition(GamePhase.CARD_SELECTION);
      }
    });
  }
}
