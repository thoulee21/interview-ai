"use client";

import interviewAPI from "@/services/api";
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Title, Text } = Typography;
const { Search } = Input;
const { confirm } = Modal;

type PositionType = {
  id: number;
  value: string;
  label: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export default function PositionTypesPage() {
  const [loading, setLoading] = useState(false);
  const [positionTypes, setPositionTypes] = useState<PositionType[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sortField, setSortField] = useState<string>("label");
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | undefined>(
    "ascend",
  );
  const router = useRouter();

  // 获取职位类型列表
  const fetchPositionTypes = async () => {
    try {
      setLoading(true);
      const response = await interviewAPI.getAdminPositionTypes();
      setPositionTypes(response.data || []);
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
  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      await interviewAPI.deletePositionType(id.toString());
      message.success("职位类型已删除");
      fetchPositionTypes();
    } catch (error: unknown) {
      type ErrorResponse = {
        response?: { status?: number; data?: { usageCount?: number } };
      };
      if ((error as ErrorResponse).response?.status === 409) {
        // 处理已有会话使用该职位类型的情况
        const usageCount =
          (error as ErrorResponse).response?.data?.usageCount || 0;
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
  const handleEdit = (id: number) => {
    router.push(`/admin/position-types/${id}`);
  };

  // 创建新职位类型
  const handleCreate = () => {
    router.push("/admin/position-types/create");
  };

  // 筛选职位类型数据
  const filteredPositionTypes = positionTypes
    .filter(
      (position) =>
        searchText === "" ||
        position.value.toLowerCase().includes(searchText.toLowerCase()) ||
        position.label.toLowerCase().includes(searchText.toLowerCase()) ||
        position.description?.toLowerCase().includes(searchText.toLowerCase()),
    )
    .sort((a, b) => {
      if (!sortOrder) return 0;

      const direction = sortOrder === "ascend" ? 1 : -1;

      switch (sortField) {
        case "id":
          return direction * (a.id - b.id);
        case "value":
          return direction * a.value.localeCompare(b.value, "zh-CN");
        case "label":
          return direction * a.label.localeCompare(b.label, "zh-CN");
        case "createdAt":
          return (
            direction *
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          );
        case "description":
          return (
            direction *
            (a.description || "").localeCompare(b.description || "", "zh-CN")
          );
        default:
          return 0;
      }
    });

  // 表格列定义
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
      sorter: true,
      sortOrder: sortField === "id" ? sortOrder : undefined,
    },
    {
      title: "职位代码",
      dataIndex: "value",
      key: "value",
      render: (text: string) => <Tag color="blue">{text}</Tag>,
      width: 130,
      sorter: true,
      sortOrder: sortField === "value" ? sortOrder : undefined,
    },
    {
      title: "职位名称",
      dataIndex: "label",
      key: "label",
      width: 150,
      sorter: true,
      sortOrder: sortField === "label" ? sortOrder : undefined,
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      render: (text: string) => (
        <Text ellipsis={{ tooltip: text }}>{text || "-"}</Text>
      ),
      width: 250,
      ellipsis: true,
      sorter: true,
      sortOrder: sortField === "description" ? sortOrder : undefined,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleString("zh-CN"),
      width: 150,
      sorter: true,
      sortOrder: sortField === "createdAt" ? sortOrder : undefined,
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (date: string) => new Date(date).toLocaleString("zh-CN"),
      width: 150,
      sorter: true,
      sortOrder: sortField === "updatedAt" ? sortOrder : undefined,
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_: string, record: PositionType) => (
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
            title: "职位类型管理",
          },
        ]}
      />

      <Title level={2}>
        <ApartmentOutlined style={{ marginRight: 8 }} />
        职位类型管理
      </Title>

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
            hideOnSinglePage: true,
          }}
          onChange={(_pagination, _filters, sorter) => {
            const typedSorter = sorter as {
              field: string;
              order?: "ascend" | "descend";
            };

            if (typedSorter) {
              setSortField(typedSorter.field);
              setSortOrder(typedSorter.order);
            }
          }}
        />
      </Card>
    </div>
  );
}
