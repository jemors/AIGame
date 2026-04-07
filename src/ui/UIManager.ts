// ========================================
// UIManager - DOM UI 界面切换调度器
// ========================================

import { eventBus, Events } from '../kernel/EventBus';
import { GamePhase } from '../models/types';

export interface Screen {
  id: string;
  create(container: HTMLElement): void;
  update?(): void;
  destroy?(): void;
}

export class UIManager {
  private container: HTMLElement;
  private screens = new Map<string, Screen>();
  private activeScreenId: string | null = null;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;

    // 监听阶段变化自动切换界面
    eventBus.on(Events.PHASE_CHANGED, (phase: unknown) => {
      this.onPhaseChanged(phase as GamePhase);
    });
  }

  registerScreen(screen: Screen): void {
    this.screens.set(screen.id, screen);
  }

  showScreen(screenId: string): void {
    // 销毁当前界面
    if (this.activeScreenId) {
      const current = this.screens.get(this.activeScreenId);
      current?.destroy?.();
    }

    // 清空容器
    this.container.innerHTML = '';

    // 创建新界面
    const screen = this.screens.get(screenId);
    if (!screen) {
      console.warn(`[UIManager] Screen "${screenId}" not found`);
      return;
    }

    screen.create(this.container);
    this.activeScreenId = screenId;
    eventBus.emit(Events.UI_SCREEN_CHANGE, screenId);
  }

  updateCurrentScreen(): void {
    if (this.activeScreenId) {
      this.screens.get(this.activeScreenId)?.update?.();
    }
  }

  private onPhaseChanged(phase: GamePhase): void {
    const screenMap: Record<string, string> = {
      [GamePhase.TITLE]: 'title',
      [GamePhase.SETUP]: 'setup',
      [GamePhase.DAILY]: 'daily',
      [GamePhase.MONTH_END]: 'month-end',
      [GamePhase.COMBAT]: 'combat-bridge',
      [GamePhase.MONTH_RESULT]: 'month-result',
      [GamePhase.WEEK_RESULT]: 'week-result',
      [GamePhase.CARD_SELECTION]: 'card-selection',
      [GamePhase.EQUIPMENT_SELECTION]: 'equipment-selection',
      [GamePhase.PROJECT_RESULT]: 'project-result',
      [GamePhase.SHOP]: 'shop',
      [GamePhase.RECRUIT]: 'recruit',
    };
    const screenId = screenMap[phase];
    if (screenId && this.screens.has(screenId)) {
      this.showScreen(screenId);
    }
  }

  // 显示对话框覆盖层
  showDialog(
    title: string,
    content: string,
    choices?: { text: string; callback: () => void }[],
  ): void {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay fade-in';

    const box = document.createElement('div');
    box.className = 'dialog-box slide-up';
    box.innerHTML = `<h3 class="title-decoration">${title}</h3><p style="margin-bottom:16px;line-height:1.8">${content}</p>`;

    if (choices && choices.length > 0) {
      const btnGroup = document.createElement('div');
      btnGroup.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      choices.forEach((choice) => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = choice.text;
        btn.onclick = () => {
          overlay.remove();
          choice.callback();
          eventBus.emit(Events.UI_DIALOG_HIDE);
        };
        btnGroup.appendChild(btn);
      });
      box.appendChild(btnGroup);
    } else {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = '确定';
      btn.onclick = () => {
        overlay.remove();
        eventBus.emit(Events.UI_DIALOG_HIDE);
      };
      box.appendChild(btn);
    }

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    eventBus.emit(Events.UI_DIALOG_SHOW);
  }

  // 显示顶部通知
  showNotification(text: string, type: 'info' | 'success' | 'warning' = 'info'): void {
    const notif = document.createElement('div');
    const colors = {
      info: 'var(--highlight-blue)',
      success: 'var(--highlight-green)',
      warning: 'var(--highlight-red)',
    };
    notif.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      padding:10px 24px;border:2px solid ${colors[type]};border-radius:4px;
      background:var(--bg-card);color:${colors[type]};font-family:var(--font-body);
      z-index:300;animation:slideUp 0.3s ease-out;box-shadow:2px 2px 0 rgba(0,0,0,0.1);
    `;
    notif.textContent = text;
    document.body.appendChild(notif);
    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transition = 'opacity 0.3s';
      setTimeout(() => notif.remove(), 300);
    }, 2000);
  }
}
