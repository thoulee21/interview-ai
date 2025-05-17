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
  Steps,
  Switch,
  Tooltip,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface PositionType {
  value: string;
  label: string;
}

interface InterviewPreset {
  id: number;
  name: string;
  description: string;
  interviewParams: any;
  createdAt: string;
  updatedAt: string;
}

interface InterviewFormValues {
  positionType: string;
  difficulty: string;
  questionCount: number;
  duration: number;
  specificTopics?: string[];
  includeCodeExercise?: boolean;
  interviewerStyle?: string;
  interviewMode?: string;
  industryFocus?: string;
  companySize?: string;
  customPrompt?: string;
  includeBehavioralQuestions?: boolean;
  includeStressTest?: boolean;
  presetId?: number;
}

export default function InterviewSetupPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [loading, setLoading] = useState(false);
  const [positionTypes, setPositionTypes] = useState<PositionType[]>([]);

  const [presets, setPresets] = useState<InterviewPreset[]>([]); // 预设场景列表
  const [selectedPreset, setSelectedPreset] = useState<InterviewPreset | null>(
    null,
  ); // 当前选中的预设
  const [currentStep, setCurrentStep] = useState<number>(0); // 当前步骤

  useEffect(() => {
    // 组件加载时从后端获取职位类型列表和预设场景
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // 并行请求职位类型和预设场景
        const [positionTypesResponse, presetsResponse] = await Promise.all([
          interviewAPI.getPositionTypes(),
          interviewAPI.getInterviewPresets(),
        ]);

        setPositionTypes(positionTypesResponse.data || []);
        setPresets(presetsResponse.data?.presets || []);
      } catch (error) {
        console.error("获取初始数据失败:", error);
        messageApi.error("获取数据失败，请稍后重试");

        setPositionTypes([]);
        setPresets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [messageApi, form]);

  // 处理选择预设场景
  const handleSelectPreset = async (preset: InterviewPreset) => {
    try {
      setSelectedPreset(preset);

      // 从预设场景中获取参数，并设置到表单中
      const { interviewParams } = preset;

      // 将参数名从后端格式转换为前端格式
      const paramsMapping: Record<string, string> = {
        difficulty: "difficulty",
        include_code_exercise: "includeCodeExercise",
        interviewer_style: "interviewerStyle",
        interview_mode: "interviewMode",
        industry_focus: "industryFocus",
        company_size: "companySize",
        include_behavioral_questions: "includeBehavioralQuestions",
        include_stress_test: "includeStressTest",
      };

      // 准备设置到表单的值
      const formValues: Partial<InterviewFormValues> = {
        presetId: preset.id,
      };

      // 设置表单值
      Object.entries(interviewParams).forEach(([key, value]) => {
        const frontendKey = paramsMapping[key];
        if (frontendKey) {
          formValues[frontendKey as keyof InterviewFormValues] = value as any;
        }
      });

      // 更新表单
      form.setFieldsValue(formValues);
    } catch (error) {
      console.error("选择预设场景失败:", error);
      messageApi.error("选择预设场景失败");
    }
  };

  const handleSubmit = async (values: InterviewFormValues) => {
    // 确保只有在最后一步才能提交表单
    if (currentStep !== 2) {
      messageApi.warning("请完成所有必要设置后再开始面试");
      return;
    }

    try {
      setLoading(true);

      const finalValues = values;
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

  const handleNextStep = useCallback(async (e?: React.MouseEvent) => {
    // 如果是事件对象，防止事件冒泡和默认行为，避免触发表单提交
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setCurrentStep((prev) => prev + 1);
  }, []);

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
            onKeyDown={(e) => {
              // 防止回车键在非最后步骤时提交表单
              if (e.key === "Enter" && currentStep !== 2) {
                e.preventDefault();
              }
            }}
          >
            <Steps
              current={currentStep}
              items={[
                {
                  title: "选择预设场景",
                  description: "快速开始面试",
                },
                {
                  title: "可选设置",
                  description: "细致化面试体验",
                },
                {
                  title: "必要设置",
                  description: "职位和难度",
                },
              ]}
            />
            <div
              style={{
                marginTop: "32px",
                marginBottom: "32px",
                minHeight: "300px",
                padding: "20px",
                border: "1px solid #f0f0f0",
                borderRadius: "4px",
                backgroundColor: "#fafafa",
              }}
            >
              <div style={{ display: currentStep === 0 ? "block" : "none" }}>
                <Paragraph>选择一个预设的面试场景，快速开始面试</Paragraph>
                {presets.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <Spin spinning={loading} />
                    {!loading && <p>暂无可用预设场景</p>}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {presets.map((preset) => (
                      <Tooltip
                        // 依据interviewParams中的值动态设置提示信息
                        title={
                          Object.values(preset.interviewParams)
                            .filter((value) => typeof value !== "boolean")
                            .join(", ") || "无额外信息"
                        }
                        key={preset.id}
                      >
                        <Card
                          key={preset.id}
                          style={{
                            marginBottom: "16px",
                            cursor: "pointer",
                            border:
                              selectedPreset?.id === preset.id
                                ? "2px solid #1890ff"
                                : undefined,
                            boxShadow:
                              selectedPreset?.id === preset.id
                                ? "0 0 10px rgba(24, 144, 255, 0.3)"
                                : undefined,
                          }}
                          onClick={() => handleSelectPreset(preset)}
                          title={preset.name}
                        >
                          <Card.Meta
                            description={preset.description}
                          />
                        </Card>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: currentStep === 1 ? "block" : "none" }}>
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
              </div>

              <div style={{ display: currentStep === 2 ? "block" : "none" }}>
                <Form.Item
                  label="选择职位类型"
                  name="positionType"
                  rules={[{ required: true, message: "请选择职位类型" }]}
                >
                  <Select placeholder="选择你要模拟的职位">
                    {positionTypes.map((pos) => (
                      <Option
                        key={pos.value}
                        // 传递给后端大模型的值应该用可读的标签值
                        value={pos.label}
                      >
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
                  rules={[{ required: true, message: "请选择面试官风格" }]}
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
              </div>
            </div>

            <div
              style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              {currentStep > 0 && (
                <Button
                  htmlType="button"
                  style={{ marginRight: "8px" }}
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  上一步
                </Button>
              )}

              {currentStep < 2 ? (
                <Button
                  type="primary"
                  htmlType="button" // 明确指定为普通按钮，避免触发表单提交
                  style={{ marginLeft: "auto" }}
                  onClick={(e) => handleNextStep(e)}
                  disabled={
                    // 如果在第一个步骤且未选择预设，则禁用
                    currentStep === 0 && !selectedPreset
                  }
                >
                  下一步
                </Button>
              ) : (
                <Button type="primary" htmlType="submit">
                  开始面试
                </Button>
              )}
            </div>
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
