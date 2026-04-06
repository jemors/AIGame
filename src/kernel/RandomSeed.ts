// ========================================
// 种子随机数生成器
// 确保同一种子下随机结果可复现
// 使用 Mulberry32 算法
// ========================================

export class RandomSeed {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  // 返回 [0, 1) 之间的浮点数
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // 返回 [min, max] 之间的整数
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // 返回 [min, max] 之间的浮点数
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  // 从数组中随机选一个
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  // 加权随机选择，weights 为权重数组
  weightedPick<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  // 洗牌（Fisher-Yates）
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // 获取当前种子状态（用于存档）
  getState(): number {
    return this.state;
  }

  // 恢复种子状态（用于读档）
  setState(state: number): void {
    this.state = state;
  }
}
