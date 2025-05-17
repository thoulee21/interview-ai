"use client";

import { interviewAPI } from "@/services/api";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface InterviewPreset {
  id: number;
  name: string;
  description: string;
  interviewParams: any;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPresetsPage() {
  const [form] = Form.useForm();
  const [presets, setPresets] = useState<InterviewPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPreset, setEditingPreset] = useState<InterviewPreset | null>(
    null,
  );
  const [messageApi, contextHolder] = message.useMessage();

  // 搜索和筛选状态
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 获取所有预设场景
  const fetchPresets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await interviewAPI.getInterviewPresets();
      const allPresets = response.data.presets || [];

      // 根据搜索文本筛选预设场景
      let filteredPresets = allPresets;
      if (searchText) {
        filteredPresets = allPresets.filter(
          (preset: InterviewPreset) =>
            preset.name.toLowerCase().includes(searchText.toLowerCase()) ||
            preset.description.toLowerCase().includes(searchText.toLowerCase()),
        );
      }

      // 更新总数量
      setPagination((prev) => ({
        ...prev,
        total: filteredPresets.length,
      }));

      setPresets(filteredPresets);
    } catch (error) {
      console.error("获取预设场景失败:", error);
      messageApi.error("获取预设场景失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [messageApi, searchText]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  // 打开新增预设场景抽屉
  const showAddDrawer = () => {
    setEditingPreset(null);
    form.resetFields();
    form.setFieldsValue({
      interviewParams: {
        difficulty: "中级",
        interviewer_style: "专业型",
        interview_mode: "标准",
        include_code_exercise: false,
        include_behavioral_questions: false,
        include_stress_test: false,
      },
    });
    setDrawerVisible(true);
  };

  // 打开编辑预设场景抽屉
  const showEditDrawer = (preset: InterviewPreset) => {
    setEditingPreset(preset);

    // 设置表单值
    form.setFieldsValue({
      name: preset.name,
      description: preset.description,
      interviewParams: preset.interviewParams,
    });

    setDrawerVisible(true);
  };

  // 关闭抽屉
  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  // 打开预设场景详情模态框
  const showDetailModal = (preset: InterviewPreset) => {
    setEditingPreset(preset);
    setModalVisible(true);
  };

  // 关闭模态框
  const closeModal = () => {
    setModalVisible(false);
  };

  // 处理提交
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      const payload = {
        name: values.name,
        description: values.description,
        interviewParams: values.interviewParams,
      };

      let response;

      if (editingPreset) {
        // 更新预设场景
        response = await interviewAPI.updatePreset(editingPreset.id, payload);
        messageApi.success("预设场景更新成功");
      } else {
        // 创建新预设场景
        response = await interviewAPI.createPreset(payload);
        if (response.status === 201) {
          messageApi.success("预设场景创建成功");
        } else {
          messageApi.error("预设场景创建失败，请稍后重试");
        }
      }

      // 重新获取预设场景列表
      fetchPresets();

      // 关闭抽屉
      closeDrawer();
    } catch (error) {
      console.error("操作预设场景失败:", error);
      messageApi.error(editingPreset ? "更新预设场景失败" : "创建预设场景失败");
    } finally {
      setLoading(false);
    }
  };

  // 删除预设场景
  const handleDelete = async (presetId: number) => {
    try {
      setLoading(true);
      await interviewAPI.deletePreset(presetId);
      messageApi.success("预设场景删除成功");
      fetchPresets();
    } catch (error) {
      console.error("删除预设场景失败:", error);
      messageApi.error("删除预设场景失败");
    } finally {
      setLoading(false);
    }
  };

  // 处理分页变化
  const handlePaginationChange = (page: number, pageSize?: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize,
    }));
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination((prev) => ({
      ...prev,
      current: 1, // 搜索后返回第一页
    }));
  };

  // 处理排序
  const handleTableChange = (_pagination: any, _filters: any, sorter: any) => {
    const { field, order } = sorter;

    if (field && order) {
      const sortedPresets = [...presets].sort((a, b) => {
        const compareA = field
          .split(".")
          .reduce((obj: any, key: string) => obj?.[key], a);
        const compareB = field
          .split(".")
          .reduce((obj: any, key: string) => obj?.[key], b);

        if (typeof compareA === "string" && typeof compareB === "string") {
          return order === "ascend"
            ? compareA.localeCompare(compareB)
            : compareB.localeCompare(compareA);
        }

        return order === "ascend"
          ? compareA > compareB
            ? 1
            : -1
          : compareA > compareB
            ? -1
            : 1;
      });

      setPresets(sortedPresets);
    }
  };

  // 处理页面大小变化
  const handleShowSizeChange = (_current: number, size: number) => {
    setPagination((prev) => ({
      ...prev,
      pageSize: size,
    }));
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
      sorter: true,
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 150,
      sorter: true,
      render: (text: string, record: InterviewPreset) => (
        <Tag
          color="blue"
          style={{ cursor: "pointer" }}
          onClick={() => showDetailModal(record)}
        >
          {text}
        </Tag>
      ),
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      width: 420,
      ellipsis: true,
      sorter: true,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: true,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      sorter: true,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      render: (_text: string, record: InterviewPreset) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showEditDrawer(record)}
          />
          <Popconfirm
            title="确定要删除这个预设场景吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <Breadcrumb
        style={{ margin: "16px 0" }}
        items={[
          { title: <Link href="/admin">管理控制台</Link> },
          { title: "面试预设场景" },
        ]}
      />

      <Title level={3}>
        <SettingOutlined style={{ marginRight: 8 }} />
        面试预设场景管理
      </Title>

      <Card style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <Space>
            <Input.Search
              placeholder="搜索预设场景"
              allowClear
              onSearch={handleSearch}
              style={{ width: 250 }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchPresets}>
              刷新
            </Button>
          </Space>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showAddDrawer}
          >
            添加预设场景
          </Button>
        </div>

        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={presets}
            rowKey="id"
            onChange={handleTableChange}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              pageSizeOptions: ["5", "10", "20", "50"],
              onChange: handlePaginationChange,
              onShowSizeChange: handleShowSizeChange,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Spin>
      </Card>

      {/* 添加/编辑预设场景抽屉 */}
      <Drawer
        title={editingPreset ? "编辑预设场景" : "添加预设场景"}
        width={600}
        onClose={closeDrawer}
        open={drawerVisible}
        styles={{ body: { paddingBottom: 80 } }}
        extra={
          <Space>
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" onClick={() => form.submit()}>
              提交
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="预设场景名称"
            rules={[{ required: true, message: "请输入预设场景名称" }]}
          >
            <Input placeholder="例如：技术深度型面试" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ message: "请输入预设场景描述" }]}
          >
            <TextArea
              placeholder="描述这个预设场景的特点和适用情况"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>

          <Form.Item
            label="面试模式"
            name={["interviewParams", "interview_mode"]}
          >
            <Select>
              <Option value="标准">标准面试</Option>
              <Option value="结对编程">结对编程</Option>
              <Option value="系统设计">系统设计</Option>
              <Option value="算法挑战">算法挑战</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="行业焦点"
            name={["interviewParams", "industry_focus"]}
          >
            <Select placeholder="选择行业焦点">
              <Option value="互联网">互联网</Option>
              <Option value="金融">金融</Option>
              <Option value="医疗">医疗</Option>
              <Option value="教育">教育</Option>
              <Option value="零售">零售</Option>
              <Option value="制造业">制造业</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="公司规模"
            name={["interviewParams", "company_size"]}
          >
            <Select placeholder="选择公司规模">
              <Option value="创业公司">创业公司</Option>
              <Option value="中型企业">中型企业</Option>
              <Option value="大型企业">大型企业</Option>
              <Option value="跨国公司">跨国公司</Option>
            </Select>
          </Form.Item>

          <Form.Item
            valuePropName="checked"
            label="包含代码练习"
            name={["interviewParams", "include_code_exercise"]}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            valuePropName="checked"
            label="包含行为问题"
            name={["interviewParams", "include_behavioral_questions"]}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            valuePropName="checked"
            label="包含压力测试"
            name={["interviewParams", "include_stress_test"]}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 预设场景详情模态框 */}
      <Modal
        title="预设场景详情"
        open={modalVisible}
        onCancel={closeModal}
        footer={[
          <Button key="back" onClick={closeModal}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {editingPreset && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">{editingPreset.id}</Descriptions.Item>
            <Descriptions.Item label="名称">
              {editingPreset.name}
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {editingPreset.description}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(editingPreset.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {new Date(editingPreset.updatedAt).toLocaleString()}
            </Descriptions.Item>

            <Descriptions.Item label="面试参数">
              <Table
                size="middle"
                bordered={false}
                pagination={false}
                showHeader={false}
                dataSource={[
                  {
                    key: "interview_mode",
                    label: "面试模式",
                    value: editingPreset.interviewParams.interview_mode,
                  },
                  {
                    key: "industry_focus",
                    label: "行业焦点",
                    value: editingPreset.interviewParams.industry_focus,
                  },
                  {
                    key: "company_size",
                    label: "公司规模",
                    value: editingPreset.interviewParams.company_size,
                  },
                  {
                    key: "include_code_exercise",
                    label: "包含代码练习",
                    value: editingPreset.interviewParams.include_code_exercise
                      ? "是"
                      : "否",
                  },
                  {
                    key: "include_behavioral_questions",
                    label: "包含行为问题",
                    value: editingPreset.interviewParams
                      .include_behavioral_questions
                      ? "是"
                      : "否",
                  },
                  {
                    key: "include_stress_test",
                    label: "包含压力测试",
                    value: editingPreset.interviewParams.include_stress_test
                      ? "是"
                      : "否",
                  },
                ]}
                columns={[
                  {
                    dataIndex: "label",
                    width: 120,
                  },
                  {
                    dataIndex: "value",
                  },
                ]}
                rowKey="key"
                style={{ marginBottom: 0 }}
              />
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
