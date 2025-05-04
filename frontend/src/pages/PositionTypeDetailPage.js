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
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import interviewAPI from "../services/api";

const { Title } = Typography;
const { TextArea } = Input;

const PositionTypeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [positionType, setPositionType] = useState(null);

  const isCreate = location.pathname.includes("/create");

  // 获取职位类型详情
  useEffect(() => {
    const fetchPositionTypeDetail = async () => {
      if (isCreate) {
        setPositionType({ value: "", label: "", description: "" });
        return;
      }

      try {
        setLoading(true);
        const response = await interviewAPI.getPositionTypeDetail(id);
        setPositionType(response.data);
        form.setFieldsValue({
          value: response.data.value,
          label: response.data.label,
          description: response.data.description || "",
        });
      } catch (error) {
        console.error("获取职位类型详情失败:", error);
        message.error("获取职位类型详情失败，请稍后重试");
        navigate("/admin/position-types"); // 获取失败返回列表页
      } finally {
        setLoading(false);
      }
    };

    fetchPositionTypeDetail();
  }, [id, isCreate, form, navigate]);

  // 保存职位类型
  const handleSave = async (values) => {
    try {
      setLoading(true);
      if (isCreate) {
        await interviewAPI.createPositionType(values);
        message.success("职位类型创建成功");
      } else {
        await interviewAPI.updatePositionType(id, values);
        message.success("职位类型更新成功");
      }
      navigate("/admin/position-types");
    } catch (error) {
      if (error.response?.status === 409) {
        message.error("已存在相同编码的职位类型");
      } else {
        console.error(
          isCreate ? "创建职位类型失败:" : "更新职位类型失败:",
          error
        );
        message.error(
          isCreate
            ? "创建职位类型失败，请稍后重试"
            : "更新职位类型失败，请稍后重试"
        );
      }
      setLoading(false);
    }
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { title: "职位管理", path: "/admin/position-types" },
          { title: isCreate ? "添加职位类型" : "编辑职位类型" },
        ]}
        style={{ marginBottom: "16px" }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <Title level={2}>{isCreate ? "添加职位类型" : "编辑职位类型"}</Title>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/admin/position-types")}
        >
          返回列表
        </Button>
      </div>

      <Card>
        <Spin spinning={loading}>
          {(positionType || isCreate) && (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              initialValues={{
                value: positionType?.value || "",
                label: positionType?.label || "",
                description: positionType?.description || "",
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
                    保存
                  </Button>
                  <Button onClick={() => navigate("/admin/position-types")}>
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default PositionTypeDetailPage;
