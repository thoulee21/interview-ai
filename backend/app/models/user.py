"""
用户相关的数据库模型
"""

import hashlib
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
            "last_login": user["last_login"],
            "status": user["status"]
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

        # 检查用户状态
        if user.get("status") == "inactive":
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
            "status": user["status"],
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
    def update_profile(user_id, email=None):
        """
        更新用户资料

        Args:
            user_id (int): 用户ID
            email (str, optional): 邮箱

        Returns:
            bool: 更新是否成功
        """
        db = get_db()
        cursor = db.cursor()

        # 构建更新SQL
        update_fields = []
        params = []

        if email is not None:
            update_fields.append("email = ?")
            params.append(email)

        # 如果没有要更新的字段，直接返回成功
        if not update_fields:
            return True

        # 添加用户ID参数
        params.append(user_id)

        # 执行更新
        cursor.execute(
            f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?",
            params
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
            "SELECT id, username, email, is_admin, status, created_at, last_login FROM users")

        users = []
        for row in cursor.fetchall():
            users.append({
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "is_admin": bool(row["is_admin"]),
                "status": row["status"],
                "created_at": row["created_at"],
                "last_login": row["last_login"]
            })

        return users

    @staticmethod
    def update_user(user_id, data):
        """
        更新用户信息（管理员功能）

        Args:
            user_id (int): 用户ID
            data (dict): 要更新的字段，可包含 email, is_admin, status

        Returns:
            bool: 更新是否成功
        """
        db = get_db()
        cursor = db.cursor()

        # 构建更新SQL
        update_fields = []
        params = []

        if 'email' in data and data['email'] is not None:
            update_fields.append("email = ?")
            params.append(data['email'])

        if 'is_admin' in data and data['is_admin'] is not None:
            update_fields.append("is_admin = ?")
            params.append(1 if data['is_admin'] else 0)

        if 'status' in data and data['status'] is not None:
            update_fields.append("status = ?")
            params.append(data['status'])

        # 如果没有要更新的字段，直接返回成功
        if not update_fields:
            return True

        # 添加用户ID参数
        params.append(user_id)

        # 执行更新
        cursor.execute(
            f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?",
            params
        )
        db.commit()
        return cursor.rowcount > 0

    @staticmethod
    def delete_user(user_id):
        """
        删除用户（管理员功能）

        Args:
            user_id (int): 要删除的用户ID

        Returns:
            bool: 删除是否成功
        """
        db = get_db()
        cursor = db.cursor()

        # 先检查是否有关联的会话
        cursor.execute(
            "SELECT COUNT(*) FROM user_sessions WHERE user_id = ?", (user_id,))
        session_count = cursor.fetchone()[0]

        if session_count > 0:
            # 如果有关联会话，改为停用账户而不是删除
            cursor.execute(
                "UPDATE users SET status = 'inactive' WHERE id = ?", (user_id,))
            db.commit()
            return True
        else:
            # 如果没有关联会话，可以直接删除
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            db.commit()
            return cursor.rowcount > 0

    @staticmethod
    def reset_password(user_id, new_password):
        """
        重置用户密码（管理员功能）

        Args:
            user_id (int): 用户ID
            new_password (str): 新密码（明文）

        Returns:
            bool: 重置是否成功
        """
        return User.update_password(user_id, new_password)
