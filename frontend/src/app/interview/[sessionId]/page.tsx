"use client";

import InterviewBreadcrumb from "@/components/InterviewBreadcrumb";
import interviewAPI from "@/services/api";
import formatEvaluationToMarkdown from "@/utils/formatEvaluationToMarkdown";
import {
  AudioOutlined,
  CheckCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
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

  const [isRecording, setIsRecording] = useState(false);

  const [isRecognitionAvailable, setIsRecognitionAvailable] = useState(false);
  const [recognizing, setRecognizing] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // 添加一个ref来跟踪是否已经初始化
  const isInitialized = useRef(false);

  // 检测语音识别是否可用
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        //@ts-expect-error 有些浏览器可能不支持 SpeechRecognition
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsRecognitionAvailable(true);
      } else {
        setIsRecognitionAvailable(false);
      }
    }
  }, []);

  const silentAnalysis = useCallback(async () => {
    if (recordedChunks.length === 0) {
      console.warn("没有录制的视频数据，无法进行分析");
      return;
    }

    try {
      const videoBlob = new Blob(recordedChunks, { type: "video/webm" });

      // 后台分析视频（现在后台会同时处理视频和音频分析）
      console.info("开始分析数据...");
      await interviewAPI.multimodalAnalysis(videoBlob, sessionId);
    } catch (error) {
      console.warn("后台分析失败:", error);
    } finally {
      console.info("分析完成");
    }
  }, [recordedChunks, sessionId]);

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

          mediaRecorderRef.current.addEventListener("stop", () => {
            console.log("MediaRecorder 停止录制");
            setIsRecording(false);
          });

          mediaRecorderRef.current.addEventListener("start", () => {
            console.log("MediaRecorder 开始录制");
            setIsRecording(true);
          });

          // 添加错误处理
          mediaRecorderRef.current.addEventListener("error", (error) => {
            console.log("MediaRecorder 错误:", error);
          });

          mediaRecorderRef.current.start(1000);
        } else {
          throw new Error("摄像头流不可用");
        }
      } catch (error) {
        console.error("无法开始录制:", error);
        messageApi.error("无法开始录制视频，请检查您的摄像头权限");
      }
    }
  }, [handleDataAvailable, messageApi]);

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
      } finally {
        // 标记已经初始化
        isInitialized.current = true;
      }
    };

    initializeInterview();

    return () => {
      stopRecording();
    };
  }, [messageApi, router, sessionId, startRecording]);

  // 停止录制
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  // 提交答案
  const handleSubmitAnswer = async () => {
    try {
      setLoading(true);

      const response = await interviewAPI.answerQuestion(sessionId, answer);

      // 处理回答评估
      if (response.data.is_complete) {
        // 设置面试完成状态
        setIsComplete(true);
        setLoadingFinalEvaluation(true);

        await silentAnalysis();
        stopRecording();
        messageApi.info("多模态分析完成，正在生成评估结果...");

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

  // 添加语音回答功能，文字回答作为备用
  const handleVoiceInput = useCallback(() => {
    if (!webcamRef.current || !webcamRef.current.stream) {
      messageApi.warning("无法访问麦克风，请检查权限并刷新页面");
      return;
    }

    try {
      //@ts-expect-error 有些浏览器可能不支持 SpeechRecognition
      const recognition = new (window.SpeechRecognition ||
        //@ts-expect-error 有些浏览器可能不支持 SpeechRecognition
        window.webkitSpeechRecognition)();

      recognition.lang = "zh-CN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log("语音识别开始");
        setRecognizing(true);
        messageApi.info("请开始说话...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.info("语音识别结果:", transcript);
        setAnswer(transcript);
        messageApi.success("语音输入成功");
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech") {
          return;
        }

        console.error("语音识别错误:", event.error);
        setRecognizing(false);
        messageApi.error("语音识别失败，请重试");
      };

      recognition.onend = () => {
        console.log("语音识别结束");
        setRecognizing(false);
        messageApi.info("语音识别已结束");
      };

      recognition.start();
    } catch (error) {
      console.error("语音识别初始化失败:", error);
      messageApi.error("语音识别不可用，请使用文字输入");
    }
  }, [messageApi]);

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

        {isComplete || (
          <Card title="你的回答">
            <TextArea
              rows={6}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="在此输入你的回答..."
              style={{ marginBottom: "20px" }}
              disabled={loading}
            />

            <Space
              size="small"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                width: "100%",
              }}
            >
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmitAnswer}
                loading={loading}
                block
                disabled={loading || !answer.trim() || !isRecording}
              >
                提交回答
              </Button>

              {isRecognitionAvailable && (
                <Button
                  type="default"
                  icon={<AudioOutlined />}
                  onClick={handleVoiceInput}
                  loading={recognizing}
                  block
                  disabled={loading || !isRecognitionAvailable || recognizing}
                >
                  使用语音回答
                </Button>
              )}
            </Space>
          </Card>
        )}

        {evaluation && (
          <Card title="上一问题的评估" style={{ marginTop: "20px" }}>
            <div className="markdown-content">
              <ReactMarkdown>{evaluation}</ReactMarkdown>
            </div>
          </Card>
        )}

        {isComplete && (
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
    </div>
  );
}
