// ========================================
// TitleScreen - 标题/主菜单界面
// ========================================

import { kernel } from '../../kernel/GameKernel';
import { GamePhase } from '../../models/types';
import type { Screen } from '../UIManager';

export class TitleScreen implements Screen {
  id = 'title';

  create(container: HTMLElement): void {
    container.innerHTML = `
      <div class="screen" style="background:var(--bg-paper);text-align:center;">
        <div style="max-width:600px;">
          <h1 style="font-family:var(--font-title);font-size:56px;margin-bottom:8px;color:var(--ink-dark);">
            游戏制作人模拟器
          </h1>
          <p style="font-size:18px;color:var(--ink-medium);margin-bottom:48px;font-style:italic;">
            从草台班子到独立游戏之光
          </p>
          <div style="display:flex;flex-direction:column;gap:16px;align-items:center;">
            <button id="btn-new-game" class="btn btn-primary" style="width:200px;font-size:18px;padding:12px;">
              新游戏
            </button>
            <button id="btn-continue" class="btn" style="width:200px;font-size:18px;padding:12px;display:none;">
              继续游戏
            </button>
          </div>
          <p style="margin-top:48px;font-size:12px;color:var(--ink-light);">
            v0.1 MVP | 卡牌肉鸽 x 模拟经营
          </p>
        </div>
      </div>
    `;

    // 检查存档
    if (kernel.hasSave()) {
      const btnContinue = container.querySelector('#btn-continue') as HTMLElement;
      btnContinue.style.display = 'block';
      btnContinue.onclick = () => {
        kernel.loadFromStorage();
        const phase = kernel.getState().phase;
        kernel.transition(phase);
      };
    }

    const btnNew = container.querySelector('#btn-new-game') as HTMLElement;
    btnNew.onclick = () => {
      kernel.transition(GamePhase.SETUP);
    };
  }
}
