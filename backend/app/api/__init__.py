"""
API蓝图模块
"""

from app.api import admin, analysis, health, interview, position
from flask import Blueprint

# 创建API蓝图
api_bp = Blueprint('api', __name__, url_prefix='/api')

# 导入各个子模块的路由

# 注册健康检查路由
api_bp.add_url_rule('/health', view_func=health.health_check)

# 注册面试相关路由
api_bp.add_url_rule('/start_interview',
                    view_func=interview.start_interview, methods=['POST'])
api_bp.add_url_rule('/answer_question',
                    view_func=interview.answer_question, methods=['POST'])
api_bp.add_url_rule('/interview_results/<session_id>',
                    view_func=interview.get_interview_results)

# 注册分析相关路由
api_bp.add_url_rule('/evaluate_video',
                    view_func=analysis.evaluate_video, methods=['POST'])
api_bp.add_url_rule('/evaluate_audio',
                    view_func=analysis.evaluate_audio, methods=['POST'])

# 注册职位类型相关路由
api_bp.add_url_rule('/position_types', view_func=position.get_position_types)

# 注册管理员相关路由
api_bp.add_url_rule('/admin/sessions', view_func=admin.get_all_sessions)
api_bp.add_url_rule('/admin/sessions/<session_id>',
                    view_func=admin.get_session_details)
api_bp.add_url_rule('/admin/sessions/<session_id>',
                    view_func=admin.delete_session, methods=['DELETE'])
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
