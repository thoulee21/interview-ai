/**
 * 面试评估结果的 TypeScript 类型定义
 * 用于与 TypeChat 配合，规范大模型输出
 */

// 评分区间类型
export type Score = number; // 限制为1-100的整数

// 各项得分类型定义
export interface ScoreDetails {
  overallScore: Score;      // 总体得分
  contentScore: Score;      // 内容评分（专业知识、逻辑思维）
  deliveryScore: Score;     // 表达评分（语言组织、表达流畅性）
  nonVerbalScore: Score;    // 非语言表现评分（肢体语言、面部表情）
}

// 问题评估结果
export interface QuestionScore {
  question: string;         // 问题内容
  answer: string;           // 回答内容
  score: Score;             // 得分（1-100）
  feedback: string;         // 反馈意见
}

// 视频分析结果
export interface VideoAnalysis {
  eyeContact: number;       // 眼神接触评分（1-10）
  facialExpressions: number; // 面部表情评分（1-10）
  bodyLanguage: number;     // 肢体语言评分（1-10）
  confidence: number;       // 自信程度评分（1-10）
  recommendations: string;  // 建议
}

// 音频分析结果
export interface AudioAnalysis {
  clarity: number;          // 清晰度评分（1-10）
  pace: number;             // 语速评分（1-10）
  tone: number;             // 语调评分（1-10）
  fillerWordsCount: number; // 填充词使用次数
  recommendations: string;  // 建议
}

// 完整的面试评估结果
export interface InterviewEvaluation {
  overallScore: Score;      // 总体得分
  contentScore: Score;      // 内容评分
  deliveryScore: Score;     // 表达评分
  nonVerbalScore: Score;    // 非语言表现评分
  strengths: string[];      // 优势列表（通常是3个）
  improvements: string[];   // 需要改进的方面列表（通常是3个）
  recommendations: string;  // 整体改进建议
  questionScores: QuestionScore[]; // 各问题的评分和反馈
  videoAnalysis: VideoAnalysis; // 视频分析结果
  audioAnalysis: AudioAnalysis; // 音频分析结果
}