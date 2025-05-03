import {
  CheckCircleOutlined,
  SendOutlined,
  VideoCameraOutlined,
  CloseOutlined
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Divider,
  Input,
  message,
  Progress,
  Result,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import React, { useEffect, useRef, useState } from "react";
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
  
  // 视频分析相关状态
  const [videoAnalysis, setVideoAnalysis] = useState(null);
  const [loadingVideoAnalysis, setLoadingVideoAnalysis] = useState(false);
  const [showVideoAnalysis, setShowVideoAnalysis] = useState(false);

  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);

  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

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
  }, [sessionId, location.state, navigate]);

  // 处理视频录制
  const handleStartCapture = () => {
    setCapturing(true);

    // 使用MediaRecorder API录制视频
    if (webcamRef.current && webcamRef.current.stream) {
      mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
        mimeType: "video/webm",
      });

      mediaRecorderRef.current.addEventListener(
        "dataavailable",
        handleDataAvailable
      );
      mediaRecorderRef.current.start();
    }
  };

  const handleDataAvailable = ({ data }) => {
    if (data.size > 0) {
      setRecordedChunks((prev) => [...prev, data]);
    }
  };

  const handleStopCapture = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setCapturing(false);
  };

  // 提交视频进行分析
  const handleAnalyzeVideo = async () => {
    if (recordedChunks.length === 0) {
      message.warning("没有录制视频，无法分析");
      return;
    }

    try {
      setLoadingVideoAnalysis(true);
      setShowVideoAnalysis(true);
      const blob = new Blob(recordedChunks, { type: "video/webm" });

      // 调用后端API分析视频，使用interviewAPI服务
      const response = await interviewAPI.evaluateVideo(blob, sessionId);

      // 处理视频分析结果
      const analysisData = response.data;
      
      // 转换后端数据为前端使用格式（与ResultPage保持一致）
      const formattedData = {
        eyeContact: analysisData.eye_contact || 0,
        facialExpressions: analysisData.facial_expressions || 0,
        bodyLanguage: analysisData.body_language || 0,
        confidence: analysisData.confidence || 0,
        recommendations: analysisData.recommendations || "视频分析完成，请继续回答问题。"
      };
      
      setVideoAnalysis(formattedData);
      message.success("视频分析完成");

      // 清除录制的视频数据
      setRecordedChunks([]);
    } catch (error) {
      console.error("视频分析失败:", error);
      message.error("视频分析失败，请重试");
    } finally {
      setLoadingVideoAnalysis(false);
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

      // 调用后端API提交答案，使用interviewAPI服务
      const response = await interviewAPI.answerQuestion(sessionId, answer);

      // 处理回答评估
      if (response.data.is_complete) {
        // 面试结束
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
        </div>

        <div className="controls-container">
          <Button
            type={capturing ? "danger" : "primary"}
            icon={<VideoCameraOutlined />}
            onClick={capturing ? handleStopCapture : handleStartCapture}
          >
            {capturing ? "停止录制" : "开始录制"}
          </Button>

          <Button
            type="default"
            disabled={recordedChunks.length === 0}
            onClick={handleAnalyzeVideo}
          >
            分析视频
          </Button>
        </div>

        <Divider />

        <Progress
          percent={questionIndex * 20}
          status="active"
          style={{ marginBottom: "20px" }}
        />

        {/* 视频分析结果展示 */}
        {showVideoAnalysis && !isComplete && (
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>实时视频分析</span>
                <Button 
                  type="text" 
                  icon={<CloseOutlined />} 
                  onClick={() => setShowVideoAnalysis(false)}
                  size="small"
                />
              </div>
            } 
            style={{ marginBottom: "20px" }}
          >
            {loadingVideoAnalysis ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Spin size="default" />
                <Paragraph style={{ marginTop: 10 }}>正在分析视频行为表现...</Paragraph>
              </div>
            ) : (
              <>
                <Row gutter={16}>
                  <Col xs={24} md={24}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span>眼神接触</span>
                        <span><strong>{videoAnalysis?.eyeContact.toFixed(1)}</strong>/10</span>
                      </div>
                      <Progress 
                        percent={videoAnalysis?.eyeContact * 10} 
                        size="small"
                        status={videoAnalysis?.eyeContact >= 7 ? "success" : "normal"}
                      />
                    </div>
                    
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span>面部表情</span>
                        <span><strong>{videoAnalysis?.facialExpressions.toFixed(1)}</strong>/10</span>
                      </div>
                      <Progress 
                        percent={videoAnalysis?.facialExpressions * 10} 
                        size="small"
                        status={videoAnalysis?.facialExpressions >= 7 ? "success" : "normal"}
                      />
                    </div>
                    
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span>肢体语言</span>
                        <span><strong>{videoAnalysis?.bodyLanguage.toFixed(1)}</strong>/10</span>
                      </div>
                      <Progress 
                        percent={videoAnalysis?.bodyLanguage * 10} 
                        size="small"
                        status={videoAnalysis?.bodyLanguage >= 7 ? "success" : "normal"}
                      />
                    </div>
                    
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span>自信程度</span>
                        <span><strong>{videoAnalysis?.confidence.toFixed(1)}</strong>/10</span>
                      </div>
                      <Progress 
                        percent={videoAnalysis?.confidence * 10} 
                        size="small"
                        status={videoAnalysis?.confidence >= 7 ? "success" : "normal"}
                      />
                    </div>
                  </Col>
                </Row>
                
                <Divider style={{ margin: '12px 0' }}/>
                
                <div>
                  <strong>分析建议：</strong>
                  <Paragraph>{videoAnalysis?.recommendations}</Paragraph>
                </div>
              </>
            )}
          </Card>
        )}

        <Card title="面试问题" style={{ marginBottom: "20px" }}>
          {/* 使用ReactMarkdown替换原来的Paragraph组件来渲染Markdown格式的内容 */}
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
                {/* 同样使用ReactMarkdown渲染评估结果 */}
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
