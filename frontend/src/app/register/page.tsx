"use client";

import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  message,
  Card,
  Space,
  Divider,
} from "antd";
import { LockOutlined, UserOutlined, MailOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { authAPI } from "@/services/api";
import Link from "next/link";

const { Title, Paragraph } = Typography;

export default function RegisterPage() {
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

  const handleRegister = async (values: {
    username: string;
    password: string;
    confirmPassword: string;
    email?: string;
  }) => {
    try {
      // 先验证确认密码是否一致
      if (values.password !== values.confirmPassword) {
        messageApi.error("两次密码输入不一致");
        return;
      }

      setLoading(true);
      const response = await authAPI.register({
        username: values.username,
        password: values.password,
        email: values.email,
      });

      if (response.status === 201) {
        messageApi.success("注册成功，请登录");
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      }
    } catch (error: unknown) {
      console.error("注册失败:", error);
      messageApi.error(
        (
          error as {
            response?: { data?: { error?: string } };
          }
        ).response?.data?.error || "注册失败，该用户名可能已被使用",
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
            注册账号
          </Title>
          <Paragraph type="secondary">创建您的智能模拟面试系统账号</Paragraph>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={handleRegister}
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 3, message: "用户名至少需要3个字符" },
            ]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[{ type: "email", message: "请输入有效的邮箱地址" }]}
          >
            <Input
              prefix={<MailOutlined className="site-form-item-icon" />}
              placeholder="邮箱（可选）"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 6, message: "密码至少需要6个字符" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            rules={[
              { required: true, message: "请确认密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次密码输入不一致"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="确认密码"
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
              注册
            </Button>
          </Form.Item>
        </Form>

        <Divider>或者</Divider>

        <Space direction="vertical" style={{ width: "100%" }}>
          <Button block onClick={() => router.push("/login")}>
            已有账号？去登录
          </Button>

          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <Link href="/">返回首页</Link>
          </div>
        </Space>
      </Card>
    </div>
  );
}
