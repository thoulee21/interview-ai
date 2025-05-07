"""
健康检查API模块
"""

import os

import tomli
from flask import jsonify


def get_version():
    """获取应用版本"""
    try:
        # 获取项目根目录的pyproject.toml文件路径
        base_dir = os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))))
        toml_path = os.path.join(base_dir, "pyproject.toml")

        # 读取toml文件
        with open(toml_path, "rb") as f:
            data = tomli.load(f)

        # 获取版本信息
        version = data.get("project", {}).get("version", "未知版本")
        return version
    except Exception as e:
        print(f"获取版本信息出错: {e}")
        return "未知版本"


def health_check():
    """健康检查接口"""
    version = get_version()
    return jsonify({
        "status": "ok",
        "message": "服务正常运行",
        "version": version
    })
