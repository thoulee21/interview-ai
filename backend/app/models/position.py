"""
职位类型的数据库模型
"""

from datetime import datetime
from app.utils.db import get_db


class PositionType:
    """职位类型模型"""

    @staticmethod
    def get_all():
        """
        获取所有职位类型

        Returns:
            list: 职位类型列表
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT id, value, label, description FROM position_types ORDER BY label")

        position_types = []
        for row in cursor.fetchall():
            position_types.append({
                "id": row['id'],
                "value": row['value'],
                "label": row['label'],
                "description": row['description']
            })

        return position_types

    @staticmethod
    def get_all_with_details():
        """
        获取所有职位类型（包括创建和更新时间）

        Returns:
            list: 带详细信息的职位类型列表
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT id, value, label, description, created_at, updated_at FROM position_types ORDER BY label")

        position_types = []
        for row in cursor.fetchall():
            position_types.append({
                "id": row['id'],
                "value": row['value'],
                "label": row['label'],
                "description": row['description'],
                "createdAt": row['created_at'],
                "updatedAt": row['updated_at']
            })

        return position_types

    @staticmethod
    def get_by_id(position_id):
        """
        根据ID获取职位类型

        Args:
            position_id (int): 职位类型ID

        Returns:
            dict|None: 职位类型详情
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT id, value, label, description, created_at, updated_at FROM position_types WHERE id = ?", 
            (position_id,)
        )
        position = cursor.fetchone()

        if not position:
            return None

        return {
            "id": position['id'],
            "value": position['value'],
            "label": position['label'],
            "description": position['description'],
            "createdAt": position['created_at'],
            "updatedAt": position['updated_at']
        }

    @staticmethod
    def create(value, label, description=""):
        """
        创建新的职位类型

        Args:
            value (str): 职位类型编码
            label (str): 职位类型名称
            description (str, optional): 职位描述

        Returns:
            int: 新职位类型的ID，如果创建失败则返回None
        """
        db = get_db()
        cursor = db.cursor()

        # 检查是否已存在相同的value
        cursor.execute(
            "SELECT id FROM position_types WHERE value = ?", (value,)
        )
        if cursor.fetchone():
            return None

        # 插入新职位类型
        now = datetime.now()
        cursor.execute(
            "INSERT INTO position_types (value, label, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (value, label, description, now, now)
        )
        db.commit()

        # 返回新插入的ID
        return cursor.lastrowid

    @staticmethod
    def update(position_id, value, label, description=""):
        """
        更新职位类型

        Args:
            position_id (int): 职位类型ID
            value (str): 职位类型编码
            label (str): 职位类型名称
            description (str, optional): 职位描述

        Returns:
            bool: 是否更新成功
        """
        db = get_db()
        cursor = db.cursor()

        # 检查是否与其他职位类型的value冲突
        cursor.execute(
            "SELECT id FROM position_types WHERE value = ? AND id != ?", 
            (value, position_id)
        )
        if cursor.fetchone():
            return False

        # 更新职位类型
        now = datetime.now()
        cursor.execute(
            "UPDATE position_types SET value = ?, label = ?, description = ?, updated_at = ? WHERE id = ?",
            (value, label, description, now, position_id)
        )
        db.commit()
        return cursor.rowcount > 0

    @staticmethod
    def delete(position_id):
        """
        删除职位类型

        Args:
            position_id (int): 职位类型ID

        Returns:
            bool: 是否删除成功，如果有依赖关系则返回False
        """
        db = get_db()
        cursor = db.cursor()

        # 检查是否有面试会话使用该职位类型
        cursor.execute(
            "SELECT COUNT(*) FROM interview_sessions WHERE position_type = (SELECT value FROM position_types WHERE id = ?)",
            (position_id,)
        )
        usage_count = cursor.fetchone()[0]
        if usage_count > 0:
            return False

        # 删除职位类型
        cursor.execute(
            "DELETE FROM position_types WHERE id = ?", (position_id,)
        )
        db.commit()
        return cursor.rowcount > 0

    @staticmethod
    def get_usage_count(position_id):
        """
        获取职位类型被使用的次数

        Args:
            position_id (int): 职位类型ID

        Returns:
            int: 使用次数
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT COUNT(*) FROM interview_sessions WHERE position_type = (SELECT value FROM position_types WHERE id = ?)",
            (position_id,)
        )
        return cursor.fetchone()[0]