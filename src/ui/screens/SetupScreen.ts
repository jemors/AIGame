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
    const availableEmployees = allEmployees.filter(e => e.rarity <= 3);
    const selectedIds = new Set<string>();

    container.innerHTML = `
      <div class="screen" style="justify-content:flex-start;padding-top:40px;overflow-y:auto;">
        <div style="max-width:700px;width:100%;">
          <h2 class="title-decoration" style="font-family:var(--font-title);font-size:36px;margin-bottom:32px;">
            创建工作室
          </h2>

          <div style="margin-bottom:24px;">
            <label style="font-size:14px;color:var(--ink-medium);display:block;margin-bottom:6px;">工作室名称</label>
            <input id="studio-name" type="text" value="梦想工坊" style="
              width:100%;padding:10px 14px;font-size:16px;font-family:var(--font-body);
              border:2px solid var(--pencil-line);border-radius:3px;background:var(--bg-card);
              outline:none;
            " />
          </div>

          <div style="margin-bottom:24px;">
            <label style="font-size:14px;color:var(--ink-medium);display:block;margin-bottom:6px;">难度选择</label>
            <div id="difficulty-group" style="display:flex;gap:12px;">
              <button class="btn difficulty-btn" data-diff="EASY">轻松</button>
              <button class="btn btn-primary difficulty-btn active" data-diff="NORMAL">普通</button>
              <button class="btn difficulty-btn" data-diff="HARD">困难</button>
            </div>
          </div>

          <div style="margin-bottom:24px;">
            <label style="font-size:14px;color:var(--ink-medium);display:block;margin-bottom:10px;">
              选择初始团队成员（选3人）
            </label>
            <div id="employee-list" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"></div>
          </div>

          <div style="text-align:center;margin-top:24px;margin-bottom:40px;">
            <button id="btn-start" class="btn btn-primary" style="width:200px;font-size:18px;padding:12px;" disabled>
              开始开发之旅
            </button>
            <p id="selection-hint" style="font-size:13px;color:var(--ink-light);margin-top:8px;">
              还需选择 3 名成员
            </p>
          </div>
        </div>
      </div>
    `;

    let selectedDifficulty = Difficulty.NORMAL;

    // 难度按钮
    container.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.difficulty-btn').forEach(b => {
          b.classList.remove('btn-primary', 'active');
        });
        btn.classList.add('btn-primary', 'active');
        selectedDifficulty = (btn as HTMLElement).dataset.diff as Difficulty;
      });
    });

    // 员工列表
    const listEl = container.querySelector('#employee-list')!;
    const btnStart = container.querySelector('#btn-start') as HTMLButtonElement;
    const hint = container.querySelector('#selection-hint')!;

    const roleNames: Record<string, string> = {
      PROGRAMMER: '程序员', ARTIST: '美术', DESIGNER: '策划', QA: '测试',
    };

    const renderEmployees = () => {
      listEl.innerHTML = '';
      availableEmployees.forEach(emp => {
        const selected = selectedIds.has(emp.id);
        const card = document.createElement('div');
        card.className = `card ${selected ? 'selected' : ''}`;
        card.style.cssText = `cursor:pointer;${selected ? 'border-color:var(--highlight-green);background:#f0f8f0;' : ''}`;
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
      const name = (container.querySelector('#studio-name') as HTMLInputElement).value.trim() || '梦想工坊';
      kernel.startNewGame(name, selectedDifficulty, Array.from(selectedIds));
      kernel.startProject('project_indie_puzzle', `${name}的第一款游戏`);
    };
  }

  private renderEmployeeCard(emp: EmployeeData, roleNames: Record<string, string>): string {
    const stars = '★'.repeat(emp.rarity) + '☆'.repeat(5 - emp.rarity);
    const mainStat = this.getMainStat(emp);
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <strong style="font-size:16px;">${emp.name}</strong>
          <span class="tag info" style="margin-left:6px;">${roleNames[emp.role] || emp.role}</span>
        </div>
        <span style="color:var(--highlight-yellow);font-size:12px;">${stars}</span>
      </div>
      <p style="font-size:12px;color:var(--ink-light);margin:6px 0;">${emp.bio || ''}</p>
      <div style="font-size:13px;color:var(--ink-medium);">
        ${mainStat} | 体力:${emp.baseStats.stamina} | 月薪:${emp.salary}
      </div>
      ${emp.traits.filter(t => !t.hidden).map(t =>
        `<span class="tag positive" style="margin-top:6px;margin-right:4px;">${t.name}</span>`
      ).join('')}
    `;
  }

  private getMainStat(emp: EmployeeData): string {
    const s = emp.baseStats;
    switch (emp.role) {
      case 'PROGRAMMER': return `编程:${s.coding}`;
      case 'ARTIST': return `美术:${s.art}`;
      case 'DESIGNER': return `策划:${s.design}`;
      case 'QA': return `编程:${s.coding}`;
      default: return `综合`;
    }
  }
}
