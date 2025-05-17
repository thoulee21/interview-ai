"""
面试相关API模块
"""

import json
import logging
from datetime import datetime

from app.api.auth import token_required
from app.models.interview import (FinalEvaluation, InterviewPreset,
                                  InterviewQuestion, InterviewSession,
                                  MultimodalAnalysis)
from app.models.user import User
from app.schemas.validation import (extract_evaluation_from_text,
                                    fix_evaluation_data,
                                    validate_evaluation_result)
from app.services.ai import ai_service
from flask import current_app, jsonify, request

# 配置日志
logger = logging.getLogger(__name__)


@token_required
def start_interview():
    """开始一个新的面试会话"""
    data = request.json
    position_type = data.get('positionType', '软件工程师')  # 职位类型
    difficulty = data.get('difficulty', '中级')  # 难度

    # 获取其他参数
    question_count = data.get('questionCount', 5)  # 问题数量
    include_code_exercise = data.get('includeCodeExercise', False)  # 是否包含代码练习
    interviewer_style = data.get('interviewerStyle', '专业型')  # 面试官风格
    interview_mode = data.get('interviewMode', '标准')  # 面试模式
    industry_focus = data.get('industryFocus')  # 行业焦点
    company_size = data.get('companySize')  # 公司规模
    include_behavioral_questions = data.get(
        'includeBehavioralQuestions', False
    )  # 是否包含行为问题
    include_stress_test = data.get('includeStressTest', False)  # 是否包含压力测试
    custom_prompt = data.get('customPrompt')  # 自定义提示词

    # 更新配置
    current_app.config['INTERVIEW_QUESTION_COUNT'] = question_count

    # 获取当前用户ID
    user_id = request.user.get('user_id')

    try:
        # 构建提示词参数
        interview_params = {
            'include_code_exercise': include_code_exercise,
            'interviewer_style': interviewer_style,
            'interview_mode': interview_mode,
            'industry_focus': industry_focus,
            'company_size': company_size,
            'include_behavioral_questions': include_behavioral_questions,
            'include_stress_test': include_stress_test,
            'custom_prompt': custom_prompt
        }

        # 创建会话，添加额外参数
        session_id = InterviewSession.create(
            position_type,
            difficulty,
            interviewer_style=interviewer_style,
            interview_params=interview_params  # 将完整的面试参数传递给create方法
        )

        # 关联用户和会话
        User.associate_session(user_id, session_id)

        # 生成第一个面试问题
        question_response = ai_service.generate_interview_question(
            position_type, difficulty, interview_params=interview_params
        )

        if question_response.get("status") != "success":
            return jsonify({"error": "生成面试问题失败"}), 500

        first_question = question_response.get("question")

        # 保存问题到数据库
        InterviewQuestion.create(session_id, first_question, 0)

        return jsonify({
            "session_id": session_id,
            "question": first_question,
            "message": "面试会话已创建"
        })

    except Exception as e:
        logger.exception(f"创建面试会话失败: {str(e)}")
        return jsonify({"error": f"创建面试会话失败: {str(e)}"}), 500


@token_required
def answer_question():
    """处理面试问题的回答并生成下一个问题"""
    data = request.json
    session_id = data.get('session_id')
    answer = data.get('answer', '')

    # 检查会话是否存在
    session = InterviewSession.get(session_id)
    if not session:
        return jsonify({"error": "无效的会话ID"}), 400

    # 检查当前用户是否有权限操作此会话
    user_id = request.user.get('user_id')
    is_admin = request.user.get('is_admin')

    if not is_admin:
        # 检查会话是否属于当前用户
        user_sessions = User.get_user_sessions(user_id)
        if not any(s['session_id'] == session_id for s in user_sessions):
            return jsonify({"error": "您没有权限操作此会话"}), 403

    try:
        # 获取当前问题
        current_question = InterviewQuestion.get_latest_for_session(session_id)
        position_type = session["position_type"]

        # 评估回答
        evaluation_response = ai_service.evaluate_answer(
            current_question["question"],
            answer,
            position_type
        )

        if evaluation_response.get("status") != "success":
            return jsonify({"error": "评估回答失败"}), 500

        evaluation = evaluation_response.get("evaluation")

        # 更新回答和评估
        InterviewQuestion.update_answer_and_evaluation(
            current_question["id"], answer, evaluation
        )

        # 判断是否结束面试
        question_count = InterviewQuestion.count_for_session(session_id)
        all_questions = InterviewQuestion.get_all_for_session(session_id)

        # 提取问题和回答
        questions = [q["question"] for q in all_questions]
        answers = [q["answer"] for q in all_questions if q["answer"]]

        # 进入面试完成分支，生成最终评估
        if question_count >= current_app.config['INTERVIEW_QUESTION_COUNT']:
            # 获取聚合的多模态分析数据
            aggregated_video_analysis, aggregated_audio_analysis = MultimodalAnalysis.aggregate_for_session(
                session_id
            )

            # 生成最终评估
            final_evaluation_response = ai_service.generate_final_evaluation(
                position_type,
                questions,
                answers,
                aggregated_video_analysis,
                aggregated_audio_analysis
            )

            if final_evaluation_response.get("status") != "success":
                return jsonify({"error": "生成最终评估失败"}), 500

            final_evaluation = final_evaluation_response.get("evaluation")

            # 使用 JSON Schema 验证来提取和验证结构化数据
            data, is_valid, errors = validate_evaluation_result(
                final_evaluation
            )

            if not is_valid:
                logger.warning(f"评估结果验证失败: {errors}, 尝试修复数据")
                # 尝试修复数据
                data = fix_evaluation_data(data)

            if data:
                # 从验证后的数据中获取评估信息
                overall_score = data.get('overallScore', 0)
                content_score = data.get('contentScore', 0)
                delivery_score = data.get('deliveryScore', 0)
                nonverbal_score = data.get('nonVerbalScore', 0)
                strengths = data.get('strengths', [])
                improvements = data.get('improvements', [])
                recommendations = data.get('recommendations', "")

                # 保存最终评估
                FinalEvaluation.create(
                    session_id,
                    overall_score,
                    content_score,
                    delivery_score,
                    nonverbal_score,
                    strengths,
                    improvements,
                    recommendations
                )
            else:
                logger.error("无法从评估结果中提取有效数据")

            # 更新会话状态为已完成
            InterviewSession.update_status(
                session_id, "completed", datetime.now()
            )

            return jsonify({
                "message": "面试已完成",
                "final_evaluation": final_evaluation,
                "is_complete": True
            })

        # 生成下一个问题
        # 获取保存的interview_params
        interview_params = InterviewSession.get_interview_params(session_id)

        next_question_response = ai_service.generate_interview_question(
            position_type,
            session["difficulty"],
            questions,
            answers,
            interview_params=interview_params  # 传递保存的面试参数
        )

        if next_question_response.get("status") != "success":
            return jsonify({"error": "生成下一个问题失败"}), 500

        next_question = next_question_response.get("question")

        # 保存下一个问题
        InterviewQuestion.create(session_id, next_question, question_count)

        return jsonify({
            "evaluation": evaluation,
            "next_question": next_question,
            "is_complete": False
        })

    except Exception as e:
        logger.exception(f"处理回答失败: {str(e)}")
        return jsonify({"error": f"处理回答失败: {str(e)}"}), 500


