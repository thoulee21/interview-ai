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
  timeout: 2 * 60 * 1000, // 请求超时设置为120秒
  headers: {
    "Content-Type": "application/json",
  },
});

// 添加请求拦截器，自动添加认证令牌
apiClient.interceptors.request.use((config) => {
  // 从localStorage获取认证令牌
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 添加响应拦截器，处理身份验证和账户状态问题
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 检查是否是账户已被停用的错误
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data &&
      error.response.data.status === "inactive"
    ) {
      // 用户账户被停用，强制登出
      if (typeof window !== "undefined") {
        // 清除认证信息
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");

        // 显示通知并重定向
        alert("您的账户已被停用，请联系管理员。");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// 认证相关API
const authAPI = {
  // 用户登录
  login: (data: { username: string; password: string }) => {
    return apiClient.post("/auth/login", data);
  },

  // 用户注册
  register: (data: { username: string; password: string; email?: string }) => {
    return apiClient.post("/auth/register", data);
  },

  // 获取用户资料
  getUserProfile: () => {
    return apiClient.get("/auth/profile");
  },

  // 更新用户资料
  updateProfile: (data: { email?: string }) => {
    return apiClient.put("/auth/update-profile", data);
  },

  // 修改密码
  changePassword: (data: { old_password: string; new_password: string }) => {
    return apiClient.post("/auth/change-password", data);
  },

  // 获取用户列表（管理员功能）
  getAllUsers: () => {
    return apiClient.get("/auth/users");
  },

  // 检查是否为管理员
  isAdmin: () => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          return user.is_admin === true;
        } catch {
          return false;
        }
      }
    }
    return false;
  },

  // 检查用户是否已登录
  isAuthenticated: () => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("auth_token");
    }
    return false;
  },

  // 用户登出
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
    }
  },

  // 获取用户面试会话列表
  getUserSessions: () => {
    return apiClient.get("/auth/my-sessions");
  },
};

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
  answerQuestion: (sessionId: string, answer: string) => {
    return apiClient.post("/answer_question", {
      session_id: sessionId,
      answer: answer,
    });
  },

  // 分析视频数据
  multimodalAnalysis: (videoBlob: Blob, sessionId: string | null = null) => {
    const formData = new FormData();
    formData.append("video", videoBlob);
    if (sessionId) {
      formData.append("session_id", sessionId);
    }

    return apiClient.post("/multimodal_analysis", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // 获取面试结果
  getInterviewResults: (sessionId: string) => {
    return apiClient.get(`/interview_results/${sessionId}`);
  },

  // 获取健康状态
  getHealthStatus: () => {
    return apiClient.get("/health");
  },

  // 管理后台API
  // 获取所有面试会话
  getAllSessions: (params?: { userId?: number }) => {
    return apiClient.get("/admin/sessions", { params });
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

  // 用户管理接口
  // 获取所有用户
  getAllUsers: () => {
    return apiClient.get("/admin/users");
  },

  // 获取单个用户详情
  getUserDetail: (id: string) => {
    return apiClient.get(`/admin/users/${id}`);
  },

  // 创建新用户
  createUser: (data: {
    username: string;
    password?: string;
    email?: string;
    is_admin?: boolean;
  }) => {
    return apiClient.post("/admin/users", data);
  },

  // 更新用户
  updateUser: (
    id: string,
    data: { email?: string; is_admin?: boolean; status?: string },
  ) => {
    return apiClient.put(`/admin/users/${id}`, data);
  },

  // 删除用户
  deleteUser: (id: string) => {
    return apiClient.delete(`/admin/users/${id}`);
  },

  // 重置用户密码
  resetUserPassword: (id: string) => {
    return apiClient.post(`/admin/users/${id}/reset-password`);
  },
};

export { apiClient, authAPI, interviewAPI };
export default interviewAPI;
