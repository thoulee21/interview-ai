import json
import logging
import os
import sqlite3
import uuid
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
# 导入验证模块
from schemas.validation import (fix_evaluation_data, validate_audio_analysis,
                                validate_evaluation_result,
                                validate_video_analysis)
# 导入讯飞星火API模块
from xunfei_api import XunFeiSparkAPI

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 获取面试问题数量的环境变量，默认为5个问题
INTERVIEW_QUESTION_COUNT = int(os.getenv('INTERVIEW_QUESTION_COUNT', '5'))

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化讯飞星火API客户端
xunfei_api = XunFeiSparkAPI()


def get_db_connection():
    conn = sqlite3.connect('interview_ai.db')
    conn.row_factory = sqlite3.Row  # 使查询结果可通过列名访问
    return conn


def init_db():
    """初始化SQLite数据库"""
    conn = sqlite3.connect('interview_ai.db')
    cursor = conn.cursor()

    # 创建面试会话表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS interview_sessions (
        session_id TEXT PRIMARY KEY,
        position_type TEXT,
        difficulty TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        status TEXT
    )
    ''')

    # 创建面试问题表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS interview_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        question TEXT,
        answer TEXT,
        evaluation TEXT,
        question_index INTEGER,
        created_at TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES interview_sessions (session_id)
    )
    ''')

    # 创建多模态分析结果表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS multimodal_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        question_id INTEGER,
        video_analysis TEXT,
        audio_analysis TEXT,
        created_at TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES interview_sessions (session_id),
        FOREIGN KEY (question_id) REFERENCES interview_questions (id)
    )
    ''')

    # 创建最终评估表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS final_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        overall_score INTEGER,
        content_score INTEGER,
        delivery_score INTEGER,
        nonverbal_score INTEGER,
        strengths TEXT,
        improvements TEXT,
        recommendations TEXT,
        created_at TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES interview_sessions (session_id)
    )
    ''')

    # 创建职位类型表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS position_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # 检查职位类型表是否为空，如果为空则添加默认数据
    cursor.execute("SELECT COUNT(*) FROM position_types")
    count = cursor.fetchone()[0]

    if count == 0:
        # 默认职位类型数据
        default_position_types = [
            ("software_engineer", "软件工程师", "负责软件系统的设计、开发、测试和维护"),
            ("frontend_engineer", "前端开发工程师", "负责网站和应用程序的用户界面开发"),
            ("backend_engineer", "后端开发工程师", "负责服务器端逻辑和数据库交互的开发"),
            ("product_manager", "产品经理", "负责产品的规划、开发和市场推广"),
            ("ui_designer", "UI设计师", "负责用户界面的视觉设计"),
            ("ux_designer", "UX设计师", "负责用户体验设计和用户研究"),
            ("data_analyst", "数据分析师", "负责数据收集、处理和分析"),
            ("hr_specialist", "人力资源专员", "负责招聘、培训和员工关系管理"),
            ("marketing_specialist", "市场营销专员", "负责市场策略制定和执行"),
            ("operations_specialist", "运营专员", "负责日常运营和用户增长"),
            ("financial_analyst", "财务分析师", "负责财务数据分析和报告"),
            ("project_manager", "项目经理", "负责项目计划、执行和控制"),
            ("test_engineer", "测试工程师", "负责软件测试和质量保证"),
            ("devops_engineer", "DevOps工程师", "负责开发和运维的融合工作")
        ]

        cursor.executemany(
            "INSERT INTO position_types (value, label, description) VALUES (?, ?, ?)",
            default_position_types
        )

    conn.commit()
    conn.close()


# 初始化数据库
init_db()


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({"status": "ok", "message": "服务正常运行"})


@app.route('/api/start_interview', methods=['POST'])
def start_interview():
    """开始一个新的面试会话"""
    data = request.json
    position_type = data.get('positionType', '软件工程师')  # 职位类型
    difficulty = data.get('difficulty', '中级')  # 难度

    try:
        # 生成会话ID
        session_id = str(uuid.uuid4())

        # 调用讯飞星火API生成第一个面试问题
        question_response = xunfei_api.generate_interview_question(
            position_type, difficulty)

        if question_response.get("status") != "success":
            return jsonify({"error": "生成面试问题失败"}), 500

        first_question = question_response.get("question")

        # 保存会话信息到数据库
        conn = get_db_connection()
        cursor = conn.cursor()

        # 插入面试会话记录
        cursor.execute(
            "INSERT INTO interview_sessions (session_id, position_type, difficulty, start_time, status) VALUES (?, ?, ?, ?, ?)",
            (session_id, position_type, difficulty, datetime.now(), "active")
        )

        # 插入第一个问题记录
        cursor.execute(
            "INSERT INTO interview_questions (session_id, question, question_index, created_at) VALUES (?, ?, ?, ?)",
            (session_id, first_question, 0, datetime.now())
        )

        conn.commit()
        conn.close()

        return jsonify({
            "session_id": session_id,
            "question": first_question,
            "message": "面试会话已创建"
        })

    except Exception as e:
        logger.exception(f"创建面试会话失败: {str(e)}")
        return jsonify({"error": f"创建面试会话失败: {str(e)}"}), 500


