"use client";

import interviewAPI from "@/services/api";
import type { SessionType } from "@/types";
import {
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Card,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Title, Text } = Typography;
const { Option } = Select;

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await interviewAPI.getAllSessions();
      setSessions(response.data.sessions);
    } catch (error) {
      console.error("获取面试会话列表失败:", error);
      message.error("获取面试会话列表失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      setLoading(true);
      await interviewAPI.deleteSession(sessionId);
      message.success("面试会话已删除");
      // 重新加载数据
      fetchSessions();
    } catch (error) {
      console.error("删除面试会话失败:", error);
      message.error("删除面试会话失败，请稍后重试");
      setLoading(false);
    }
  };

  const handleViewDetails = (sessionId: string) => {
    router.push(`/admin/sessions/${sessionId}`);
  };

  const handleViewResults = (sessionId: string) => {
    router.push(`/results/${sessionId}`);
  };

  // 筛选面试会话数据
  const filteredSessions = sessions
    .filter(
      (session: SessionType) =>
        (statusFilter === "all" || session.status === statusFilter) &&
        (positionFilter === "all" || session.positionType === positionFilter) &&
        (searchText === "" ||
          session.sessionId.toLowerCase().includes(searchText.toLowerCase()) ||
          session.positionType.toLowerCase().includes(searchText.toLowerCase()))
    )
    .sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

  // 获取所有职位类型（用于筛选）
  const positionTypes = [
    ...new Set(sessions.map((session) => session.positionType)),
  ];

  // 表格列定义
  const columns = [
    {
      title: "会话ID",
      dataIndex: "sessionId",
      key: "sessionId",
      render: (text: string) => (
        <Text ellipsis={{ tooltip: text }}>{text.slice(0, 8)}...</Text>
      ),
    },
    {
      title: "职位类型",
      dataIndex: "positionType",
      key: "positionType",
      render: (text: string) => <Tag icon={<UserOutlined />}>{text}</Tag>,
    },
    {
      title: "难度",
      dataIndex: "difficulty",
      key: "difficulty",
      render: (text: string) => {
        const color =
          text === "初级" ? "green" : text === "中级" ? "blue" : "red";
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "开始时间",
      dataIndex: "startTime",
      key: "startTime",
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (text: "active" | "completed" | "abandoned") => {
        const statusConfig = {
          active: { color: "processing", text: "进行中" },
          completed: { color: "success", text: "已完成" },
          abandoned: { color: "default", text: "已放弃" },
        };
        const { color, text: statusText } = statusConfig[text] || {
          color: "default",
          text,
        };
        return <Tag color={color}>{statusText}</Tag>;
      },
    },
    {
      title: "问题数",
      dataIndex: "questionCount",
      key: "questionCount",
      render: (text: string, record: SessionType) => (
        <Text>
          {record.answeredCount}/{text}
        </Text>
      ),
    },
    {
      title: "持续时间",
      dataIndex: "duration",
      key: "duration",
      render: (text: string) => (text ? `${text} 分钟` : "-"),
    },
    {
      title: "操作",
      key: "action",
      render: (_: string, record: SessionType) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record.sessionId)}
          >
            详情
          </Button>
          {record.status === "completed" && (
            <Button
              type="default"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => handleViewResults(record.sessionId)}
            >
              报告
            </Button>
          )}
          <Popconfirm
            title="确定要删除此面试会话吗？"
            description="此操作不可恢复，所有相关数据将被删除。"
            onConfirm={() => handleDelete(record.sessionId)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="primary"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <Breadcrumb 
        style={{ marginBottom: 16 }}
        items={[
          {
            title: <Link href="/">首页</Link>
          },
          {
            title: "管理后台"
          }
        ]}
      />

      <Title level={2}>面试会话管理</Title>

      <Card style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Space wrap>
            <Input
              placeholder="搜索会话ID或职位"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              style={{ width: 120 }}
              placeholder="状态筛选"
            >
              <Option value="all">所有状态</Option>
              <Option value="active">进行中</Option>
              <Option value="completed">已完成</Option>
              <Option value="abandoned">已放弃</Option>
            </Select>
            <Select
              value={positionFilter}
              onChange={(value) => setPositionFilter(value)}
              style={{ width: 150 }}
              placeholder="职位筛选"
            >
              <Option value="all">所有职位</Option>
              {positionTypes.map((type) => (
                <Option key={type} value={type}>
                  {type}
                </Option>
              ))}
            </Select>
          </Space>

          <Button type="primary" onClick={fetchSessions}>
            刷新数据
          </Button>
        </div>
      </Card>

      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredSessions.map((session) => ({
              ...session,
              key: session.sessionId,
            }))}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            bordered
          />
        </Spin>
      </Card>
    </div>
  );
}
