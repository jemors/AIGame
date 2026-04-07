export interface StudioData {
  name: string;
  level: number;
  reputation: number; // 声望 0-100
  funds: number; // 当前资金
  monthlyRent: number; // 月租金
  maxEmployees: number; // 最大员工数
  environment: {
    morale: number; // 团队氛围 0-100
    creativity: number; // 创意指数 0-100
    efficiency: number; // 工作效率 0-100
  };
}