@app.route('/api/answer_question', methods=['POST'])
def answer_question():
    """处理面试问题的回答并生成下一个问题"""
    data = request.json
    session_id = data.get('session_id')
    answer = data.get('answer', '')
    video_analysis = data.get('video_analysis')  # 接收前端传来的视频分析数据
    audio_analysis = data.get('audio_analysis')  # 接收前端传来的音频分析数据

    # 检查会话是否存在
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM interview_sessions WHERE session_id = ?", (session_id,))
    session = cursor.fetchone()
    if not session:
        return jsonify({"error": "无效的会话ID"}), 400

    try:
        # 获取当前问题
        cursor.execute(
            "SELECT * FROM interview_questions WHERE session_id = ? ORDER BY question_index DESC LIMIT 1",
            (session_id,)
        )
        current_question = cursor.fetchone()
        position_type = session["position_type"]

        # 验证和修复多模态分析数据
        if video_analysis:
            is_valid, errors = validate_video_analysis(video_analysis)
            if not is_valid:
                logger.warning(f"视频分析数据验证失败: {errors}")
                # 应用默认值或修正错误的数据
                video_analysis = {
                    "eye_contact": video_analysis.get("eyeContact", 7.5),
                    "facial_expressions": video_analysis.get("facialExpressions", 7.0),
                    "body_language": video_analysis.get("bodyLanguage", 6.5),
                    "confidence": video_analysis.get("confidence", 7.0)
                }

        if audio_analysis:
            is_valid, errors = validate_audio_analysis(audio_analysis)
            if not is_valid:
                logger.warning(f"音频分析数据验证失败: {errors}")
                # 应用默认值或修正错误的数据
                audio_analysis = {
                    "clarity": audio_analysis.get("clarity", 7.5),
                    "pace": audio_analysis.get("pace", 7.0),
                    "tone": audio_analysis.get("tone", 7.5),
                    "filler_words_count": audio_analysis.get("fillerWordsCount", 5)
                }

        # 调用讯飞星火API评估回答
        evaluation_response = xunfei_api.evaluate_answer(
            current_question["question"],
            answer,
            position_type
        )

        if evaluation_response.get("status") != "success":
            return jsonify({"error": "评估回答失败"}), 500

        evaluation = evaluation_response.get("evaluation")

        # 更新数据库中的回答和评估
        cursor.execute(
            "UPDATE interview_questions SET answer = ?, evaluation = ? WHERE id = ?",
            (answer, evaluation, current_question["id"])
        )

        # 如果有多模态分析数据，保存到数据库
        if video_analysis or audio_analysis:
            # 检查是否已有多模态分析记录
            cursor.execute(
                "SELECT id FROM multimodal_analysis WHERE question_id = ?",
                (current_question["id"],)
            )
            analysis_record = cursor.fetchone()

            # 准备多模态数据
            video_json = json.dumps(video_analysis) if video_analysis else None
            audio_json = json.dumps(audio_analysis) if audio_analysis else None

            if analysis_record:
                # 更新现有记录
                update_fields = []
                update_values = []

                if video_analysis:
                    update_fields.append("video_analysis = ?")
                    update_values.append(video_json)

                if audio_analysis:
                    update_fields.append("audio_analysis = ?")
                    update_values.append(audio_json)

                if update_fields:
                    cursor.execute(
                        f"UPDATE multimodal_analysis SET {', '.join(update_fields)} WHERE id = ?",
                        tuple(update_values + [analysis_record[0]])
                    )
            else:
                # 创建新记录
                cursor.execute(
                    "INSERT INTO multimodal_analysis (session_id, question_id, video_analysis, audio_analysis, created_at) VALUES (?, ?, ?, ?, ?)",
                    (session_id, current_question["id"],
                     video_json, audio_json, datetime.now())
                )

        conn.commit()

        # 判断是否结束面试
        cursor.execute(
            "SELECT COUNT(*) FROM interview_questions WHERE session_id = ?",
            (session_id,)
        )
        question_count = cursor.fetchone()[0]

        cursor.execute(
            "SELECT question, answer FROM interview_questions WHERE session_id = ? ORDER BY question_index",
            (session_id,)
        )
        questions_and_answers = cursor.fetchall()

        # 进入面试完成分支，生成最终评估
        if question_count >= INTERVIEW_QUESTION_COUNT:
            # 生成整体评估
            questions = [qa["question"] for qa in questions_and_answers]
            answers = [qa["answer"] for qa in questions_and_answers]

            # 获取所有多模态分析数据
            cursor.execute(
                "SELECT video_analysis, audio_analysis FROM multimodal_analysis WHERE session_id = ? ORDER BY created_at",
                (session_id,)
            )
            multimodal_data = cursor.fetchall()

            # 整合多模态分析数据
            aggregated_video_analysis = {}
            aggregated_audio_analysis = {}

            if multimodal_data:
                # 计算平均值
                video_samples = []
                audio_samples = []

                for record in multimodal_data:
                    if record["video_analysis"]:
                        video_data = json.loads(record["video_analysis"])
                        video_samples.append(video_data)

                    if record["audio_analysis"]:
                        audio_data = json.loads(record["audio_analysis"])
                        audio_samples.append(audio_data)

                # 处理视频分析数据
                if video_samples:
                    aggregated_video_analysis = {
                        "eye_contact": sum(v.get("eyeContact", 0) for v in video_samples) / len(video_samples),
                        "facial_expressions": sum(v.get("facialExpressions", 0) for v in video_samples) / len(video_samples),
                        "body_language": sum(v.get("bodyLanguage", 0) for v in video_samples) / len(video_samples),
                        "confidence": sum(v.get("confidence", 0) for v in video_samples) / len(video_samples)
                    }

                # 处理音频分析数据
                if audio_samples:
                    aggregated_audio_analysis = {
                        "clarity": sum(a.get("clarity", 0) for a in audio_samples) / len(audio_samples),
                        "pace": sum(a.get("pace", 0) for a in audio_samples) / len(audio_samples),
                        "tone": sum(a.get("tone", 0) for a in audio_samples) / len(audio_samples),
                        "filler_words_count": sum(a.get("fillerWordsCount", 0) for a in audio_samples)
                    }

            final_evaluation_response = xunfei_api.generate_final_evaluation(
                position_type,
                questions,
                answers,
                aggregated_video_analysis if aggregated_video_analysis else None,
                aggregated_audio_analysis if aggregated_audio_analysis else None
            )

            if final_evaluation_response.get("status") != "success":
                return jsonify({"error": "生成最终评估失败"}), 500

            final_evaluation = final_evaluation_response.get("evaluation")

            # 使用 JSON Schema 验证来提取和验证结构化数据
            data, is_valid, errors = validate_evaluation_result(
                final_evaluation)

            if not is_valid:
                logger.warning(f"评估结果验证失败: {errors}")
                # 尝试修复数据
                data = fix_evaluation_data(data)

            if data:
                # 从验证后的数据中获取评估信息
                overall_score = data.get('overallScore', 75)
                content_score = data.get('contentScore', 75)
                delivery_score = data.get('deliveryScore', 75)
                nonverbal_score = data.get('nonVerbalScore', 75)
                strengths = data.get('strengths', ["回答条理清晰", "专业知识扎实", "表达流畅"])
                improvements = data.get(
                    'improvements', ["可以更加简洁", "需要更多具体案例", "注意减少填充词"])
                recommendations = data.get(
                    'recommendations', "整体表现良好，建议进一步提升回答的简洁性和具体性。")

                # 保存到数据库
                cursor.execute(
                    """INSERT INTO final_evaluations 
                    (session_id, overall_score, content_score, delivery_score, nonverbal_score, 
                        strengths, improvements, recommendations, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (session_id, overall_score, content_score, delivery_score, nonverbal_score,
                        json.dumps(strengths), json.dumps(improvements), recommendations, datetime.now())
                )
            else:
                logger.error("无法从评估结果中提取有效数据")

            # 更新会话状态为已完成
            cursor.execute(
                "UPDATE interview_sessions SET status = ?, end_time = ? WHERE session_id = ?",
                ("completed", datetime.now(), session_id)
            )

            conn.commit()
            conn.close()

            return jsonify({
                "message": "面试已完成",
                "final_evaluation": final_evaluation,
                "is_complete": True
            })

        # 生成下一个问题
        next_question_response = xunfei_api.generate_interview_question(
            position_type,
            session["difficulty"],
            [q["question"] for q in questions_and_answers],
            [q["answer"] for q in questions_and_answers]
        )

        if next_question_response.get("status") != "success":
            return jsonify({"error": "生成下一个问题失败"}), 500

        next_question = next_question_response.get("question")

        # 在数据库中添加下一个问题
        cursor.execute(
            "INSERT INTO interview_questions (session_id, question, question_index, created_at) VALUES (?, ?, ?, ?)",
            (session_id, next_question, question_count, datetime.now())
        )

        conn.commit()
        conn.close()

        return jsonify({
            "evaluation": evaluation,
            "next_question": next_question,
            "is_complete": False
        })

    except Exception as e:
        logger.exception(f"处理回答失败: {str(e)}")
        return jsonify({"error": f"处理回答失败: {str(e)}"}), 500


@app.route('/api/evaluate_video', methods=['POST'])
def evaluate_video():
    """分析视频行为的接口"""
    if 'video' not in request.files:
        return jsonify({"error": "没有提供视频文件"}), 400

    try:
        video_file = request.files['video']
        session_id = request.form.get('session_id')

        # 在实际项目中，这里应该保存视频文件，并使用计算机视觉模型进行分析
        # 例如使用OpenCV、MediaPipe等库分析面部表情、眼神接触等

        # 对于MVP，我们使用模拟数据
        analysis = {
            "eye_contact": 8.5,  # 眼神接触评分(1-10)
            "facial_expressions": 7.2,  # 面部表情评分
            "body_language": 6.8,  # 肢体语言评分
            "confidence": 7.5,  # 自信程度
            "recommendations": "保持良好的眼神接触，但可以尝试展示更多自然的面部表情。"
        }

        # 如果提供了会话ID，保存分析结果到数据库
        if session_id:
            conn = sqlite3.connect('interview_ai.db')
            cursor = conn.cursor()

            # 获取最后一个问题记录
            cursor.execute(
                "SELECT id FROM interview_questions WHERE session_id = ? ORDER BY question_index DESC LIMIT 1",
                (session_id,)
            )
            result = cursor.fetchone()

            if result:
                question_id = result[0]

                # 检查是否已有分析记录
                cursor.execute(
                    "SELECT id FROM multimodal_analysis WHERE session_id = ? AND question_id = ?",
                    (session_id, question_id)
                )
                existing = cursor.fetchone()

                if existing:
                    # 更新现有记录
                    cursor.execute(
                        "UPDATE multimodal_analysis SET video_analysis = ? WHERE id = ?",
                        (json.dumps(analysis), existing[0])
                    )
                else:
                    # 插入新记录
                    cursor.execute(
                        "INSERT INTO multimodal_analysis (session_id, question_id, video_analysis, created_at) VALUES (?, ?, ?, ?)",
                        (session_id, question_id, json.dumps(
                            analysis), datetime.now())
                    )

                conn.commit()

            conn.close()

        return jsonify(analysis)

    except Exception as e:
        logger.exception(f"视频分析失败: {str(e)}")
        return jsonify({"error": f"视频分析失败: {str(e)}"}), 500


@app.route('/api/evaluate_audio', methods=['POST'])
def evaluate_audio():
    """分析音频的接口"""
    if 'audio' not in request.files:
        return jsonify({"error": "没有提供音频文件"}), 400

    try:
        audio_file = request.files['audio']
        session_id = request.form.get('session_id')

        # 在实际项目中，这里应该保存音频文件，并使用语音处理模型进行分析
        # 例如使用librosa、pydub等库分析语速、音调、清晰度等

        # 对于MVP，我们使用模拟数据
        analysis = {
            "clarity": 8.2,  # 清晰度评分(1-10)
            "pace": 7.5,  # 语速评分
            "tone": 8.0,  # 语调评分
            "filler_words_count": 4,  # 填充词数量("嗯"、"啊"等)
            "recommendations": "整体表现良好，但注意减少填充词的使用，保持语速的一致性。"
        }

        # 如果提供了会话ID，保存分析结果到数据库
        if session_id:
            conn = sqlite3.connect('interview_ai.db')
            cursor = conn.cursor()

            # 获取最后一个问题记录
            cursor.execute(
                "SELECT id FROM interview_questions WHERE session_id = ? ORDER BY question_index DESC LIMIT 1",
                (session_id,)
            )
            result = cursor.fetchone()

            if result:
                question_id = result[0]

                # 检查是否已有分析记录
                cursor.execute(
                    "SELECT id FROM multimodal_analysis WHERE session_id = ? AND question_id = ?",
                    (session_id, question_id)
                )
                existing = cursor.fetchone()

                if existing:
                    # 更新现有记录
                    cursor.execute(
                        "UPDATE multimodal_analysis SET audio_analysis = ? WHERE id = ?",
                        (json.dumps(analysis), existing[0])
                    )
                else:
                    # 插入新记录
                    cursor.execute(
                        "INSERT INTO multimodal_analysis (session_id, question_id, audio_analysis, created_at) VALUES (?, ?, ?, ?)",
                        (session_id, question_id, json.dumps(
                            analysis), datetime.now())
                    )

                conn.commit()

            conn.close()

        return jsonify(analysis)

    except Exception as e:
        logger.exception(f"音频分析失败: {str(e)}")
        return jsonify({"error": f"音频分析失败: {str(e)}"}), 500


@app.route('/api/interview_results/<session_id>', methods=['GET'])
def get_interview_results(session_id):
    """获取面试结果的接口"""
    try:
        # 检查会话是否存在
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM interview_sessions WHERE session_id = ?", (session_id,))
        session = cursor.fetchone()
        if not session:
            return jsonify({"error": "无效的会话ID"}), 400

        # 从数据库查询完整的面试记录
        conn.row_factory = sqlite3.Row  # 启用行工厂，使结果可以通过列名访问

        # 获取会话基本信息
        cursor.execute(
            "SELECT * FROM interview_sessions WHERE session_id = ?",
            (session_id,)
        )
        session_info = cursor.fetchone()

        if not session_info:
            return jsonify({"error": "面试记录未找到"}), 404

        # 处理最终评估报告
        # 检查是否有保存在数据库中的最终评估结果
        cursor.execute(
            "SELECT * FROM final_evaluations WHERE session_id = ?",
            (session_id,)
        )
        final_eval_record = cursor.fetchone()

        # 获取所有问题、回答和评估
        cursor.execute(
            "SELECT question, answer, evaluation FROM interview_questions WHERE session_id = ? AND answer IS NOT NULL",
            (session_id,)
        )
        qa_data = cursor.fetchall()

        question_scores = []
        for q in qa_data:
            if q['evaluation']:
                # 从评估文本中提取结构化 JSON 数据
                score = 75  # 默认分数
                try:
                    from schemas.validation import extract_evaluation_from_text

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

        # 获取视频和音频分析数据
        video_analysis = None
        audio_analysis = None

        cursor.execute(
            "SELECT * FROM multimodal_analysis WHERE session_id = ? ORDER BY id DESC LIMIT 1",
            (session_id,)
        )
        multimodal_data = cursor.fetchone()

        if multimodal_data:
            if multimodal_data['video_analysis']:
                video_analysis = json.loads(multimodal_data['video_analysis'])
            if multimodal_data['audio_analysis']:
                audio_analysis = json.loads(multimodal_data['audio_analysis'])

        # 构建结果对象，优先使用数据库中保存的最终评估结果
        if final_eval_record:
            # 从数据库记录中获取评估数据
            strengths = json.loads(
                final_eval_record['strengths']) if final_eval_record['strengths'] else []
            improvements = json.loads(
                final_eval_record['improvements']) if final_eval_record['improvements'] else []

            results = {
                'overallScore': final_eval_record['overall_score'],
                'contentScore': final_eval_record['content_score'],
                'deliveryScore': final_eval_record['delivery_score'],
                'nonVerbalScore': final_eval_record['nonverbal_score'],
                'strengths': strengths,
                'improvements': improvements,
                'questionScores': question_scores,
                'videoAnalysis': video_analysis or {
                    'eyeContact': 7.5,
                    'facialExpressions': 7.0,
                    'bodyLanguage': 6.5,
                    'confidence': 7.0
                },
                'audioAnalysis': audio_analysis or {
                    'clarity': 7.5,
                    'pace': 7.0,
                    'tone': 7.5,
                    'fillerWordsCount': 5
                },
                'recommendations': final_eval_record['recommendations']
            }
        else:
            # 如果没有保存的最终评估结果，则计算评估数据
            # 计算各项得分
            content_score = sum([qs['score'] for qs in question_scores]) / \
                len(question_scores) if question_scores else 75
            delivery_score = audio_analysis.get(
                'clarity', 8.0) * 10 if audio_analysis else 75
            nonverbal_score = video_analysis.get(
                'eye_contact', 7.5) * 10 if video_analysis else 75

            # 计算总体得分(权重：内容60%，表达20%，非语言表现20%)
            overall_score = int(content_score * 0.6 +
                                delivery_score * 0.2 + nonverbal_score * 0.2)

            # 默认的优势和改进点
            strengths = ['清晰表达核心技能', '回答结构合理', '专业知识扎实']
            improvements = ['需要提高回答的简洁性', '可以提供更多具体的工作实例', '减少填充词的使用']
            recommendations = '整体表现良好，特别是在专业知识展示方面。建议在今后的面试中更加注意简洁有力地表达核心观点，并准备更多具体的工作案例来支持你的能力陈述。此外，可以适当减少填充词的使用，保持更自然的面部表情和肢体语言，这将进一步提升你的整体表现。'

            # 生成面试评估结果并保存到数据库
            cursor.execute(
                """INSERT INTO final_evaluations 
                   (session_id, overall_score, content_score, delivery_score, nonverbal_score, 
                    strengths, improvements, recommendations, created_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (session_id, overall_score, int(content_score), int(delivery_score), int(nonverbal_score),
                 json.dumps(strengths), json.dumps(improvements), recommendations, datetime.now())
            )
            conn.commit()

            results = {
                'overallScore': overall_score,
                'contentScore': int(content_score),
                'deliveryScore': int(delivery_score),
                'nonVerbalScore': int(nonverbal_score),
                'strengths': strengths,
                'improvements': improvements,
                'questionScores': question_scores,
                'videoAnalysis': video_analysis or {
                    'eyeContact': 7.5,
                    'facialExpressions': 7.0,
                    'bodyLanguage': 6.5,
                    'confidence': 7.0
                },
                'audioAnalysis': audio_analysis or {
                    'clarity': 7.5,
                    'pace': 7.0,
                    'tone': 7.5,
                    'fillerWordsCount': 5
                },
                'recommendations': recommendations,
                'rawEvaluation': None
            }

        conn.close()
        return jsonify(results)

    except Exception as e:
        logger.exception(f"获取面试结果失败: {str(e)}")
        return jsonify({"error": f"获取面试结果失败: {str(e)}"}), 500


@app.route('/api/admin/sessions', methods=['GET'])
def get_all_sessions():
    """获取所有面试会话的管理接口"""
    try:
        # 从数据库查询所有面试会话
        conn = get_db_connection()
        cursor = conn.cursor()

        # 获取会话基本信息，包括相关统计数据
        cursor.execute("""
            SELECT 
                s.session_id, 
                s.position_type, 
                s.difficulty, 
                s.start_time, 
                s.end_time, 
                s.status,
                COUNT(q.id) as question_count,
                SUM(CASE WHEN q.answer IS NOT NULL THEN 1 ELSE 0 END) as answered_count
            FROM 
                interview_sessions s
            LEFT JOIN 
                interview_questions q ON s.session_id = q.session_id
            GROUP BY 
                s.session_id
            ORDER BY 
                s.start_time DESC
        """)

        sessions = []
        for row in cursor.fetchall():
            # 计算会话持续时间
            start_time = datetime.fromisoformat(
                row['start_time']) if row['start_time'] else None
            end_time = datetime.fromisoformat(
                row['end_time']) if row['end_time'] else None

            duration = None
            if start_time and end_time:
                duration = (
                    end_time - start_time).total_seconds() / 60  # 转换为分钟

            sessions.append({
                'sessionId': row['session_id'],
                'positionType': row['position_type'],
                'difficulty': row['difficulty'],
                'startTime': row['start_time'],
                'endTime': row['end_time'],
                'status': row['status'],
                'questionCount': row['question_count'],
                'answeredCount': row['answered_count'],
                'duration': round(duration, 1) if duration else None
            })

        conn.close()
        return jsonify({
            'sessions': sessions,
            'total': len(sessions)
        })

    except Exception as e:
        logger.exception(f"获取面试会话列表失败: {str(e)}")
        return jsonify({"error": f"获取面试会话列表失败: {str(e)}"}), 500


@app.route('/api/admin/sessions/<session_id>', methods=['GET'])
def get_session_details(session_id):
    """获取单个面试会话详情的管理接口"""
    try:
        # 检查会话是否存在
        conn = get_db_connection()
        cursor = conn.cursor()

        # 获取会话基本信息
        cursor.execute("""
            SELECT * FROM interview_sessions WHERE session_id = ?
        """, (session_id,))

        session_info = cursor.fetchone()
        if not session_info:
            return jsonify({"error": "面试会话不存在"}), 404

        # 获取所有问题和回答
        cursor.execute("""
            SELECT * FROM interview_questions 
            WHERE session_id = ? 
            ORDER BY question_index
        """, (session_id,))

        questions = []
        for q in cursor.fetchall():
            questions.append({
                'id': q['id'],
                'question': q['question'],
                'answer': q['answer'],
                'evaluation': q['evaluation'],
                'questionIndex': q['question_index'],
                'createdAt': q['created_at']
            })

        # 获取多模态分析数据
        cursor.execute("""
            SELECT * FROM multimodal_analysis 
            WHERE session_id = ? 
            ORDER BY created_at
        """, (session_id,))

        analyses = []
        for a in cursor.fetchall():
            analyses.append({
                'id': a['id'],
                'questionId': a['question_id'],
                'videoAnalysis': json.loads(a['video_analysis']) if a['video_analysis'] else None,
                'audioAnalysis': json.loads(a['audio_analysis']) if a['audio_analysis'] else None,
                'createdAt': a['created_at']
            })

        # 构建会话详情对象
        session_details = {
            'sessionId': session_info['session_id'],
            'positionType': session_info['position_type'],
            'difficulty': session_info['difficulty'],
            'startTime': session_info['start_time'],
            'endTime': session_info['end_time'],
            'status': session_info['status'],
            'questions': questions,
            'analyses': analyses
        }

        conn.close()
        return jsonify(session_details)

    except Exception as e:
        logger.exception(f"获取面试会话详情失败: {str(e)}")
        return jsonify({"error": f"获取面试会话详情失败: {str(e)}"}), 500


@app.route('/api/admin/sessions/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """删除面试会话的管理接口"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 检查会话是否存在
        cursor.execute(
            "SELECT * FROM interview_sessions WHERE session_id = ?", (session_id,))
        if not cursor.fetchone():
            return jsonify({"error": "面试会话不存在"}), 404

        # 删除相关记录（先删除外键关联的表）
        cursor.execute(
            "DELETE FROM multimodal_analysis WHERE session_id = ?", (session_id,))
        cursor.execute(
            "DELETE FROM interview_questions WHERE session_id = ?", (session_id,))
        cursor.execute(
            "DELETE FROM interview_sessions WHERE session_id = ?", (session_id,))

        conn.commit()
        conn.close()

        return jsonify({"message": "面试会话已删除"})

    except Exception as e:
        logger.exception(f"删除面试会话失败: {str(e)}")
        return jsonify({"error": f"删除面试会话失败: {str(e)}"}), 500


@app.route('/api/position_types', methods=['GET'])
def get_position_types():
    """获取可用职位类型列表的接口"""
    try:
        # 从数据库中获取职位类型列表
        conn = get_db_connection()
        cursor = conn.cursor()

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

        conn.close()

        return jsonify({
            "positionTypes": position_types
        })

    except Exception as e:
        logger.exception(f"获取职位类型列表失败: {str(e)}")
        return jsonify({"error": f"获取职位类型列表失败: {str(e)}"}), 500


@app.route('/api/admin/position_types', methods=['GET'])
def get_admin_position_types():
    """管理员获取所有职位类型的接口"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

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

        conn.close()

        return jsonify({
            "positionTypes": position_types,
            "total": len(position_types)
        })

    except Exception as e:
        logger.exception(f"管理员获取职位类型列表失败: {str(e)}")
        return jsonify({"error": f"管理员获取职位类型列表失败: {str(e)}"}), 500


@app.route('/api/admin/position_types/<int:position_id>', methods=['GET'])
def get_position_type_detail(position_id):
    """获取单个职位类型详情"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, value, label, description, created_at, updated_at FROM position_types WHERE id = ?", (position_id,))
        position = cursor.fetchone()

        if not position:
            return jsonify({"error": "职位类型不存在"}), 404

        position_detail = {
            "id": position['id'],
            "value": position['value'],
            "label": position['label'],
            "description": position['description'],
            "createdAt": position['created_at'],
            "updatedAt": position['updated_at']
        }

        conn.close()
        return jsonify(position_detail)

    except Exception as e:
        logger.exception(f"获取职位类型详情失败: {str(e)}")
        return jsonify({"error": f"获取职位类型详情失败: {str(e)}"}), 500


@app.route('/api/admin/position_types', methods=['POST'])
def create_position_type():
    """创建新的职位类型"""
    try:
        data = request.json
        value = data.get('value')
        label = data.get('label')
        description = data.get('description', '')

        # 验证必填字段
        if not value or not label:
            return jsonify({"error": "职位编码和名称为必填项"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # 检查是否已存在相同的value
        cursor.execute(
            "SELECT id FROM position_types WHERE value = ?", (value,))
        if cursor.fetchone():
            return jsonify({"error": "已存在相同编码的职位类型"}), 409

        # 插入新职位类型
        now = datetime.now()
        cursor.execute(
            "INSERT INTO position_types (value, label, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (value, label, description, now, now)
        )

        # 获取新插入的ID
        new_id = cursor.lastrowid

        conn.commit()

        # 获取完整的新职位类型数据
        cursor.execute(
            "SELECT id, value, label, description, created_at, updated_at FROM position_types WHERE id = ?", (new_id,))
        new_position = cursor.fetchone()

        position_detail = {
            "id": new_position['id'],
            "value": new_position['value'],
            "label": new_position['label'],
            "description": new_position['description'],
            "createdAt": new_position['created_at'],
            "updatedAt": new_position['updated_at']
        }

        conn.close()
        return jsonify(position_detail), 201

    except Exception as e:
        logger.exception(f"创建职位类型失败: {str(e)}")
        return jsonify({"error": f"创建职位类型失败: {str(e)}"}), 500


@app.route('/api/admin/position_types/<int:position_id>', methods=['PUT'])
def update_position_type(position_id):
    """更新职位类型信息"""
    try:
        data = request.json
        value = data.get('value')
        label = data.get('label')
        description = data.get('description', '')

        # 验证必填字段
        if not value or not label:
            return jsonify({"error": "职位编码和名称为必填项"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # 检查要更新的职位类型是否存在
        cursor.execute(
            "SELECT id FROM position_types WHERE id = ?", (position_id,))
        if not cursor.fetchone():
            return jsonify({"error": "职位类型不存在"}), 404

        # 检查是否与其他职位类型的value冲突
        cursor.execute(
            "SELECT id FROM position_types WHERE value = ? AND id != ?", (value, position_id))
        if cursor.fetchone():
            return jsonify({"error": "已存在相同编码的其他职位类型"}), 409

        # 更新职位类型
        now = datetime.now()
        cursor.execute(
            "UPDATE position_types SET value = ?, label = ?, description = ?, updated_at = ? WHERE id = ?",
            (value, label, description, now, position_id)
        )

        conn.commit()

        # 获取更新后的职位类型数据
        cursor.execute(
            "SELECT id, value, label, description, created_at, updated_at FROM position_types WHERE id = ?", (position_id,))
        updated_position = cursor.fetchone()

        position_detail = {
            "id": updated_position['id'],
            "value": updated_position['value'],
            "label": updated_position['label'],
            "description": updated_position['description'],
            "createdAt": updated_position['created_at'],
            "updatedAt": updated_position['updated_at']
        }

        conn.close()
        return jsonify(position_detail)

    except Exception as e:
        logger.exception(f"更新职位类型失败: {str(e)}")
        return jsonify({"error": f"更新职位类型失败: {str(e)}"}), 500


@app.route('/api/admin/position_types/<int:position_id>', methods=['DELETE'])
def delete_position_type(position_id):
    """删除职位类型"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 检查职位类型是否存在
        cursor.execute(
            "SELECT id FROM position_types WHERE id = ?", (position_id,))
        if not cursor.fetchone():
            return jsonify({"error": "职位类型不存在"}), 404

        # 检查是否有面试会话使用该职位类型
        cursor.execute(
            "SELECT COUNT(*) FROM interview_sessions WHERE position_type = (SELECT value FROM position_types WHERE id = ?)", (position_id,))
        usage_count = cursor.fetchone()[0]
        if usage_count > 0:
            return jsonify({
                "error": "无法删除该职位类型，因为它已被使用",
                "usageCount": usage_count
            }), 409

        # 删除职位类型
        cursor.execute(
            "DELETE FROM position_types WHERE id = ?", (position_id,))

        conn.commit()
        conn.close()

        return jsonify({"message": "职位类型已成功删除"})

    except Exception as e:
        logger.exception(f"删除职位类型失败: {str(e)}")
        return jsonify({"error": f"删除职位类型失败: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
