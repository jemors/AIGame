// ========================================
// 游戏制作人模拟器 - 应用入口
// ========================================

import { kernel } from './kernel/GameKernel';
import { eventBus, Events } from './kernel/EventBus';
import { GamePhase } from './models/types';
import { loadAllGameData } from './dataLoader';
import { UIManager } from './ui/UIManager';
import { eventSystem } from './systems/EventSystem';
import { soundManager } from './systems/SoundManager';

// 界面
import { TitleScreen } from './ui/screens/TitleScreen';
import { SetupScreen } from './ui/screens/SetupScreen';
import { DailyScreen } from './ui/screens/DailyScreen';
import { MonthEndScreen } from './ui/screens/MonthEndScreen';
import { CombatBridgeScreen } from './ui/screens/CombatBridgeScreen';
import { MonthResultScreen } from './ui/screens/MonthResultScreen';
import { ProjectResultScreen } from './ui/screens/ProjectResultScreen';
import { WeekResultScreen } from './ui/screens/WeekResultScreen';
import { CardSelectionScreen } from './ui/screens/CardSelectionScreen';
import { EquipmentSelectionScreen } from './ui/screens/EquipmentSelectionScreen';
import { ShopScreen } from './ui/screens/ShopScreen';
import { RecruitScreen } from './ui/screens/RecruitScreen';

function init(): void {
  console.log('[GameDevSimulator] Initializing...');

  // 1. 加载游戏数据
  loadAllGameData();

  // 2. 初始化 UI 管理器
  const ui = new UIManager('app');

  // 3. 注册所有界面
  ui.registerScreen(new TitleScreen());
  ui.registerScreen(new SetupScreen());
  ui.registerScreen(new DailyScreen());
  ui.registerScreen(new MonthEndScreen());
  ui.registerScreen(new CombatBridgeScreen());
  ui.registerScreen(new MonthResultScreen());
  ui.registerScreen(new ProjectResultScreen());
  ui.registerScreen(new WeekResultScreen());
  ui.registerScreen(new CardSelectionScreen());
  ui.registerScreen(new EquipmentSelectionScreen());
  ui.registerScreen(new ShopScreen());
  ui.registerScreen(new RecruitScreen());

  // 4. 初始化音效系统
  soundManager.init();

  // 5. 监听阶段变化时的自动保存
  eventBus.on(Events.PHASE_CHANGED, (phase: unknown) => {
    const p = phase as GamePhase;
    if (p !== GamePhase.TITLE && p !== GamePhase.COMBAT) {
      kernel.saveToStorage();
    }
  });

  // 6. 监听日常阶段变化时刷新界面
  eventBus.on(Events.TIME_SLOT_CHANGED, () => {
    ui.updateCurrentScreen();
  });

  eventBus.on(Events.DAY_STARTED, () => {
    const state = kernel.getState();
    if (state.phase === GamePhase.DAILY) {
      // 检查事件触发
      const evt = eventSystem.checkTriggers();
      if (evt) {
        // 显示事件对话框
        showEventDialog(ui, evt);
      }
      ui.showScreen('daily');
    }
  });

  // 7. 对战结束后回到 DOM 界面
  eventBus.on(Events.COMBAT_ENDED, () => {
    const phaserContainer = document.getElementById('phaser-container');
    if (phaserContainer) phaserContainer.style.display = 'none';
  });

  // 8. 显示标题画面
  kernel.transition(GamePhase.TITLE);

  console.log('[GameDevSimulator] Ready!');
}

// 显示事件对话框（逐阶段）
function showEventDialog(ui: UIManager, evt: import('./models/GameEvent').GameEventData): void {
  let phaseIndex = 0;

  const showPhase = () => {
    if (phaseIndex >= evt.phases.length) {
      // 所有阶段完成，应用基础效果
      eventSystem.applyEventEffects(evt);
      eventSystem.clearPendingEvent();
      return;
    }

    const phase = evt.phases[phaseIndex];
    const title = phaseIndex === 0 ? evt.name : '';
    const speaker = phase.speaker ? `【${phase.speaker}】` : '';
    const content = `${speaker}${phase.text}`;

    if (phase.choices && phase.choices.length > 0) {
      ui.showDialog(
        title,
        content,
        phase.choices.map((choice) => ({
          text: choice.text,
          callback: () => {
            eventSystem.applyChoiceEffects(choice);
            phaseIndex++;
            showPhase();
          },
        })),
      );
    } else {
      ui.showDialog(title, content, [
        {
          text: '继续',
          callback: () => {
            phaseIndex++;
            showPhase();
          },
        },
      ]);
    }
  };

  showPhase();
}

// 启动
document.addEventListener('DOMContentLoaded', init);
