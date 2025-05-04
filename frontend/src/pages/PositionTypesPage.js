import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import interviewAPI from "../services/api";

const { Title, Text } = Typography;
const { Search } = Input;
const { confirm } = Modal;

const PositionTypesPage = () => {
  const [loading, setLoading] = useState(false);
  const [positionTypes, setPositionTypes] = useState([]);
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();

  // 获取职位类型列表
  const fetchPositionTypes = async () => {
    try {
      setLoading(true);
      const response = await interviewAPI.getAdminPositionTypes();
      setPositionTypes(response.data.positionTypes || []);
    } catch (error) {
      console.error("获取职位类型列表失败:", error);
      message.error("获取职位类型列表失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositionTypes();
  }, []);

  // 处理删除职位类型
  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await interviewAPI.deletePositionType(id);
      message.success("职位类型已删除");
      fetchPositionTypes();
    } catch (error) {
      if (error.response?.status === 409) {
        // 处理已有会话使用该职位类型的情况
        const usageCount = error.response.data.usageCount || 0;
        confirm({
          title: "无法删除职位类型",
          icon: <ExclamationCircleOutlined />,
          content: `该职位类型已被 ${usageCount} 个面试会话使用，无法删除。`,
          okText: "知道了",
          cancelText: null,
          okButtonProps: { type: "primary" },
        });
      } else {
        console.error("删除职位类型失败:", error);
        message.error("删除职位类型失败，请稍后重试");
      }
      setLoading(false);
    }
  };

  // 查看/编辑详情
  const handleEdit = (id) => {
    navigate(`/admin/position-types/${id}`);
  };

  // 创建新职位类型
  const handleCreate = () => {
    navigate("/admin/position-types/create");
  };

  // 筛选职位类型数据
  const filteredPositionTypes = positionTypes
    .filter(
      (position) =>
        searchText === "" ||
        position.value.toLowerCase().includes(searchText.toLowerCase()) ||
        position.label.toLowerCase().includes(searchText.toLowerCase()) ||
        position.description?.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));

  // 表格列定义
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: "职位编码",
      dataIndex: "value",
      key: "value",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "职位名称",
      dataIndex: "label",
      key: "label",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      render: (text) => <Text ellipsis={{ tooltip: text }}>{text || "-"}</Text>,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此职位类型吗？"
            description="删除后将无法恢复，已被使用的职位类型无法删除。"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>职位类型管理</Title>
      <Card style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <Search
            placeholder="搜索职位类型"
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            添加职位类型
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredPositionTypes}
          loading={loading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ["10", "20", "50"],
          }}
        />
      </Card>
    </div>
  );
};

export default PositionTypesPage;
