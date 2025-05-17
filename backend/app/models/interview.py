"""
面试相关的数据库模型
"""

import json
import uuid
from datetime import datetime

from app.utils.db import get_db
from app.utils.float32json import Float32JSONEncoder


class InterviewSession:
    """面试会话模型"""

    @staticmethod
    def create(position_type, difficulty, **kwargs):
        """
        创建新的面试会话

        Args:
            position_type (str): 职位类型
            difficulty (str): 难度级别
            **kwargs: 其他面试参数
                interviewer_style (str, optional): 面试官风格
                interview_mode (str, optional): 面试模式
                industry_focus (str, optional): 行业焦点
                company_size (str, optional): 公司规模
                interview_params (dict, optional): 完整的面试参数

        Returns:
            str: 会话ID
        """
        db = get_db()
        cursor = db.cursor()

        session_id = str(uuid.uuid4())

        # 基本参数
        params = (
            session_id,
            position_type,
            difficulty,
            datetime.now(),
            "active"
        )

        cursor.execute(
            "INSERT INTO interview_sessions (session_id, position_type, difficulty, start_time, status) VALUES (?, ?, ?, ?, ?)",
            params
        )

        if kwargs:
            # 存储完整的面试参数
            interview_params = kwargs.get('interview_params')
            if interview_params:
                interview_params_json = json.dumps(interview_params)
                cursor.execute(
                    "UPDATE interview_sessions SET interview_params = ? WHERE session_id = ?",
                    (interview_params_json, session_id)
                )

        db.commit()
        return session_id

    @staticmethod
    def get(session_id):
        """
        获取面试会话

        Args:
            session_id (str): 会话ID

        Returns:
            dict|None: 会话信息
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT * FROM interview_sessions WHERE session_id = ?",
            (session_id,)
        )
        return cursor.fetchone()

    @staticmethod
    def get_user_id(session_id):
        """
        获取面试会话的用户ID

        Args:
            session_id (str): 会话ID

        Returns:
            int|None: 用户ID
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT user_id FROM user_sessions WHERE session_id = ?",
            (session_id,)
        )
        return cursor.fetchone()

    @staticmethod
    def get_all(limit=100, offset=0, user_filter=None):
        """
        获取所有面试会话

        Args:
            limit (int, optional): 限制返回数量
            offset (int, optional): 偏移量
            user_filter (int, optional): 按用户ID筛选

        Returns:
            list: 会话列表
        """
        db = get_db()
        cursor = db.cursor()

        query = """
            SELECT 
                s.session_id, 
                s.position_type, 
                s.difficulty, 
                s.start_time, 
                s.end_time, 
                s.status,
                COUNT(q.id) as question_count,
                SUM(CASE WHEN q.answer IS NOT NULL THEN 1 ELSE 0 END) as answered_count,
                u.id as user_id,
                u.username
            FROM 
                interview_sessions s
            LEFT JOIN 
                interview_questions q ON s.session_id = q.session_id
            LEFT JOIN
                user_sessions us ON s.session_id = us.session_id
            LEFT JOIN
                users u ON us.user_id = u.id
        """

        params = []

        # 添加用户筛选条件
        if user_filter:
            query += " WHERE u.id = ? "
            params.append(user_filter)

        query += """
            GROUP BY 
                s.session_id
            ORDER BY 
                s.start_time DESC
            LIMIT ? OFFSET ?
        """

        params.extend([limit, offset])

        cursor.execute(query, params)

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
                'duration': round(duration, 1) if duration else None,
                'userId': row['user_id'],
                'username': row['username']
            })

        return sessions

    @staticmethod
    def update_status(session_id, status, end_time=None):
        """
        更新会话状态

        Args:
            session_id (str): 会话ID
            status (str): 新状态
            end_time (datetime, optional): 结束时间

        Returns:
            bool: 是否更新成功
        """
        db = get_db()
        cursor = db.cursor()

        if end_time:
            cursor.execute(
                "UPDATE interview_sessions SET status = ?, end_time = ? WHERE session_id = ?",
                (status, end_time, session_id)
            )
        else:
            cursor.execute(
                "UPDATE interview_sessions SET status = ? WHERE session_id = ?",
                (status, session_id)
            )

        db.commit()
        return cursor.rowcount > 0

    @staticmethod
    def delete(session_id):
        """
        删除面试会话及相关数据

        Args:
            session_id (str): 会话ID

        Returns:
            bool: 是否删除成功
        """
        db = get_db()
        cursor = db.cursor()

        # 删除相关记录（先删除外键关联的表）
        cursor.execute(
            "DELETE FROM multimodal_analysis WHERE session_id = ?", (session_id,))
        cursor.execute(
            "DELETE FROM interview_questions WHERE session_id = ?", (session_id,))
        cursor.execute(
            "DELETE FROM final_evaluations WHERE session_id = ?", (session_id,))
        cursor.execute(
            "DELETE FROM interview_sessions WHERE session_id = ?", (session_id,))

        db.commit()
        return True

    @staticmethod
    def get_interview_params(session_id):
        """
        获取面试会话的完整面试参数

        Args:
            session_id (str): 会话ID

        Returns:
            dict|None: 面试参数
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT interview_params FROM interview_sessions WHERE session_id = ?",
            (session_id,)
        )
        result = cursor.fetchone()

        if result and result['interview_params']:
            try:
                return json.loads(result['interview_params'])
            except json.JSONDecodeError:
                return None
        return None


class InterviewQuestion:
    """面试问题模型"""

    @staticmethod
    def create(session_id, question, question_index):
        """
        创建面试问题

        Args:
            session_id (str): 会话ID
            question (str): 问题内容
            question_index (int): 问题索引

        Returns:
            int: 问题ID
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "INSERT INTO interview_questions (session_id, question, question_index, created_at) VALUES (?, ?, ?, ?)",
            (session_id, question, question_index, datetime.now())
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def get_latest_for_session(session_id):
        """
        获取会话的最新问题

        Args:
            session_id (str): 会话ID

        Returns:
            dict|None: 问题信息
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT * FROM interview_questions WHERE session_id = ? ORDER BY question_index DESC LIMIT 1",
            (session_id,)
        )
        return cursor.fetchone()

    @staticmethod
    def get_all_for_session(session_id):
        """
        获取会话的所有问题

        Args:
            session_id (str): 会话ID

        Returns:
            list: 问题列表
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT * FROM interview_questions WHERE session_id = ? ORDER BY question_index",
            (session_id,)
        )

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

        return questions

    @staticmethod
    def count_for_session(session_id):
        """
        计算会话的问题数量

        Args:
            session_id (str): 会话ID

        Returns:
            int: 问题数量
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT COUNT(*) FROM interview_questions WHERE session_id = ?",
            (session_id,)
        )
        return cursor.fetchone()[0]

    @staticmethod
    def update_answer_and_evaluation(question_id, answer, evaluation):
        """
        更新问题的回答和评估

        Args:
            question_id (int): 问题ID
            answer (str): 回答内容
            evaluation (str): 评估结果

        Returns:
            bool: 是否更新成功
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "UPDATE interview_questions SET answer = ?, evaluation = ? WHERE id = ?",
            (answer, evaluation, question_id)
        )
        db.commit()
        return cursor.rowcount > 0


