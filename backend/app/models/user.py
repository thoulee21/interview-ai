"""
用户相关的数据库模型
"""

import hashlib
import time
from datetime import datetime

from app.utils.db import get_db


class User:
    """用户模型"""

    @staticmethod
    def create(username, password, email=None, is_admin=0):
        """
        创建新用户

        Args:
            username (str): 用户名
            password (str): 密码（明文）
            email (str, optional): 邮箱
            is_admin (int, optional): 是否为管理员（0=普通用户，1=管理员）

        Returns:
            int: 用户ID，如果用户名已存在则返回None
        """
        db = get_db()
        cursor = db.cursor()

        # 检查用户名是否已存在
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        if cursor.fetchone() is not None:
            return None

        # 密码加密
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        # 插入新用户
        cursor.execute(
            "INSERT INTO users (username, password_hash, email, is_admin, created_at) VALUES (?, ?, ?, ?, ?)",
            (username, password_hash, email, is_admin, datetime.now())
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def get_by_id(user_id):
        """
        通过ID获取用户信息

        Args:
            user_id (int): 用户ID

        Returns:
            dict|None: 用户信息
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()

        if not user:
            return None

        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "is_admin": bool(user["is_admin"]),
            "created_at": user["created_at"],
            "last_login": user["last_login"]
        }

    @staticmethod
    def get_by_username(username):
        """
        通过用户名获取用户信息

        Args:
            username (str): 用户名

        Returns:
            dict|None: 用户信息
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

        if not user:
            return None

        return dict(user)

    @staticmethod
    def authenticate(username, password):
        """
        用户认证

        Args:
            username (str): 用户名
            password (str): 密码（明文）

        Returns:
            dict|None: 成功时返回用户信息，失败时返回None
        """
        user = User.get_by_username(username)
        if not user:
            return None

        # 验证密码
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        if user["password_hash"] != password_hash:
            return None

        # 更新最后登录时间
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE users SET last_login = ? WHERE id = ?",
            (datetime.now(), user["id"])
        )
        db.commit()

        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "is_admin": bool(user["is_admin"]),
            "created_at": user["created_at"],
            "last_login": datetime.now()
        }

    @staticmethod
    def update_password(user_id, new_password):
        """
        更新用户密码

        Args:
            user_id (int): 用户ID
            new_password (str): 新密码（明文）

        Returns:
            bool: 更新是否成功
        """
        db = get_db()
        cursor = db.cursor()

        # 加密密码
        password_hash = hashlib.sha256(new_password.encode()).hexdigest()

        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (password_hash, user_id)
        )
        db.commit()
        return cursor.rowcount > 0

    @staticmethod
    def associate_session(user_id, session_id):
        """
        关联用户和面试会话

        Args:
            user_id (int): 用户ID
            session_id (str): 会话ID

        Returns:
            bool: 关联是否成功
        """
        db = get_db()
        cursor = db.cursor()

        try:
            cursor.execute(
                "INSERT INTO user_sessions (user_id, session_id) VALUES (?, ?)",
                (user_id, session_id)
            )
            db.commit()
            return True
        except Exception:
            return False

    @staticmethod
    def get_user_sessions(user_id):
        """
        获取用户的所有面试会话

        Args:
            user_id (int): 用户ID

        Returns:
            list: 会话列表
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute("""
            SELECT s.* 
            FROM interview_sessions s
            JOIN user_sessions us ON s.session_id = us.session_id
            WHERE us.user_id = ?
            ORDER BY s.start_time DESC
        """, (user_id,))

        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def is_admin(user_id):
        """
        检查用户是否为管理员

        Args:
            user_id (int): 用户ID

        Returns:
            bool: 是否为管理员
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT is_admin FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()

        if not user:
            return False

        return bool(user["is_admin"])

    @staticmethod
    def get_all_users():
        """
        获取所有用户列表（管理员功能）

        Returns:
            list: 用户列表
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT id, username, email, is_admin, created_at, last_login FROM users")

        users = []
        for row in cursor.fetchall():
            users.append({
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "is_admin": bool(row["is_admin"]),
                "created_at": row["created_at"],
                "last_login": row["last_login"]
            })

        return users
