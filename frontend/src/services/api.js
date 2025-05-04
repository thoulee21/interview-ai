import axios from "axios";
import { typeChatTransform, interviewEvaluationSchema } from '../utils/typeChat';

// 从环境变量中获取API基础URL，如未设置则使用默认值
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 50000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 面试相关API
const interviewAPI = {
  // 开始新的面试会话
  startInterview: (data) => {
    return apiClient.post("/start_interview", data);
  },

  // 获取可用职位类型列表
  getPositionTypes: () => {
    return apiClient.get("/position_types");
  },

  // 提交问题回答
  answerQuestion: (sessionId, answer, videoAnalysis = null, audioAnalysis = null) => {
    return apiClient.post("/answer_question", {
      session_id: sessionId,
      answer: answer,
      video_analysis: videoAnalysis,
      audio_analysis: audioAnalysis
    });
  },

  // 分析视频数据
  evaluateVideo: (videoBlob, sessionId = null) => {
    const formData = new FormData();
    formData.append("video", videoBlob);
    if (sessionId) {
      formData.append("session_id", sessionId);
    }

    return apiClient.post("/evaluate_video", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // 分析音频数据
  evaluateAudio: (audioBlob, sessionId = null) => {
    const formData = new FormData();
    formData.append("audio", audioBlob);
    if (sessionId) {
      formData.append("session_id", sessionId);
    }

    return apiClient.post("/evaluate_audio", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // 获取面试结果
  getInterviewResults: (sessionId) => {
    return apiClient.get(`/interview_results/${sessionId}`);
  },

  // 处理评估结果并规范成TypeScript定义的结构
  processEvaluation: (rawEvaluation) => {
    // 使用TypeChat对原始评估文本进行处理
    return typeChatTransform(rawEvaluation, interviewEvaluationSchema);
  },

  // 获取健康状态
  getHealthStatus: () => {
    return apiClient.get("/health");
  },
  
  // 管理后台API
  // 获取所有面试会话
  getAllSessions: () => {
    return apiClient.get("/admin/sessions");
  },
  
  // 获取单个面试会话详情
  getSessionDetails: (sessionId) => {
    return apiClient.get(`/admin/sessions/${sessionId}`);
  },
  
  // 删除面试会话
  deleteSession: (sessionId) => {
    return apiClient.delete(`/admin/sessions/${sessionId}`);
  }
};

export default interviewAPI;
