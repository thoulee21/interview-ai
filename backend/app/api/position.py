"""
职位类型API模块
"""

from app.models.position import PositionType
from flask import jsonify


def get_position_types():
    """获取所有职位类型"""
    try:
        position_types = PositionType.get_all()
        return jsonify(position_types)
    except Exception as e:
        return jsonify({"error": f"获取职位类型失败: {str(e)}"}), 500
