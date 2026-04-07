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
    const progAvg =
      (project.progress.programming + project.progress.art + project.progress.design) / 3;
    const healthRatio = project.health / project.maxHealth;
    const qualityBonus = project.progress.quality * 0.3;
    const innovationBonus = project.progress.innovation * 0.2;

    const rawScore = progAvg * 0.5 + healthRatio * 100 * 0.3 + qualityBonus + innovationBonus;
    const score = Math.round(Math.min(100, rawScore));

    let grade = 'D';
    let gradeColor = 'var(--highlight-red)';
    if (score >= 90) {
      grade = 'S';
      gradeColor = '#f0d060';
    } else if (score >= 80) {
      grade = 'A';
      gradeColor = 'var(--highlight-green)';
    } else if (score >= 65) {
      grade = 'B';
      gradeColor = 'var(--highlight-blue)';
    } else if (score >= 50) {
      grade = 'C';
      gradeColor = 'var(--ink-medium)';
    }

    // 计算收入
    const revenue = Math.round(score * 1000 + state.studio.reputation * 200);
    const finalBalance = state.studio.funds + revenue;
    const launchSummary =
      score >= 90
        ? '这是一款带着明确完成度和风格落地的作品，市场反馈会非常强。'
        : score >= 80
          ? '项目整体已经达到了稳定可卖的水准，足以为工作室带来一波健康现金流。'
          : score >= 65
            ? '这次发售能回本并留下经验，但还没到真正出圈的程度。'
            : '项目勉强上线了，现金流虽然能续命，但下一轮必须更精细地经营。';

    container.innerHTML = `
      <div class="screen result-screen">
        <div class="result-shell">
          <aside class="result-side">
            <section class="result-panel result-hero is-success">
              <span class="panel-eyebrow" style="color:rgba(255,237,211,0.72);">Project Launch</span>
              <h1>《${project.name}》正式上线</h1>
              <p>${launchSummary}</p>
              <div class="result-metric-list">
                <span class="ops-chip">最终评级 <strong>${grade}</strong></span>
                <span class="ops-chip">综合评分 <strong>${score}</strong></span>
                <span class="ops-chip">销售收入 <strong>+${revenue.toLocaleString()}</strong></span>
              </div>
            </section>
          </aside>

          <main class="result-main">
            <section class="result-panel" style="text-align:center;">
              <div class="result-section-head">
                <div>
                  <span class="panel-eyebrow">Review Score</span>
                  <h2>项目评级</h2>
                </div>
                <span class="tag info">${pData?.name || 'Project'}</span>
              </div>
              <div class="grade-emblem" style="background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.24), transparent 32%), linear-gradient(135deg, ${gradeColor}, rgba(32,25,18,0.92));margin:0 auto 18px;">
                ${grade}
              </div>
              <p style="font-size:26px;font-weight:800;color:var(--ink-dark);">综合评分 ${score} 分</p>
            </section>

            <section class="result-panel">
              <div class="result-section-head">
                <div>
                  <span class="panel-eyebrow">Review Breakdown</span>
                  <h2>详细评价</h2>
                </div>
                <span class="tag info">Postmortem</span>
              </div>
              <div class="result-stat-grid">
                <div class="result-kpi">
                  <div class="result-kpi-label">编程完成度</div>
                  <div class="result-kpi-value">${Math.round(project.progress.programming)}%</div>
                </div>
                <div class="result-kpi">
                  <div class="result-kpi-label">美术完成度</div>
                  <div class="result-kpi-value">${Math.round(project.progress.art)}%</div>
                </div>
                <div class="result-kpi">
                  <div class="result-kpi-label">策划完成度</div>
                  <div class="result-kpi-value">${Math.round(project.progress.design)}%</div>
                </div>
                <div class="result-kpi">
                  <div class="result-kpi-label">项目健康度</div>
                  <div class="result-kpi-value">${Math.round(healthRatio * 100)}%</div>
                </div>
              </div>
            </section>

            <section class="result-panel">
              <div class="result-section-head">
                <div>
                  <span class="panel-eyebrow">Revenue Report</span>
                  <h2>收益结算</h2>
                </div>
                <span class="tag positive">Cash Flow</span>
              </div>
              <div class="finance-list">
                <div class="finance-row">
                  <span>游戏销售收入</span>
                  <strong style="color:var(--highlight-green);">+${revenue.toLocaleString()}</strong>
                </div>
                <div class="finance-row is-total">
                  <span>结算后余额</span>
                  <strong>${finalBalance.toLocaleString()}</strong>
                </div>
              </div>
            </section>

            <section class="result-panel">
              <div class="result-action-row">
                <div>
                  <div class="panel-eyebrow">Next Step</div>
                  <p class="result-action-note">你可以直接进入项目间歇商店，为下一轮项目做准备，或者回到标题页结束本局。</p>
                </div>
                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                  <button id="btn-to-shop" class="btn btn-primary" style="min-width:180px;">
                    前往商店 →
                  </button>
                  <button id="btn-back-title" class="btn" style="min-width:140px;">
                    返回标题
                  </button>
                </div>
              </div>
            </section>
          </main>
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
