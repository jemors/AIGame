// ========================================
// MonthEndScreen - 月末结算界面
// ========================================

import { kernel } from '../../kernel/GameKernel';
import type { Screen } from '../UIManager';

export class MonthEndScreen implements Screen {
  id = 'month-end';

  create(container: HTMLElement): void {
    const state = kernel.getState();
    const project = state.project!;
    const studio = state.studio;
    const isFinalBoss = state.publishMarked;

    // 月末扣除租金和工资
    const totalSalary = state.employees.reduce((sum, emp) => {
      const eData = kernel.getDataStore().employees.get(emp.dataId);
      return sum + (eData?.salary || 0);
    }, 0);
    const totalExpense = studio.monthlyRent + totalSalary;

    kernel.modifyFunds(-totalExpense);

    // 获取Boss敌人信息
    const pData = kernel.getDataStore().projects.get(project.dataId);
    const bossId =
      pData?.bossEnemies?.[project.currentMonth - 1] ||
      pData?.monthlyEnemies[project.currentMonth - 1]?.[
        (pData.monthlyEnemies[project.currentMonth - 1]?.length || 1) - 1
      ] ||
      'enemy_tech_debt_giant';
    const bossData = kernel.getDataStore().enemies.get(bossId);

    // 计算Boss缩放后的HP预览
    const baseMult = 1 + (project.currentMonth - 1) * 0.3;
    const bossMultiplier = isFinalBoss ? baseMult * 2.0 : baseMult;
    const scaledHp = bossData ? Math.round(bossData.maxHp * bossMultiplier) : 80;

    const lockedCount = state.lockedDeck.length;

    const titleText = isFinalBoss
      ? `第${project.currentMonth}月结算 — 最终Boss战`
      : `第${project.currentMonth}月结算`;

    const bossIconBg = isFinalBoss ? '#660000' : '#8B0000';
    const bossBorder = isFinalBoss ? '#ff4444' : '#DAA520';
    const balance = kernel.getState().studio.funds;

    container.innerHTML = `
      <div class="screen result-screen">
        <div class="result-shell">
          <aside class="result-side">
            <section class="result-panel result-hero ${isFinalBoss ? 'is-danger' : ''}">
              <span class="panel-eyebrow" style="color:rgba(255,237,211,0.72);">Month End</span>
              <h1>${titleText}</h1>
              <p>
                ${
                  isFinalBoss
                    ? '发布已经锁定，今晚不再是普通月末结算，而是决定项目命运的最终 Boss 战。'
                    : '月末账单已经落地，接下来要用这一个阶段，验证本月经营是否真的撑得住 Boss 压力。'
                }
              </p>
              <div class="result-metric-list">
                <span class="ops-chip">本月支出 <strong>${totalExpense.toLocaleString()}</strong></span>
                <span class="ops-chip">Boss 预估 HP <strong>${scaledHp}</strong></span>
                <span class="ops-chip">锁定牌组 <strong>${lockedCount}</strong></span>
              </div>
            </section>

            <section class="result-panel">
              <div class="result-section-head" style="margin-bottom:10px;">
                <div>
                  <span class="panel-eyebrow">Boss Tips</span>
                  <h3>战前提示</h3>
                </div>
              </div>
              <div class="candidate-meta" style="margin-top:0;">
                <span>锁定牌组越清晰，Boss 战容错越高</span>
                <span>最终 Boss 强度按常规月末的两倍计算</span>
                <span>项目健康度过低时要避免拖长战斗</span>
              </div>
            </section>
          </aside>

          <main class="result-main">
            <section class="result-panel">
              <div class="result-section-head">
                <div>
                  <span class="panel-eyebrow">Finance Report</span>
                  <h2>财务报告</h2>
                </div>
                <span class="tag info">月末结算</span>
              </div>
              <div class="finance-list">
                <div class="finance-row">
                  <span>工作室租金</span>
                  <strong style="color:var(--highlight-red);">-${studio.monthlyRent.toLocaleString()}</strong>
                </div>
                <div class="finance-row">
                  <span>员工薪资</span>
                  <strong style="color:var(--highlight-red);">-${totalSalary.toLocaleString()}</strong>
                </div>
                <div class="finance-row is-total">
                  <span>月末余额</span>
                  <strong style="color:${balance >= 0 ? '#b8f1da' : '#ffd1cc'};">${balance.toLocaleString()}</strong>
                </div>
              </div>
            </section>

            <section class="result-panel">
              <div class="result-section-head">
                <div>
                  <span class="panel-eyebrow">Project Snapshot</span>
                  <h2>项目状态</h2>
                </div>
                <span class="tag info">月度进度</span>
              </div>
              <div class="result-stat-grid">
                <div class="result-kpi">
                  <div class="result-kpi-label">编程</div>
                  <div class="result-kpi-value">${Math.round(project.progress.programming)}%</div>
                </div>
                <div class="result-kpi">
                  <div class="result-kpi-label">美术</div>
                  <div class="result-kpi-value">${Math.round(project.progress.art)}%</div>
                </div>
                <div class="result-kpi">
                  <div class="result-kpi-label">策划</div>
                  <div class="result-kpi-value">${Math.round(project.progress.design)}%</div>
                </div>
                <div class="result-kpi">
                  <div class="result-kpi-label">项目健康</div>
                  <div class="result-kpi-value">${project.health}/${project.maxHealth}</div>
                </div>
              </div>
            </section>

            <section class="result-panel">
              <div class="result-section-head">
                <div>
                  <span class="panel-eyebrow">Boss Preview</span>
                  <h2>${isFinalBoss ? '最终 Boss 战' : 'Boss 战情报'}</h2>
                </div>
                <span class="tag ${isFinalBoss ? 'negative' : 'info'}">${isFinalBoss ? 'Final' : 'Monthly'}</span>
              </div>
              ${
                isFinalBoss
                  ? '<div class="status-banner is-danger">击败最终 Boss 后项目将立即结算发售，失败则意味着你带着残破状态进入项目收尾。</div>'
                  : ''
              }
              ${
                bossData
                  ? `
                <div class="boss-preview ${isFinalBoss ? 'is-danger' : ''}">
                  <div class="boss-avatar ${isFinalBoss ? 'is-final' : ''}" style="background:${bossIconBg};border:3px solid ${bossBorder};">
                    ${bossData.name[0]}
                  </div>
                  <div>
                    <div class="boss-name ${isFinalBoss ? 'is-final' : ''}">${isFinalBoss ? '【最终】' : ''}${bossData.name}</div>
                    <div class="boss-subline">HP ${scaledHp} · ${bossData.description || '未知 Boss'}</div>
                    ${bossData.passiveAbility ? `<div class="boss-passive">被动: ${bossData.passiveAbility}</div>` : ''}
                  </div>
                </div>
              `
                  : '<div class="status-banner">当前无法解析 Boss 情报。</div>'
              }
              <div class="status-banner is-gold" style="margin-top:14px;">
                Boss 战牌组: <strong style="color:#8f5a23;">${lockedCount}</strong> 张锁定卡牌。${lockedCount === 0 ? '警告：当前为空，将直接使用完整牌库。' : '锁定越明确，战斗节奏越可控。'}
              </div>
            </section>

            <section class="result-panel">
              <div class="result-action-row">
                <div>
                  <div class="panel-eyebrow">Next Step</div>
                  <p class="result-action-note">确认无误后进入 Boss 战。月末不会再给额外准备回合。</p>
                </div>
                <button id="btn-enter-combat" class="btn btn-primary" style="${isFinalBoss ? 'background:linear-gradient(135deg,#cc0000,#8B0000);border-color:#660000;' : 'min-width:220px;'}">
                  ${isFinalBoss ? '迎接最终 Boss 战' : '迎接 Boss 战'}
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    `;

    container.querySelector('#btn-enter-combat')!.addEventListener('click', () => {
      kernel.startBossCombat();
    });
  }
}
