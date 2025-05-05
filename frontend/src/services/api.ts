import axios from "axios";

// 从环境变量中获取API基础URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
}
console.log("API_BASE_URL:", API_BASE_URL);

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
  startInterview: (data: { positionType: string; difficulty: string }) => {
    return apiClient.post("/start_interview", data);
  },

  // 获取可用职位类型列表
  getPositionTypes: () => {
    return apiClient.get("/position_types");
  },

  // 提交问题回答
  answerQuestion: (
    sessionId: string,
    answer: string,
    videoAnalysis: unknown = null,
    audioAnalysis: unknown = null
  ) => {
    return apiClient.post("/answer_question", {
      session_id: sessionId,
      answer: answer,
      video_analysis: videoAnalysis,
      audio_analysis: audioAnalysis,
    });
  },

  // 分析视频数据
  evaluateVideo: (videoBlob: Blob, sessionId: string | null = null) => {
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
  evaluateAudio: (audioBlob: Blob, sessionId: string | null = null) => {
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
  getInterviewResults: (sessionId: string) => {
    return apiClient.get(`/interview_results/${sessionId}`);
  },

  // 处理评估结果并规范成TypeScript定义的结构
  processEvaluation: (rawEvaluation: unknown) => {
    // 使用TypeChat对原始评估文本进行处理
    // Note: 这部分需要迁移 typeChat.ts 和 interviewEvaluationSchema
    // 暂时返回原始结果，后续会实现这个功能
    return rawEvaluation;
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
  getSessionDetails: (sessionId: string) => {
    return apiClient.get(`/admin/sessions/${sessionId}`);
  },

  // 删除面试会话
  deleteSession: (sessionId: string) => {
    return apiClient.delete(`/admin/sessions/${sessionId}`);
  },

  // 职位类型管理接口
  // 获取管理员职位类型列表
  getAdminPositionTypes: () => {
    return apiClient.get("/admin/position_types");
  },

  // 获取单个职位类型详情
  getPositionTypeDetail: (id: string) => {
    return apiClient.get(`/admin/position_types/${id}`);
  },

  // 创建新职位类型
  createPositionType: (data: unknown) => {
    return apiClient.post("/admin/position_types", data);
  },

  // 更新职位类型
  updatePositionType: (id: string, data: unknown) => {
    return apiClient.put(`/admin/position_types/${id}`, data);
  },

  // 删除职位类型
  deletePositionType: (id: string) => {
    return apiClient.delete(`/admin/position_types/${id}`);
  },
};

export default interviewAPI;
