"""
用户认证API模块
"""

import functools
import logging
from datetime import datetime, timedelta

import jwt
from app.models.user import User
from flask import current_app, jsonify, request

# 配置日志
logger = logging.getLogger(__name__)


def register():
    """注册新用户"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    # 验证必要字段
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400

    # 创建新用户（默认为普通用户）
    user_id = User.create(username, password, email, is_admin=0)

    if not user_id:
        return jsonify({"error": "用户名已存在"}), 409

    return jsonify({
        "message": "注册成功",
        "user_id": user_id
    }), 201


def login():
    """用户登录"""
    data = request.json
    username = data.get('username')
    password = data.get('password')

    # 验证必要字段
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400

    # 验证用户身份
    user = User.authenticate(username, password)

    if not user:
        return jsonify({"error": "用户名或密码错误"}), 401

    # 生成JWT令牌
    payload = {
        "user_id": user["id"],
        "username": user["username"],
        "is_admin": user["is_admin"],
        "exp": datetime.utcnow() + timedelta(days=1)  # 令牌有效期1天
    }
    token = jwt.encode(
        payload, current_app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        "message": "登录成功",
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "is_admin": user["is_admin"]
        }
    })


def user_profile():
    """获取当前用户信息"""
    # 从请求头获取令牌
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "未提供认证令牌"}), 401

    try:
        # 提取令牌
        token = auth_header.split(
            " ")[1] if " " in auth_header else auth_header

        # 验证令牌
        payload = jwt.decode(
            token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload.get('user_id')

        # 获取用户信息
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({"error": "用户不存在"}), 404

        return jsonify({
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "is_admin": user["is_admin"],
            "created_at": user["created_at"],
            "last_login": user["last_login"]
        })
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "令牌已过期"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "无效的令牌"}), 401


def update_profile():
    """更新用户资料"""
    # 从请求头获取令牌
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "未提供认证令牌"}), 401

    try:
        # 提取令牌
        token = auth_header.split(" ")[1] if " " in auth_header else auth_header

        # 验证令牌
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload.get('user_id')

        # 获取请求数据
        data = request.json
        email = data.get('email')
        
        # 更新用户资料
        success = User.update_profile(user_id, email)
        
        if not success:
            return jsonify({"error": "更新用户资料失败"}), 500
            
        # 获取更新后的用户信息
        user = User.get_by_id(user_id)
        
        return jsonify({
            "message": "用户资料更新成功",
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "is_admin": user["is_admin"],
                "created_at": user["created_at"]
            }
        })
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "令牌已过期"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "无效的令牌"}), 401


def change_password():
    """修改密码"""
    # 从请求头获取令牌
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "未提供认证令牌"}), 401

    data = request.json
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not old_password or not new_password:
        return jsonify({"error": "旧密码和新密码不能为空"}), 400

    try:
        # 提取令牌
        token = auth_header.split(
            " ")[1] if " " in auth_header else auth_header

        # 验证令牌
        payload = jwt.decode(
            token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload.get('user_id')

        # 验证旧密码
        user = User.get_by_id(user_id)
        auth_result = User.authenticate(user["username"], old_password)

        if not auth_result:
            return jsonify({"error": "旧密码不正确"}), 400

        # 更新密码
        success = User.update_password(user_id, new_password)

        if success:
            return jsonify({"message": "密码已成功更新"})
        else:
            return jsonify({"error": "更新密码失败"}), 500
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "令牌已过期"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "无效的令牌"}), 401


def admin_user_list():
    """获取所有用户列表（管理员功能）"""
    # 从请求头获取令牌
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "未提供认证令牌"}), 401

    try:
        # 提取令牌
        token = auth_header.split(
            " ")[1] if " " in auth_header else auth_header

        # 验证令牌
        payload = jwt.decode(
            token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload.get('user_id')
        is_admin = payload.get('is_admin')

        # 检查管理员权限
        if not is_admin:
            return jsonify({"error": "权限不足"}), 403

        # 获取所有用户列表
        users = User.get_all_users()

        return jsonify({"users": users})
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "令牌已过期"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "无效的令牌"}), 401


def get_user_sessions():
    """获取用户的面试会话列表"""
    # 从请求头获取令牌
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "未提供认证令牌"}), 401

    try:
        # 提取令牌
        token = auth_header.split(" ")[1] if " " in auth_header else auth_header

        # 验证令牌
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = payload.get('user_id')
        is_admin = payload.get('is_admin')

        # 获取用户会话列表
        sessions = User.get_user_sessions(user_id)
        
        return jsonify({"sessions": sessions})
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "令牌已过期"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "无效的令牌"}), 401


# 权限验证装饰器
def token_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({"error": "未提供认证令牌"}), 401

        try:
            # 提取令牌
            token = auth_header.split(
                " ")[1] if " " in auth_header else auth_header

            # 验证令牌
            payload = jwt.decode(
                token, current_app.config['SECRET_KEY'], algorithms=['HS256'])

            # 设置当前用户信息
            request.user = {
                "user_id": payload.get('user_id'),
                "username": payload.get('username'),
                "is_admin": payload.get('is_admin')
            }

            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "令牌已过期"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "无效的令牌"}), 401

    return decorated


# 管理员权限验证装饰器
def admin_required(f):
    @functools.wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if not request.user.get('is_admin'):
            return jsonify({"error": "需要管理员权限"}), 403
        return f(*args, **kwargs)
    return decorated
