"use client";

import { interviewAPI } from "@/services/api";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UnlockOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Title, Text } = Typography;
const { confirm } = Modal;

// 用户类型定义
interface UserType {
  id: number;
  username: string;
  email: string | null;
  is_admin: boolean;
  status: string;
  created_at: string;
  last_login: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | undefined>(
    "descend",
  );
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  // 获取所有用户
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await interviewAPI.getAllUsers();
      setUsers(response.data.users);
    } catch (error) {
      console.error("获取用户列表失败:", error);
      message.error("获取用户列表失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 删除用户
  const handleDelete = async (userId: number) => {
    try {
      setLoading(true);
      await interviewAPI.deleteUser(userId.toString());
      messageApi.success("用户已删除或停用");
      fetchUsers();
    } catch (error: unknown) {
      const errorResponse = error as {
        response?: { data?: { error?: string } };
      };
      messageApi.error(
        errorResponse.response?.data?.error || "删除用户失败，请稍后重试",
      );
      setLoading(false);
    }
  };

  // 更新用户状态
  const handleStatusChange = async (userId: number, newStatus: boolean) => {
    try {
      setLoading(true);
      await interviewAPI.updateUser(userId.toString(), {
        status: newStatus ? "active" : "inactive",
      });
      messageApi.success(`用户状态已更新为${newStatus ? "启用" : "停用"}`);
      fetchUsers();
    } catch (error) {
      console.error("更新用户状态失败:", error);
      messageApi.error("更新用户状态失败，请稍后重试");
      setLoading(false);
    }
  };

  // 重置用户密码
  const handleResetPassword = async (userId: number, username: string) => {
    try {
      const response = await interviewAPI.resetUserPassword(userId.toString());

      confirm({
        title: "密码重置成功",
        icon: <KeyOutlined />,
        content: (
          <div>
            <p>
              用户 <strong>{username}</strong> 的密码已重置为：
            </p>
            <p
              style={{
                background: "#f5f5f5",
                padding: "8px",
                fontFamily: "monospace",
              }}
            >
              {response.data.new_password}
            </p>
            <p>请记下此密码，它不会再次显示。</p>
          </div>
        ),
        okText: "已复制",
        cancelText: "关闭",
      });
    } catch (error) {
      console.error("重置密码失败:", error);
      messageApi.error("重置密码失败，请稍后重试");
    }
  };

  // 更新管理员权限
  const handleAdminChange = async (userId: number, isAdmin: boolean) => {
    try {
      setLoading(true);
      await interviewAPI.updateUser(userId.toString(), {
        is_admin: isAdmin,
      });
      messageApi.success(
        `用户权限已${isAdmin ? "提升为管理员" : "降级为普通用户"}`,
      );
      fetchUsers();
    } catch (error) {
      console.error("更新用户权限失败:", error);
      messageApi.error("更新用户权限失败，请稍后重试");
      setLoading(false);
    }
  };

  // 编辑用户
  const handleEdit = (userId: number) => {
    router.push(`/admin/users/${userId}`);
  };

  // 创建新用户
  const handleCreate = () => {
    router.push("/admin/users/create");
  };

  // 筛选用户数据
  const filteredUsers = users
    .filter(
      (user) =>
        (statusFilter === "all" ||
          (statusFilter === "active" && user.status === "active") ||
          (statusFilter === "inactive" && user.status === "inactive")) &&
        (searchText === "" ||
          user.username.toLowerCase().includes(searchText.toLowerCase()) ||
          (user.email &&
            user.email.toLowerCase().includes(searchText.toLowerCase()))),
    )
    .sort((a, b) => {
      const direction = sortOrder === "ascend" ? 1 : -1;

      switch (sortField) {
        case "username":
          return direction * a.username.localeCompare(b.username);
        case "email":
          const emailA = a.email || "";
          const emailB = b.email || "";
          return direction * emailA.localeCompare(emailB);
        case "is_admin":
          return (
            direction * (a.is_admin === b.is_admin ? 0 : a.is_admin ? 1 : -1)
          );
        case "status":
          return (
            direction *
            (a.status === b.status ? 0 : a.status === "active" ? 1 : -1)
          );
        case "last_login":
          const lastLoginA = a.last_login
            ? new Date(a.last_login).getTime()
            : 0;
          const lastLoginB = b.last_login
            ? new Date(b.last_login).getTime()
            : 0;
          return direction * (lastLoginA - lastLoginB);
        case "created_at":
        default:
          return (
            direction *
            (new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime())
          );
      }
    });

  // 表格列定义
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
      sorter: true,
      sortOrder: sortField === "username" ? sortOrder : undefined,
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      sorter: true,
      sortOrder: sortField === "email" ? sortOrder : undefined,
      render: (text: string | null) =>
        text || <Text type="secondary">未设置</Text>,
    },
    {
      title: "角色",
      dataIndex: "is_admin",
      key: "is_admin",
      width: 100,
      sorter: true,
      sortOrder: sortField === "is_admin" ? sortOrder : undefined,
      render: (isAdmin: boolean) => (
        <Tag
          color={isAdmin ? "gold" : "default"}
          icon={isAdmin ? <LockOutlined /> : <UnlockOutlined />}
        >
          {isAdmin ? "管理员" : "普通用户"}
        </Tag>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 80,
      sorter: true,
      sortOrder: sortField === "status" ? sortOrder : undefined,
      render: (status: string) => {
        if (status === "active") {
          return <Badge status="success" text="启用" />;
        } else {
          return <Badge status="error" text="停用" />;
        }
      },
    },
    {
      title: "注册时间",
      dataIndex: "created_at",
      key: "created_at",
      render: (text: string) => new Date(text).toLocaleString(),
      sorter: true,
      sortOrder: sortField === "created_at" ? sortOrder : undefined,
    },
    {
      title: "上次登录",
      dataIndex: "last_login",
      key: "last_login",
      render: (text: string | null) =>
        text ? (
          new Date(text).toLocaleString()
        ) : (
          <Text type="secondary">从未登录</Text>
        ),
      sorter: true,
      sortOrder: sortField === "last_login" ? sortOrder : undefined,
    },
    {
      title: "操作",
      key: "action",
      render: (_: string, record: UserType) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要重置此用户的密码吗？"
            description="新密码将显示一次，请确保将其安全地传达给用户。"
            onConfirm={() => handleResetPassword(record.id, record.username)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" icon={<KeyOutlined />}>
              重置密码
            </Button>
          </Popconfirm>
          <Switch
            size="small"
            checked={record.is_admin}
            checkedChildren="管理员"
            unCheckedChildren="普通"
            onChange={(checked) => handleAdminChange(record.id, checked)}
          />
          <Switch
            size="small"
            checked={record.status === "active"}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={(checked) => handleStatusChange(record.id, checked)}
          />
          <Popconfirm
            title="确定要删除此用户吗？"
            description="如果用户有关联数据将改为停用，否则将永久删除。"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div className="admin-users-page">
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
              title: "用户管理",
            },
          ]}
        />

        <Title level={2}>
          <TeamOutlined style={{ marginRight: 8 }} />
          用户管理
        </Title>

        <Card style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Space wrap>
              <Input
                placeholder="搜索用户名或邮箱"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
              />
              <Button
                type={statusFilter === "all" ? "primary" : "default"}
                onClick={() => setStatusFilter("all")}
              >
                全部
              </Button>
              <Button
                type={statusFilter === "active" ? "primary" : "default"}
                icon={<CheckCircleOutlined />}
                onClick={() => setStatusFilter("active")}
              >
                启用
              </Button>
              <Button
                type={statusFilter === "inactive" ? "primary" : "default"}
                icon={<CloseCircleOutlined />}
                onClick={() => setStatusFilter("inactive")}
              >
                停用
              </Button>
            </Space>

            <Space wrap>
              <Button
                type="default"
                icon={<ReloadOutlined />}
                onClick={fetchUsers}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={handleCreate}
              >
                创建用户
              </Button>
            </Space>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredUsers}
            loading={loading}
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
        </Card>
      </div>
    </>
  );
}
