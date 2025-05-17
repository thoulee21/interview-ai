"""
管理员API模块
管理所有管理员相关操作的API
"""

import logging
import secrets

from app.api.auth import admin_required
from app.models.interview import (InterviewPreset, InterviewQuestion,
                                  InterviewSession, MultimodalAnalysis)
from app.models.position import PositionType
from app.models.user import User
from flask import jsonify, request

# 配置日志
logger = logging.getLogger(__name__)


# 会话管理相关API
@admin_required
def get_all_sessions():
    """获取所有面试会话"""
    try:
        limit = request.args.get('limit', default=100, type=int)
        offset = request.args.get('offset', default=0, type=int)
        user_id = request.args.get('userId', default=None, type=int)

        sessions = InterviewSession.get_all(
            limit=limit, offset=offset, user_filter=user_id)
        return jsonify({
            "sessions": sessions,
            "total": len(sessions),
            "limit": limit,
            "offset": offset
        })
    except Exception as e:
        logger.exception(f"获取会话列表失败: {str(e)}")
        return jsonify({"error": f"获取会话列表失败: {str(e)}"}), 500


@admin_required
def get_session_details(session_id):
    """获取会话详情"""
    try:
        # 获取会话基本信息
        session = InterviewSession.get(session_id)
        if not session:
            return jsonify({"error": "会话不存在"}), 404

        user_id = InterviewSession.get_user_id(session_id)['user_id']
        user_info = User.get_by_id(user_id)

        # 获取会话的所有问题
        questions = InterviewQuestion.get_all_for_session(session_id)

        # 获取多模态分析
        analyses = MultimodalAnalysis.get_for_session(session_id)

        session = dict(session)
        # 计算会话开始和结束时间（如果有）
        start_time = session["start_time"] if "start_time" in session else None
        end_time = session["end_time"] if "end_time" in session else None

        return jsonify({
            "sessionId": session["session_id"],
            "positionType": session["position_type"],
            "difficulty": session["difficulty"],
            "status": session["status"],
            "startTime": start_time,
            "endTime": end_time,
            "questions": questions,
            "analyses": analyses,
            "userInfo": user_info
        })
    except Exception as e:
        logger.exception(f"获取会话详情失败: {str(e)}")
        return jsonify({"error": f"获取会话详情失败: {str(e)}"}), 500


@admin_required
def delete_session(session_id):
    """删除会话"""
    try:
        # 检查会话是否存在
        session = InterviewSession.get(session_id)
        if not session:
            return jsonify({"error": "会话不存在"}), 404

        # 删除会话及相关数据
        success = InterviewSession.delete(session_id)

        if success:
            return jsonify({"message": "会话已删除"})
        else:
            return jsonify({"error": "删除会话失败"}), 500
    except Exception as e:
        logger.exception(f"删除会话失败: {str(e)}")
        return jsonify({"error": f"删除会话失败: {str(e)}"}), 500


# 职位类型管理相关API
@admin_required
def get_admin_position_types():
    """获取所有职位类型（管理员版，包含更多详情）"""
    try:
        position_types = PositionType.get_all_with_details()

        # 对于每个职位类型，添加使用计数
        for pt in position_types:
            pt["usageCount"] = PositionType.get_usage_count(pt["id"])

        return jsonify(position_types)
    except Exception as e:
        logger.exception(f"获取职位类型列表失败: {str(e)}")
        return jsonify({"error": f"获取职位类型列表失败: {str(e)}"}), 500


@admin_required
def get_position_type_detail(position_id):
    """获取职位类型详情"""
    try:
        position_type = PositionType.get_by_id(position_id)
        if not position_type:
            return jsonify({"error": "职位类型不存在"}), 404

        # 添加使用计数
        position_type["usageCount"] = PositionType.get_usage_count(position_id)

        return jsonify(position_type)
    except Exception as e:
        logger.exception(f"获取职位类型详情失败: {str(e)}")
        return jsonify({"error": f"获取职位类型详情失败: {str(e)}"}), 500


