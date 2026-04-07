// ========================================
// CombatScene - Phaser 卡牌对战渲染场景
// 增强版：卡牌交互、敌人动画、牌库查看、敌人信息
// ========================================

import Phaser from 'phaser';
import { combatManager } from '../combat/CombatManager';
import { kernel } from '../kernel/GameKernel';
import { eventBus, Events } from '../kernel/EventBus';
import type { CardData, CardInstance } from '../models/Card';
import type { EnemyInstance } from '../models/Enemy';

const W = 960;
const H = 640;
const UI_FONT = '"Noto Sans SC", Arial, sans-serif';
const TITLE_FONT = '"Noto Serif SC", serif';
const MONO_FONT = '"JetBrains Mono", "Courier New", monospace';

const COLORS = {
  bg: 0x070d16,
  bgTop: 0x10182a,
  bgBottom: 0x090d14,
  panel: 0x10192a,
  panelAlt: 0x172338,
  panelStroke: 0x5a86ba,
  cardBg: 0xf7f1e7,
  cardShadow: 0x06080d,
  cardBorder: 0x1f1914,
  attack: 0xd95757,
  skill: 0x57a8d9,
  power: 0xd49a49,
  status: 0x8c88a0,
  heal: 0x53b889,
  hp: 0xe06464,
  hpBg: 0x3e1420,
  block: 0x58a7d1,
  energy: 0xf2c14f,
  energyCore: 0x6c3d00,
  enemyBg: 0x311824,
  enemyAura: 0xb04362,
  enemyPanel: 0x1c1118,
  highlight: 0xf2c14f,
  accentBlue: 0x71b6ff,
  accentGold: 0xf6d37a,
  accentCream: 0xf9edd7,
  textLight: 0xf5eee3,
  textMuted: 0xb3bfd3,
  victoryGold: 0xffd76a,
  defeatRed: 0xa51f2d,
};

