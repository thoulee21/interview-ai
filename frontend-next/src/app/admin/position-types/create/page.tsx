"use client";

import interviewAPI from "@/services/api";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Card,
  Form,
  Input,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const { Title } = Typography;
const { TextArea } = Input;

type PositionTypeFormValues = {
  value: string;
  label: string;
  description: string;
};

export default function CreatePositionTypePage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 创建职位类型
  const handleSave = async (values: PositionTypeFormValues) => {
    try {
      setLoading(true);
      await interviewAPI.createPositionType(values);
      message.success("职位类型创建成功");
      router.push("/admin/position-types");
    } catch (error: unknown) {
      if (
        (error as { response?: { status?: number } }).response?.status === 409
      ) {
        message.error("已存在相同编码的职位类型");
      } else {
        console.error("创建职位类型失败:", error);
        message.error("创建职位类型失败，请稍后重试");
      }
      setLoading(false);
    }
  };

  return (
    <div>
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
            title: <Link href="/admin/position-types">职位类型管理</Link>,
          },
          {
            title: "添加职位类型",
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
        <Title level={2}>添加职位类型</Title>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/admin/position-types")}
        >
          返回列表
        </Button>
      </div>

      <Card>
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{
              value: "",
              label: "",
              description: "",
            }}
          >
            <Form.Item
              label="职位编码"
              name="value"
              rules={[
                { required: true, message: "请输入职位编码" },
                { max: 50, message: "职位编码不能超过50个字符" },
              ]}
            >
              <Input placeholder="请输入职位编码，如software_engineer" />
            </Form.Item>

            <Form.Item
              label="职位名称"
              name="label"
              rules={[
                { required: true, message: "请输入职位名称" },
                { max: 50, message: "职位名称不能超过50个字符" },
              ]}
            >
              <Input placeholder="请输入职位名称，如软件工程师" />
            </Form.Item>

            <Form.Item
              label="职位描述"
              name="description"
              rules={[{ max: 200, message: "职位描述不能超过200个字符" }]}
            >
              <TextArea placeholder="请输入职位描述" rows={4} />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<SaveOutlined />}
                >
                  创建
                </Button>
                <Button onClick={() => router.push("/admin/position-types")}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  );
}
