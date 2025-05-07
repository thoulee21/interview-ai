"use client";

import AuthGuard from "@/components/AuthGuard";
import { interviewAPI } from "@/services/api";
import type { SessionType, UserProfile } from "@/types";
import {
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
  TeamOutlined,
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
import { useCallback, useEffect, useState } from "react";

const { Title, Text } = Typography;
const { Option } = Select;

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionType[]>([]);
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState<number | undefined>(undefined);
  const [sortField, setSortField] = useState<string>("startTime");
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | undefined>(
    "descend",
  );
  const router = useRouter();

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      // 添加用户筛选条件
      const params: { userId?: number } = {};
      if (userFilter) {
        params.userId = userFilter;
      }

      const response = await interviewAPI.getAllSessions(params);
      setSessions(response.data.sessions);
    } catch (error) {
      console.error("获取面试会话列表失败:", error);
      message.error("获取面试会话列表失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [userFilter]);

  useEffect(() => {
    fetchSessions();
    fetchUsers();
  }, [fetchSessions]);

  const fetchUsers = async () => {
    try {
      const response = await interviewAPI.getAllUsers();
      if (response.data && response.data.users) {
        setUsers(
          response.data.users.map((user: UserProfile) => ({
            id: user.id,
            username: user.username,
          })),
        );
      }
    } catch (error) {
      console.error("获取用户列表失败:", error);
    }
  };

  // 当用户筛选更改时更新会话列表
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, userFilter]);

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
          session.positionType
            .toLowerCase()
            .includes(searchText.toLowerCase()) ||
          (session.username &&
            session.username.toLowerCase().includes(searchText.toLowerCase()))),
    )
    .sort((a, b) => {
      if (!sortOrder) return 0;
      const direction = sortOrder === "ascend" ? 1 : -1;

      switch (sortField) {
        case "sessionId":
          return direction * a.sessionId.localeCompare(b.sessionId);
        case "positionType":
          return direction * a.positionType.localeCompare(b.positionType);
        case "username":
          return direction * (a.username || "").localeCompare(b.username || "");
        case "difficulty":
          // 自定义难度级别排序
          const difficultyOrder = { 初级: 1, 中级: 2, 高级: 3 };
          return (
            direction *
            ((difficultyOrder[a.difficulty as keyof typeof difficultyOrder] ||
              0) -
              (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] ||
                0))
          );
        case "startTime":
          return (
            direction *
            (new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          );
        case "status":
          const statusOrder = { active: 1, completed: 2, abandoned: 3 };
          return (
            direction *
            ((statusOrder[a.status as keyof typeof statusOrder] || 0) -
              (statusOrder[b.status as keyof typeof statusOrder] || 0))
          );
        case "questionCount":
          return (
            direction * (Number(a.questionCount) - Number(b.questionCount))
          );
        case "duration":
          const aDuration = a.duration !== undefined ? Number(a.duration) : 0;
          const bDuration = b.duration !== undefined ? Number(b.duration) : 0;
          return direction * (aDuration - bDuration);
        default:
          // 默认按开始时间排序
          return (
            direction *
            (new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          );
      }
    });

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
      sorter: true,
      sortOrder: sortField === "sessionId" ? sortOrder : undefined,
    },
    {
      title: "用户",
      dataIndex: "username",
      key: "username",
      render: (text: string) => (
        <Tag icon={<TeamOutlined />} color="purple">
          {text || "未知用户"}
        </Tag>
      ),
      sorter: true,
      sortOrder: sortField === "username" ? sortOrder : undefined,
    },
    {
      title: "职位类型",
      dataIndex: "positionType",
      key: "positionType",
      render: (text: string) => <Tag icon={<UserOutlined />}>{text}</Tag>,
      sorter: true,
      sortOrder: sortField === "positionType" ? sortOrder : undefined,
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
      sorter: true,
      sortOrder: sortField === "difficulty" ? sortOrder : undefined,
    },
    {
      title: "开始时间",
      dataIndex: "startTime",
      key: "startTime",
      render: (text: string) => new Date(text).toLocaleString(),
      sorter: true,
      sortOrder: sortField === "startTime" ? sortOrder : undefined,
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
      sorter: true,
      sortOrder: sortField === "status" ? sortOrder : undefined,
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
      sorter: true,
      sortOrder: sortField === "questionCount" ? sortOrder : undefined,
    },
    {
      title: "持续时间",
      dataIndex: "duration",
      key: "duration",
      render: (text: string) => (text ? `${text} 分钟` : "-"),
      sorter: true,
      sortOrder: sortField === "duration" ? sortOrder : undefined,
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

  // 使用AuthGuard包裹整个管理页面
  return (
    <AuthGuard requireAdmin={true}>
      <div className="admin-page">
        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            {
              title: <Link href="/">首页</Link>,
            },
            {
              title: "管理后台",
            },
          ]}
        />

        <Title level={2}>
          <UserOutlined style={{ marginRight: 8 }} />
          面试会话管理
        </Title>

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
                placeholder="搜索会话ID、职位或用户"
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
              <Select
                value={userFilter}
                onChange={(value) => setUserFilter(value)}
                style={{ width: 150 }}
                placeholder="用户筛选"
                allowClear
              >
                {users.map((user) => (
                  <Option key={user.id} value={user.id}>
                    {user.username}
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
              onChange={(_pagination, _filters, sorter) => {
                const typedSorter = sorter as {
                  field: string;
                  order?: "ascend" | "descend";
                };

                if (typedSorter) {
                  setSortField(typedSorter.field);
                  setSortOrder(typedSorter.order);
                }
              }}
            />
          </Spin>
        </Card>
      </div>
    </AuthGuard>
  );
}
