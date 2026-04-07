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
    const currentTeam = state.employees
      .map((emp) => {
        const eData = dataStore.employees.get(emp.dataId);
        return eData
          ? `
        <div class="team-mini-card">
          <div class="employee-avatar">
            ${eData.name[0]}
          </div>
          <div>
            <div class="candidate-name">${eData.name} <span style="font-size:11px;color:var(--ink-light);">${ROLE_LABELS[eData.role] || eData.role}</span></div>
            <div class="candidate-subline">${'\u2605'.repeat(eData.rarity)}${'\u2606'.repeat(5 - eData.rarity)} | 薪资 ${eData.salary.toLocaleString()}/月</div>
          </div>
        </div>
      `
          : '';
      })
      .join('');

    // 可招募候选人（排除已有的）
    const hiredIds = new Set(state.employees.map((e) => e.dataId));
    const candidates = Array.from(dataStore.employees.values()).filter((e) => !hiredIds.has(e.id));

    const slotsAvailable = state.studio.maxEmployees - state.employees.length;

    const candidateHtml =
      candidates.length === 0
        ? '<p style="font-size:13px;color:var(--ink-light);">没有更多候选人了</p>'
        : candidates
            .map((c) => {
              const mainStat =
                c.role === 'PROGRAMMER'
                  ? `编程:${c.baseStats.coding}`
                  : c.role === 'ARTIST'
                    ? `美术:${c.baseStats.art}`
                    : c.role === 'DESIGNER'
                      ? `策划:${c.baseStats.design}`
                      : `编程:${c.baseStats.coding}`;
              const canHire = slotsAvailable > 0;
              return `
          <div class="candidate-card ${!canHire ? 'is-disabled' : ''}">
            <div class="candidate-card-top">
              <div class="candidate-main">
                <div class="employee-avatar is-candidate">
                  ${c.name[0]}
                </div>
                <div>
                  <div class="candidate-name">${c.name} <span style="font-size:11px;color:var(--ink-light);">${ROLE_LABELS[c.role] || c.role}</span></div>
                  <div class="candidate-subline">${'\u2605'.repeat(c.rarity)}${'\u2606'.repeat(5 - c.rarity)} | ${mainStat} | 薪资 ${c.salary.toLocaleString()}/月</div>
                </div>
              </div>
              <button class="btn recruit-btn" data-emp-id="${c.id}" style="font-size:12px;padding:8px 16px;${!canHire ? 'pointer-events:none;' : ''}">
                招募
              </button>
            </div>
            <div class="candidate-bio">${c.bio || '暂无简介'}</div>
            <div class="candidate-meta">
              <span>体力 ${c.baseStats.stamina}</span>
              <span>创意 ${c.baseStats.creativity}</span>
              <span>忠诚 ${c.baseStats.loyalty}</span>
            </div>
          </div>`;
            })
            .join('');

    container.innerHTML = `
      <div class="screen flow-screen">
        <div class="flow-shell">
          <aside class="flow-side">
            <section class="flow-panel flow-hero">
              <span class="panel-eyebrow" style="color:rgba(255,237,211,0.72);">Hiring Window</span>
              <h1>员工招募</h1>
              <p>
                项目间歇的招募决定下一轮项目的节奏。先看当前团队缺口，再决定是补短板、拉高上限，还是维持成本结构。
              </p>
              <div class="flow-hero-metrics">
                <span class="ops-chip">团队人数 <strong>${state.employees.length}/${state.studio.maxEmployees}</strong></span>
                <span class="ops-chip">剩余名额 <strong>${slotsAvailable}</strong></span>
                <span class="ops-chip">当前项目数 <strong>${state.projectNumber}</strong></span>
              </div>
            </section>

            <section class="flow-panel">
              <div class="flow-section-head" style="margin-bottom:10px;">
                <div>
                  <span class="panel-eyebrow">Hiring Heuristics</span>
                  <h3>招聘建议</h3>
                </div>
              </div>
              <div class="candidate-meta" style="margin-top:0;">
                <span>优先补足缺少的核心职能</span>
                <span>高薪成员要配得上长期收益</span>
                <span>不要让团队上限卡死后续灵活性</span>
              </div>
            </section>
          </aside>

          <main class="flow-main">
            <section class="flow-panel">
              <div class="flow-section-head">
                <div>
                  <span class="panel-eyebrow">Current Roster</span>
                  <h2>当前团队</h2>
                </div>
                <span class="tag info">现有编制</span>
              </div>
              <div class="team-grid">
                ${currentTeam}
              </div>
            </section>

            <section class="flow-panel">
              <div class="flow-section-head">
                <div>
                  <span class="panel-eyebrow">Candidates</span>
                  <h2>可招募候选人</h2>
                </div>
                <span class="tag info">候选池</span>
              </div>
              <div class="candidate-list">
                ${candidateHtml}
              </div>
            </section>

            <section class="flow-panel">
              <div class="flow-cta-row">
                <div>
                  <div class="panel-eyebrow">Next Project</div>
                  <p class="flow-cta-hint">团队调整完成后，进入下一款游戏的项目循环。</p>
                </div>
                <button id="btn-start-new-project" class="btn btn-primary" style="min-width:240px;">
                  \u{1F3AE} 开始新项目
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    `;

    // 绑定招募按钮
    container.querySelectorAll('.recruit-btn').forEach((btn) => {
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
