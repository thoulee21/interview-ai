"""
API蓝图模块
"""

from app.api import admin, analysis, auth, health, interview, position
from flask import Blueprint

# 创建API蓝图
api_bp = Blueprint('api', __name__, url_prefix='/')

# 导入各个子模块的路由

# 注册健康检查路由
api_bp.add_url_rule('/health', view_func=health.health_check)
api_bp.add_url_rule('/', view_func=health.health_check)

# 注册用户认证相关路由
api_bp.add_url_rule(
    '/auth/register', view_func=auth.register, methods=['POST'])
api_bp.add_url_rule('/auth/login', view_func=auth.login, methods=['POST'])
api_bp.add_url_rule('/auth/profile', view_func=auth.user_profile)
api_bp.add_url_rule('/auth/update-profile',
                    view_func=auth.update_profile, methods=['PUT'])
api_bp.add_url_rule('/auth/change-password',
                    view_func=auth.change_password, methods=['POST'])
api_bp.add_url_rule('/auth/users', view_func=auth.admin_user_list)
api_bp.add_url_rule('/auth/my-sessions', view_func=auth.get_user_sessions)

# 注册面试相关路由
api_bp.add_url_rule('/start_interview',
                    view_func=interview.start_interview, methods=['POST'])
api_bp.add_url_rule('/answer_question',
                    view_func=interview.answer_question, methods=['POST'])
api_bp.add_url_rule('/interview_results/<session_id>',
                    view_func=interview.get_interview_results)
api_bp.add_url_rule('/interview_presets',
                    view_func=interview.get_interview_presets)
api_bp.add_url_rule('/interview_presets/<int:preset_id>',
                    view_func=interview.get_interview_preset_detail)

# 注册分析相关路由
api_bp.add_url_rule('/multimodal_analysis',
                    view_func=analysis.multimodal_analysis, methods=['POST'])

# 注册职位类型相关路由
api_bp.add_url_rule('/position_types', view_func=position.get_position_types)

# 注册管理员相关路由 - 会话管理
api_bp.add_url_rule('/admin/sessions', view_func=admin.get_all_sessions)
api_bp.add_url_rule('/admin/sessions/<session_id>',
                    view_func=admin.get_session_details)
api_bp.add_url_rule('/admin/sessions/<session_id>',
                    view_func=admin.delete_session, methods=['DELETE'])

# 注册管理员相关路由 - 职位类型管理
api_bp.add_url_rule('/admin/position_types',
                    view_func=admin.get_admin_position_types)
api_bp.add_url_rule('/admin/position_types',
                    view_func=admin.create_position_type, methods=['POST'])
api_bp.add_url_rule('/admin/position_types/<int:position_id>',
                    view_func=admin.get_position_type_detail)
api_bp.add_url_rule('/admin/position_types/<int:position_id>',
                    view_func=admin.update_position_type, methods=['PUT'])
api_bp.add_url_rule('/admin/position_types/<int:position_id>',
                    view_func=admin.delete_position_type, methods=['DELETE'])

# 注册管理员相关路由 - 用户管理
api_bp.add_url_rule('/admin/users', view_func=admin.get_all_users)
api_bp.add_url_rule(
    '/admin/users', view_func=admin.create_user, methods=['POST'])
api_bp.add_url_rule('/admin/users/<int:user_id>',
                    view_func=admin.get_user_detail)
api_bp.add_url_rule('/admin/users/<int:user_id>',
                    view_func=admin.update_user, methods=['PUT'])
api_bp.add_url_rule('/admin/users/<int:user_id>',
                    view_func=admin.delete_user, methods=['DELETE'])
api_bp.add_url_rule('/admin/users/<int:user_id>/reset-password',
                    view_func=admin.reset_user_password, methods=['POST'])

# 注册管理员相关路由 - 预设场景管理
api_bp.add_url_rule('/admin/presets', view_func=admin.create_preset, methods=['POST'])
api_bp.add_url_rule('/admin/presets/<int:preset_id>', view_func=admin.update_preset, methods=['PUT'])
api_bp.add_url_rule('/admin/presets/<int:preset_id>', view_func=admin.delete_preset, methods=['DELETE'])
