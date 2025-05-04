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
