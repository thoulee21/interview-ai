export type SessionType = {
  sessionId: string;
  positionType: string;
  difficulty: string;
  startTime: string;
  status: string;
  questionCount: number;
  answeredCount: number;
  duration?: number | null;
};

// 定义用户信息类型
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  last_login?: string;
}

// 定义会话类型
export interface InterviewSession {
  session_id: string;
  position_type: string;
  difficulty: string;
  start_time: string;
  end_time?: string;
  status: string;
}
