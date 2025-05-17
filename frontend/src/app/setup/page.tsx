"use client";

import InterviewBreadcrumb from "@/components/InterviewBreadcrumb";
import { interviewAPI } from "@/services/api";
import {
  Button,
  Card,
  Form,
  InputNumber,
  Radio,
  Select,
  Spin,
  Switch,
  Tabs,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface PositionType {
  value: string;
  label: string;
}

interface InterviewFormValues {
  positionType: string;
  difficulty: string;
  questionCount: number;
  duration: number;
  specificTopics?: string[];
  includeCodeExercise?: boolean;
  scenarioId?: string;
  interviewerStyle?: string;
  interviewMode?: string;
  industryFocus?: string;
  companySize?: string;
  customPrompt?: string;
  includeBehavioralQuestions?: boolean;
  includeStressTest?: boolean;
}

export default function InterviewSetupPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(false);
  const [positionTypes, setPositionTypes] = useState<PositionType[]>([]);
  const [activeTab, setActiveTab] = useState<string>("basic");

  useEffect(() => {
    // 组件加载时从后端获取职位类型列表
    const fetchPositionTypes = async () => {
      try {
        setLoading(true);
        const response = await interviewAPI.getPositionTypes();
        setPositionTypes(response.data || []);
      } catch (error) {
        console.error("获取职位类型列表失败:", error);
        messageApi.error("获取职位类型列表失败，请稍后重试");

        setPositionTypes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPositionTypes();
  }, [messageApi, form]);

  const handleSubmit = async (values: InterviewFormValues) => {
    try {
      setLoading(true);

      const finalValues = values;
      // 调用后端API开始面试会话，使用interviewAPI服务
      const response = await interviewAPI.startInterview(finalValues);

      // 获取会话ID和初始问题，并跳转到面试页面
      const sessionId = response.data.session_id;
      const firstQuestion = response.data.question;

      messageApi.success("面试会话已创建，即将开始面试");

      // 使用 localStorage 存储初始问题，在面试页面取出
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `interview_${sessionId}_initial_question`,
          firstQuestion,
        );
      }

      // 跳转到面试页面
      router.push(`/interview/${sessionId}`);
    } catch (error) {
      console.error("创建面试会话失败:", error);
      messageApi.error("创建面试会话失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {contextHolder}
      <InterviewBreadcrumb currentStep="setup" />
      <Title level={2} className="text-center">
        设置你的模拟面试
      </Title>
      <Paragraph className="text-center">
        选择你希望模拟的面试类型和难度，我们将为你创建个性化的面试体验
      </Paragraph>

      <Card style={{ maxWidth: "800px", margin: "0 auto", marginTop: "32px" }}>
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              difficulty: "中级",
              questionCount: 5,
              interviewerStyle: "专业型",
            }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  label: "基本设置",
                  key: "basic",
                  children: (
                    <>
                      <Form.Item
                        label="选择职位类型"
                        name="positionType"
                        rules={[{ required: true, message: "请选择职位类型" }]}
                      >
                        <Select placeholder="选择你要模拟的职位">
                          {positionTypes.map((pos) => (
                            <Option key={pos.value} value={pos.label}>
                              {pos.label}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        label="选择面试难度"
                        name="difficulty"
                        rules={[{ required: true, message: "请选择面试难度" }]}
                      >
                        <Radio.Group>
                          <Radio.Button value="初级">初级</Radio.Button>
                          <Radio.Button value="中级">中级</Radio.Button>
                          <Radio.Button value="高级">高级</Radio.Button>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label="面试官风格"
                        name="interviewerStyle"
                        rules={[
                          { required: true, message: "请选择面试官风格" },
                        ]}
                      >
                        <Radio.Group>
                          <Radio.Button value="专业型">专业型</Radio.Button>
                          <Radio.Button value="友好型">友好型</Radio.Button>
                          <Radio.Button value="挑战型">挑战型</Radio.Button>
                        </Radio.Group>
                      </Form.Item>

                      <Form.Item
                        label="问题数量"
                        name="questionCount"
                        rules={[{ required: true, message: "请设置问题数量" }]}
                      >
                        <InputNumber min={3} max={10} />
                      </Form.Item>
                    </>
                  ),
                },
                {
                  label: "高级设置",
                  key: "advanced",
                  children: (
                    <>
                      <Form.Item
                        label="包含代码练习"
                        name="includeCodeExercise"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>

                      <Form.Item
                        label="包含行为问题"
                        name="includeBehavioralQuestions"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>

                      <Form.Item
                        label="包含压力测试"
                        name="includeStressTest"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>

                      <Form.Item label="面试模式" name="interviewMode">
                        <Select placeholder="选择面试模式">
                          <Option value="标准">标准面试</Option>
                          <Option value="结对编程">结对编程</Option>
                          <Option value="系统设计">系统设计</Option>
                          <Option value="算法挑战">算法挑战</Option>
                        </Select>
                      </Form.Item>

                      <Form.Item label="行业焦点" name="industryFocus">
                        <Select placeholder="选择行业焦点">
                          <Option value="互联网">互联网</Option>
                          <Option value="金融">金融</Option>
                          <Option value="医疗">医疗</Option>
                          <Option value="教育">教育</Option>
                          <Option value="零售">零售</Option>
                          <Option value="制造业">制造业</Option>
                        </Select>
                      </Form.Item>

                      <Form.Item label="公司规模" name="companySize">
                        <Select placeholder="选择公司规模">
                          <Option value="创业公司">创业公司</Option>
                          <Option value="中型公司">中型公司</Option>
                          <Option value="大型企业">大型企业</Option>
                          <Option value="跨国公司">跨国公司</Option>
                        </Select>
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />

            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                开始面试
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>

      <Card
        style={{
          maxWidth: "800px",
          margin: "32px auto",
          backgroundColor: "#f6f8fa",
        }}
      >
        <Title level={4}>准备建议</Title>
        <Paragraph>1. 确保你的摄像头和麦克风正常工作</Paragraph>
        <Paragraph>2. 选择安静、光线充足的环境</Paragraph>
        <Paragraph>3. 穿着得体，保持专业形象</Paragraph>
        <Paragraph>4. 准备好纸笔，可能需要记录一些信息</Paragraph>
      </Card>

      <style jsx global>{`
        .selected-scenario {
          border: 2px solid #1890ff;
          box-shadow: 0 0 10px rgba(24, 144, 255, 0.3);
        }
        .text-center {
          text-align: center;
        }
      `}</style>
    </div>
  );
}
