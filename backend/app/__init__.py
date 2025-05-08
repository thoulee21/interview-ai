"""
面试AI应用初始化模块
应用工厂模式创建Flask应用实例
"""

import logging

from app.api import api_bp
from app.utils.db import close_db, init_db
from app.utils.float32json import Float32FlaskEncoder
from config import config
from flask import Flask, jsonify
from flask_cors import CORS


def create_app(config_name="default"):
    """
    应用工厂函数，创建并配置Flask应用

    Args:
        config_name (str): 配置名称，可以是development、production或default

    Returns:
        Flask: Flask应用实例
    """
    # 创建应用
    app = Flask(__name__)

    # 设置自定义JSON编码器
    app.json_encoder = Float32FlaskEncoder

    # 加载配置
    app.config.from_object(config[config_name])

    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # 设置CORS
    CORS(app)

    # 注册蓝图
    app.register_blueprint(api_bp)

    # 注册数据库关闭函数
    app.teardown_appcontext(close_db)

    # 初始化数据库
    with app.app_context():
        init_db()

    # 添加错误处理器
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "资源未找到"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "服务器内部错误"}), 500

    return app