const TYPE_COLORS: Record<string, string> = {
  ATTACK: '#d95757',
  SKILL: '#57a8d9',
  POWER: '#d49a49',
  STATUS: '#8c88a0',
  HEAL: '#53b889',
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
      x: number,
      y: number,
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
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
    bg.fillRect(0, 0, W, H);
    bg.fillStyle(0x20304d, 0.18);
    bg.fillCircle(170, 120, 180);
    bg.fillStyle(0x4e1f32, 0.2);
    bg.fillCircle(W - 150, 160, 220);
    bg.fillStyle(0x152235, 0.94);
    bg.fillEllipse(W / 2, 148, 780, 250);
    bg.fillStyle(0x0c121d, 0.9);
    bg.fillEllipse(W / 2, H - 88, 860, 210);
    bg.lineStyle(2, 0x3a5375, 0.32);
    bg.strokeEllipse(W / 2, 148, 780, 250);
    bg.lineStyle(1, 0xf2c14f, 0.16);
    bg.lineBetween(48, 266, W - 48, 266);
    bg.lineStyle(1, 0x2f4766, 0.18);
    for (let x = 80; x < W; x += 80) {
      bg.lineBetween(x, 280, x - 40, H - 10);
    }

    this.add
      .text(W / 2, 38, 'BATTLE STAGE', {
        fontSize: '14px',
        color: '#d5b980',
        fontFamily: UI_FONT,
        letterSpacing: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0.72);

    this.add
      .text(W / 2, 287, 'Hand / Tactics', {
        fontSize: '12px',
        color: '#9fb1cb',
        fontFamily: UI_FONT,
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0.65);
  }

  // ==================== UI 创建 ====================

  private createUI(): void {
    this.add.rectangle(176, 54, 316, 104, 0x050a12, 0.32);
    this.add
      .rectangle(172, 50, 316, 104, COLORS.panel, 0.84)
      .setStrokeStyle(2, COLORS.panelStroke, 0.85);
    this.add.text(42, 18, '项目状态', {
      fontSize: '13px',
      color: '#d8bc84',
      fontFamily: UI_FONT,
      letterSpacing: 3,
    });
    this.uiTexts.hpLabel = this.add.text(42, 36, '', {
      fontSize: '18px',
      color: '#ffe2dc',
      fontFamily: MONO_FONT,
      fontStyle: 'bold',
    });
    this.add.rectangle(42, 84, 236, 12, COLORS.hpBg).setOrigin(0, 0.5);
    this.hpFillRect = this.add.rectangle(42, 84, 236, 12, COLORS.hp).setOrigin(0, 0.5);
    this.uiTexts.block = this.add.text(42, 56, '', {
      fontSize: '14px',
      color: '#9fd7ff',
      fontFamily: MONO_FONT,
    });
    this.playerBuffsText = this.add.text(150, 56, '', {
      fontSize: '11px',
      color: '#aebbd0',
      fontFamily: UI_FONT,
      wordWrap: { width: 150 },
    });

    this.add.rectangle(W / 2, 50, 152, 56, 0x050a12, 0.28);
    this.add
      .rectangle(W / 2, 48, 152, 56, COLORS.panelAlt, 0.88)
      .setStrokeStyle(2, COLORS.highlight, 0.72);
    this.add
      .text(W / 2, 31, 'TURN', {
        fontSize: '11px',
        color: '#d8bc84',
        fontFamily: UI_FONT,
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    this.uiTexts.turn = this.add
      .text(W / 2, 45, '', {
        fontSize: '18px',
        color: '#f9edd7',
        fontFamily: MONO_FONT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);

    this.add.rectangle(98, H - 206, 132, 88, 0x050a12, 0.28);
    this.add
      .rectangle(94, H - 210, 132, 88, COLORS.panelAlt, 0.88)
      .setStrokeStyle(2, COLORS.energy, 0.75);
    this.add
      .text(94, H - 237, 'ENERGY', {
        fontSize: '11px',
        color: '#d8bc84',
        fontFamily: UI_FONT,
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    this.uiTexts.energy = this.add
      .text(94, H - 224, '', {
        fontSize: '38px',
        color: '#ffd974',
        fontFamily: MONO_FONT,
        fontStyle: 'bold',
        stroke: '#4a2d00',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0);

    const pilePanelY = H - 26;
    this.add.rectangle(W / 2, pilePanelY, 360, 34, 0x050a12, 0.24);
    this.add
      .rectangle(W / 2, pilePanelY, 360, 34, COLORS.panel, 0.84)
      .setStrokeStyle(1, COLORS.panelStroke, 0.5);

    this.uiTexts.drawPile = this.add
      .text(128, H - 33, '', {
        fontSize: '13px',
        color: '#d3dded',
        fontFamily: MONO_FONT,
      })
      .setInteractive({ useHandCursor: true });
    this.uiTexts.drawPile.on('pointerdown', () => this.showPileViewer('drawPile'));
    this.uiTexts.drawPile.on('pointerover', () => this.uiTexts.drawPile.setColor('#ffe7a4'));
    this.uiTexts.drawPile.on('pointerout', () => this.uiTexts.drawPile.setColor('#d3dded'));

    this.uiTexts.exhaustPile = this.add
      .text(W / 2 - 52, H - 33, '', {
        fontSize: '13px',
        color: '#d3dded',
        fontFamily: MONO_FONT,
      })
      .setInteractive({ useHandCursor: true });
    this.uiTexts.exhaustPile.on('pointerdown', () => this.showPileViewer('exhaustPile'));
    this.uiTexts.exhaustPile.on('pointerover', () => this.uiTexts.exhaustPile.setColor('#ffe7a4'));
    this.uiTexts.exhaustPile.on('pointerout', () => this.uiTexts.exhaustPile.setColor('#d3dded'));

    this.uiTexts.discardPile = this.add
      .text(W - 200, H - 33, '', {
        fontSize: '13px',
        color: '#d3dded',
        fontFamily: MONO_FONT,
      })
      .setOrigin(0.5, 0);
    this.uiTexts.discardPile.setInteractive({ useHandCursor: true });
    this.uiTexts.discardPile.on('pointerdown', () => this.showPileViewer('discardPile'));
    this.uiTexts.discardPile.on('pointerover', () => this.uiTexts.discardPile.setColor('#ffe7a4'));
    this.uiTexts.discardPile.on('pointerout', () => this.uiTexts.discardPile.setColor('#d3dded'));

    this.endTurnBtn = this.add.container(W - 118, H - 210);
    const btnShadow = this.add.rectangle(4, 4, 150, 54, 0x000000, 0.24);
    const btnBg = this.add
      .rectangle(0, 0, 150, 54, 0x2a1a0f)
      .setStrokeStyle(2, COLORS.highlight, 0.9);
    const btnAccent = this.add.rectangle(0, -22, 146, 8, COLORS.highlight, 0.9);
    const btnText = this.add
      .text(0, 0, '结束回合', {
        fontSize: '16px',
        color: '#fff0c6',
        fontFamily: UI_FONT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.endTurnBtn.add([btnShadow, btnBg, btnAccent, btnText]);
    this.endTurnBtn.setSize(150, 54);
    this.endTurnBtn.setInteractive({ useHandCursor: true });
    this.endTurnBtn.on('pointerdown', () => {
      if (!this.isAnimating) this.onEndTurn();
    });
    this.endTurnBtn.on('pointerover', () => {
      btnBg.setFillStyle(0x3a2414);
      this.tweens.add({ targets: this.endTurnBtn, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });
    this.endTurnBtn.on('pointerout', () => {
      btnBg.setFillStyle(0x2a1a0f);
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

    this.uiTexts.hpLabel.setText(`项目 HP ${cs.playerHp}/${cs.playerMaxHp}`);
    const hpRatio = Math.max(0, cs.playerHp / cs.playerMaxHp);
    this.hpFillRect.width = 236 * hpRatio;
    if (hpRatio < 0.3) this.hpFillRect.setFillStyle(0xff3333);
    else if (hpRatio < 0.6) this.hpFillRect.setFillStyle(0xdd8833);
    else this.hpFillRect.setFillStyle(COLORS.hp);

    this.uiTexts.block.setText(cs.playerBlock > 0 ? `护甲 ${cs.playerBlock}` : '护甲 0');
    this.uiTexts.energy.setText(`${cs.energy}/${cs.maxEnergy}`);
    this.uiTexts.drawPile.setText(`牌库 ${cs.drawPile.length}`);
    this.uiTexts.discardPile.setText(`弃牌 ${cs.discardPile.length}`);
    this.uiTexts.exhaustPile.setText(`消耗 ${cs.exhaustPile.length}`);
    this.uiTexts.turn.setText(`回合 ${cs.turn}`);

    // Buff 列表
    const buffStrs = cs.playerBuffs
      .map((b) => {
        const bd = kernel.getDataStore().buffs.get(b.dataId);
        if (!bd) return '';
        const icon = bd.type === 'POSITIVE' ? '+' : '-';
        return `${icon}${bd.name}${b.stacks > 1 ? 'x' + b.stacks : ''}`;
      })
      .filter(Boolean);
    this.playerBuffsText.setText(buffStrs.length > 0 ? buffStrs.join('  ') : '无额外效果');
  }

  // ==================== 敌人渲染 ====================

  private renderEnemies(enemies: EnemyInstance[]): void {
    this.enemyContainers.forEach((c) => c.destroy());
    this.enemyContainers = [];

    const alive = enemies.filter((e) => e.hp > 0);
    if (alive.length === 0) return;

    const spacing = Math.min(220, (W - 120) / alive.length);
    const startX = W / 2 - ((alive.length - 1) * spacing) / 2;

    let aliveIdx = 0;
    enemies.forEach((enemy, realIndex) => {
      if (enemy.hp <= 0) return;
      const eData = kernel.getDataStore().enemies.get(enemy.dataId);
      if (!eData) return;

      const x = startX + aliveIdx * spacing;
      const y = 130;
      aliveIdx++;

      const container = this.add.container(x, y);

      const aura = this.add.circle(0, 0, 62, COLORS.enemyAura, 0.18);
      const shadow = this.add.ellipse(0, 68, 104, 22, 0x000000, 0.24);
      const body = this.add.circle(0, 0, 44, COLORS.enemyBg);
      body.setStrokeStyle(3, 0xb97393);
      const innerRing = this.add.circle(0, 0, 36, 0x4f2435, 0.42).setStrokeStyle(1, 0xffd6e1, 0.25);

      // 首字
      const initial = this.add
        .text(0, -2, eData.name[0], {
          fontSize: '30px',
          color: '#fff3ea',
          fontFamily: TITLE_FONT,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      // 名字
      const nameText = this.add
        .text(0, 54, eData.name, {
          fontSize: '14px',
          color: '#f5eee3',
          fontFamily: UI_FONT,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      // HP条与信息板
      const infoPanel = this.add
        .rectangle(0, 84, 116, 44, COLORS.enemyPanel, 0.86)
        .setStrokeStyle(1, 0x6a4560, 0.85);
      this.add.rectangle(0, 74, 90, 10, COLORS.hpBg).setOrigin(0.5);
      const hpRatio = enemy.hp / enemy.maxHp;
      const hpFill = this.add
        .rectangle(-45 * (1 - hpRatio), 74, 90 * hpRatio, 10, hpRatio > 0.5 ? COLORS.hp : 0xff5533)
        .setOrigin(0, 0.5);

      const hpText = this.add
        .text(0, 90, `${enemy.hp}/${enemy.maxHp}`, {
          fontSize: '11px',
          color: '#ffd9d6',
          fontFamily: MONO_FONT,
        })
        .setOrigin(0.5);

      container.add([aura, shadow, body, innerRing, initial, nameText, infoPanel, hpFill, hpText]);

      // 护甲
      if (enemy.block > 0) {
        const blockBg = this.add.circle(52, -30, 15, COLORS.block, 0.92);
        const blockTxt = this.add
          .text(52, -30, `${enemy.block}`, {
            fontSize: '12px',
            color: '#fff',
            fontFamily: MONO_FONT,
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
        container.add([blockBg, blockTxt]);
      }

      // 意图（上方气泡）
      const intent = combatManager.getEnemyIntent(realIndex);
      if (intent) {
        const intentBubble = this.add
          .rectangle(0, -78, 86, 34, 0xfff7ea, 0.94)
          .setStrokeStyle(2, intent.type === 'ATTACK' ? COLORS.attack : COLORS.skill, 0.9);
        const intentIcon =
          intent.type === 'ATTACK'
            ? '⚔'
            : intent.type === 'DEFEND'
              ? '🛡'
              : intent.type === 'BUFF_SELF'
                ? '💪'
                : '☠';
        const intentTxt = this.add
          .text(0, -78, `${intentIcon} ${intent.value}`, {
            fontSize: '13px',
            color: intent.type === 'ATTACK' ? '#cc3333' : '#2d5f92',
            fontFamily: MONO_FONT,
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
        container.add([intentBubble, intentTxt]);
      }

      // Buff 显示
      if (enemy.buffs.length > 0) {
        const buffStr = enemy.buffs
          .map((b) => {
            const bd = kernel.getDataStore().buffs.get(b.dataId);
            return bd ? `${bd.name}${b.stacks > 1 ? 'x' + b.stacks : ''}` : '';
          })
          .filter(Boolean)
          .join(' ');
        if (buffStr) {
          container.add(
            this.add
              .text(0, 100, buffStr, {
                fontSize: '10px',
                color: '#c4b7c3',
                fontFamily: UI_FONT,
              })
              .setOrigin(0.5),
          );
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
        aura.setScale(1.08);
        aura.setAlpha(0.28);
        if (this.selectedCardIndex >= 0) body.setStrokeStyle(4, COLORS.highlight);
      });
      body.on('pointerout', () => {
        aura.setScale(1);
        aura.setAlpha(0.18);
        body.setStrokeStyle(3, 0xb97393);
      });

      this.enemyContainers.push(container);
    });
  }

  // ==================== 手牌渲染 ====================

  private renderHand(hand: CardInstance[]): void {
    this.cardSprites.forEach((c) => c.destroy());
    this.cardSprites = [];
    this.selectedCardIndex = -1;
    if (hand.length === 0) return;

    const cardW = 105;
    const cardH = 145;
    const maxTotalWidth = W - 200;
    const overlap = Math.max(cardW * 0.3, cardW - maxTotalWidth / hand.length);
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
    cardData: CardData,
    x: number,
    y: number,
    w: number,
    h: number,
    index: number,
    currentEnergy: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const canPlay = !cardData.unplayable && currentEnergy >= cardData.cost;

    const isHeal = cardData.effects.some((e) => e.type === 'HEAL');
    const typeColor = isHeal
      ? COLORS.heal
      : cardData.type === 'ATTACK'
        ? COLORS.attack
        : cardData.type === 'SKILL'
          ? COLORS.skill
          : cardData.type === 'POWER'
            ? COLORS.power
            : COLORS.status;

    const shadow = this.add.rectangle(5, 8, w, h, COLORS.cardShadow, 0.2).setOrigin(0.5);
    const glow = this.add
      .rectangle(0, 0, w + 8, h + 8, typeColor, canPlay ? 0.08 : 0.03)
      .setOrigin(0.5);
    const bg = this.add.rectangle(0, 0, w, h, canPlay ? COLORS.cardBg : 0xe8e3db);
    bg.setStrokeStyle(2, typeColor, canPlay ? 1 : 0.5);
    const topBar = this.add.rectangle(0, -h / 2 + 10, w - 10, 10, typeColor).setOrigin(0.5, 0.5);
    const footerBar = this.add.rectangle(0, h / 2 - 12, w - 12, 18, 0x140f0b, 0.08).setOrigin(0.5);

    const costCircle = this.add.circle(-w / 2 + 19, -h / 2 + 19, 14, typeColor);
    const costText = this.add
      .text(-w / 2 + 19, -h / 2 + 19, `${cardData.cost}`, {
        fontSize: '15px',
        color: '#ffffff',
        fontFamily: MONO_FONT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const nameText = this.add
      .text(0, -h / 2 + 36, cardData.name, {
        fontSize: '12px',
        color: '#2c2c2c',
        fontFamily: UI_FONT,
        fontStyle: 'bold',
        wordWrap: { width: w - 24 },
        align: 'center',
      })
      .setOrigin(0.5);

    const typeIcon =
      cardData.type === 'ATTACK'
        ? '⚔️'
        : cardData.type === 'SKILL'
          ? '🛡'
          : cardData.type === 'POWER'
            ? '⭐'
            : '⚠️';
    const iconGlow = this.add.circle(0, 2, 28, typeColor, 0.12);
    const icon = this.add.text(0, 2, typeIcon, { fontSize: '28px' }).setOrigin(0.5);
    const typeLabel = isHeal ? '恢复' : TYPE_LABELS[cardData.type] || cardData.type;
    const typeText = this.add
      .text(0, h / 2 - 12, typeLabel, {
        fontSize: '10px',
        color: '#5e5548',
        fontFamily: UI_FONT,
        letterSpacing: 1,
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, h / 2 - 36, cardData.description, {
        fontSize: '9px',
        color: '#555',
        fontFamily: UI_FONT,
        wordWrap: { width: w - 14 },
        align: 'center',
      })
      .setOrigin(0.5);

    container.add([
      shadow,
      glow,
      bg,
      topBar,
      footerBar,
      costCircle,
      costText,
      nameText,
      iconGlow,
      icon,
      desc,
      typeText,
    ]);
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
          y: y - 48,
          scaleX: 1.18,
          scaleY: 1.18,
          rotation: 0,
          duration: 150,
          ease: 'Back.easeOut',
        });
        this.tweens.add({ targets: glow, alpha: 0.18, duration: 120 });
      });

      bg.on('pointerout', () => {
        const midIdx = (this.cardSprites.length - 1) / 2;
        const offsetFromMid = index - midIdx;
        container.setDepth(index);
        if (this.selectedCardIndex !== index) {
          this.tweens.add({
            targets: container,
            y: y,
            scaleX: 1,
            scaleY: 1,
            rotation: offsetFromMid * 0.02,
            duration: 150,
          });
        }
        this.tweens.add({ targets: glow, alpha: canPlay ? 0.08 : 0.03, duration: 120 });
      });

      bg.on('pointerdown', () => {
        if (this.isAnimating) return;
        const cs = combatManager.getState();
        if (!cs) return;

        const aliveEnemies = cs.enemies.filter((e) => e.hp > 0);

        // 如果是技能/能力牌（无需选目标）或只有一个敌人
        if (cardData.type !== 'ATTACK' || aliveEnemies.length <= 1) {
          this.selectedCardIndex = index;
          // 找到第一个存活敌人的真实索引
          const firstAliveIdx = cs.enemies.findIndex((e) => e.hp > 0);
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
        const color = isH
          ? COLORS.heal
          : cData.type === 'ATTACK'
            ? COLORS.attack
            : cData.type === 'SKILL'
              ? COLORS.skill
              : cData.type === 'POWER'
                ? COLORS.power
                : COLORS.status;
        cardBg.setStrokeStyle(2, color);
      }
    });
    this.selectedCardIndex = -1;
    this.hideTargetHint();
  }

  private showTargetHint(): void {
    this.hideTargetHint();
    this.targetHintText = this.add
      .text(W / 2, 250, '点击一个敌人作为目标', {
        fontSize: '16px',
        color: '#ffe09a',
        fontFamily: UI_FONT,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(300);
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
        y: targetY,
        alpha: 0,
        scaleX: 0.6,
        scaleY: 0.6,
        rotation: 0,
        duration: 250,
        ease: 'Power2',
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
    const promises = this.cardSprites.map(
      (sprite, i) =>
        new Promise<void>((resolve) => {
          this.tweens.add({
            targets: sprite,
            x: W + 80,
            alpha: 0,
            rotation: 0.3,
            duration: 200,
            delay: i * 40,
            ease: 'Power2',
            onComplete: () => resolve(),
          });
        }),
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
    if (!cs) {
      callback();
      return;
    }

    // 敌人容器冲向玩家方向
    const animations: Promise<void>[] = [];
    this.enemyContainers.forEach((container) => {
      animations.push(
        new Promise<void>((resolve) => {
          const origY = container.y;
          this.tweens.add({
            targets: container,
            y: origY + 30,
            duration: 150,
            ease: 'Power2',
            yoyo: true,
            onComplete: () => resolve(),
          });
        }),
      );
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

  private showEnemyInfo(
    enemy: EnemyInstance,
    eData: { name: string; description?: string; maxHp: number; passiveAbility?: string },
  ): void {
    const cs = combatManager.getState();
    if (!cs) return;
    const enemyIndex = cs.enemies.indexOf(enemy);

    const buffsHtml =
      enemy.buffs.length > 0
        ? enemy.buffs
            .map((b) => {
              const bd = kernel.getDataStore().buffs.get(b.dataId);
              if (!bd) return '';
              const isNeg = bd.type === 'NEGATIVE';
              return `<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:3px;font-size:12px;background:${isNeg ? '#ffdddd' : '#ddffdd'};color:${isNeg ? '#cc3333' : '#338833'};">${bd.name}${b.stacks > 1 ? ' x' + b.stacks : ''}</span>`;
            })
            .filter(Boolean)
            .join('')
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
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;';
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
    const groups: Record<
      string,
      Array<{ name: string; type: string; cost: number; desc: string; count: number }>
    > = {
      ATTACK: [],
      HEAL: [],
      SKILL: [],
      POWER: [],
      STATUS: [],
    };

    for (const [cardId, count] of cardCounts) {
      const cd = kernel.getDataStore().cards.get(cardId);
      if (!cd) continue;
      const isHeal = cd.effects.some((e) => e.type === 'HEAL');
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
          ${items
            .map(
              (c) => `
            <div style="display:flex;align-items:center;gap:6px;padding:4px 6px;margin-bottom:2px;background:#fff;border-radius:3px;border-left:3px solid ${color};">
              <span style="background:${color};color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;">${c.cost}</span>
              <span style="font-size:12px;font-weight:bold;flex-shrink:0;">${c.name}${c.count > 1 ? ` x${c.count}` : ''}</span>
              <span style="font-size:10px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.desc}</span>
            </div>
          `,
            )
            .join('')}
        </div>
      `;
    }

    if (!cardsHtml) {
      cardsHtml = '<p style="color:#999;text-align:center;padding:20px;">空</p>';
    }

    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;';
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
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x04070d, 0).setDepth(500);
    this.tweens.add({
      targets: overlay,
      alpha: 0.62,
      duration: 500,
    });

    const panel = this.add
      .rectangle(W / 2, H / 2, 420, 180, 0x15100a, 0.92)
      .setStrokeStyle(2, COLORS.victoryGold, 0.9)
      .setDepth(501)
      .setAlpha(0);
    const text = this.add
      .text(W / 2, H / 2 - 20, '胜 利', {
        fontSize: '64px',
        color: '#ffd76a',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        stroke: '#6a4d16',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(1.6)
      .setDepth(502);
    const sub = this.add
      .text(W / 2, H / 2 + 38, '本轮战斗收官，准备带着优势进入结算。', {
        fontSize: '16px',
        color: '#fff0c6',
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(502);

    this.tweens.add({
      targets: panel,
      alpha: 1,
      duration: 400,
    });
    this.tweens.add({
      targets: text,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 600,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: sub,
      alpha: 1,
      duration: 500,
      delay: 120,
    });

    this.time.delayedCall(1800, () => this.exitCombat());
  }

  private showDefeat(): void {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x1a0507, 0).setDepth(500);
    this.tweens.add({
      targets: overlay,
      alpha: 0.65,
      duration: 500,
    });

    const panel = this.add
      .rectangle(W / 2, H / 2, 460, 180, 0x24090d, 0.94)
      .setStrokeStyle(2, COLORS.defeatRed, 0.9)
      .setDepth(501)
      .setAlpha(0);
    const text = this.add
      .text(W / 2, H / 2 - 18, '项目受挫', {
        fontSize: '50px',
        color: '#ff8c8c',
        fontFamily: TITLE_FONT,
        fontStyle: 'bold',
        stroke: '#4a080d',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(502);
    const sub = this.add
      .text(W / 2, H / 2 + 36, '这一战没撑住，但经营循环还没结束。', {
        fontSize: '16px',
        color: '#ffd8d8',
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(502);

    this.tweens.add({
      targets: panel,
      alpha: 1,
      duration: 400,
    });
    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 600,
    });
    this.tweens.add({
      targets: sub,
      alpha: 1,
      duration: 500,
      delay: 120,
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
        const dmgText = this.add
          .text(target.x + Phaser.Math.Between(-20, 20), target.y - 40, `-${dmg}`, {
            fontSize: '26px',
            color: '#ff2222',
            fontFamily: MONO_FONT,
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 2,
          })
          .setOrigin(0.5)
          .setDepth(200);
        this.tweens.add({
          targets: dmgText,
          y: dmgText.y - 60,
          alpha: 0,
          duration: 900,
          ease: 'Power1',
          onComplete: () => dmgText.destroy(),
        });
      }
    };

    const onBlock = (amount: unknown) => {
      const val = amount as number;
      if (val <= 0 || !this.scene.isActive()) return;
      const txt = this.add
        .text(150, 30, `+${val} 护甲`, {
          fontSize: '18px',
          color: '#4488aa',
          fontFamily: MONO_FONT,
          fontStyle: 'bold',
        })
        .setDepth(200);
      this.tweens.add({
        targets: txt,
        y: 0,
        alpha: 0,
        duration: 700,
        onComplete: () => txt.destroy(),
      });
    };

    const onEnemyAction = (_id: unknown, action: unknown, value: unknown) => {
      if (!this.scene.isActive()) return;
      const act = action as string;
      const val = value as number;
      if (act === 'attack' && val > 0) {
        const txt = this.add
          .text(W / 2, H / 2 - 40, `-${val}`, {
            fontSize: '30px',
            color: '#ff3333',
            fontFamily: MONO_FONT,
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 2,
          })
          .setOrigin(0.5)
          .setDepth(200);
        this.tweens.add({
          targets: txt,
          y: txt.y - 50,
          alpha: 0,
          duration: 800,
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