class MultimodalAnalysis:
    """多模态分析模型"""

    @staticmethod
    def create_or_update(session_id, video_analysis=None, audio_analysis=None):
        """
        创建或更新多模态分析数据

        Args:
            session_id (str): 会话ID
            video_analysis (dict, optional): 视频分析数据
            audio_analysis (dict, optional): 音频分析数据

        Returns:
            int: 分析ID
        """
        if not video_analysis and not audio_analysis:
            return None

        db = get_db()
        cursor = db.cursor()

        # 准备多模态数据
        video_json = json.dumps(video_analysis) if video_analysis else None

        audio_json = json.dumps(
            audio_analysis, cls=Float32JSONEncoder
        ) if audio_analysis else None

        # 检查是否已有记录
        cursor.execute(
            "SELECT id FROM multimodal_analysis WHERE session_id = ?",
            (session_id,)
        )
        existing = cursor.fetchone()

        if existing:
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
                    tuple(update_values + [existing['id']])
                )
                db.commit()
                return existing['id']
        else:
            # 创建新记录
            cursor.execute(
                "INSERT INTO multimodal_analysis (session_id, video_analysis, audio_analysis, created_at) VALUES (?, ?, ?, ?)",
                (session_id, video_json, audio_json, datetime.now())
            )
            db.commit()
            return cursor.lastrowid

    @staticmethod
    def get_for_session(session_id):
        """
        获取会话的所有多模态分析数据

        Args:
            session_id (str): 会话ID

        Returns:
            list: 多模态分析数据列表
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT * FROM multimodal_analysis WHERE session_id = ? ORDER BY created_at",
            (session_id,)
        )

        analyses = []
        for a in cursor.fetchall():
            analyses.append({
                'id': a['id'],
                'videoAnalysis': json.loads(a['video_analysis']) if a['video_analysis'] else None,
                'audioAnalysis': json.loads(a['audio_analysis']) if a['audio_analysis'] else None,
                'createdAt': a['created_at']
            })

        return analyses

    @staticmethod
    def aggregate_for_session(session_id):
        """
        聚合会话的多模态分析数据

        Args:
            session_id (str): 会话ID

        Returns:
            tuple: (视频分析聚合数据, 音频分析聚合数据)
        """
        db = get_db()
        cursor = db.cursor()

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
                    "eyeContact": sum(v.get("eyeContact", 0) for v in video_samples) / len(video_samples),
                    "facialExpressions": sum(v.get("facialExpressions", 0) for v in video_samples) / len(video_samples),
                    "bodyLanguage": sum(v.get("bodyLanguage", 0) for v in video_samples) / len(video_samples),
                    "confidence": sum(v.get("confidence", 0) for v in video_samples) / len(video_samples)
                }

            # 处理音频分析数据
            if audio_samples:
                aggregated_audio_analysis = {
                    "clarity": sum(a.get("clarity", 0) for a in audio_samples) / len(audio_samples),
                    "pace": sum(a.get("pace", 0) for a in audio_samples) / len(audio_samples),
                    "tone": sum(a.get("tone", 0) for a in audio_samples) / len(audio_samples),
                    "fillerWordsCount": sum(a.get("fillerWordsCount", 0) for a in audio_samples)
                }

        return aggregated_video_analysis, aggregated_audio_analysis


class FinalEvaluation:
    """最终评估模型"""

    @staticmethod
    def create(session_id, overall_score, content_score, delivery_score, nonverbal_score,
               strengths, improvements, recommendations):
        """
        创建最终评估

        Args:
            session_id (str): 会话ID
            overall_score (int): 总体评分
            content_score (int): 内容评分
            delivery_score (int): 表达评分
            nonverbal_score (int): 非语言表现评分
            strengths (list): 优势列表
            improvements (list): 需改进点列表
            recommendations (str): 建议

        Returns:
            int: 评估ID
        """
        db = get_db()
        cursor = db.cursor()

        strengths_json = json.dumps(strengths) if strengths else "[]"
        improvements_json = json.dumps(improvements) if improvements else "[]"

        cursor.execute(
            """INSERT INTO final_evaluations 
            (session_id, overall_score, content_score, delivery_score, nonverbal_score, 
                strengths, improvements, recommendations, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (session_id, overall_score, content_score, delivery_score, nonverbal_score,
                strengths_json, improvements_json, recommendations, datetime.now())
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def get_for_session(session_id):
        """
        获取会话的最终评估

        Args:
            session_id (str): 会话ID

        Returns:
            dict|None: 评估信息
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT * FROM final_evaluations WHERE session_id = ? ORDER BY created_at DESC LIMIT 1",
            (session_id,)
        )
        return cursor.fetchone()


class InterviewPreset:
    """面试预设场景模型"""

    @staticmethod
    def get_all():
        """
        获取所有面试预设场景

        Returns:
            list: 预设场景列表
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT * FROM interview_presets ORDER BY id"
        )

        presets = []
        for p in cursor.fetchall():
            presets.append({
                'id': p['id'],
                'name': p['name'],
                'description': p['description'],
                'interviewParams': json.loads(p['interview_params']) if p['interview_params'] else {},
                'isDefault': bool(p['is_default']),
                'createdAt': p['created_at']
            })

        return presets

    @staticmethod
    def get_by_id(preset_id):
        """
        根据ID获取面试预设场景

        Args:
            preset_id (int): 预设场景ID

        Returns:
            dict|None: 预设场景信息
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "SELECT * FROM interview_presets WHERE id = ?",
            (preset_id,)
        )

        preset = cursor.fetchone()
        if preset:
            return {
                'id': preset['id'],
                'name': preset['name'],
                'description': preset['description'],
                'interviewParams': json.loads(preset['interview_params']) if preset['interview_params'] else {},
                'isDefault': bool(preset['is_default']),
                'createdAt': preset['created_at']
            }
        return None

    @staticmethod
    def create(name, description, interview_params, is_default=False):
        """
        创建面试预设场景

        Args:
            name (str): 预设场景名称
            description (str): 预设场景描述
            interview_params (dict): 面试参数
            is_default (bool, optional): 是否为默认预设

        Returns:
            int: 预设场景ID
        """
        db = get_db()
        cursor = db.cursor()

        interview_params_json = json.dumps(interview_params)

        cursor.execute(
            "INSERT INTO interview_presets (name, description, interview_params, is_default) VALUES (?, ?, ?, ?)",
            (name, description, interview_params_json, 1 if is_default else 0)
        )
        db.commit()
        return cursor.lastrowid

    @staticmethod
    def update(preset_id, name=None, description=None, interview_params=None, is_default=None):
        """
        更新面试预设场景

        Args:
            preset_id (int): 预设场景ID
            name (str, optional): 预设场景名称
            description (str, optional): 预设场景描述
            interview_params (dict, optional): 面试参数
            is_default (bool, optional): 是否为默认预设

        Returns:
            bool: 是否更新成功
        """
        db = get_db()
        cursor = db.cursor()

        update_fields = []
        update_values = []

        if name is not None:
            update_fields.append("name = ?")
            update_values.append(name)

        if description is not None:
            update_fields.append("description = ?")
            update_values.append(description)

        if interview_params is not None:
            update_fields.append("interview_params = ?")
            update_values.append(json.dumps(interview_params))

        if is_default is not None:
            update_fields.append("is_default = ?")
            update_values.append(1 if is_default else 0)

        if update_fields:
            update_fields.append("updated_at = ?")
            update_values.append(datetime.now())

            update_values.append(preset_id)

            cursor.execute(
                f"UPDATE interview_presets SET {', '.join(update_fields)} WHERE id = ?",
                tuple(update_values)
            )
            db.commit()
            return cursor.rowcount > 0
        return False

    @staticmethod
    def delete(preset_id):
        """
        删除面试预设场景

        Args:
            preset_id (int): 预设场景ID

        Returns:
            bool: 是否删除成功
        """
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            "DELETE FROM interview_presets WHERE id = ?",
            (preset_id,)
        )
        db.commit()
        return cursor.rowcount > 0
