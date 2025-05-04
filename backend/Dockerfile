FROM python:3.13-slim

WORKDIR /app

COPY sources.list /etc/apt/sources.list

# 安装系统依赖（OpenCV需要）
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip config set global.index-url https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple

# 安装 poetry
RUN pip install poetry

# 复制项目文件
COPY pyproject.toml poetry.lock* ./

# 配置 poetry 不创建虚拟环境并安装依赖
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

# 复制所有项目文件
COPY . .

# 暴露端口
EXPOSE 5000

# 运行应用
CMD ["gunicorn", "--workers=4", "--bind=0.0.0.0:5000", "run:app"]