@admin_required
def create_position_type():
    """创建新的职位类型"""
    try:
        data = request.json
        value = data.get('value')
        label = data.get('label')
        description = data.get('description', '')

        # 验证必要字段
        if not value or not label:
            return jsonify({"error": "缺少必要字段"}), 400

        # 创建新的职位类型
        position_id = PositionType.create(value, label, description)

        if position_id:
            # 获取创建的职位类型详情
            position_type = PositionType.get_by_id(position_id)
            return jsonify(position_type), 201
        else:
            return jsonify({"error": "职位类型已存在"}), 409
    except Exception as e:
        logger.exception(f"创建职位类型失败: {str(e)}")
        return jsonify({"error": f"创建职位类型失败: {str(e)}"}), 500


@admin_required
def update_position_type(position_id):
    """更新职位类型"""
    try:
        # 检查职位类型是否存在
        position = PositionType.get_by_id(position_id)
        if not position:
            return jsonify({"error": "职位类型不存在"}), 404

        data = request.json
        value = data.get('value')
        label = data.get('label')
        description = data.get('description', '')

        # 验证必要字段
        if not value or not label:
            return jsonify({"error": "缺少必要字段"}), 400

        # 更新职位类型
        success = PositionType.update(position_id, value, label, description)

        if success:
            # 获取更新后的职位类型详情
            updated_position = PositionType.get_by_id(position_id)
            return jsonify(updated_position)
        else:
            return jsonify({"error": "职位类型编码已被占用"}), 409
    except Exception as e:
        logger.exception(f"更新职位类型失败: {str(e)}")
        return jsonify({"error": f"更新职位类型失败: {str(e)}"}), 500


@admin_required
def delete_position_type(position_id):
    """删除职位类型"""
    try:
        # 检查职位类型是否存在
        position = PositionType.get_by_id(position_id)
        if not position:
            return jsonify({"error": "职位类型不存在"}), 404

        # 检查是否在使用中
        usage_count = PositionType.get_usage_count(position_id)
        if usage_count > 0:
            return jsonify({
                "error": "无法删除正在使用中的职位类型",
                "usageCount": usage_count
            }), 409

        # 删除职位类型
        success = PositionType.delete(position_id)

        if success:
            return jsonify({"message": "职位类型已删除"})
        else:
            return jsonify({"error": "删除职位类型失败"}), 500
    except Exception as e:
        logger.exception(f"删除职位类型失败: {str(e)}")
        return jsonify({"error": f"删除职位类型失败: {str(e)}"}), 500


# 用户管理相关API
@admin_required
def get_all_users():
    """获取所有用户列表"""
    try:
        users = User.get_all_users()
        return jsonify({"users": users})
    except Exception as e:
        logger.exception(f"获取用户列表失败: {str(e)}")
        return jsonify({"error": f"获取用户列表失败: {str(e)}"}), 500


@admin_required
def get_user_detail(user_id):
    """获取用户详情"""
    try:
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        return jsonify(user)
    except Exception as e:
        logger.exception(f"获取用户详情失败: {str(e)}")
        return jsonify({"error": f"获取用户详情失败: {str(e)}"}), 500


@admin_required
def update_user(user_id):
    """更新用户信息"""
    try:
        # 检查用户是否存在
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({"error": "用户不存在"}), 404

        # 获取要更新的数据
        data = request.json
        email = data.get('email')
        is_admin = data.get('is_admin')
        status = data.get('status')

        # 更新用户信息
        update_data = {}
        if email is not None:
            update_data['email'] = email
        if is_admin is not None:
            update_data['is_admin'] = bool(is_admin)
        if status is not None:
            update_data['status'] = status

        success = User.update_user(user_id, update_data)

        if success:
            # 获取更新后的用户信息
            updated_user = User.get_by_id(user_id)
            return jsonify({"message": "用户信息更新成功", "user": updated_user})
        else:
            return jsonify({"error": "更新用户信息失败"}), 500
    except Exception as e:
        logger.exception(f"更新用户信息失败: {str(e)}")
        return jsonify({"error": f"更新用户信息失败: {str(e)}"}), 500


