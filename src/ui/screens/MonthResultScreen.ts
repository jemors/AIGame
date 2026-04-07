// ========================================
// MonthResultScreen - 月度战斗结算界面
// ========================================

import { kernel } from '../../kernel/GameKernel';
import type { Screen } from '../UIManager';

export class MonthResultScreen implements Screen {
  id = 'month-result';

  create(container: HTMLElement): void {
    const state = kernel.getState();
    const project = state.project!;
    const pData = kernel.getDataStore().projects.get(project.dataId);
    const isLastMonth = project.currentMonth >= (pData?.totalMonths || 3) || state.publishMarked;
    const healthRatio = project.health / project.maxHealth;
    const healthColor = project.health > 40 ? 'var(--highlight-green)' : 'var(--highlight-red)';

    // Boss战胜利时生成随机奖励buff
    let rewardBuffHtml = '';
    if (state.lastCombatVictory) {
      const rewardBuffId = kernel.generateBossRewardBuff();
      if (rewardBuffId) {
        const buffData = kernel.getDataStore().buffs.get(rewardBuffId);
        if (buffData) {
          rewardBuffHtml = `
            <section class="result-panel">
              <div class="result-section-head">
                <div>
                  <span class="panel-eyebrow">Boss Reward</span>
                  <h2>奖励 Buff</h2>
                </div>
                <span class="tag positive">\u{1F3C6} 已获得</span>
              </div>
              <div class="status-banner is-gold">
                <strong style="display:block;margin-bottom:6px;color:#8f5a23;">${buffData.name}</strong>
                ${buffData.description.replace('{stacks}', '1')}\uFF08\u6301\u7EED\u5230\u4E0B\u6708\u672B\uFF09
              </div>
            </section>
          `;
        }
      }
    }

    container.innerHTML = `
      <div class="screen result-screen">
        <div class="result-shell">
          <aside class="result-side">
            <section class="result-panel result-hero ${project.health > 0 ? 'is-success' : 'is-danger'}">
              <span class="panel-eyebrow" style="color:rgba(255,237,211,0.72);">Boss Resolution</span>
              <h1>战斗结算</h1>
              <p>
                ${
                  project.health > 0
                    ? '你已经挺过这个月最关键的一战。接下来要决定是迈向下一个月，还是直接进入项目发售结算。'
                    : '这一战代价很高，但项目还没完全结束。剩下的每一步都要更克制地推进。'
                }
              </p>
              <div class="result-metric-list">
                <span class="ops-chip">项目健康 <strong>${project.health}/${project.maxHealth}</strong></span>
                <span class="ops-chip">当前月份 <strong>${project.currentMonth}</strong></span>
                <span class="ops-chip">下一步 <strong>${isLastMonth ? '项目结算' : `进入第${project.currentMonth + 1}月`}</strong></span>
              </div>
            </section>
          </aside>

          <main class="result-main">
            <section class="result-panel">
              <div class="result-section-head">
                <div>
                  <span class="panel-eyebrow">Health Report</span>
                  <h2>项目健康度</h2>
                </div>
                <span class="tag info">Month ${project.currentMonth}</span>
              </div>
              <div class="status-banner">
                月末战斗的结果会直接决定你下一轮经营的容错空间。状态越差，后续任何一次高风险推进都会更难承受。
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

            ${rewardBuffHtml}

            <section class="result-panel">
              <div class="result-action-row">
                <div>
                  <div class="panel-eyebrow">Next Step</div>
                  <p class="result-action-note">${isLastMonth ? '这是项目循环的最后一步，下一页将进入发售结算。' : '继续下个月前，先确认你是否还能承受当前的项目状态。'}</p>
                </div>
                <button id="btn-next" class="btn btn-primary" style="min-width:220px;">
                  ${isLastMonth ? '项目结算' : `进入第${project.currentMonth + 1}个月`}
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    `;

    container.querySelector('#btn-next')!.addEventListener('click', () => {
      kernel.advanceMonth();
    });
  }
}
