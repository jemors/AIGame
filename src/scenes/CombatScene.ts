// ========================================
// CombatScene - Phaser 卡牌对战渲染场景
// 增强版：卡牌交互、敌人动画、牌库查看、敌人信息
// ========================================

import Phaser from 'phaser';
import { combatManager } from '../combat/CombatManager';
import { kernel } from '../kernel/GameKernel';
import { eventBus, Events } from '../kernel/EventBus';
import type { CardData, CardInstance } from '../models/Card';
import type { EnemyData, EnemyInstance } from '../models/Enemy';

const W = 960;
const H = 640;

const COLORS = {
  bg: 0xf5f0e8,
  cardBg: 0xfffdf7,
  cardBorder: 0x3a3a3a,
  attack: 0xcc4444,
  skill: 0x4488aa,
  power: 0xbb8833,
  status: 0x888888,
  heal: 0x44aa66,
  hp: 0xcc4444,
  hpBg: 0x442222,
  block: 0x4488aa,
  energy: 0xddaa33,
  enemyBg: 0x553333,
  highlight: 0xf0d060,
  victoryGold: 0xffd700,
  defeatRed: 0x880000,
};

const TYPE_COLORS: Record<string, string> = {
  ATTACK: '#cc4444',
  SKILL: '#4488aa',
  POWER: '#bb8833',
  STATUS: '#888888',
  HEAL: '#44aa66',
};

const TYPE_LABELS: Record<string, string> = {
  ATTACK: '攻击',
  HEAL: '恢复',
  SKILL: '技能',
  POWER: '能力',
  STATUS: '状态',
};

