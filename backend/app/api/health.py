"""
健康检查API模块
"""

from flask import jsonify


def health_check():
    """健康检查接口"""
    return jsonify({"status": "ok", "message": "服务正常运行"})
