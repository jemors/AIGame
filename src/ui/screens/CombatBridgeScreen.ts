// ========================================
// CombatBridgeScreen - 对战桥接
// 负责启动 Phaser 游戏实例进入对战场景
// ========================================

import Phaser from 'phaser';
import { BootScene } from '../../scenes/BootScene';
import { CombatScene } from '../../scenes/CombatScene';
import type { Screen } from '../UIManager';

let phaserGame: Phaser.Game | null = null;

export class CombatBridgeScreen implements Screen {
  id = 'combat-bridge';

  create(container: HTMLElement): void {
    // 隐藏 DOM UI
    container.innerHTML = '<div class="screen" style="background:var(--bg-paper);"></div>';

    // 显示 Phaser 容器
    const phaserContainer = document.getElementById('phaser-container')!;
    phaserContainer.style.display = 'block';

    // 如果已有 Phaser 实例，先销毁
    if (phaserGame) {
      phaserGame.destroy(true);
      phaserGame = null;
    }

    // 创建 Phaser 游戏
    phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'phaser-container',
      width: 960,
      height: 640,
      backgroundColor: '#f5f0e8',
      scene: [BootScene, CombatScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        pixelArt: false,
        antialias: true,
      },
    });
  }

  destroy(): void {
    if (phaserGame) {
      phaserGame.destroy(true);
      phaserGame = null;
    }
    const phaserContainer = document.getElementById('phaser-container');
    if (phaserContainer) {
      phaserContainer.style.display = 'none';
      phaserContainer.innerHTML = '';
    }
  }
}
