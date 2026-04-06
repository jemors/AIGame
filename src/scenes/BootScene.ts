// ========================================
// BootScene - Phaser 资源预加载场景
// ========================================

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // MVP 阶段不加载外部资源，使用程序化生成的图形
  }

  create(): void {
    this.scene.start('CombatScene');
  }
}
