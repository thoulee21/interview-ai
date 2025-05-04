import {
  Button,
  Card,
  Form,
  Radio,
  Select,
  Spin,
  Typography,
  message,
} from "antd";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import InterviewBreadcrumb from "../components/InterviewBreadcrumb";
import interviewAPI from "../services/api";

const { Title, Paragraph } = Typography;
const { Option } = Select;

const InterviewSetupPage = () => {
  const [loading, setLoading] = useState(false);
  const [positionTypes, setPositionTypes] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    // 组件加载时从后端获取职位类型列表
    const fetchPositionTypes = async () => {
      try {
        setLoading(true);
        const response = await interviewAPI.getPositionTypes();
        setPositionTypes(response.data || []);
      } catch (error) {
        console.error("获取职位类型列表失败:", error);
        message.error("获取职位类型列表失败，使用默认列表");
        // 加载失败时使用默认列表
        setPositionTypes([
          { value: "软件工程师", label: "软件工程师" },
          { value: "产品经理", label: "产品经理" },
          { value: "数据分析师", label: "数据分析师" },
          { value: "人力资源专员", label: "人力资源专员" },
          { value: "市场营销专员", label: "市场营销专员" },
          { value: "运营专员", label: "运营专员" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPositionTypes();
  }, []);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      // 调用后端API开始面试会话，使用interviewAPI服务
      const response = await interviewAPI.startInterview({
        positionType: values.positionType,
        difficulty: values.difficulty,
      });

      // 获取会话ID和初始问题，并跳转到面试页面
      const sessionId = response.data.session_id;
      const firstQuestion = response.data.question;

      message.success("面试会话已创建，即将开始面试");
      // 使用state参数将初始问题传递给InterviewPage
      navigate(`/interview/${sessionId}`, {
        state: { initialQuestion: firstQuestion },
      });
    } catch (error) {
      console.error("创建面试会话失败:", error);
      message.error("创建面试会话失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <InterviewBreadcrumb currentStep="setup" />
      <Title level={2} className="text-center">
        设置你的模拟面试
      </Title>
      <Paragraph className="text-center">
        选择你希望模拟的面试类型和难度，我们将为你创建个性化的面试体验
      </Paragraph>

      <Card style={{ maxWidth: "600px", margin: "0 auto", marginTop: "32px" }}>
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ positionType: "软件工程师", difficulty: "中级" }}
          >
            <Form.Item
              label="选择职位类型"
              name="positionType"
              rules={[{ required: true, message: "请选择职位类型" }]}
            >
              <Select placeholder="选择你要模拟的职位">
                {positionTypes.map((pos) => (
                  <Option key={pos.value} value={pos.value}>
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
          maxWidth: "600px",
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
    </div>
  );
};

export default InterviewSetupPage;
