# 多模态智能模拟面试评测智能体 - 后端服务

本目录包含面向高校学生的多模态智能模拟面试评测智能体的后端服务代码。

## 技术栈

- Flask: Web框架
- SQLite: 数据存储
- 讯飞星火大模型API: 智能对话与分析

## 环境设置

1. 安装依赖：

```bash
poetry install
```

2. 配置环境变量：
   复制`.env.example`为`.env`并填入讯飞星火API凭证

3. 运行服务：

```bash
poetry run python app.py
```
