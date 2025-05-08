FROM python:3.13-slim

WORKDIR /app

COPY debian.sources /etc/apt/sources.list.d/debian.sources

# 安装系统依赖（包括OpenCV和NumPy编译需要的依赖）
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip config set global.index-url https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple

# 安装 poetry
RUN pip install poetry

# 复制所有项目文件
COPY . .

RUN poetry install --no-interaction

EXPOSE 5000

# 运行应用
CMD ["poetry", "run", "gunicorn", "--workers=4", "--bind=0.0.0.0:5000", "run:app"]