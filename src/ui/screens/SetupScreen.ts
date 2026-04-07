// ========================================
// SetupScreen - 初创设定界面
// ========================================

import { kernel } from '../../kernel/GameKernel';
import { Difficulty } from '../../models/types';
import type { EmployeeData } from '../../models/Employee';
import type { Screen } from '../UIManager';

export class SetupScreen implements Screen {
  id = 'setup';

  create(container: HTMLElement): void {
    const dataStore = kernel.getDataStore();
    const allEmployees = Array.from(dataStore.employees.values());
    // 初始可选员工：3星及以下
    const availableEmployees = allEmployees.filter((e) => e.rarity <= 3);
    const selectedIds = new Set<string>();

    container.innerHTML = `
      <div class="screen flow-screen">
        <div class="flow-shell">
          <aside class="flow-side">
            <section class="flow-panel flow-hero">
              <span class="panel-eyebrow" style="color:rgba(255,237,211,0.72);">Studio Genesis</span>
              <h1>创建你的第一间工作室</h1>
              <p>
                开局不是填表，而是定调。工作室名称、难度与初始三人组，会直接决定你第一月的容错、节奏和牌库风格。
              </p>
              <div class="flow-hero-metrics">
                <span class="ops-chip">初始编制 <strong>3 名成员</strong></span>
                <span class="ops-chip">首个目标 <strong>撑过第一月</strong></span>
                <span class="ops-chip">核心约束 <strong>资金 / 体力 / 士气</strong></span>
              </div>
            </section>

            <section class="flow-panel">
              <div class="flow-section-head" style="margin-bottom:10px;">
                <div>
                  <span class="panel-eyebrow">Draft Notes</span>
                  <h3>开局建议</h3>
                </div>
              </div>
              <div class="candidate-meta" style="margin-top:0;">
                <span>先保证至少一名程序和一名美术</span>
                <span>第三人优先补策划或高士气角色</span>
                <span>普通难度最适合先熟悉循环</span>
              </div>
            </section>
          </aside>

          <main class="flow-main">
            <section class="flow-panel">
              <div class="flow-section-head">
                <div>
                  <span class="panel-eyebrow">Studio Profile</span>
                  <h2>设定工作室</h2>
                </div>
                <span class="tag info">Step 1</span>
              </div>

              <div class="flow-input-group" style="margin-bottom:18px;">
                <label for="studio-name">工作室名称</label>
                <input id="studio-name" type="text" value="梦想工坊" />
              </div>

              <div class="flow-input-group">
                <label>难度选择</label>
                <div id="difficulty-group" class="flow-pill-row">
                  <button class="flow-pill-button difficulty-btn" data-diff="EASY">轻松</button>
                  <button class="flow-pill-button difficulty-btn is-active btn-primary" data-diff="NORMAL">普通</button>
                  <button class="flow-pill-button difficulty-btn" data-diff="HARD">困难</button>
                </div>
              </div>
            </section>

            <section class="flow-panel">
              <div class="flow-section-head">
                <div>
                  <span class="panel-eyebrow">Founding Team</span>
                  <h2>选择初始三人组</h2>
                </div>
                <span class="tag info">Step 2</span>
              </div>
              <p class="flow-section-note">从当前候选人里选出 3 人。高星不是唯一答案，团队结构和体力曲线更重要。</p>
              <div id="employee-list" class="selection-grid"></div>
            </section>

            <section class="flow-panel">
              <div class="flow-cta-row">
                <div>
                  <div class="panel-eyebrow">Launch</div>
                  <p id="selection-hint" class="flow-cta-hint">还需选择 3 名成员</p>
                </div>
                <button id="btn-start" class="btn btn-primary" style="min-width:220px;" disabled>
                  开始开发之旅
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    `;

    let selectedDifficulty = Difficulty.NORMAL;

    // 难度按钮
    container.querySelectorAll('.difficulty-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.difficulty-btn').forEach((b) => {
          b.classList.remove('btn-primary', 'active', 'is-active');
        });
        btn.classList.add('btn-primary', 'active', 'is-active');
        selectedDifficulty = (btn as HTMLElement).dataset.diff as Difficulty;
      });
    });

    // 员工列表
    const listEl = container.querySelector('#employee-list')!;
    const btnStart = container.querySelector('#btn-start') as HTMLButtonElement;
    const hint = container.querySelector('#selection-hint')!;

    const roleNames: Record<string, string> = {
      PROGRAMMER: '程序员',
      ARTIST: '美术',
      DESIGNER: '策划',
      QA: '测试',
    };

    const renderEmployees = () => {
      listEl.innerHTML = '';
      availableEmployees.forEach((emp) => {
        const selected = selectedIds.has(emp.id);
        const card = document.createElement('div');
        card.className = `employee-select-card ${selected ? 'is-selected' : ''}`;
        card.innerHTML = this.renderEmployeeCard(emp, roleNames);
        card.onclick = () => {
          if (selected) {
            selectedIds.delete(emp.id);
          } else if (selectedIds.size < 3) {
            selectedIds.add(emp.id);
          }
          updateUI();
        };
        listEl.appendChild(card);
      });
    };

    const updateUI = () => {
      renderEmployees();
      const remaining = 3 - selectedIds.size;
      btnStart.disabled = remaining > 0;
      hint.textContent = remaining > 0 ? `还需选择 ${remaining} 名成员` : '准备就绪！';
    };

    renderEmployees();

    // 开始按钮
    btnStart.onclick = () => {
      const name =
        (container.querySelector('#studio-name') as HTMLInputElement).value.trim() || '梦想工坊';
      kernel.startNewGame(name, selectedDifficulty, Array.from(selectedIds));
      kernel.startProject('project_indie_puzzle', `${name}的第一款游戏`);
    };
  }

  private renderEmployeeCard(emp: EmployeeData, roleNames: Record<string, string>): string {
    const stars = '★'.repeat(emp.rarity) + '☆'.repeat(5 - emp.rarity);
    const mainStat = this.getMainStat(emp);
    return `
      <div class="employee-card-top">
        <div>
          <div class="employee-card-name">${emp.name}</div>
          <div class="employee-card-meta" style="margin-top:8px;">
            <span>${roleNames[emp.role] || emp.role}</span>
            <span>${mainStat}</span>
          </div>
        </div>
        <span class="employee-card-stars">${stars}</span>
      </div>
      <p class="employee-card-bio">${emp.bio || '暂无简介'}</p>
      <div class="employee-card-meta">
        <span>体力 ${emp.baseStats.stamina}</span>
        <span>创意 ${emp.baseStats.creativity}</span>
        <span>月薪 ${emp.salary.toLocaleString()}</span>
      </div>
      <div class="employee-card-traits">
        ${emp.traits
          .filter((t) => !t.hidden)
          .map((t) => `<span class="tag positive">${t.name}</span>`)
          .join('')}
      </div>
    `;
  }

  private getMainStat(emp: EmployeeData): string {
    const s = emp.baseStats;
    switch (emp.role) {
      case 'PROGRAMMER':
        return `编程:${s.coding}`;
      case 'ARTIST':
        return `美术:${s.art}`;
      case 'DESIGNER':
        return `策划:${s.design}`;
      case 'QA':
        return `编程:${s.coding}`;
      default:
        return `综合`;
    }
  }
}
