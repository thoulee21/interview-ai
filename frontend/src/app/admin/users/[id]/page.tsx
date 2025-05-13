"use client";

import { interviewAPI } from "@/services/api";
import type { UserProfile } from "@/types";
import {
  ArrowLeftOutlined,
  EditOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Spin,
  Switch,
  Typography,
} from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const { Title } = Typography;
const { Option } = Select;

// 定义表单字段类型
interface UserFormValues {
  username: string;
  email: string;
  is_admin: boolean;
  status: "active" | "inactive";
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const [user, setUser] = useState<UserProfile | null>(null);

  // 获取用户详情
  const fetchUserDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await interviewAPI.getUserDetail(userId);
      setUser(response.data);

      // 设置表单初始值
      form.setFieldsValue({
        username: response.data.username,
        email: response.data.email || "",
        is_admin: response.data.is_admin,
        status: response.data.status || "active",
      });
    } catch (error) {
      console.error("获取用户详情失败:", error);
      messageApi.error("获取用户详情失败，请稍后重试");
      router.push("/admin/users");
    } finally {
      setLoading(false);
    }
  }, [userId, form, router, messageApi]);

  useEffect(() => {
    fetchUserDetail();
  }, [fetchUserDetail]);

  // 保存用户信息
  const handleSave = async (values: UserFormValues) => {
    try {
      setLoading(true);

      await interviewAPI.updateUser(userId, {
        email: values.email,
        is_admin: values.is_admin,
        status: values.status,
      });

      messageApi.success("用户信息更新成功");
      router.push("/admin/users");
    } catch (error) {
      console.error("更新用户信息失败:", error);
      messageApi.error("更新用户信息失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 重置用户密码
  const handleResetPassword = async () => {
    try {
      setLoading(true);
      const response = await interviewAPI.resetUserPassword(userId);
      setLoading(false);

      Modal.success({
        title: "密码重置成功",
        icon: <KeyOutlined />,
        content: (
          <div>
            <p>
              用户 <strong>{user?.username}</strong> 的密码已重置为：
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
      });
    } catch (error) {
      console.error("重置密码失败:", error);
      messageApi.error("重置密码失败，请稍后重试");
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
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
            title: <Link href="/admin/users">用户管理</Link>,
          },
          {
            title: "编辑用户",
          },
        ]}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <Title level={2}>
          <EditOutlined style={{ marginRight: 8 }} />
          编辑用户
        </Title>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/admin/users")}
        >
          返回列表
        </Button>
      </div>

      <Card>
        <Spin spinning={loading}>
          <Form form={form} layout="vertical" onFinish={handleSave}>
            {loading && !user ? (
              <div style={{ textAlign: "center", padding: "50px 0" }}>
                <Spin size="large" />
              </div>
            ) : (
              <>
                <Form.Item
                  name="username"
                  label="用户名"
                  rules={[{ required: true, message: "请输入用户名" }]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="email"
                  label="邮箱"
                  rules={[{ type: "email", message: "请输入有效的邮箱地址" }]}
                >
                  <Input placeholder="用户邮箱" />
                </Form.Item>

                <Form.Item
                  name="is_admin"
                  label="管理员权限"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="是" unCheckedChildren="否" />
                </Form.Item>

                <Form.Item name="status" label="状态">
                  <Select>
                    <Option value="active">启用</Option>
                    <Option value="inactive">停用</Option>
                  </Select>
                </Form.Item>

                <Form.Item>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <Button type="primary" htmlType="submit">
                      保存
                    </Button>
                    <Button
                      type="default"
                      onClick={handleResetPassword}
                      icon={<KeyOutlined />}
                    >
                      重置密码
                    </Button>
                    <Button onClick={() => router.push("/admin/users")}>
                      取消
                    </Button>
                  </div>
                </Form.Item>
              </>
            )}
          </Form>
        </Spin>
      </Card>
    </>
  );
}
