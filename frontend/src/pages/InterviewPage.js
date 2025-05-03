import { CheckCircleOutlined, SendOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Divider,
  Input,
  message,
  Progress,
  Result,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Webcam from "react-webcam";
import InterviewBreadcrumb from "../components/InterviewBreadcrumb";
import interviewAPI from "../services/api";

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

const InterviewPage = () => {
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [finalEvaluation, setFinalEvaluation] = useState(null);
  const [loadingFinalEvaluation, setLoadingFinalEvaluation] = useState(false);
  const [overallScore, setOverallScore] = useState(null);

  // 视频分析和音频分析相关状态 (仅内部使用，不再向用户展示实时分析)
  const [videoAnalysis, setVideoAnalysis] = useState(null);
  const [audioAnalysis, setAudioAnalysis] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingInterval = useRef(null);
  const [recordedChunks, setRecordedChunks] = useState([]);

  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const silentAnalysis = useCallback(async () => {
    if (recordedChunks.length === 0) return;

    try {
      // 准备视频blob
      const videoBlob = new Blob(recordedChunks, { type: "video/webm" });

      // 后台分析视频
      const videoResponse = await interviewAPI.evaluateVideo(
        videoBlob,
        sessionId
      );
      const videoData = videoResponse.data;

      // 更新状态，但不展示给用户
      const formattedVideoData = {
        eyeContact: videoData.eye_contact || 0,
        facialExpressions: videoData.facial_expressions || 0,
        bodyLanguage: videoData.body_language || 0,
        confidence: videoData.confidence || 0,
        recommendations: videoData.recommendations || "",
      };
      setVideoAnalysis(formattedVideoData);

      // 后台分析音频
      const audioResponse = await interviewAPI.evaluateAudio(
        videoBlob,
        sessionId
      );
      const audioData = audioResponse.data;

      // 更新状态，但不展示给用户
      const formattedAudioData = {
        clarity: audioData.clarity || 0,
        pace: audioData.pace || 0,
        tone: audioData.tone || 0,
        fillerWordsCount: audioData.filler_words_count || 0,
        recommendations: audioData.recommendations || "",
      };
      setAudioAnalysis(formattedAudioData);

      // 清空录制内容，为下一次录制准备
      setRecordedChunks([]);

      // 如果需要，重新开始录制
      if (isRecording && mediaRecorderRef.current.state === "inactive") {
        mediaRecorderRef.current.start();
      }
    } catch (error) {
      console.error("后台分析失败:", error);
      // 静默失败，不打扰用户
    }
  }, [isRecording, recordedChunks, sessionId]);

  const startRecording = useCallback(() => {
    if (!webcamRef.current || !webcamRef.current.stream) return;

    setIsRecording(true);

    try {
      mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
        mimeType: "video/webm",
      });

      mediaRecorderRef.current.addEventListener(
        "dataavailable",
        handleDataAvailable
      );
      mediaRecorderRef.current.start();

      // 设置定期分析 - 每30秒分析一次（实际环境中可调整周期）
      recordingInterval.current = setInterval(() => {
        if (recordedChunks.length > 0 && !isComplete) {
          // 不影响用户体验，静默分析
          silentAnalysis();
        }
      }, 30000);
    } catch (error) {
      console.error("无法开始录制:", error);
    }
  }, [isComplete, recordedChunks.length, silentAnalysis]);

  // 获取初始面试问题
  useEffect(() => {
    const initializeInterview = () => {
      try {
        setCurrentQuestion("正在加载面试问题...");

        // 从导航时传递的state中获取初始问题
        const initialQuestion = location.state?.initialQuestion;

        if (initialQuestion) {
          // 如果state中有初始问题，直接使用
          setCurrentQuestion(initialQuestion);
          setLoading(false);

          // 自动开始录制
          startRecording();
        } else {
          // 如果没有初始问题（例如用户直接访问URL），可以考虑重定向回设置页面
          // 或者向后端请求当前会话的问题
          message.warning("无法获取面试问题，请从设置页面开始面试");
          setTimeout(() => {
            navigate("/setup");
          }, 2000);
        }
      } catch (error) {
        console.error("获取面试问题失败:", error);
        message.error("获取面试问题失败，请刷新页面重试");
      }
    };

    initializeInterview();

    // 组件卸载时清理资源
    return () => {
      stopRecording();
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, [sessionId, location.state, navigate, startRecording]);

  // 自动开始录制视频
  const handleDataAvailable = ({ data }) => {
    if (data.size > 0) {
      setRecordedChunks((prev) => [...prev, data]);
    }
  };

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
      message.warning("请输入你的回答");
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
        currentQuestionData.audioAnalysis
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
          const resultResponse = await interviewAPI.getInterviewResults(
            sessionId
          );
          setFinalEvaluation(
            resultResponse.data.recommendations ||
              response.data.final_evaluation
          );
          setOverallScore(resultResponse.data.overallScore);
        } catch (error) {
          console.error("获取详细评估结果失败:", error);
          setFinalEvaluation(response.data.final_evaluation);
        } finally {
          setLoadingFinalEvaluation(false);
        }
        message.success("面试已完成，评估生成完毕");
      } else {
        // 继续面试
        setEvaluation(response.data.evaluation);
        setCurrentQuestion(response.data.next_question);
        setQuestionIndex(questionIndex + 1);
        setAnswer("");

        // 清除当前分析数据，准备下一个问题
        setVideoAnalysis(null);
        setAudioAnalysis(null);

        // 重置录制
        setRecordedChunks([]);

        message.success("回答已提交，请继续回答下一个问题");
      }
    } catch (error) {
      console.error("提交答案失败:", error);
      message.error("提交答案失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 结束面试并查看结果
  const handleViewResults = () => {
    navigate(`/results/${sessionId}`);
  };

  return (
    <div>
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

        <Progress
          percent={questionIndex * 20}
          status="active"
          style={{ marginBottom: "20px" }}
        />

        <Card title="面试问题" style={{ marginBottom: "20px" }}>
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
    </div>
  );
};

export default InterviewPage;
