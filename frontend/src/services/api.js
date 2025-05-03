import axios from "axios";

// 从环境变量中获取API基础URL，如未设置则使用默认值
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    "API_BASE_URL is not set. Please set it in your environment variables."
  );
}

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

  // 提交回答并获取下一个问题
  answerQuestion: (sessionId, answer) => {
    return apiClient.post("/answer_question", {
      session_id: sessionId,
      answer: answer,
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

  // 获取健康状态
  getHealthStatus: () => {
    return apiClient.get("/health");
  },
};

export default interviewAPI;
