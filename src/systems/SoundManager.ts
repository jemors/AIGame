// ========================================
// SoundManager - 音效与背景音乐管理
// 使用 Web Audio API 程序化生成音效
// ========================================

import { eventBus, Events } from '../kernel/EventBus';

type SfxType =
  | 'click'
  | 'attack'
  | 'playerHit'
  | 'heal'
  | 'buff'
  | 'block'
  | 'cardPlay'
  | 'cardDraw'
  | 'turnStart'
  | 'victory'
  | 'defeat';

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private bgmElement: HTMLAudioElement | null = null;
  private bgmVolume = 0.3;
  private sfxVolume = 0.5;
  private lastClickTime = 0;
  private lastPlayerHp = -1;
  private bgmWasPlaying = false;

  init(): void {
    this.setupBgm();
    this.setupClickDelegation();
    this.subscribeToEvents();
    this.setupVisibilityHandling();
  }

  // --- AudioContext 懒初始化（需要用户手势） ---

  private ensureAudioContext(): AudioContext | null {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // --- BGM ---

  private setupBgm(): void {
    this.bgmElement = new Audio('./audio/bgm.mp3');
    this.bgmElement.loop = true;
    this.bgmElement.volume = this.bgmVolume;
  }

  // --- 页面可见性处理：隐藏时暂停，可见时恢复 ---

  private setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAll();
      } else {
        this.resumeAll();
      }
    });

    // pagehide 比 beforeunload 在现代浏览器和 iframe 中更可靠
    window.addEventListener('pagehide', () => this.destroyAudio());

    window.addEventListener('beforeunload', () => this.destroyAudio());
  }

  private pauseAll(): void {
    this.bgmWasPlaying = !!(this.bgmElement && !this.bgmElement.paused);
    this.bgmElement?.pause();
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend();
    }
  }

  private resumeAll(): void {
    if (this.bgmWasPlaying && this.bgmElement) {
      this.bgmElement.play();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private destroyAudio(): void {
    this.bgmWasPlaying = false;
    if (this.bgmElement) {
      this.bgmElement.pause();
      this.bgmElement.src = '';
      this.bgmElement.load();
    }
    this.audioCtx?.close();
    this.audioCtx = null;
  }

  private playBgm(): void {
    if (!this.bgmElement) return;
    const promise = this.bgmElement.play();
    if (promise) {
      promise.catch(() => {
        // 自动播放被阻止，等待下一次用户交互后重试
        const retry = () => {
          this.bgmElement?.play();
          document.removeEventListener('click', retry);
        };
        document.addEventListener('click', retry, { once: true });
      });
    }
  }

  // --- 点击音效事件委托 ---

  private setupClickDelegation(): void {
    document.body.addEventListener(
      'click',
      (e) => {
        const now = performance.now();
        if (now - this.lastClickTime < 30) return;

        const target = e.target as HTMLElement;
        if (this.isClickableElement(target)) {
          this.lastClickTime = now;
          this.playSfx('click');
        }
      },
      { capture: true },
    );
  }

  private isClickableElement(el: HTMLElement): boolean {
    let node: HTMLElement | null = el;
    for (let i = 0; i < 5 && node; i++) {
      if (node.tagName === 'BUTTON') return true;
      if (node.tagName === 'CANVAS') return false; // Phaser 场景由 EventBus 处理
      const style = node.style;
      if (style && style.cursor === 'pointer') return true;
      if (
        node.dataset &&
        (node.dataset.activity !== undefined ||
          node.dataset.buffId !== undefined ||
          node.dataset.equipId !== undefined)
      )
        return true;
      if (
        node.classList &&
        (node.classList.contains('btn') ||
          node.classList.contains('activity-btn') ||
          node.classList.contains('difficulty-btn') ||
          node.classList.contains('clickable-tag'))
      )
        return true;
      node = node.parentElement;
    }
    return false;
  }

  // --- EventBus 订阅 ---

  private subscribeToEvents(): void {
    eventBus.on(Events.GAME_STARTED, () => this.playBgm());
    eventBus.on(Events.CARD_PLAYED, () => this.playSfx('cardPlay'));
    eventBus.on(Events.CARD_DRAWN, () => this.playSfx('cardDraw'));
    eventBus.on(Events.DAMAGE_DEALT, () => this.playSfx('attack'));
    eventBus.on(Events.BLOCK_GAINED, () => this.playSfx('block'));
    eventBus.on(Events.BUFF_APPLIED, () => this.playSfx('buff'));
    eventBus.on(Events.TURN_STARTED, () => this.playSfx('turnStart'));

    eventBus.on(Events.ENEMY_ACTION, (_enemyId: unknown, action: unknown) => {
      if (action === 'attack') this.playSfx('playerHit');
    });

    eventBus.on(Events.COMBAT_ENDED, (victory: unknown) => {
      this.playSfx(victory ? 'victory' : 'defeat');
    });

    // 追踪玩家血量变化，仅恢复时播放治疗音效
    eventBus.on(Events.COMBAT_STARTED, () => {
      this.lastPlayerHp = -1;
    });
    eventBus.on(Events.PLAYER_HP_CHANGED, (newHp: unknown) => {
      const hp = newHp as number;
      if (this.lastPlayerHp >= 0 && hp > this.lastPlayerHp) {
        this.playSfx('heal');
      }
      this.lastPlayerHp = hp;
    });

    // 如果有存档继续游戏，也播放BGM
    eventBus.on(Events.PHASE_CHANGED, (phase: unknown) => {
      if (phase !== 'TITLE' && this.bgmElement && this.bgmElement.paused) {
        this.playBgm();
      }
    });
  }

  // --- SFX 播放调度 ---

  playSfx(type: SfxType): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    switch (type) {
      case 'click':
        this.sfxClick(ctx);
        break;
      case 'attack':
        this.sfxAttack(ctx);
        break;
      case 'playerHit':
        this.sfxPlayerHit(ctx);
        break;
      case 'heal':
        this.sfxHeal(ctx);
        break;
      case 'buff':
        this.sfxBuff(ctx);
        break;
      case 'block':
        this.sfxBlock(ctx);
        break;
      case 'cardPlay':
        this.sfxCardPlay(ctx);
        break;
      case 'cardDraw':
        this.sfxCardDraw(ctx);
        break;
      case 'turnStart':
        this.sfxTurnStart(ctx);
        break;
      case 'victory':
        this.sfxVictory(ctx);
        break;
      case 'defeat':
        this.sfxDefeat(ctx);
        break;
    }
  }

  // --- 程序化音效生成 ---

  private playTone(
    ctx: AudioContext,
    waveform: OscillatorType,
    freqStart: number,
    freqEnd: number,
    duration: number,
    volume: number,
    delay = 0,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveform;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = ctx.currentTime + delay;
    const vol = volume * this.sfxVolume;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.linearRampToValueAtTime(0, t + duration);

    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  // 点击：柔和短促的 tick
  private sfxClick(ctx: AudioContext): void {
    this.playTone(ctx, 'sine', 800, 600, 0.06, 0.15);
  }

  // 攻击：下行锯齿波冲击
  private sfxAttack(ctx: AudioContext): void {
    this.playTone(ctx, 'sawtooth', 200, 80, 0.15, 0.25);
    // 叠加短促高频噪声模拟冲击感
    this.playTone(ctx, 'square', 1500, 800, 0.03, 0.1);
  }

  // 受击：沉闷低音
  private sfxPlayerHit(ctx: AudioContext): void {
    this.playTone(ctx, 'square', 300, 100, 0.2, 0.2);
  }

  // 治疗：上行三音琶音
  private sfxHeal(ctx: AudioContext): void {
    this.playTone(ctx, 'sine', 400, 400, 0.08, 0.2, 0);
    this.playTone(ctx, 'sine', 500, 500, 0.08, 0.2, 0.08);
    this.playTone(ctx, 'sine', 600, 600, 0.08, 0.2, 0.16);
  }

  // 加Buff：上行闪烁音
  private sfxBuff(ctx: AudioContext): void {
    this.playTone(ctx, 'sine', 600, 900, 0.2, 0.15);
  }

  // 格挡：金属叮当双音
  private sfxBlock(ctx: AudioContext): void {
    this.playTone(ctx, 'triangle', 500, 500, 0.06, 0.2, 0);
    this.playTone(ctx, 'triangle', 700, 700, 0.06, 0.2, 0.06);
  }

  // 出牌：快速下行气流
  private sfxCardPlay(ctx: AudioContext): void {
    this.playTone(ctx, 'sine', 400, 300, 0.1, 0.15);
  }

  // 抽牌：轻柔上行
  private sfxCardDraw(ctx: AudioContext): void {
    this.playTone(ctx, 'sine', 300, 500, 0.08, 0.1);
  }

  // 回合开始：双音提示
  private sfxTurnStart(ctx: AudioContext): void {
    this.playTone(ctx, 'sine', 500, 500, 0.08, 0.15, 0);
    this.playTone(ctx, 'sine', 700, 700, 0.1, 0.15, 0.1);
  }

  // 胜利：上行琶音 C5-E5-G5-C6
  private sfxVictory(ctx: AudioContext): void {
    this.playTone(ctx, 'sine', 523, 523, 0.15, 0.2, 0);
    this.playTone(ctx, 'sine', 659, 659, 0.15, 0.2, 0.15);
    this.playTone(ctx, 'sine', 784, 784, 0.15, 0.2, 0.3);
    this.playTone(ctx, 'sine', 1047, 1047, 0.25, 0.25, 0.45);
  }

  // 失败：下行暗沉音
  private sfxDefeat(ctx: AudioContext): void {
    this.playTone(ctx, 'sawtooth', 400, 400, 0.2, 0.2, 0);
    this.playTone(ctx, 'sawtooth', 300, 300, 0.2, 0.2, 0.2);
    this.playTone(ctx, 'sawtooth', 200, 150, 0.25, 0.2, 0.4);
  }
}

export const soundManager = new SoundManager();
