"use client";

import InterviewBreadcrumb from "@/components/InterviewBreadcrumb";
import interviewAPI from "@/services/api";
import formatEvaluationToMarkdown from "@/utils/formatEvaluationToMarkdown";
import { CheckCircleOutlined, SendOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Divider,
  Input,
  Result,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import Webcam from "react-webcam";

type VideoAnalysisType = {
  eyeContact: number;
  facialExpressions: number;
  bodyLanguage: number;
  confidence: number;
  recommendations: string;
};

type AudioAnalysisType = {
  clarity: number;
  pace: number;
  tone: number;
  fillerWordsCount: number;
  recommendations: string;
};

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

export default function InterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [finalEvaluation, setFinalEvaluation] = useState<string | null>(null);
  const [loadingFinalEvaluation, setLoadingFinalEvaluation] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);

  // 视频分析和音频分析相关状态 (仅内部使用，不再向用户展示实时分析)
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysisType | null>(
    null,
  );
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysisType | null>(
    null,
  );
  const [isRecording, setIsRecording] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // 添加一个ref来跟踪是否已经初始化
  const isInitialized = useRef(false);

  const silentAnalysis = useCallback(async () => {
    if (recordedChunks.length === 0) return;

    try {
      // 准备视频blob
      const videoBlob = new Blob(recordedChunks, { type: "video/webm" });

      // 后台分析视频
      const videoResponse = await interviewAPI.evaluateVideo(
        videoBlob,
        sessionId,
      );
      const videoData = videoResponse.data;

      // 更新状态，但不展示给用户
      const formattedVideoData = {
        eyeContact: videoData.eyeContact || 0,
        facialExpressions: videoData.facialExpressions || 0,
        bodyLanguage: videoData.bodyLanguage || 0,
        confidence: videoData.confidence || 0,
        recommendations: videoData.recommendations || "",
      };
      setVideoAnalysis(formattedVideoData);

      // 后台分析音频
      const audioResponse = await interviewAPI.evaluateAudio(
        videoBlob,
        sessionId,
      );
      const audioData = audioResponse.data;

      // 更新状态，但不展示给用户
      const formattedAudioData = {
        clarity: audioData.clarity || 0,
        pace: audioData.pace || 0,
        tone: audioData.tone || 0,
        fillerWordsCount: audioData.fillerWordsCount || 0,
        recommendations: audioData.recommendations || "",
      };
      setAudioAnalysis(formattedAudioData);

      // 清空录制内容，为下一次录制准备
      setRecordedChunks([]);

      // 如果需要，重新开始录制
      if (
        isRecording &&
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "inactive"
      ) {
        mediaRecorderRef.current.start();
      }
    } catch (error) {
      console.error("后台分析失败:", error);
      // 静默失败，不打扰用户
    }
  }, [isRecording, recordedChunks, sessionId]);

  // 自动开始录制视频
  const handleDataAvailable = useCallback(({ data }: { data: Blob }) => {
    if (data.size > 0) {
      setRecordedChunks((prev) => [...prev, data]);
    }
  }, []);

  const startRecording = useCallback(() => {
    // 检查摄像头流是否可用，如果不可用则使用重试机制
    if (!webcamRef.current || !webcamRef.current.stream) {
      console.log("摄像头流暂不可用，等待中...");

      // 设置最大重试次数和计数器
      const maxRetries = 10;
      let retryCount = 0;

      // 创建一个重试函数
      const retryStartRecording = () => {
        if (retryCount >= maxRetries) {
          console.error("无法获取摄像头流，已达到最大重试次数");
          messageApi.warning("无法访问摄像头，请检查您的摄像头权限并刷新页面");
          return;
        }

        retryCount++;
        console.log(`尝试获取摄像头流，第 ${retryCount} 次尝试...`);

        // 检查摄像头流是否已经可用
        if (webcamRef.current && webcamRef.current.stream) {
          console.log("摄像头流已可用，开始录制");
          actuallyStartRecording();
        } else {
          // 如果还不可用，等待500毫秒后重试
          setTimeout(retryStartRecording, 500);
        }
      };

      // 开始重试过程
      retryStartRecording();
      return;
    }

    // 如果摄像头流已经可用，直接开始录制
    actuallyStartRecording();

    function actuallyStartRecording() {
      setIsRecording(true);

      try {
        if (webcamRef.current && webcamRef.current.stream) {
          mediaRecorderRef.current = new MediaRecorder(
            webcamRef.current.stream,
            {
              mimeType: "video/webm",
            },
          );

          // 清除先前的事件监听器（如果有的话）
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.removeEventListener(
              "dataavailable",
              handleDataAvailable,
            );
          }

          // 重新添加事件监听器
          mediaRecorderRef.current.addEventListener(
            "dataavailable",
            handleDataAvailable,
          );

          // 添加错误处理
          mediaRecorderRef.current.addEventListener("error", (error) => {
            console.error("MediaRecorder 错误:", error);
          });

          // 重要：添加timeslice参数（1秒），确保每秒触发一次dataavailable事件
          mediaRecorderRef.current.start(1000);

          console.log("MediaRecorder 已启动，每1秒触发一次dataavailable事件");

          // 设置定期分析 - 每5秒分析一次
          recordingInterval.current = setInterval(() => {
            if (recordedChunks.length > 0 && !isComplete) {
              // 不影响用户体验，静默分析
              silentAnalysis();
            }
          }, 5000);
        } else {
          throw new Error("摄像头流不可用");
        }
      } catch (error) {
        console.error("无法开始录制:", error);
        messageApi.error("无法开始录制视频，请检查您的摄像头权限");
      }
    }
  }, [
    handleDataAvailable,
    isComplete,
    messageApi,
    recordedChunks.length,
    silentAnalysis,
  ]);

  // 获取初始面试问题
  useEffect(() => {
    // 如果已经初始化过，则不再执行
    if (isInitialized.current) return;

    const initializeInterview = () => {
      try {
        setCurrentQuestion("正在加载面试问题...");

        // 从 localStorage 获取初始问题
        const initialQuestion =
          typeof window !== "undefined"
            ? localStorage.getItem(`interview_${sessionId}_initial_question`)
            : null;

        if (initialQuestion) {
          // 如果有初始问题，直接使用
          setCurrentQuestion(initialQuestion);
          setLoading(false);

          // 自动开始录制
          startRecording();
        } else {
          // 如果没有初始问题（例如用户直接访问URL），尝试从后端获取当前会话的问题
          interviewAPI
            .getSessionDetails(sessionId)
            .then((response) => {
              if (
                response.data &&
                response.data.questions &&
                response.data.questions.length > 0
              ) {
                const lastQuestion =
                  response.data.questions[response.data.questions.length - 1];
                setCurrentQuestion(lastQuestion.question);
                setQuestionIndex(lastQuestion.questionIndex);
                setLoading(false);
                startRecording();
              } else {
                throw new Error("无法获取会话问题");
              }
            })
            .catch((error) => {
              console.error("获取会话问题失败:", error);
              messageApi.warning("无法获取面试问题，请从设置页面开始面试");
              setTimeout(() => {
                router.push("/setup");
              }, 2000);
            });
        }
      } catch (error) {
        console.error("获取面试问题失败:", error);
        messageApi.error("获取面试问题失败，请刷新页面重试");
      }
    };

    initializeInterview();
    // 标记已经初始化
    isInitialized.current = true;

    // 组件卸载时清理资源
    return () => {
      stopRecording();
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, [messageApi, router, sessionId, startRecording]); // 依赖项列表

  // 停止录制
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    // 清理定时器
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
    }
  };

  // 提交答案
  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      messageApi.warning("请输入你的回答");
      return;
    }

    try {
      setLoading(true);

      // 在提交前进行一次分析，确保获取最新数据
      await silentAnalysis();

      // 整合当前问题的多模态分析数据
      const currentQuestionData = {
        questionIndex: questionIndex,
        question: currentQuestion,
        answer: answer,
        videoAnalysis: videoAnalysis || null,
        audioAnalysis: audioAnalysis || null,
      };

      // 调用后端API提交答案，同时提交多模态分析数据
      const response = await interviewAPI.answerQuestion(
        sessionId,
        answer,
        currentQuestionData.videoAnalysis,
        currentQuestionData.audioAnalysis,
      );

      // 处理回答评估
      if (response.data.is_complete) {
        // 面试结束，停止录制
        stopRecording();

        // 设置面试完成状态
        setIsComplete(true);
        setLoadingFinalEvaluation(true);

        // 获取面试结果详情
        try {
          const resultResponse =
            await interviewAPI.getInterviewResults(sessionId);
          setFinalEvaluation(
            resultResponse.data.recommendations ||
              response.data.final_evaluation,
          );
          setOverallScore(resultResponse.data.overallScore);
        } catch (error) {
          console.error("获取详细评估结果失败:", error);
          setFinalEvaluation(response.data.final_evaluation);
        } finally {
          setLoadingFinalEvaluation(false);
        }
        messageApi.success("面试已完成，评估生成完毕");
      } else {
        // 继续面试
        // 格式化评估结果为可读性好的Markdown
        const formattedEvaluation = formatEvaluationToMarkdown(
          response.data.evaluation,
        );
        setEvaluation(formattedEvaluation);
        setCurrentQuestion(response.data.next_question);
        setQuestionIndex(questionIndex + 1);
        setAnswer("");

        // 清除当前分析数据，准备下一个问题
        setVideoAnalysis(null);
        setAudioAnalysis(null);

        // 重置录制
        setRecordedChunks([]);

        messageApi.success("回答已提交，请继续回答下一个问题");
      }
    } catch (error) {
      console.error("提交答案失败:", error);
      messageApi.error("提交答案失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 结束面试并查看结果
  const handleViewResults = () => {
    router.push(`/results/${sessionId}`);
  };

  return (
    <div>
      {contextHolder}
      <InterviewBreadcrumb
        currentStep="interview"
        sessionId={sessionId}
        questionIndex={questionIndex}
        isComplete={isComplete}
      />
      <Title level={2} className="text-center">
        智能模拟面试
      </Title>
      <Paragraph className="text-center">
        {isComplete
          ? "面试已完成，感谢您的参与！"
          : "请面对摄像头回答问题，系统将自动分析您的表现"}
      </Paragraph>

      <div className="interview-container">
        <div className="video-container">
          <Webcam audio={true} ref={webcamRef} className="video-preview" />
          {isRecording && (
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>正在录制...</span>
            </div>
          )}
        </div>

        <Divider />

        <Card
          title={`面试问题 ${questionIndex + 1}`}
          style={{ marginBottom: "20px" }}
        >
          <div className="markdown-content">
            <ReactMarkdown>{currentQuestion}</ReactMarkdown>
          </div>
        </Card>

        {!isComplete ? (
          <>
            <Card title="你的回答">
              <TextArea
                rows={6}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="在此输入你的回答..."
                style={{ marginBottom: "20px" }}
                disabled={loading}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmitAnswer}
                loading={loading}
                block
                disabled={loading || !answer.trim()}
              >
                提交回答
              </Button>
            </Card>

            {evaluation && (
              <Card title="上一问题的评估" style={{ marginTop: "20px" }}>
                <div className="markdown-content">
                  <ReactMarkdown>{evaluation}</ReactMarkdown>
                </div>
              </Card>
            )}
          </>
        ) : (
          <Card title="面试评估结果" style={{ marginTop: "20px" }}>
            {loadingFinalEvaluation ? (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <Spin size="large" />
                <Paragraph style={{ marginTop: 16 }}>
                  正在生成您的面试评估报告...
                </Paragraph>
              </div>
            ) : (
              <>
                {overallScore !== null && (
                  <div style={{ marginBottom: 16, textAlign: "center" }}>
                    <Result
                      icon={
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                      }
                      title="面试已完成"
                      subTitle={
                        <Space direction="vertical" size="small">
                          <span>总体得分</span>
                          <Tag
                            color={
                              overallScore >= 80
                                ? "success"
                                : overallScore >= 60
                                  ? "warning"
                                  : "error"
                            }
                            style={{ fontSize: 18, padding: "8px 16px" }}
                          >
                            {overallScore} / 100
                          </Tag>
                        </Space>
                      }
                    />
                  </div>
                )}
                <Divider orientation="left">评估摘要</Divider>
                <div className="markdown-content">
                  <ReactMarkdown>
                    {finalEvaluation || "暂无评估内容"}
                  </ReactMarkdown>
                </div>
                <Button
                  type="primary"
                  onClick={handleViewResults}
                  style={{ marginTop: 24 }}
                  block
                  size="large"
                >
                  查看详细分析报告
                </Button>
              </>
            )}
          </Card>
        )}
      </div>

      <style jsx global>{`
        .interview-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .video-container {
          position: relative;
          width: 100%;
          height: 300px;
          overflow: hidden;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .video-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          background-color: #f0f0f0;
        }

        .text-center {
          text-align: center;
        }

        .recording-indicator {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.5);
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
        }

        .recording-dot {
          width: 12px;
          height: 12px;
          background-color: #ff4d4f;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 1;
          }
        }

        .markdown-content {
          line-height: 1.8;
        }
      `}</style>
    </div>
  );
}
