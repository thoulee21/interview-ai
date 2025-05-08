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
    # 启动应用
    app.run(host='0.0.0.0', port=5000, debug=(env == 'development'))
