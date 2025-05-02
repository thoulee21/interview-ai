import json
import logging
import sqlite3
import time
import uuid
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
# 导入讯飞星火API模块
from xunfei_api import XunFeiSparkAPI

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化讯飞星火API客户端
xunfei_api = XunFeiSparkAPI()

# 数据库助手函数
def get_db_connection():
    conn = sqlite3.connect('interview_ai.db')
    conn.row_factory = sqlite3.Row  # 使查询结果可通过列名访问
    return conn

# 初始化数据库
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
        question_response = xunfei_api.generate_interview_question(position_type, difficulty)
        
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
    
    # 检查会话是否存在
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM interview_sessions WHERE session_id = ?", (session_id,))
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
        
        conn.commit()
        
        # 判断是否结束面试(假设5个问题后结束)
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

        if question_count >= 5:
            # 生成整体评估
            questions = [qa["question"] for qa in questions_and_answers]
            answers = [qa["answer"] for qa in questions_and_answers]
            
            final_evaluation_response = xunfei_api.generate_final_evaluation(
                position_type,
                questions,
                answers
            )
            
            if final_evaluation_response.get("status") != "success":
                return jsonify({"error": "生成最终评估失败"}), 500
                
            final_evaluation = final_evaluation_response.get("evaluation")
            
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
                        (session_id, question_id, json.dumps(analysis), datetime.now())
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
                        (session_id, question_id, json.dumps(analysis), datetime.now())
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
        cursor.execute("SELECT * FROM interview_sessions WHERE session_id = ?", (session_id,))
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
            
        # 获取所有问题和回答
        cursor.execute(
            "SELECT * FROM interview_questions WHERE session_id = ? ORDER BY question_index",
            (session_id,)
        )
        questions_data = cursor.fetchall()
        
        question_scores = []
        for q in questions_data:
            if q['answer'] and q['evaluation']:
                # 从评估文本中提取分数(简化处理，实际应该有更复杂的解析逻辑)
                score = 75  # 默认分数
                try:
                    # 尝试从评估文本中找到分数，格式如"分数：8/10"
                    eval_text = q['evaluation']
                    if '分数：' in eval_text and '/10' in eval_text:
                        score_part = eval_text.split('分数：')[1].split('/10')[0]
                        raw_score = float(score_part.strip())
                        score = int(raw_score * 10)  # 转换为百分制
                except:
                    pass
                
                question_scores.append({
                    'question': q['question'],
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
        
        conn.close()
        
        # 处理最终评估报告
        # 在实际应用中，这部分应该从数据库中获取或动态生成
        # 这里为了简化，我们使用一些模拟数据
        
        strengths = ['清晰表达核心技能', '回答结构合理', '专业知识扎实']
        improvements = ['需要提高回答的简洁性', '可以提供更多具体的工作实例', '减少填充词的使用']
        
        # 计算各项得分
        content_score = sum([qs['score'] for qs in question_scores]) / len(question_scores) if question_scores else 75
        delivery_score = audio_analysis.get('clarity', 8.0) * 10 if audio_analysis else 75
        nonverbal_score = video_analysis.get('eye_contact', 7.5) * 10 if video_analysis else 75
        
        # 计算总体得分(权重：内容60%，表达20%，非语言表现20%)
        overall_score = int(content_score * 0.6 + delivery_score * 0.2 + nonverbal_score * 0.2)
        
        # 构建结果对象
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
            'recommendations': '整体表现良好，特别是在专业知识展示方面。建议在今后的面试中更加注意简洁有力地表达核心观点，并准备更多具体的工作案例来支持你的能力陈述。此外，可以适当减少填充词的使用，保持更自然的面部表情和肢体语言，这将进一步提升你的整体表现。'
        }
        
        return jsonify(results)
        
    except Exception as e:
        logger.exception(f"获取面试结果失败: {str(e)}")
        return jsonify({"error": f"获取面试结果失败: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)