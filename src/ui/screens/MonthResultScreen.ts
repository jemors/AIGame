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

    // Boss战胜利时生成随机奖励buff
    let rewardBuffHtml = '';
    if (state.lastCombatVictory) {
      const rewardBuffId = kernel.generateBossRewardBuff();
      if (rewardBuffId) {
        const buffData = kernel.getDataStore().buffs.get(rewardBuffId);
        if (buffData) {
          rewardBuffHtml = `
            <div class="card" style="margin-bottom:20px;text-align:left;border:2px solid var(--highlight-yellow);">
              <div style="font-size:13px;color:var(--highlight-yellow);font-weight:bold;margin-bottom:6px;">
                \u{1F3C6} Boss\u5956\u52B1
              </div>
              <div style="font-size:15px;font-weight:bold;margin-bottom:4px;">
                ${buffData.name}
              </div>
              <div style="font-size:12px;color:var(--ink-medium);">
                ${buffData.description.replace('{stacks}', '1')}\uFF08\u6301\u7EED\u5230\u4E0B\u6708\u672B\uFF09
              </div>
            </div>
          `;
        }
      }
    }

    container.innerHTML = `
      <div class="screen" style="text-align:center;">
        <div style="max-width:500px;">
          <h2 class="title-decoration" style="font-family:var(--font-title);font-size:36px;margin-bottom:16px;">
            \u6218\u6597\u7ED3\u7B97
          </h2>
          <p style="font-size:16px;color:var(--ink-medium);margin-bottom:24px;">
            ${project.health > 0 ? '\u6210\u529F\u6E21\u8FC7\u4E86\u8FD9\u4E2A\u6708\u7684\u6311\u6218\uFF01' : '\u9879\u76EE\u53D7\u5230\u4E86\u91CD\u521B\uFF0C\u4F46\u8FD8\u53EF\u4EE5\u7EE7\u7EED...'}
          </p>

          <div class="card" style="margin-bottom:20px;text-align:left;">
            <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px;">
              <span>\u9879\u76EE\u5065\u5EB7\u5EA6</span>
              <span class="value" style="color:${project.health > 40 ? 'var(--highlight-green)' : 'var(--highlight-red)'};">
                ${project.health} / ${project.maxHealth}
              </span>
            </div>
            <div class="progress-bar">
              <div class="fill" style="width:${(project.health / project.maxHealth) * 100}%;background:${project.health > 40 ? 'var(--highlight-green)' : 'var(--highlight-red)'};"></div>
            </div>
          </div>

          ${rewardBuffHtml}

          <button id="btn-next" class="btn btn-primary" style="font-size:18px;padding:12px 32px;">
            ${isLastMonth ? '\u9879\u76EE\u7ED3\u7B97' : '\u8FDB\u5165\u7B2C' + (project.currentMonth + 1) + '\u4E2A\u6708'}
          </button>
        </div>
      </div>
    `;

    container.querySelector('#btn-next')!.addEventListener('click', () => {
      kernel.advanceMonth();
    });
  }
}
