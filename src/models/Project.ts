export interface ProjectProgress {
  programming: number; // 编程进度 0-100
  art: number; // 美术进度 0-100
  design: number; // 策划进度 0-100
  quality: number; // 品质 0-100
  innovation: number; // 创新度 0-100
}

export interface ProjectData {
  id: string;
  name: string;
  genre: string;
  totalMonths: number; // 开发总月数
  requiredProgress: {
    // 合格线
    programming: number;
    art: number;
    design: number;
  };
  monthlyEnemies: string[][]; // 每月的敌人 ID 列表
  bossEnemies?: string[]; // 每月的Boss敌人 ID（可选）
}

// 运行时项目实例
export interface ProjectInstance {
  dataId: string;
  name: string;
  currentMonth: number;
  currentDay: number; // 当月第几天（1-30）
  progress: ProjectProgress;
  health: number; // 项目健康度（对战中的HP）
  maxHealth: number;
}
