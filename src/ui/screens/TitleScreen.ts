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
      <div class="screen title-screen">
        <div class="title-backdrop"></div>
        <div class="title-overlay"></div>
        <div class="title-stage">
          <section class="title-brand">
            <span class="title-kicker">Indie Studio Roguelike</span>
            <h1>游戏制作人模拟器</h1>
            <p class="title-tagline">
              把一间混乱的小工作室，做成能撑过每周对战、月末 Boss 与市场考验的独立游戏团队。
            </p>
            <div class="title-actions">
              <button id="btn-new-game" class="btn btn-primary">
                开始新项目
              </button>
              <button id="btn-continue" class="btn" style="display:none;">
                读取存档
              </button>
            </div>
            <p class="title-meta">
              卡牌构筑、团队经营、项目推进与 Boss 战被压进同一条时间线里。每个决定都会改变你的牌库、团队状态和最后的发布窗口。
            </p>
          </section>

          <aside class="title-side">
            <div class="title-side-block">
              <h2>Core Loop</h2>
              <ul class="title-beats">
                <li>
                  <strong>组建工作室</strong>
                  <span>在预算和星级之间选出第一批关键成员。</span>
                </li>
                <li>
                  <strong>推进项目</strong>
                  <span>把白天的经营决策转成卡牌、进度与团队状态。</span>
                </li>
                <li>
                  <strong>挑战 Boss</strong>
                  <span>在周战和月末战里验证你的构筑是否真的成立。</span>
                </li>
              </ul>
              <p class="title-version">v0.1 MVP · 卡牌肉鸽 × 模拟经营</p>
            </div>
          </aside>
        </div>
      </div>
    `;

    // 检查存档
    if (kernel.hasSave()) {
      const btnContinue = container.querySelector('#btn-continue') as HTMLElement;
      btnContinue.style.display = 'inline-flex';
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
