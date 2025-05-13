"use client";

import interviewAPI from "@/services/api";
import type { UserProfile } from "@/types";
import formatEvaluationToMarkdown from "@/utils/formatEvaluationToMarkdown";
import {
  ArrowLeftOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  SoundOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  message,
  Progress,
  Row,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

type QuestionType = {
  id: string;
  questionIndex: number;
  question: string;
  answer?: string | null;
  evaluation?: string | null;
  createdAt: string;
};

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

type AnalysisType = {
  id: string;
  videoAnalysis?: VideoAnalysisType;
  audioAnalysis?: AudioAnalysisType;
  createdAt: string;
};

type SessionDetailsType = {
  sessionId: string;
  positionType: string;
  difficulty: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  questions: Array<QuestionType>;
  analyses?: Array<AnalysisType> | null;
  userInfo: UserProfile;
};

const { Title, Paragraph, Text } = Typography;

export default function AdminSessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const router = useRouter();

  const [sessionDetails, setSessionDetails] =
    useState<SessionDetailsType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await interviewAPI.getSessionDetails(sessionId);
      setSessionDetails(response.data);
    } catch (error) {
      console.error("获取会话详情失败:", error);
      message.error("获取会话详情失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionDetails();
  }, [fetchSessionDetails, sessionId]);

  const handleViewResults = () => {
    router.push(`/results/${sessionId}`);
  };

  const handleBack = () => {
    router.push("/admin");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 20 }}>正在加载会话详情...</Paragraph>
      </div>
    );
  }

  if (!sessionDetails) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Paragraph>找不到会话详情</Paragraph>
        <Button type="primary" onClick={handleBack}>
          返回管理页面
        </Button>
      </div>
    );
  }

  const formatDateTime = (dateString: string | null) => {
    return dateString ? new Date(dateString).toLocaleString() : "尚未结束";
  };

  // 计算会话时长
  const calculateDuration = () => {
    if (!sessionDetails.startTime || !sessionDetails.endTime) return "进行中";

    const start = new Date(sessionDetails.startTime).getTime();
    const end = new Date(sessionDetails.endTime).getTime();
    const durationMinutes = Math.round((end - start) / 60000); // 毫秒转分钟

    if (durationMinutes < 60) {
      return `${durationMinutes} 分钟`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return `${hours} 小时 ${minutes} 分钟`;
    }
  };

  // 问题列表表格列
  const questionsColumns = [
    {
      title: "索引",
      dataIndex: "questionIndex",
      key: "questionIndex",
      width: 60,
      render: (text: string) => <Tag>{text + 1}</Tag>,
    },
    {
      title: "问题内容",
      dataIndex: "question",
      key: "question",
      render: (text: string) => (
        <div style={{ maxHeight: "100px", overflow: "auto" }}>{text}</div>
      ),
    },
    {
      title: "回答状态",
      key: "answerStatus",
      width: 120,
      render: (_: string, record: QuestionType) => (
        <Tag color={record.answer ? "success" : "default"}>
          {record.answer ? "已回答" : "未回答"}
        </Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (text: string) => formatDateTime(text),
    },
  ];

  // 分析表格列
  const analysesColumns = [
    {
      title: "分析类型",
      key: "type",
      width: 100,
      render: (_: string, record: AnalysisType) => (
        <Space wrap>
          {record.videoAnalysis && (
            <Tag icon={<VideoCameraOutlined />} color="blue">
              视频
            </Tag>
          )}
          {record.audioAnalysis && (
            <Tag icon={<SoundOutlined />} color="green">
              音频
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (text: string) => formatDateTime(text),
    },
    {
      title: "分析结果",
      key: "analysis",
      render: (_: string, record: AnalysisType) => (
        <div>
          {record.videoAnalysis && (
            <Card size="small" title="视频分析" style={{ marginBottom: 10 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>眼神接触</Text>
                      <Text strong>{record.videoAnalysis.eyeContact}/10</Text>
                    </div>
                    <Progress
                      percent={record.videoAnalysis.eyeContact * 10}
                      size="small"
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>面部表情</Text>
                      <Text strong>
                        {record.videoAnalysis.facialExpressions}/10
                      </Text>
                    </div>
                    <Progress
                      percent={record.videoAnalysis.facialExpressions * 10}
                      size="small"
                    />
                  </div>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>肢体语言</Text>
                      <Text strong>{record.videoAnalysis.bodyLanguage}/10</Text>
                    </div>
                    <Progress
                      percent={record.videoAnalysis.bodyLanguage * 10}
                      size="small"
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>自信程度</Text>
                      <Text strong>{record.videoAnalysis.confidence}/10</Text>
                    </div>
                    <Progress
                      percent={record.videoAnalysis.confidence * 10}
                      size="small"
                    />
                  </div>
                </Col>
              </Row>
              <Paragraph type="secondary">
                {record.videoAnalysis.recommendations}
              </Paragraph>
            </Card>
          )}
          {record.audioAnalysis && (
            <Card size="small" title="音频分析">
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>清晰度</Text>
                      <Text strong>{record.audioAnalysis.clarity}/10</Text>
                    </div>
                    <Progress
                      percent={record.audioAnalysis.clarity * 10}
                      size="small"
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>语速</Text>
                      <Text strong>{record.audioAnalysis.pace}/10</Text>
                    </div>
                    <Progress
                      percent={record.audioAnalysis.pace * 10}
                      size="small"
                    />
                  </div>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>语调</Text>
                      <Text strong>{record.audioAnalysis.tone}/10</Text>
                    </div>
                    <Progress
                      percent={record.audioAnalysis.tone * 10}
                      size="small"
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text>填充词数量</Text>
                      <Text strong>
                        {record.audioAnalysis.fillerWordsCount}
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
              <Paragraph type="secondary">
                {record.audioAnalysis.recommendations}
              </Paragraph>
            </Card>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="admin-session-detail">
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: <Link href="/">首页</Link>,
          },
          {
            title: <Link href="/admin">管理后台</Link>,
          },
          {
            title: "会话详情",
          },
        ]}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Title level={2}>
          <EditOutlined style={{ marginRight: 8 }} />
          面试会话详情
        </Title>
        <Space>
          {sessionDetails.status === "completed" && (
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={handleViewResults}
            >
              查看评估报告
            </Button>
          )}
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回列表
          </Button>
        </Space>
      </div>

      <Card title="基本信息" style={{ marginBottom: 20 }}>
        <Descriptions
          bordered
          column={{ xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }}
        >
          <Descriptions.Item label="会话ID" span={1}>
            {sessionDetails.sessionId}
          </Descriptions.Item>
          <Descriptions.Item label="用户">
            <Tag icon={<TeamOutlined />} color="purple">
              <Link href={`/admin/users/${sessionDetails.userInfo.id}`}>
                {sessionDetails.userInfo.username}
              </Link>
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="职位类型">
            {sessionDetails.positionType}
          </Descriptions.Item>
          <Descriptions.Item label="难度">
            {sessionDetails.difficulty}
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {formatDateTime(sessionDetails.startTime)}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            {formatDateTime(sessionDetails.endTime)}
          </Descriptions.Item>
          <Descriptions.Item label="持续时间">
            {calculateDuration()}
          </Descriptions.Item>
          <Descriptions.Item label="问题数量">
            {sessionDetails.questions?.length || 0}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag
              color={
                sessionDetails.status === "completed"
                  ? "success"
                  : sessionDetails.status === "active"
                    ? "processing"
                    : "default"
              }
            >
              {sessionDetails.status === "completed"
                ? "已完成"
                : sessionDetails.status === "active"
                  ? "进行中"
                  : sessionDetails.status}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs
        defaultActiveKey="questions"
        type="card"
        items={[
          {
            key: "questions",
            label: (
              <span>
                <QuestionCircleOutlined /> 问题与回答
              </span>
            ),
            children: (
              <Card>
                <Table
                  dataSource={sessionDetails.questions.map((q) => ({
                    ...q,
                    key: q.id,
                  }))}
                  columns={questionsColumns}
                  expandable={{
                    expandedRowRender: (record) => (
                      <div style={{ padding: "0 20px" }}>
                        {record.answer ? (
                          <>
                            <Title level={5}>用户回答</Title>
                            <Paragraph style={{ whiteSpace: "pre-wrap" }}>
                              {record.answer}
                            </Paragraph>
                            {record.evaluation && (
                              <>
                                <Divider />
                                <Title level={5}>AI评估</Title>
                                <div className="markdown-content">
                                  <ReactMarkdown>
                                    {formatEvaluationToMarkdown(
                                      record.evaluation,
                                    )}
                                  </ReactMarkdown>
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <Paragraph type="secondary">
                            用户尚未回答此问题
                          </Paragraph>
                        )}
                      </div>
                    ),
                    expandIcon: ({ expanded, onExpand, record }) =>
                      record.answer ? (
                        expanded ? (
                          <EyeOutlined onClick={(e) => onExpand(record, e)} />
                        ) : (
                          <EyeOutlined
                            onClick={(e) => onExpand(record, e)}
                            style={{ color: "#1890ff" }}
                          />
                        )
                      ) : null,
                  }}
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: "analyses",
            label: (
              <span>
                <VideoCameraOutlined /> 多模态分析
              </span>
            ),
            children: (
              <Card>
                {sessionDetails.analyses &&
                sessionDetails.analyses.length > 0 ? (
                  <Table
                    dataSource={sessionDetails.analyses.map((a) => ({
                      ...a,
                      key: a.id,
                    }))}
                    columns={analysesColumns}
                    pagination={false}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "30px 0" }}>
                    <Paragraph type="secondary">暂无多模态分析数据</Paragraph>
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
