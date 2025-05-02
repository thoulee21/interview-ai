import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  Card,
  Col,
  Empty,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Tag,
  Typography,
} from "antd";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const { Title, Paragraph, Text } = Typography;

const ResultPage = () => {
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);

  useEffect(() => {
    // 模拟从API获取数据
    const fetchResults = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/interview_results/${sessionId}`
        );
        setResults(response.data);
      } catch (error) {
        console.error("获取面试结果失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  // 根据分数返回评价等级和颜色
  const getScoreLevel = (score) => {
    if (score >= 85) return { text: "优秀", color: "green" };
    if (score >= 70) return { text: "良好", color: "blue" };
    if (score >= 60) return { text: "合格", color: "orange" };
    return { text: "需改进", color: "red" };
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Spin size="large" />
        <p style={{ marginTop: 20 }}>正在加载面试评估结果...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Empty description="未找到面试结果" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2} className="text-center">
        面试评估结果
      </Title>
      <Paragraph className="text-center">
        基于多模态AI技术的综合分析评估
      </Paragraph>

      {/* 总体得分卡片 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Statistic
              title="总体得分"
              value={results.overallScore}
              suffix={`/100 (${getScoreLevel(results.overallScore).text})`}
              valueStyle={{ color: getScoreLevel(results.overallScore).color }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Statistic
              title="内容评分"
              value={results.contentScore}
              suffix="/100"
              valueStyle={{ color: getScoreLevel(results.contentScore).color }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Statistic
              title="表达评分"
              value={results.deliveryScore}
              suffix="/100"
              valueStyle={{ color: getScoreLevel(results.deliveryScore).color }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Statistic
              title="非语言表现"
              value={results.nonVerbalScore}
              suffix="/100"
              valueStyle={{
                color: getScoreLevel(results.nonVerbalScore).color,
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* 优势和改进点 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card
            title="优势"
            extra={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
          >
            <List
              dataSource={results.strengths}
              renderItem={(item) => (
                <List.Item>
                  <Text>✓ {item}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title="需要改进"
            extra={<ExclamationCircleOutlined style={{ color: "#faad14" }} />}
          >
            <List
              dataSource={results.improvements}
              renderItem={(item) => (
                <List.Item>
                  <Text>• {item}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 各问题得分 */}
      <Card title="各问题评估" style={{ marginBottom: 24 }}>
        <List
          itemLayout="vertical"
          dataSource={results.questionScores}
          renderItem={(item) => (
            <List.Item>
              <Text strong>{item.question}</Text>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  margin: "8px 0",
                }}
              >
                <Progress
                  percent={item.score}
                  size="small"
                  status={item.score >= 60 ? "success" : "exception"}
                  style={{ flex: 1, marginRight: 16 }}
                />
                <Tag color={getScoreLevel(item.score).color}>
                  {item.score}分
                </Tag>
              </div>
              <Text type="secondary">{item.feedback}</Text>
            </List.Item>
          )}
        />
      </Card>

      {/* 视频和音频分析 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="视频分析">
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text>眼神接触</Text>
                <Text strong>{results.videoAnalysis.eyeContact}/10</Text>
              </div>
              <Progress
                percent={results.videoAnalysis.eyeContact * 10}
                size="small"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text>面部表情</Text>
                <Text strong>{results.videoAnalysis.facialExpressions}/10</Text>
              </div>
              <Progress
                percent={results.videoAnalysis.facialExpressions * 10}
                size="small"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text>肢体语言</Text>
                <Text strong>{results.videoAnalysis.bodyLanguage}/10</Text>
              </div>
              <Progress
                percent={results.videoAnalysis.bodyLanguage * 10}
                size="small"
              />
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text>自信程度</Text>
                <Text strong>{results.videoAnalysis.confidence}/10</Text>
              </div>
              <Progress
                percent={results.videoAnalysis.confidence * 10}
                size="small"
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="音频分析">
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text>清晰度</Text>
                <Text strong>{results.audioAnalysis.clarity}/10</Text>
              </div>
              <Progress
                percent={results.audioAnalysis.clarity * 10}
                size="small"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text>语速</Text>
                <Text strong>{results.audioAnalysis.pace}/10</Text>
              </div>
              <Progress
                percent={results.audioAnalysis.pace * 10}
                size="small"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text>语调</Text>
                <Text strong>{results.audioAnalysis.tone}/10</Text>
              </div>
              <Progress
                percent={results.audioAnalysis.tone * 10}
                size="small"
              />
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text>填充词使用</Text>
                <Text strong>{results.audioAnalysis.fillerWordsCount} 次</Text>
              </div>
              <Progress
                percent={
                  (10 - Math.min(10, results.audioAnalysis.fillerWordsCount)) *
                  10
                }
                size="small"
                status={
                  results.audioAnalysis.fillerWordsCount <= 5
                    ? "success"
                    : "exception"
                }
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 整体建议 */}
      <Card title="改进建议" style={{ marginBottom: 24 }}>
        <Paragraph>{results.recommendations}</Paragraph>
      </Card>
    </div>
  );
};

export default ResultPage;
