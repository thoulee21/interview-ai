FROM node:slim

LABEL org.opencontainers.image.source="https://github.com/thoulee21/interview-ai"

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json* ./
RUN npm ci

# 复制项目文件
COPY . .

# 构建应用 - 确保环境变量在构建时被注入
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 运行应用
CMD ["npm", "start"]