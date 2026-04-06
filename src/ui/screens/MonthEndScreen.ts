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
    const bossId = pData?.bossEnemies?.[project.currentMonth - 1]
      || pData?.monthlyEnemies[project.currentMonth - 1]?.[
        (pData.monthlyEnemies[project.currentMonth - 1]?.length || 1) - 1
      ]
      || 'enemy_tech_debt_giant';
    const bossData = kernel.getDataStore().enemies.get(bossId);

    // 计算Boss缩放后的HP预览
    const baseMult = 1 + (project.currentMonth - 1) * 0.3;
    const bossMultiplier = isFinalBoss ? baseMult * 2.0 : baseMult;
    const scaledHp = bossData ? Math.round(bossData.maxHp * bossMultiplier) : 80;

    const lockedCount = state.lockedDeck.length;
    const lockedWarning = lockedCount === 0
      ? '<span style="color:var(--highlight-red);">警告：锁定牌组为空，将使用完整牌库！</span>'
      : '';

    const titleText = isFinalBoss
      ? `第${project.currentMonth}月结算 — 最终Boss战`
      : `第${project.currentMonth}月结算`;

    const bossIconBg = isFinalBoss ? '#660000' : '#8B0000';
    const bossBorder = isFinalBoss ? '#ff4444' : '#DAA520';
    const bossCardBorder = isFinalBoss ? 'border:2px solid #ff4444;box-shadow:0 0 12px rgba(255,68,68,0.3);' : '';

    container.innerHTML = `
      <div class="screen" style="text-align:center;">
        <div style="max-width:600px;">
          <h2 class="title-decoration" style="font-family:var(--font-title);font-size:36px;margin-bottom:24px;${isFinalBoss ? 'color:#cc0000;' : ''}">
            ${titleText}
          </h2>

          <div class="card" style="margin-bottom:20px;text-align:left;">
            <h3 style="font-size:16px;margin-bottom:12px;">💰 财务报告</h3>
            <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;">
              <span>工作室租金</span><span style="color:var(--highlight-red);">-${studio.monthlyRent.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;">
              <span>员工薪资</span><span style="color:var(--highlight-red);">-${totalSalary.toLocaleString()}</span>
            </div>
            <div style="border-top:1px solid var(--pencil-line);padding-top:8px;margin-top:8px;display:flex;justify-content:space-between;font-size:16px;font-weight:bold;">
              <span>余额</span><span style="color:${kernel.getState().studio.funds >= 0 ? 'var(--highlight-green)' : 'var(--highlight-red)'};">
                ${kernel.getState().studio.funds.toLocaleString()}
              </span>
            </div>
          </div>

          <div class="card" style="margin-bottom:20px;text-align:left;">
            <h3 style="font-size:16px;margin-bottom:12px;">📊 项目进度</h3>
            <div style="font-size:14px;line-height:2;">
              编程进度: ${Math.round(project.progress.programming)}% |
              美术进度: ${Math.round(project.progress.art)}% |
              策划进度: ${Math.round(project.progress.design)}%
            </div>
          </div>

          <div class="card" style="margin-bottom:24px;text-align:left;${bossCardBorder}">
            <h3 style="font-size:16px;margin-bottom:12px;">${isFinalBoss ? '⚡ 最终Boss战' : '👹 Boss战'}</h3>
            ${isFinalBoss ? '<div style="font-size:12px;color:#cc0000;margin-bottom:8px;padding:4px 8px;background:#fff0f0;border-radius:4px;border:1px solid #ffcccc;">击败最终Boss后项目将结算发售！</div>' : ''}
            ${bossData ? `
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;">
                <div style="width:50px;height:50px;background:${bossIconBg};border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:24px;border:3px solid ${bossBorder};${isFinalBoss ? 'box-shadow:0 0 8px rgba(255,68,68,0.5);' : ''}">
                  ${bossData.name[0]}
                </div>
                <div>
                  <strong style="font-size:16px;${isFinalBoss ? 'color:#cc0000;' : ''}">${isFinalBoss ? '【最终】' : ''}${bossData.name}</strong>
                  <div style="font-size:12px;color:var(--ink-light);">HP: <strong style="color:${isFinalBoss ? '#cc0000' : 'inherit'};">${scaledHp}</strong> | ${bossData.description || ''}</div>
                  ${bossData.passiveAbility ? `<div style="font-size:11px;color:#DAA520;margin-top:2px;">被动: ${bossData.passiveAbility}</div>` : ''}
                </div>
              </div>
            ` : '<p>未知Boss</p>'}
            <div style="margin-top:12px;padding-top:8px;border-top:1px dashed #ddd;font-size:13px;">
              <div>🔒 Boss战牌组: <strong style="color:#DAA520;">${lockedCount}</strong> 张锁定卡牌</div>
              ${lockedWarning}
            </div>
          </div>

          <div style="display:flex;gap:12px;justify-content:center;">
            <button id="btn-enter-combat" class="btn btn-primary" style="font-size:18px;padding:12px 32px;${isFinalBoss ? 'background:linear-gradient(135deg,#cc0000,#8B0000);border-color:#660000;' : ''}">
              ${isFinalBoss ? '⚡ 迎接最终Boss战！' : '迎接Boss战！'}
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-enter-combat')!.addEventListener('click', () => {
      kernel.startBossCombat();
    });
  }
}
