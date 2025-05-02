import { SendOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Input, Progress, Typography, message } from 'antd';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import ReactMarkdown from 'react-markdown'; // 导入ReactMarkdown

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

const InterviewPage = () => {
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  // const [isRecording, setIsRecording] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [finalEvaluation, setFinalEvaluation] = useState(null);
  
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // 获取初始面试问题
  useEffect(() => {
    const fetchFirstQuestion = async () => {
      try {
        // 这里假设start_interview API会返回第一个问题
        // 在实际应用中，你可能需要单独的API来获取当前问题
        setCurrentQuestion('正在加载面试问题...');
        
        // 模拟API调用延迟
        setTimeout(() => {
          setCurrentQuestion('请简单介绍一下你自己以及你的专业背景。');
          setLoading(false);
        }, 1500);
      } catch (error) {
        console.error('获取面试问题失败:', error);
        message.error('获取面试问题失败，请刷新页面重试');
      }
    };

    fetchFirstQuestion();
  }, [sessionId]);

  // 处理视频录制
  const handleStartCapture = () => {
    setCapturing(true);
    
    // 使用MediaRecorder API录制视频
    if (webcamRef.current && webcamRef.current.stream) {
      mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
        mimeType: 'video/webm',
      });
      
      mediaRecorderRef.current.addEventListener('dataavailable', handleDataAvailable);
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
      message.warning('没有录制视频，无法分析');
      return;
    }

    try {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('video', blob);

      // 调用后端API分析视频
      const response = await axios.post('http://localhost:5000/api/evaluate_video', formData);
      
      // 在实际项目中，这里应该处理视频分析的结果
      message.success('视频分析完成');
      console.log('视频分析结果:', response.data);
      
      // 清除录制的视频数据
      setRecordedChunks([]);
    } catch (error) {
      console.error('视频分析失败:', error);
      message.error('视频分析失败，请重试');
    }
  };

  // 提交答案
  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      message.warning('请输入你的回答');
      return;
    }

    try {
      setLoading(true);
      
      // 调用后端API提交答案
      const response = await axios.post('http://localhost:5000/api/answer_question', {
        session_id: sessionId,
        answer: answer
      });

      // 处理回答评估
      if (response.data.is_complete) {
        // 面试结束
        setIsComplete(true);
        setFinalEvaluation(response.data.final_evaluation);
        message.success('面试已完成，正在生成最终评估');
      } else {
        // 继续面试
        setEvaluation(response.data.evaluation);
        setCurrentQuestion(response.data.next_question);
        setQuestionIndex(questionIndex + 1);
        setAnswer('');
        message.success('回答已提交，请继续回答下一个问题');
      }
    } catch (error) {
      console.error('提交答案失败:', error);
      message.error('提交答案失败，请重试');
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
      <Title level={2} className="text-center">智能模拟面试</Title>
      <Paragraph className="text-center">
        {isComplete 
          ? '面试已完成，感谢您的参与！' 
          : '请面对摄像头回答问题，系统将自动分析您的表现'}
      </Paragraph>

      <div className="interview-container">
        <div className="video-container">
          <Webcam
            audio={true}
            ref={webcamRef}
            className="video-preview"
          />
        </div>

        <div className="controls-container">
          <Button 
            type={capturing ? "danger" : "primary"}
            icon={<VideoCameraOutlined />}
            onClick={capturing ? handleStopCapture : handleStartCapture}
          >
            {capturing ? '停止录制' : '开始录制'}
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
          style={{ marginBottom: '20px' }}
        />

        <Card title="面试问题" style={{ marginBottom: '20px' }}>
          {/* 使用ReactMarkdown替换原来的Paragraph组件来渲染Markdown格式的内容 */}
          <div className="markdown-content">
            <ReactMarkdown>{currentQuestion}</ReactMarkdown>
          </div>
        </Card>

        {!isComplete ? (
          <Card title="你的回答">
            <TextArea
              rows={6}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="在此输入你的回答..."
              style={{ marginBottom: '20px' }}
              disabled={loading}
            />
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              onClick={handleSubmitAnswer}
              loading={loading}
              block
            >
              提交回答
            </Button>
          </Card>
        ) : (
          <Card title="面试评估" style={{ marginTop: '20px' }}>
            {/* 同样使用ReactMarkdown渲染最终评估结果 */}
            <div className="markdown-content">
              <ReactMarkdown>{finalEvaluation || '正在生成最终评估...'}</ReactMarkdown>
            </div>
            <Button 
              type="primary" 
              onClick={handleViewResults}
              style={{ marginTop: '16px' }}
              block
            >
              查看详细结果
            </Button>
          </Card>
        )}

        {evaluation && (
          <Card title="上一问题的评估" style={{ marginTop: '20px' }}>
            {/* 同样使用ReactMarkdown渲染评估结果 */}
            <div className="markdown-content">
              <ReactMarkdown>{evaluation}</ReactMarkdown>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InterviewPage;