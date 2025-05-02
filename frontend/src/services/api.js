import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 面试相关API
const interviewAPI = {
  // 开始新的面试会话
  startInterview: (data) => {
    return apiClient.post('/start_interview', data);
  },
  
  // 提交回答并获取下一个问题
  answerQuestion: (sessionId, answer) => {
    return apiClient.post('/answer_question', {
      session_id: sessionId,
      answer: answer
    });
  },
  
  // 分析视频数据
  evaluateVideo: (videoBlob) => {
    const formData = new FormData();
    formData.append('video', videoBlob);
    
    return apiClient.post('/evaluate_video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  
  // 分析音频数据
  evaluateAudio: (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    return apiClient.post('/evaluate_audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  
  // 获取面试结果
  getInterviewResults: (sessionId) => {
    return apiClient.get(`/interview_results/${sessionId}`);
  }
};

export default interviewAPI;