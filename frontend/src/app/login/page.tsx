"use client";

import { authAPI } from "@/services/api";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  Space,
  Typography,
  message,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Title, Paragraph } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();

  // 检查是否已经登录，如果是则重定向到首页
  useEffect(() => {
    if (authAPI.isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  const handleLogin = async (values: {
    username: string;
    password: string;
  }) => {
    try {
      setLoading(true);
      const response = await authAPI.login(values);

      if (response.status === 200) {
        // 保存认证令牌和用户信息
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        messageApi.success("登录成功");

        // 根据用户角色重定向
        if (response.data.user.is_admin) {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }
    } catch (error: unknown) {
      console.error("登录失败:", error);
      messageApi.error(
        (
          error as {
            response?: { data?: { error?: string } };
          }
        ).response?.data?.error || "登录失败，请检查用户名和密码",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "40px auto", padding: "0 16px" }}>
      {contextHolder}
      <Card
        variant="outlined"
        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <Title level={2} style={{ marginBottom: "8px" }}>
            用户登录
          </Title>
          <Paragraph type="secondary">登录您的智能模拟面试系统账号</Paragraph>
        </div>

        <Form form={form} name="login" onFinish={handleLogin} layout="vertical">
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{ marginTop: "8px" }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <Divider>或者</Divider>

        <Space direction="vertical" style={{ width: "100%" }}>
          <Button block onClick={() => router.push("/register")}>
            注册新账号
          </Button>

          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <Link href="/">返回首页</Link>
          </div>
        </Space>
      </Card>
    </div>
  );
}
