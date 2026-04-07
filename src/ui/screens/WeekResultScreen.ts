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
    const healthRatio = project.health / project.maxHealth;
    const healthColor = project.health > 40 ? 'var(--highlight-green)' : 'var(--highlight-red)';
    const summaryText =
      project.health > 40
        ? '本周战斗处理得很干净，项目状态仍在可控范围内。'
        : project.health > 0
          ? '这周虽然撑过去了，但项目健康已经开始逼近危险线。'
          : '项目已经被重创，后续每一步都需要更谨慎。';

    container.innerHTML = `
      <div class="screen result-screen">
        <div class="result-shell">
          <aside class="result-side">
            <section class="result-panel result-hero ${project.health <= 40 ? 'is-danger' : 'is-success'}">
              <span class="panel-eyebrow" style="color:rgba(255,237,211,0.72);">Weekly Combat</span>
              <h1>第${weekNumber}周战斗结束</h1>
              <p>${summaryText}</p>
              <div class="result-metric-list">
                <span class="ops-chip">项目健康 <strong>${project.health}/${project.maxHealth}</strong></span>
                <span class="ops-chip">当前牌库 <strong>${state.deck.length}</strong></span>
                <span class="ops-chip">锁定牌组 <strong>${state.lockedDeck.length}</strong></span>
              </div>
            </section>
          </aside>

          <main class="result-main">
            <section class="result-panel">
              <div class="result-section-head">
                <div>
                  <span class="panel-eyebrow">Damage Report</span>
                  <h2>项目状态</h2>
                </div>
                <span class="tag info">Week ${weekNumber}</span>
              </div>
              <div class="status-banner">
                每周战斗不只是在扣血，它也在暴露你当前牌库的强弱点。健康度越低，后续经营阶段的容错越差。
              </div>
              <div style="margin-top:14px;">
                <div class="metric-label" style="margin-bottom:8px;">
                  <span>项目健康度</span>
                  <span class="metric-value" style="color:${healthColor};">${project.health} / ${project.maxHealth}</span>
                </div>
                <div class="progress-bar">
                  <div class="fill" style="width:${healthRatio * 100}%;background:${healthColor};"></div>
                </div>
              </div>
            </section>

            <section class="result-panel">
              <div class="result-section-head">
                <div>
                  <span class="panel-eyebrow">Deck Status</span>
                  <h2>牌组状态</h2>
                </div>
                <span class="tag info">Combat Ready</span>
              </div>
              <div class="result-stat-grid">
                <div class="result-kpi">
                  <div class="result-kpi-label">当前牌库</div>
                  <div class="result-kpi-value">${state.deck.length}</div>
                </div>
                <div class="result-kpi">
                  <div class="result-kpi-label">已锁定牌</div>
                  <div class="result-kpi-value">${state.lockedDeck.length}</div>
                </div>
              </div>
            </section>

            <section class="result-panel">
              <div class="result-action-row">
                <div>
                  <div class="panel-eyebrow">Next Step</div>
                  <p class="result-action-note">${state.lastCombatVictory ? '本周胜利，先收下战利品，再继续准备月末。' : '本周失利，先调整锁定牌组，准备之后的 Boss 战。'}</p>
                </div>
                <button id="btn-next-step" class="btn btn-primary" style="min-width:220px;">
                  ${state.lastCombatVictory ? '选择战利品 →' : '选择锁定卡牌 →'}
                </button>
              </div>
            </section>
          </main>
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