export class CombatScene extends Phaser.Scene {
  private cardSprites: Phaser.GameObjects.Container[] = [];
  private enemyContainers: Phaser.GameObjects.Container[] = [];
  private uiTexts: Record<string, Phaser.GameObjects.Text> = {};
  private targetHintText: Phaser.GameObjects.Text | null = null;
  private hpFillRect!: Phaser.GameObjects.Rectangle;
  private endTurnBtn!: Phaser.GameObjects.Container;
  private selectedCardIndex = -1;
  private isAnimating = false;
  private eventHandlers: Array<{ event: string; handler: (...args: unknown[]) => void }> = [];
  private playerBuffsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'CombatScene' });
  }

  create(): void {
    // 修复高DPI屏幕下文字模糊：覆盖text工厂，自动设置高分辨率
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const origAddText = this.add.text.bind(this.add);
    const patchedAddText = (
      x: number, y: number,
      text: string | string[],
      style?: Phaser.Types.GameObjects.Text.TextStyle,
    ): Phaser.GameObjects.Text => {
      const t = origAddText(x, y, text, style);
      t.setResolution(dpr);
      return t;
    };
    this.add.text = patchedAddText as typeof this.add.text;

    combatManager.initCombat();
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.isAnimating = false;
    this.selectedCardIndex = -1;
    this.eventHandlers = [];

    this.drawBattleField();
    this.createUI();
    this.renderAll();
    this.setupEventListeners();

    // 开场动画
    this.cameras.main.fadeIn(400);
  }

  // ==================== 背景布局 ====================

  private drawBattleField(): void {
    // 敌人区域
    this.add.rectangle(W / 2, 120, W - 40, 200, 0xe8e3db, 0.4)
      .setStrokeStyle(1, 0xcccccc);
    // 分隔线
    const line = this.add.graphics();
    line.lineStyle(1, 0x3a3a3a, 0.3);
    line.lineBetween(30, 260, W - 30, 260);
    // 手牌区域
    this.add.rectangle(W / 2, H - 100, W - 40, 190, 0xeae5dd, 0.3)
      .setStrokeStyle(1, 0xcccccc);
  }

  // ==================== UI 创建 ====================

  private createUI(): void {
    // 项目健康度标签
    this.uiTexts.hpLabel = this.add.text(30, 8, '', {
      fontSize: '15px', color: '#cc4444', fontFamily: 'Courier New',
    });
    // HP 条背景
    this.add.rectangle(30, 34, 200, 12, COLORS.hpBg).setOrigin(0, 0.5);
    this.hpFillRect = this.add.rectangle(30, 34, 200, 12, COLORS.hp).setOrigin(0, 0.5);

    // 护甲
    this.uiTexts.block = this.add.text(250, 8, '', {
      fontSize: '15px', color: '#4488aa', fontFamily: 'Courier New',
    });

    // Buff 显示
    this.playerBuffsText = this.add.text(250, 28, '', {
      fontSize: '11px', color: '#666', fontFamily: 'Arial',
    });

    // 能量（左下角大字）
    this.uiTexts.energy = this.add.text(40, H - 210, '', {
      fontSize: '32px', color: '#ddaa33', fontFamily: 'Courier New', fontStyle: 'bold',
    });

    // 牌库计数（可点击）
    this.uiTexts.drawPile = this.add.text(30, H - 25, '', {
      fontSize: '13px', color: '#555', fontFamily: 'Courier New',
    }).setInteractive({ useHandCursor: true });
    this.uiTexts.drawPile.on('pointerdown', () => this.showPileViewer('drawPile'));
    this.uiTexts.drawPile.on('pointerover', () => this.uiTexts.drawPile.setColor('#2266aa'));
    this.uiTexts.drawPile.on('pointerout', () => this.uiTexts.drawPile.setColor('#555'));

    // 弃牌堆计数（可点击）
    this.uiTexts.discardPile = this.add.text(W - 140, H - 25, '', {
      fontSize: '13px', color: '#555', fontFamily: 'Courier New',
    }).setInteractive({ useHandCursor: true });
    this.uiTexts.discardPile.on('pointerdown', () => this.showPileViewer('discardPile'));
    this.uiTexts.discardPile.on('pointerover', () => this.uiTexts.discardPile.setColor('#2266aa'));
    this.uiTexts.discardPile.on('pointerout', () => this.uiTexts.discardPile.setColor('#555'));

    // 消耗堆计数（可点击）
    this.uiTexts.exhaustPile = this.add.text(W / 2 - 40, H - 25, '', {
      fontSize: '13px', color: '#555', fontFamily: 'Courier New',
    }).setInteractive({ useHandCursor: true });
    this.uiTexts.exhaustPile.on('pointerdown', () => this.showPileViewer('exhaustPile'));
    this.uiTexts.exhaustPile.on('pointerover', () => this.uiTexts.exhaustPile.setColor('#2266aa'));
    this.uiTexts.exhaustPile.on('pointerout', () => this.uiTexts.exhaustPile.setColor('#555'));

    // 回合数
    this.uiTexts.turn = this.add.text(W / 2, 8, '', {
      fontSize: '13px', color: '#888', fontFamily: 'Courier New',
    }).setOrigin(0.5, 0);

    // 结束回合按钮
    this.endTurnBtn = this.add.container(W - 80, H - 215);
    const btnBg = this.add.rectangle(0, 0, 120, 42, COLORS.highlight)
      .setStrokeStyle(2, COLORS.cardBorder);
    const btnText = this.add.text(0, 0, '结束回合', {
      fontSize: '15px', color: '#2c2c2c', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.endTurnBtn.add([btnBg, btnText]);
    this.endTurnBtn.setSize(120, 42);
    this.endTurnBtn.setInteractive({ useHandCursor: true });
    this.endTurnBtn.on('pointerdown', () => {
      if (!this.isAnimating) this.onEndTurn();
    });
    this.endTurnBtn.on('pointerover', () => {
      btnBg.setFillStyle(0xf5dd77);
      this.tweens.add({ targets: this.endTurnBtn, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });
    this.endTurnBtn.on('pointerout', () => {
      btnBg.setFillStyle(COLORS.highlight);
      this.tweens.add({ targets: this.endTurnBtn, scaleX: 1, scaleY: 1, duration: 100 });
    });
  }

  // ==================== 渲染 ====================

  private renderAll(): void {
    const cs = combatManager.getState();
    if (!cs) return;
    this.renderEnemies(cs.enemies);
    this.renderHand(cs.hand);
    this.updateUI();
  }

  private updateUI(): void {
    const cs = combatManager.getState();
    if (!cs) return;

    this.uiTexts.hpLabel.setText(`项目HP: ${cs.playerHp}/${cs.playerMaxHp}`);
    const hpRatio = Math.max(0, cs.playerHp / cs.playerMaxHp);
    this.hpFillRect.width = 200 * hpRatio;
    if (hpRatio < 0.3) this.hpFillRect.setFillStyle(0xff3333);
    else if (hpRatio < 0.6) this.hpFillRect.setFillStyle(0xdd8833);
    else this.hpFillRect.setFillStyle(COLORS.hp);

    this.uiTexts.block.setText(cs.playerBlock > 0 ? `护甲: ${cs.playerBlock}` : '');
    this.uiTexts.energy.setText(`${cs.energy}/${cs.maxEnergy}`);
    this.uiTexts.drawPile.setText(`[牌库 ${cs.drawPile.length}]`);
    this.uiTexts.discardPile.setText(`[弃牌 ${cs.discardPile.length}]`);
    this.uiTexts.exhaustPile.setText(cs.exhaustPile.length > 0 ? `[消耗 ${cs.exhaustPile.length}]` : '');
    this.uiTexts.turn.setText(`回合 ${cs.turn}`);

    // Buff 列表
    const buffStrs = cs.playerBuffs.map(b => {
      const bd = kernel.getDataStore().buffs.get(b.dataId);
      if (!bd) return '';
      const icon = bd.type === 'POSITIVE' ? '+' : '-';
      return `${icon}${bd.name}${b.stacks > 1 ? 'x' + b.stacks : ''}`;
    }).filter(Boolean);
    this.playerBuffsText.setText(buffStrs.join('  '));
  }

  // ==================== 敌人渲染 ====================

  private renderEnemies(enemies: EnemyInstance[]): void {
    this.enemyContainers.forEach(c => c.destroy());
    this.enemyContainers = [];

    const alive = enemies.filter(e => e.hp > 0);
    if (alive.length === 0) return;

    const spacing = Math.min(220, (W - 120) / alive.length);
    const startX = W / 2 - (alive.length - 1) * spacing / 2;

    let aliveIdx = 0;
    enemies.forEach((enemy, realIndex) => {
      if (enemy.hp <= 0) return;
      const eData = kernel.getDataStore().enemies.get(enemy.dataId);
      if (!eData) return;

      const x = startX + aliveIdx * spacing;
      const y = 130;
      aliveIdx++;

      const container = this.add.container(x, y);

      // 身体
      const body = this.add.circle(0, 0, 44, COLORS.enemyBg);
      body.setStrokeStyle(2, COLORS.cardBorder);

      // 首字
      const initial = this.add.text(0, -2, eData.name[0], {
        fontSize: '30px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);

      // 名字
      const nameText = this.add.text(0, 54, eData.name, {
        fontSize: '13px', color: '#2c2c2c', fontFamily: 'Arial',
      }).setOrigin(0.5);

      // HP条
      this.add.rectangle(0, 72, 90, 10, COLORS.hpBg).setOrigin(0.5);
      const hpRatio = enemy.hp / enemy.maxHp;
      const hpFill = this.add.rectangle(-45 * (1 - hpRatio), 72, 90 * hpRatio, 10,
        hpRatio > 0.5 ? COLORS.hp : 0xff5533).setOrigin(0, 0.5);

      const hpText = this.add.text(0, 86, `${enemy.hp}/${enemy.maxHp}`, {
        fontSize: '11px', color: '#cc4444', fontFamily: 'Courier New',
      }).setOrigin(0.5);

      container.add([body, initial, nameText, hpFill, hpText]);

      // 护甲
      if (enemy.block > 0) {
        const blockBg = this.add.circle(48, -28, 14, COLORS.block, 0.8);
        const blockTxt = this.add.text(48, -28, `${enemy.block}`, {
          fontSize: '12px', color: '#fff', fontFamily: 'Courier New', fontStyle: 'bold',
        }).setOrigin(0.5);
        container.add([blockBg, blockTxt]);
      }

      // 意图（上方气泡）
      const intent = combatManager.getEnemyIntent(realIndex);
      if (intent) {
        const intentBubble = this.add.rectangle(0, -70, 60, 28, 0xffffff, 0.9)
          .setStrokeStyle(1, 0xaaaaaa);
        const intentIcon = intent.type === 'ATTACK' ? '⚔' :
                          intent.type === 'DEFEND' ? '🛡' :
                          intent.type === 'BUFF_SELF' ? '💪' : '☠';
        const intentTxt = this.add.text(0, -70, `${intentIcon}${intent.value}`, {
          fontSize: '13px', color: intent.type === 'ATTACK' ? '#cc3333' : '#3366aa',
          fontFamily: 'Courier New', fontStyle: 'bold',
        }).setOrigin(0.5);
        container.add([intentBubble, intentTxt]);
      }

      // Buff 显示
      if (enemy.buffs.length > 0) {
        const buffStr = enemy.buffs.map(b => {
          const bd = kernel.getDataStore().buffs.get(b.dataId);
          return bd ? `${bd.name}${b.stacks > 1 ? 'x' + b.stacks : ''}` : '';
        }).filter(Boolean).join(' ');
        if (buffStr) {
          container.add(this.add.text(0, 100, buffStr, {
            fontSize: '10px', color: '#888', fontFamily: 'Arial',
          }).setOrigin(0.5));
        }
      }

      // 交互：点击敌人
      body.setInteractive({ useHandCursor: true });
      body.on('pointerdown', () => {
        if (this.isAnimating) return;
        if (this.selectedCardIndex >= 0) {
          this.playSelectedCard(realIndex);
        } else {
          // 无选中卡牌时点击敌人，显示敌人信息
          this.showEnemyInfo(enemy, eData);
        }
      });
      body.on('pointerover', () => {
        if (this.selectedCardIndex >= 0) body.setStrokeStyle(3, COLORS.highlight);
      });
      body.on('pointerout', () => body.setStrokeStyle(2, COLORS.cardBorder));

      this.enemyContainers.push(container);
    });
  }

  // ==================== 手牌渲染 ====================

  private renderHand(hand: CardInstance[]): void {
    this.cardSprites.forEach(c => c.destroy());
    this.cardSprites = [];
    this.selectedCardIndex = -1;
    if (hand.length === 0) return;

    const cardW = 105;
    const cardH = 145;
    const maxTotalWidth = W - 200;
    const overlap = Math.max(cardW * 0.3, cardW - (maxTotalWidth / hand.length));
    const effectiveSpacing = cardW - overlap;
    const totalWidth = effectiveSpacing * (hand.length - 1) + cardW;
    const startX = (W - totalWidth) / 2 + cardW / 2;
    const baseY = H - 90;

    const cs = combatManager.getState()!;

    hand.forEach((card, i) => {
      const cardData = kernel.getDataStore().cards.get(card.dataId);
      if (!cardData) return;

      const x = startX + i * effectiveSpacing;
      // 扇形微弧度
      const midIdx = (hand.length - 1) / 2;
      const offsetFromMid = i - midIdx;
      const yOffset = Math.abs(offsetFromMid) * 3;
      const rotation = offsetFromMid * 0.02;
      const y = baseY + yOffset;

      const container = this.createCardVisual(cardData, x, y, cardW, cardH, i, cs.energy);
      container.setRotation(rotation);
      container.setDepth(i);
      this.cardSprites.push(container);
    });
  }

  private createCardVisual(
    cardData: CardData, x: number, y: number,
    w: number, h: number, index: number, currentEnergy: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const canPlay = !cardData.unplayable && currentEnergy >= cardData.cost;

    const isHeal = cardData.effects.some(e => e.type === 'HEAL');
    const typeColor = isHeal ? COLORS.heal :
                      cardData.type === 'ATTACK' ? COLORS.attack :
                      cardData.type === 'SKILL' ? COLORS.skill :
                      cardData.type === 'POWER' ? COLORS.power : COLORS.status;

    // 卡牌阴影
    const shadow = this.add.rectangle(3, 3, w, h, 0x000000, 0.15).setOrigin(0.5);

    // 卡牌背景
    const bg = this.add.rectangle(0, 0, w, h, canPlay ? COLORS.cardBg : 0xe8e3db);
    bg.setStrokeStyle(2, typeColor);

    // 顶部色条
    const topBar = this.add.rectangle(0, -h / 2 + 3, w - 4, 6, typeColor).setOrigin(0.5, 0);

    // 费用
    const costCircle = this.add.circle(-w / 2 + 16, -h / 2 + 16, 13, typeColor);
    const costText = this.add.text(-w / 2 + 16, -h / 2 + 16, `${cardData.cost}`, {
      fontSize: '15px', color: '#ffffff', fontFamily: 'Courier New', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 卡名
    const nameText = this.add.text(8, -h / 2 + 16, cardData.name, {
      fontSize: '11px', color: '#2c2c2c', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // 类型图标
    const typeIcon = cardData.type === 'ATTACK' ? '⚔️' :
                     cardData.type === 'SKILL' ? '🛡' :
                     cardData.type === 'POWER' ? '⭐' : '⚠️';
    const icon = this.add.text(0, 5, typeIcon, { fontSize: '28px' }).setOrigin(0.5);

    // 描述
    const desc = this.add.text(0, h / 2 - 28, cardData.description, {
      fontSize: '9px', color: '#555', fontFamily: 'Arial',
      wordWrap: { width: w - 14 }, align: 'center',
    }).setOrigin(0.5);

    container.add([shadow, bg, topBar, costCircle, costText, nameText, icon, desc]);
    container.setSize(w, h);

    // 不可用遮罩
    if (!canPlay) {
      const mask = this.add.rectangle(0, 0, w, h, 0x000000, 0.15);
      container.add(mask);
    }

    if (canPlay) {
      bg.setInteractive({ useHandCursor: true });

      bg.on('pointerover', () => {
        if (this.isAnimating) return;
        container.setDepth(100);
        this.tweens.add({
          targets: container,
          y: y - 40,
          scaleX: 1.2, scaleY: 1.2,
          rotation: 0,
          duration: 150, ease: 'Back.easeOut',
        });
      });

      bg.on('pointerout', () => {
        const midIdx = (this.cardSprites.length - 1) / 2;
        const offsetFromMid = index - midIdx;
        container.setDepth(index);
        if (this.selectedCardIndex !== index) {
          this.tweens.add({
            targets: container,
            y: y, scaleX: 1, scaleY: 1,
            rotation: offsetFromMid * 0.02,
            duration: 150,
          });
        }
      });

      bg.on('pointerdown', () => {
        if (this.isAnimating) return;
        const cs = combatManager.getState();
        if (!cs) return;

        const aliveEnemies = cs.enemies.filter(e => e.hp > 0);

        // 如果是技能/能力牌（无需选目标）或只有一个敌人
        if (cardData.type !== 'ATTACK' || aliveEnemies.length <= 1) {
          this.selectedCardIndex = index;
          // 找到第一个存活敌人的真实索引
          const firstAliveIdx = cs.enemies.findIndex(e => e.hp > 0);
          this.playSelectedCard(firstAliveIdx >= 0 ? firstAliveIdx : 0);
        } else {
          // 选中卡牌，等待选目标
          this.deselectAllCards();
          this.selectedCardIndex = index;
          bg.setStrokeStyle(3, COLORS.highlight);
          this.showTargetHint();
        }
      });
    }

    return container;
  }

  private deselectAllCards(): void {
    const cs = combatManager.getState();
    if (!cs) return;
    this.cardSprites.forEach((c, ci) => {
      if (ci >= cs.hand.length) return;
      const cardBg = c.list[1] as Phaser.GameObjects.Rectangle;
      const cData = kernel.getDataStore().cards.get(cs.hand[ci]?.dataId || '');
      if (cData && cardBg) {
        const isH = cData.effects.some((e: { type: string }) => e.type === 'HEAL');
        const color = isH ? COLORS.heal :
                      cData.type === 'ATTACK' ? COLORS.attack :
                      cData.type === 'SKILL' ? COLORS.skill :
                      cData.type === 'POWER' ? COLORS.power : COLORS.status;
        cardBg.setStrokeStyle(2, color);
      }
    });
    this.selectedCardIndex = -1;
    this.hideTargetHint();
  }

  private showTargetHint(): void {
    this.hideTargetHint();
    this.targetHintText = this.add.text(W / 2, 250, '点击一个敌人作为目标', {
      fontSize: '16px', color: '#ddaa33', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(300);
    // 闪烁动画
    this.tweens.add({
      targets: this.targetHintText,
      alpha: 0.4,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
  }

  private hideTargetHint(): void {
    if (this.targetHintText) {
      this.targetHintText.destroy();
      this.targetHintText = null;
    }
  }

  // ==================== 出牌逻辑 ====================

  private playSelectedCard(enemyIndex: number): void {
    this.hideTargetHint();
    const cs = combatManager.getState();
    if (!cs || this.selectedCardIndex < 0) return;

    const card = cs.hand[this.selectedCardIndex];
    if (!card) return;

    const success = combatManager.playCard(card.uid, enemyIndex);
    if (!success) {
      // 能量不足红闪
      this.cameras.main.flash(200, 200, 50, 50);
      this.deselectAllCards();
      return;
    }

    this.isAnimating = true;
    const sprite = this.cardSprites[this.selectedCardIndex];
    if (sprite) {
      // 打牌动画：飞向敌人区域
      const targetY = 200;
      this.tweens.add({
        targets: sprite,
        y: targetY, alpha: 0,
        scaleX: 0.6, scaleY: 0.6,
        rotation: 0,
        duration: 250, ease: 'Power2',
        onComplete: () => {
          this.isAnimating = false;
          if (this.checkCombatEnd()) return;
          this.renderAll();
        },
      });
    } else {
      this.isAnimating = false;
      if (this.checkCombatEnd()) return;
      this.renderAll();
    }
  }

  // ==================== 回合结束 ====================

  private onEndTurn(): void {
    this.isAnimating = true;

    // 弃牌动画：全部飞向右侧
    const promises = this.cardSprites.map((sprite, i) =>
      new Promise<void>(resolve => {
        this.tweens.add({
          targets: sprite,
          x: W + 80, alpha: 0, rotation: 0.3,
          duration: 200, delay: i * 40,
          ease: 'Power2',
          onComplete: () => resolve(),
        });
      })
    );

    Promise.all(promises).then(() => {
      combatManager.endPlayerTurn();

      if (this.checkCombatEnd()) {
        this.isAnimating = false;
        return;
      }

      // 敌人攻击动画
      this.playEnemyAttackAnimation(() => {
        this.isAnimating = false;
        if (this.checkCombatEnd()) return;
        this.renderAll();
      });
    });
  }

  private playEnemyAttackAnimation(callback: () => void): void {
    const cs = combatManager.getState();
    if (!cs) { callback(); return; }

    // 敌人容器冲向玩家方向
    const animations: Promise<void>[] = [];
    this.enemyContainers.forEach((container) => {
      animations.push(new Promise<void>(resolve => {
        const origY = container.y;
        this.tweens.add({
          targets: container,
          y: origY + 30,
          duration: 150, ease: 'Power2',
          yoyo: true,
          onComplete: () => resolve(),
        });
      }));
    });

    // 屏幕震动
    this.cameras.main.shake(250, 0.008);

    // HP 变化闪烁
    this.time.delayedCall(200, () => {
      this.hpFillRect.setAlpha(0.3);
      this.time.delayedCall(150, () => {
        this.hpFillRect.setAlpha(1);
      });
    });

    Promise.all(animations).then(() => {
      this.time.delayedCall(300, callback);
    });
  }

  // ==================== 牌库/弃牌/消耗查看器 ====================

  private showPileViewer(pileType: 'drawPile' | 'discardPile' | 'exhaustPile'): void {
    const cs = combatManager.getState();
    if (!cs) return;

    const pileNames: Record<string, string> = {
      drawPile: '牌库',
      discardPile: '弃牌堆',
      exhaustPile: '消耗堆',
    };

    const pile = cs[pileType];
    const title = pileNames[pileType];

    this.showCardListOverlay(title, pile);
  }

  private showEnemyInfo(enemy: EnemyInstance, eData: { name: string; description?: string; maxHp: number; passiveAbility?: string }): void {
    const cs = combatManager.getState();
    if (!cs) return;
    const enemyIndex = cs.enemies.indexOf(enemy);

    const buffsHtml = enemy.buffs.length > 0
      ? enemy.buffs.map(b => {
          const bd = kernel.getDataStore().buffs.get(b.dataId);
          if (!bd) return '';
          const isNeg = bd.type === 'NEGATIVE';
          return `<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:3px;font-size:12px;background:${isNeg ? '#ffdddd' : '#ddffdd'};color:${isNeg ? '#cc3333' : '#338833'};">${bd.name}${b.stacks > 1 ? ' x' + b.stacks : ''}</span>`;
        }).filter(Boolean).join('')
      : '<span style="color:#999;font-size:12px;">无</span>';

    const passiveHtml = eData.passiveAbility
      ? `<div style="margin-top:8px;padding:8px;background:#fff3e0;border-radius:4px;border-left:3px solid #bb8833;">
           <strong style="font-size:12px;color:#bb8833;">被动能力</strong>
           <div style="font-size:11px;color:#666;margin-top:2px;">${eData.passiveAbility}</div>
         </div>`
      : '';

    const intent = combatManager.getEnemyIntent(enemyIndex);
    const intentStr = intent
      ? `<div style="margin-top:8px;font-size:13px;">下一步: <strong>${intent.type === 'ATTACK' ? '攻击' : intent.type === 'DEFEND' ? '防御' : intent.type === 'BUFF_SELF' ? '强化' : '削弱'} ${intent.value}</strong></div>`
      : '';

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#f5f0e8;border:2px solid #3a3a3a;border-radius:8px;padding:20px;max-width:400px;width:90%;font-family:Arial,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:18px;margin:0;color:#553333;">${eData.name}</h3>
          <button class="close-overlay" style="cursor:pointer;border:2px solid #3a3a3a;background:#f5f0e8;padding:4px 12px;border-radius:4px;">关闭</button>
        </div>
        ${eData.description ? `<p style="font-size:13px;color:#666;margin-bottom:8px;">${eData.description}</p>` : ''}
        <div style="display:flex;gap:16px;margin-bottom:8px;">
          <span style="font-size:14px;color:#cc4444;">HP: ${enemy.hp}/${enemy.maxHp}</span>
          ${enemy.block > 0 ? `<span style="font-size:14px;color:#4488aa;">护甲: ${enemy.block}</span>` : ''}
        </div>
        <div style="margin-bottom:8px;">
          <strong style="font-size:13px;color:#555;">当前Buff:</strong><br/>
          ${buffsHtml}
        </div>
        ${passiveHtml}
        ${intentStr}
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('.close-overlay')?.addEventListener('click', () => overlay.remove());
  }

  private showCardListOverlay(title: string, cards: CardInstance[]): void {
    // 统计
    const cardCounts = new Map<string, number>();
    for (const card of cards) {
      cardCounts.set(card.dataId, (cardCounts.get(card.dataId) || 0) + 1);
    }

    // 按类型分组
    const groups: Record<string, Array<{ name: string; type: string; cost: number; desc: string; count: number }>> = {
      ATTACK: [], HEAL: [], SKILL: [], POWER: [], STATUS: [],
    };

    for (const [cardId, count] of cardCounts) {
      const cd = kernel.getDataStore().cards.get(cardId);
      if (!cd) continue;
      const isHeal = cd.effects.some(e => e.type === 'HEAL');
      const groupKey = isHeal ? 'HEAL' : cd.type;
      const group = groups[groupKey] || groups.ATTACK;
      group.push({ name: cd.name, type: cd.type, cost: cd.cost, desc: cd.description, count });
    }

    let cardsHtml = '';
    for (const [type, items] of Object.entries(groups)) {
      if (items.length === 0) continue;
      const color = TYPE_COLORS[type] || '#888';
      const label = TYPE_LABELS[type] || type;
      const total = items.reduce((s, c) => s + c.count, 0);
      cardsHtml += `
        <div style="margin-bottom:10px;">
          <div style="font-size:13px;font-weight:bold;color:${color};border-bottom:1px solid ${color}44;padding-bottom:3px;margin-bottom:4px;">${label} (${total})</div>
          ${items.map(c => `
            <div style="display:flex;align-items:center;gap:6px;padding:4px 6px;margin-bottom:2px;background:#fff;border-radius:3px;border-left:3px solid ${color};">
              <span style="background:${color};color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;">${c.cost}</span>
              <span style="font-size:12px;font-weight:bold;flex-shrink:0;">${c.name}${c.count > 1 ? ` x${c.count}` : ''}</span>
              <span style="font-size:10px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.desc}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (!cardsHtml) {
      cardsHtml = '<p style="color:#999;text-align:center;padding:20px;">空</p>';
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#f5f0e8;border:2px solid #3a3a3a;border-radius:8px;padding:20px;max-width:500px;width:90%;max-height:70vh;display:flex;flex-direction:column;font-family:Arial,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="font-size:18px;margin:0;">${title} (${cards.length}张)</h3>
          <button class="close-overlay" style="cursor:pointer;border:2px solid #3a3a3a;background:#f5f0e8;padding:4px 12px;border-radius:4px;">关闭</button>
        </div>
        <div style="flex:1;overflow-y:auto;padding-right:8px;">
          ${cardsHtml}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('.close-overlay')?.addEventListener('click', () => overlay.remove());
  }

  // ==================== 对战结束 ====================

  private checkCombatEnd(): boolean {
    const cs = combatManager.getState();
    if (!cs || !cs.combatOver) return false;

    this.isAnimating = true;

    if (cs.victory) {
      this.showVictory();
    } else {
      this.showDefeat();
    }
    return true;
  }

  private showVictory(): void {
    // 胜利遮罩
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setDepth(500);
    this.tweens.add({
      targets: overlay, alpha: 0.4, duration: 500,
    });

    // 胜利文字
    const text = this.add.text(W / 2, H / 2, '胜 利', {
      fontSize: '64px', color: '#ffd700', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#8B6914', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setScale(2).setDepth(501);

    this.tweens.add({
      targets: text,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 600, ease: 'Back.easeOut',
    });

    this.time.delayedCall(1800, () => this.exitCombat());
  }

  private showDefeat(): void {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x330000, 0)
      .setDepth(500);
    this.tweens.add({
      targets: overlay, alpha: 0.5, duration: 500,
    });

    const text = this.add.text(W / 2, H / 2, '项目受挫...', {
      fontSize: '48px', color: '#ff4444', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#550000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(501);

    this.tweens.add({
      targets: text, alpha: 1, duration: 600,
    });

    this.time.delayedCall(1800, () => this.exitCombat());
  }

  private exitCombat(): void {
    this.cameras.main.fadeOut(400);
    this.time.delayedCall(500, () => {
      // 确保对战正确结算（更新项目HP、转换游戏阶段）
      combatManager.finishCombat();
      const phaserContainer = document.getElementById('phaser-container');
      if (phaserContainer) phaserContainer.style.display = 'none';
      // 清理事件监听
      this.cleanupEventListeners();
      this.scene.stop();
    });
  }

  // ==================== 事件监听 ====================

  private setupEventListeners(): void {
    const onDamage = (damage: unknown) => {
      const dmg = damage as number;
      if (dmg <= 0 || !this.scene.isActive()) return;
      const target = this.enemyContainers[0];
      if (target) {
        const dmgText = this.add.text(
          target.x + Phaser.Math.Between(-20, 20),
          target.y - 40,
          `-${dmg}`,
          { fontSize: '26px', color: '#ff2222', fontFamily: 'Courier New', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 2 },
        ).setOrigin(0.5).setDepth(200);
        this.tweens.add({
          targets: dmgText,
          y: dmgText.y - 60, alpha: 0,
          duration: 900, ease: 'Power1',
          onComplete: () => dmgText.destroy(),
        });
      }
    };

    const onBlock = (amount: unknown) => {
      const val = amount as number;
      if (val <= 0 || !this.scene.isActive()) return;
      const txt = this.add.text(150, 30, `+${val} 护甲`, {
        fontSize: '18px', color: '#4488aa', fontFamily: 'Courier New', fontStyle: 'bold',
      }).setDepth(200);
      this.tweens.add({
        targets: txt, y: 0, alpha: 0, duration: 700,
        onComplete: () => txt.destroy(),
      });
    };

    const onEnemyAction = (_id: unknown, action: unknown, value: unknown) => {
      if (!this.scene.isActive()) return;
      const act = action as string;
      const val = value as number;
      if (act === 'attack' && val > 0) {
        const txt = this.add.text(W / 2, H / 2 - 40, `-${val}`, {
          fontSize: '30px', color: '#ff3333', fontFamily: 'Courier New', fontStyle: 'bold',
          stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(200);
        this.tweens.add({
          targets: txt, y: txt.y - 50, alpha: 0, duration: 800,
          onComplete: () => txt.destroy(),
        });
      }
    };

    eventBus.on(Events.DAMAGE_DEALT, onDamage);
    eventBus.on(Events.BLOCK_GAINED, onBlock);
    eventBus.on(Events.ENEMY_ACTION, onEnemyAction);

    this.eventHandlers.push(
      { event: Events.DAMAGE_DEALT, handler: onDamage },
      { event: Events.BLOCK_GAINED, handler: onBlock },
      { event: Events.ENEMY_ACTION, handler: onEnemyAction },
    );
  }

  private cleanupEventListeners(): void {
    for (const { event, handler } of this.eventHandlers) {
      eventBus.off(event, handler);
    }
    this.eventHandlers = [];
  }

  shutdown(): void {
    this.cleanupEventListeners();
  }
}
