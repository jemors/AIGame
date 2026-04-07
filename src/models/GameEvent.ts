import { EventType } from './types';

export interface EventChoice {
  text: string;
  effects: EventEffect[];
}

export interface EventEffect {
  type: 'funds' | 'morale' | 'reputation' | 'buff' | 'card' | 'employee_stat';
  target?: string; // buffId / cardId / employeeId
  value: number;
  duration?: number; // buff 持续时长（配合 durationUnit）
  durationUnit?: 'week' | 'month'; // 持续单位（默认为永久）
}

export interface EventPhase {
  text: string;
  speaker?: string;
  choices?: EventChoice[];
}

export interface GameEventData {
  id: string;
  name: string;
  type: EventType;
  triggerCondition: {
    month?: number; // 第几个月触发（项目内）
    day?: number; // 第几天
    minFunds?: number;
    maxFunds?: number;
    minEmployees?: number;
    probability?: number; // 0-1 随机事件概率
  };
  priority: number;
  phases: EventPhase[];
  effects: EventEffect[];
}
