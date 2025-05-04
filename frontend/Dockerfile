FROM node:23-alpine

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json* ./
RUN npm ci

# 复制项目文件
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 运行应用
CMD ["npm", "start"]