@admin_required
def delete_user(user_id):
    """删除用户"""
    try:
        # 确保不能删除自己
        if str(request.user.get('user_id')) == str(user_id):
            return jsonify({"error": "不能删除当前登录的用户"}), 400

        # 执行删除操作
        success = User.delete_user(user_id)

        if success:
            return jsonify({"message": "用户已成功删除或停用"})
        else:
            return jsonify({"error": "删除用户失败"}), 500
    except Exception as e:
        logger.exception(f"删除用户失败: {str(e)}")
        return jsonify({"error": f"删除用户失败: {str(e)}"}), 500


@admin_required
def reset_user_password(user_id):
    """重置用户密码"""
    try:
        # 检查用户是否存在
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({"error": "用户不存在"}), 404

        # 生成随机密码
        new_password = ''.join(secrets.choice(
            'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') for _ in range(10))

        # 更新密码
        success = User.reset_password(user_id, new_password)

        if success:
            return jsonify({
                "message": "密码已重置",
                "username": user["username"],
                "new_password": new_password  # 在实际生产环境中应使用邮件发送而不是直接返回
            })
        else:
            return jsonify({"error": "重置密码失败"}), 500
    except Exception as e:
        logger.exception(f"重置密码失败: {str(e)}")
        return jsonify({"error": f"重置密码失败: {str(e)}"}), 500


@admin_required
def create_user():
    """创建新用户"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password') or ''.join(secrets.choice(
            'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') for _ in range(10))
        email = data.get('email')
        is_admin = data.get('is_admin', False)

        # 验证必要字段
        if not username:
            return jsonify({"error": "用户名不能为空"}), 400

        # 创建新用户
        user_id = User.create(username, password, email,
                              is_admin=1 if is_admin else 0)

        if not user_id:
            return jsonify({"error": "用户名已存在"}), 409

        # 获取创建的用户
        new_user = User.get_by_id(user_id)

        return jsonify({
            "message": "用户创建成功",
            "user": new_user,
            "password": password  # 在实际生产环境中应使用邮件发送而不是直接返回
        }), 201
    except Exception as e:
        logger.exception(f"创建用户失败: {str(e)}")
        return jsonify({"error": f"创建用户失败: {str(e)}"}), 500


# 面试预设场景管理API
@admin_required
def create_preset():
    """创建面试预设场景"""
    data = request.json
    name = data.get('name')
    description = data.get('description')
    interview_params = data.get('interviewParams')

    if not name or not interview_params:
        return jsonify({"error": "名称和面试参数是必填项"}), 400

    try:
        preset_id = InterviewPreset.create(
            name, description, interview_params
        )
        preset = InterviewPreset.get_by_id(preset_id)
        return jsonify({
            "message": "预设场景创建成功",
            "preset": preset
        }), 201
    except Exception as e:
        logger.exception(f"创建预设场景失败: {str(e)}")
        return jsonify({"error": f"创建预设场景失败: {str(e)}"}), 500


@admin_required
def update_preset(preset_id):
    """更新面试预设场景"""
    data = request.json
    name = data.get('name')
    description = data.get('description')
    interview_params = data.get('interviewParams')

    try:
        success = InterviewPreset.update(
            preset_id, name, description, interview_params
        )
        if not success:
            return jsonify({"error": "预设场景不存在或更新失败"}), 404

        preset = InterviewPreset.get_by_id(preset_id)
        return jsonify({
            "message": "预设场景更新成功",
            "preset": preset
        })
    except Exception as e:
        logger.exception(f"更新预设场景失败: {str(e)}")
        return jsonify({"error": f"更新预设场景失败: {str(e)}"}), 500


@admin_required
def delete_preset(preset_id):
    """删除面试预设场景"""
    try:
        success = InterviewPreset.delete(preset_id)
        if not success:
            return jsonify({"error": "预设场景不存在或删除失败"}), 404
        return jsonify({"message": "预设场景删除成功"})
    except Exception as e:
        logger.exception(f"删除预设场景失败: {str(e)}")
        return jsonify({"error": f"删除预设场景失败: {str(e)}"}), 500
