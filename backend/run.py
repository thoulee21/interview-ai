"""
应用入口文件
启动Flask应用程序
"""

import os

from app import create_app

# 确定配置环境
flask_debug = os.environ.get('FLASK_DEBUG', '1')
env = 'development' if flask_debug == '1' else 'production'

# 创建应用实例
app = create_app(env)

if __name__ == '__main__':
    # 获取主机和端口（如果环境变量中设置了）
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))

    # 启动应用
    app.run(host=host, port=port, debug=(env == 'development'))

    print(f"应用已在 http://{host}:{port} 上启动")