@token_required
def get_interview_results(session_id):
    """获取面试结果的接口"""
    # 检查当前用户是否有权限查看此会话结果
    user_id = request.user.get('user_id')
    is_admin = request.user.get('is_admin')

    if not is_admin:
        # 检查会话是否属于当前用户
        user_sessions = User.get_user_sessions(user_id)
        if not any(s['session_id'] == session_id for s in user_sessions):
            return jsonify({"error": "您没有权限查看此会话结果"}), 403

    try:
        # 检查会话是否存在
        session = InterviewSession.get(session_id)
        if not session:
            return jsonify({"error": "无效的会话ID"}), 400

        # 获取最终评估
        final_eval_record = FinalEvaluation.get_for_session(session_id)

        # 获取所有问题、回答和评估
        all_questions = InterviewQuestion.get_all_for_session(session_id)

        # 提取问题得分
        question_scores = []

        for q in all_questions:
            if q['answer'] and q['evaluation']:
                # 从评估文本中提取结构化数据
                score = 75  # 默认分数
                try:
                    # 尝试提取JSON数据
                    eval_data = extract_evaluation_from_text(q['evaluation'])
                    if eval_data and isinstance(eval_data, dict):
                        # 如果成功提取到JSON数据，直接获取score字段
                        if 'score' in eval_data and isinstance(eval_data['score'], (int, float)):
                            raw_score = float(eval_data['score'])
                            # 将1-10分转换为百分制
                            score = int(raw_score * 10)
                except Exception as e:
                    logger.warning(f"提取评分失败: {str(e)}")

                question_scores.append({
                    'question': q['question'],
                    'answer': q['answer'],
                    'score': score,
                    'feedback': q['evaluation']
                })

        # 获取多模态分析数据
        analyses = MultimodalAnalysis.get_for_session(session_id)

        video_analysis = None
        audio_analysis = None

        # 如果有多模态分析数据，获取最新的一条
        if analyses:
            latest_analysis = analyses[-1]
            video_analysis = latest_analysis.get('videoAnalysis')
            audio_analysis = latest_analysis.get('audioAnalysis')

        # 构建结果对象，使用数据库中保存的最终评估结果
        if final_eval_record:
            # 从数据库记录中获取评估数据
            strengths = json.loads(
                final_eval_record['strengths']
            ) if final_eval_record['strengths'] else []

            improvements = json.loads(
                final_eval_record['improvements']
            ) if final_eval_record['improvements'] else []

            recommendations = final_eval_record['recommendations']

            results = {
                'overallScore': final_eval_record['overall_score'],
                'contentScore': final_eval_record['content_score'],
                'deliveryScore': final_eval_record['delivery_score'],
                'nonVerbalScore': final_eval_record['nonverbal_score'],
                'strengths': strengths,
                'improvements': improvements,
                'questionScores': question_scores,
                'videoAnalysis': video_analysis,
                'audioAnalysis': audio_analysis,
                'recommendations': recommendations
            }
        else:
            return jsonify({"error": "未找到面试结果"}), 404

        return jsonify(results)

    except Exception as e:
        logger.exception(f"获取面试结果失败: {str(e)}")
        return jsonify({"error": f"获取面试结果失败: {str(e)}"}), 500


@token_required
def get_interview_presets():
    """获取所有面试预设场景"""
    try:
        # 获取所有预设场景
        presets = InterviewPreset.get_all()
        return jsonify({"presets": presets})
    except Exception as e:
        logger.exception(f"获取面试预设场景失败: {str(e)}")
        return jsonify({"error": f"获取面试预设场景失败: {str(e)}"}), 500


@token_required
def get_interview_preset_detail(preset_id):
    """获取面试预设场景详情"""
    try:
        # 获取指定预设场景
        preset = InterviewPreset.get_by_id(preset_id)
        if not preset:
            return jsonify({"error": "预设场景不存在"}), 404
        return jsonify({"preset": preset})
    except Exception as e:
        logger.exception(f"获取面试预设场景详情失败: {str(e)}")
        return jsonify({"error": f"获取面试预设场景详情失败: {str(e)}"}), 500
