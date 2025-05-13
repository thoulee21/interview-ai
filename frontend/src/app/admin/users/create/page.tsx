"use client";

import { interviewAPI } from "@/services/api";
import { ArrowLeftOutlined, UserAddOutlined } from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Spin,
  Switch,
  Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const { Title } = Typography;
const { confirm } = Modal;

// 定义表单字段类型
interface UserCreateFormValues {
  username: string;
  password?: string;
  email?: string;
  is_admin: boolean;
}

export default function CreateUserPage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // 创建新用户
  const handleCreate = async (values: UserCreateFormValues) => {
    try {
      setLoading(true);
      const response = await interviewAPI.createUser({
        username: values.username,
        password: values.password,
        email: values.email,
        is_admin: values.is_admin,
      });

      setLoading(false);

      // 弹窗显示创建成功信息，包括自动生成的密码（如果有）
      confirm({
        title: "用户创建成功",
        icon: <UserAddOutlined />,
        content: (
          <div>
            <p>
              已成功创建用户： <strong>{values.username}</strong>
            </p>
            {response.data.password && (
              <>
                <p>初始密码为：</p>
                <p
                  style={{
                    background: "#f5f5f5",
                    padding: "8px",
                    fontFamily: "monospace",
                  }}
                >
                  {response.data.password}
                </p>
                <p>请记下此密码，它不会再次显示。</p>
              </>
            )}
          </div>
        ),
        okText: "返回列表",
        cancelText: "继续创建",
        onOk: () => router.push("/admin/users"),
        onCancel: () => {
          form.resetFields();
        },
      });
    } catch (error: unknown) {
      const errorResponse = error as {
        response?: { data?: { error?: string } };
      };
      messageApi.error(
        errorResponse.response?.data?.error || "创建用户失败，请稍后重试",
      );
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
            title: "创建用户",
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
          <UserAddOutlined style={{ marginRight: 8 }} />
          创建新用户
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
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreate}
            initialValues={{
              is_admin: false,
            }}
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: "请输入用户名" },
                { min: 3, message: "用户名至少3个字符" },
              ]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              help="如不填写，系统将自动生成随机密码"
              rules={[{ min: 6, message: "密码至少6个字符" }]}
            >
              <Input.Password placeholder="留空则自动生成随机密码" />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ type: "email", message: "请输入有效的邮箱地址" }]}
            >
              <Input placeholder="用户邮箱（可选）" />
            </Form.Item>

            <Form.Item
              name="is_admin"
              label="管理员权限"
              valuePropName="checked"
            >
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>

            <Form.Item>
              <div style={{ display: "flex", gap: "10px" }}>
                <Button type="primary" htmlType="submit">
                  创建用户
                </Button>
                <Button onClick={() => form.resetFields()}>重置表单</Button>
                <Button onClick={() => router.push("/admin/users")}>
                  取消
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </>
  );
}
