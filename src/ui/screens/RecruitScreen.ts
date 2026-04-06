// ========================================
// RecruitScreen - 项目间歇员工招募界面
// ========================================

import { kernel } from '../../kernel/GameKernel';
import type { Screen } from '../UIManager';

const ROLE_LABELS: Record<string, string> = {
  PROGRAMMER: '程序',
  ARTIST: '美术',
  DESIGNER: '策划',
  QA: '测试',
};

export class RecruitScreen implements Screen {
  id = 'recruit';

  create(container: HTMLElement): void {
    this.render(container);
  }

  private render(container: HTMLElement): void {
    const state = kernel.getState();
    const dataStore = kernel.getDataStore();

    // 当前团队
    const currentTeam = state.employees.map(emp => {
      const eData = dataStore.employees.get(emp.dataId);
      return eData ? `
        <div class="card" style="padding:8px;display:flex;align-items:center;gap:8px;">
          <div style="width:36px;height:36px;background:var(--highlight-blue);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:14px;">
            ${eData.name[0]}
          </div>
          <div>
            <div style="font-size:14px;font-weight:bold;">${eData.name} <span style="font-size:11px;color:var(--ink-light);">${ROLE_LABELS[eData.role] || eData.role}</span></div>
            <div style="font-size:11px;color:var(--ink-light);">${'\u2605'.repeat(eData.rarity)}${'\u2606'.repeat(5 - eData.rarity)} | 薪资: ${eData.salary.toLocaleString()}/月</div>
          </div>
        </div>
      ` : '';
    }).join('');

    // 可招募候选人（排除已有的）
    const hiredIds = new Set(state.employees.map(e => e.dataId));
    const candidates = Array.from(dataStore.employees.values())
      .filter(e => !hiredIds.has(e.id));

    const slotsAvailable = state.studio.maxEmployees - state.employees.length;

    const candidateHtml = candidates.length === 0
      ? '<p style="font-size:13px;color:var(--ink-light);">没有更多候选人了</p>'
      : candidates.map(c => {
        const mainStat = c.role === 'PROGRAMMER' ? `编程:${c.baseStats.coding}`
          : c.role === 'ARTIST' ? `美术:${c.baseStats.art}`
          : c.role === 'DESIGNER' ? `策划:${c.baseStats.design}`
          : `编程:${c.baseStats.coding}`;
        const canHire = slotsAvailable > 0;
        return `
          <div class="card" style="padding:10px;${!canHire ? 'opacity:0.5;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:40px;height:40px;background:#e67e22;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:16px;">
                  ${c.name[0]}
                </div>
                <div>
                  <div style="font-size:14px;font-weight:bold;">${c.name} <span style="font-size:11px;color:var(--ink-light);">${ROLE_LABELS[c.role] || c.role}</span></div>
                  <div style="font-size:11px;color:var(--ink-light);">${'\u2605'.repeat(c.rarity)}${'\u2606'.repeat(5 - c.rarity)} | ${mainStat} | 薪资: ${c.salary.toLocaleString()}/月</div>
                  <div style="font-size:11px;color:var(--ink-medium);margin-top:2px;">${c.bio}</div>
                </div>
              </div>
              <button class="btn recruit-btn" data-emp-id="${c.id}" style="font-size:12px;padding:4px 12px;${!canHire ? 'pointer-events:none;' : ''}">
                招募
              </button>
            </div>
          </div>`;
      }).join('');

    container.innerHTML = `
      <div class="screen" style="justify-content:flex-start;padding:24px;overflow-y:auto;">
        <div style="max-width:700px;width:100%;margin:0 auto;">
          <h2 class="title-decoration" style="font-family:var(--font-title);font-size:32px;margin-bottom:8px;text-align:center;">
            \u{1F465} 员工招募
          </h2>
          <p style="text-align:center;font-size:14px;color:var(--ink-light);margin-bottom:16px;">
            团队上限: ${state.employees.length}/${state.studio.maxEmployees} | 剩余名额: <strong>${slotsAvailable}</strong>
          </p>

          <div class="card" style="padding:12px;margin-bottom:16px;">
            <h3 style="font-size:15px;margin-bottom:8px;">当前团队</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              ${currentTeam}
            </div>
          </div>

          <h3 style="font-size:15px;margin-bottom:8px;color:var(--ink-medium);">可招募候选人</h3>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px;">
            ${candidateHtml}
          </div>

          <div style="text-align:center;">
            <button id="btn-start-new-project" class="btn btn-primary" style="font-size:18px;padding:12px 32px;">
              \u{1F3AE} 开始新项目
            </button>
          </div>
        </div>
      </div>
    `;

    // 绑定招募按钮
    container.querySelectorAll('.recruit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = (btn as HTMLElement).dataset.empId!;
        kernel.recruitEmployee(empId);
        this.render(container);
      });
    });

    // 绑定开始新项目
    container.querySelector('#btn-start-new-project')!.addEventListener('click', () => {
      const projectNumber = state.projectNumber + 1;
      kernel.startNewProject('project_indie_puzzle', `第${projectNumber}款游戏`);
    });
  }
}
