// ========================================
// ProjectResultScreen - 项目最终结算界面
// ========================================

import { kernel } from '../../kernel/GameKernel';
import { GamePhase } from '../../models/types';
import type { Screen } from '../UIManager';

export class ProjectResultScreen implements Screen {
  id = 'project-result';

  create(container: HTMLElement): void {
    const state = kernel.getState();
    const project = state.project!;
    const pData = kernel.getDataStore().projects.get(project.dataId);

    // 计算评分
    const progAvg = (project.progress.programming + project.progress.art + project.progress.design) / 3;
    const healthRatio = project.health / project.maxHealth;
    const qualityBonus = project.progress.quality * 0.3;
    const innovationBonus = project.progress.innovation * 0.2;

    const rawScore = progAvg * 0.5 + healthRatio * 100 * 0.3 + qualityBonus + innovationBonus;
    const score = Math.round(Math.min(100, rawScore));

    let grade = 'D';
    let gradeColor = 'var(--highlight-red)';
    if (score >= 90) { grade = 'S'; gradeColor = '#f0d060'; }
    else if (score >= 80) { grade = 'A'; gradeColor = 'var(--highlight-green)'; }
    else if (score >= 65) { grade = 'B'; gradeColor = 'var(--highlight-blue)'; }
    else if (score >= 50) { grade = 'C'; gradeColor = 'var(--ink-medium)'; }

    // 计算收入
    const revenue = Math.round(score * 1000 + state.studio.reputation * 200);

    container.innerHTML = `
      <div class="screen" style="text-align:center;">
        <div style="max-width:600px;">
          <h2 class="title-decoration" style="font-family:var(--font-title);font-size:36px;margin-bottom:8px;">
            项目发售！
          </h2>
          <p style="font-size:18px;color:var(--ink-medium);margin-bottom:32px;">
            《${project.name}》正式上线了！
          </p>

          <!-- 大评分 -->
          <div style="font-size:120px;font-family:var(--font-title);color:${gradeColor};margin-bottom:16px;line-height:1;">
            ${grade}
          </div>
          <p style="font-size:24px;margin-bottom:32px;">综合评分: ${score}分</p>

          <div class="card" style="text-align:left;margin-bottom:20px;">
            <h3 style="font-size:16px;margin-bottom:12px;">📊 详细评价</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">
              <div>编程完成度: ${Math.round(project.progress.programming)}%</div>
              <div>美术完成度: ${Math.round(project.progress.art)}%</div>
              <div>策划完成度: ${Math.round(project.progress.design)}%</div>
              <div>项目健康度: ${Math.round(healthRatio * 100)}%</div>
            </div>
          </div>

          <div class="card" style="text-align:left;margin-bottom:24px;">
            <h3 style="font-size:16px;margin-bottom:12px;">💰 收益结算</h3>
            <div style="font-size:14px;margin-bottom:4px;">游戏销售收入: <strong style="color:var(--highlight-green);">+${revenue.toLocaleString()}</strong></div>
            <div style="font-size:14px;">最终余额: <strong>${(state.studio.funds + revenue).toLocaleString()}</strong></div>
          </div>

          <div style="display:flex;gap:12px;justify-content:center;">
            <button id="btn-to-shop" class="btn btn-primary" style="font-size:18px;padding:12px 32px;">
              前往商店 →
            </button>
            <button id="btn-back-title" class="btn" style="font-size:14px;padding:10px 20px;">
              返回标题
            </button>
          </div>
        </div>
      </div>
    `;

    // 加入收入
    kernel.modifyFunds(revenue);

    container.querySelector('#btn-to-shop')!.addEventListener('click', () => {
      kernel.transition(GamePhase.SHOP);
    });
    container.querySelector('#btn-back-title')!.addEventListener('click', () => {
      kernel.transition(GamePhase.TITLE);
    });
  }
}
