"""
多模态分析API模块
"""

import logging
import os
import uuid

import cv2
import numpy as np
from app.models.interview import InterviewQuestion, MultimodalAnalysis
from flask import current_app, jsonify, request

# 配置日志
logger = logging.getLogger(__name__)


def evaluate_video():
    """分析视频行为的接口"""
    if 'video' not in request.files:
        return jsonify({"error": "没有提供视频文件"}), 400

    try:
        video_file = request.files['video']
        session_id = request.form.get('session_id')

        # 创建临时文件夹保存视频（如果不存在）
        temp_dir = os.path.join(os.getcwd(), 'temp', 'videos')
        os.makedirs(temp_dir, exist_ok=True)

        # 生成唯一文件名并保存视频
        filename = f"{uuid.uuid4()}.mp4"
        video_path = os.path.join(temp_dir, filename)
        video_file.save(video_path)

        # 使用OpenCV分析视频
        cap = cv2.VideoCapture(video_path)

        # 加载人脸检测器和面部特征检测器
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_eye.xml'
        )

        # 分析指标初始化
        frame_count = 0
        face_detected_frames = 0
        eye_contact_frames = 0
        facial_expression_variance = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # 转换为灰度图像
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # 人脸检测
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            if len(faces) > 0:
                face_detected_frames += 1

                for (x, y, w, h) in faces:
                    # 截取脸部区域
                    roi_gray = gray[y:y+h, x:x+w]

                    # 眼睛检测
                    eyes = eye_cascade.detectMultiScale(roi_gray)
                    if len(eyes) >= 2:  # 检测到双眼
                        eye_contact_frames += 1

                    # 计算面部表情变化（使用像素值标准差作为简单指标）
                    face_variance = np.std(roi_gray)
                    facial_expression_variance.append(face_variance)

            frame_count += 1

            # 每100帧检查一次，避免处理过大的视频
            if frame_count > 300:
                break

        cap.release()

        logger.info(
            "视频分析完成: "
            f"frame_count: {frame_count}, "
            f"face_detected_frames: {face_detected_frames}, "
            f"eye_contact_frames: {eye_contact_frames}"
        )

        # 计算分析指标
        eye_contact_rate = eye_contact_frames / \
            face_detected_frames if face_detected_frames > 0 else 0
        expression_variability = np.mean(
            facial_expression_variance
        ) if facial_expression_variance else 0

        # 计算评分（简化版）
        eye_contact_score = min(10, eye_contact_rate * 10)
        facial_expressions_score = min(
            10, (expression_variability / 50) * 10
        )  # 假设50是较好的变化值

        # 姿态和自信度评估需要更复杂的模型，这里使用简化评分
        body_language_score = 7.0  # 默认值
        confidence_score = 7.0 + (eye_contact_score - 5) * 0.2  # 眼神接触对自信度有影响

        # 生成建议
        recommendations = []
        if eye_contact_score < 7:
            recommendations.append("增加与面试官的眼神接触")
        if facial_expressions_score < 6:
            recommendations.append("尝试展示更多自然的面部表情")
        if body_language_score < 7:
            recommendations.append("注意保持良好的坐姿")

        # 最终分析结果
        analysis = {
            "eyeContact": round(eye_contact_score, 1),  # 眼神接触评分(1-10)
            "facialExpressions": round(facial_expressions_score, 1),  # 面部表情评分
            "bodyLanguage": body_language_score,  # 肢体语言评分
            "confidence": round(confidence_score, 1),  # 自信程度
            "recommendations": " ".join(recommendations) if recommendations else "保持良好的眼神接触和面部表情。"
        }

        # 清理临时文件
        if not current_app.config.get("DEBUG"):
            try:
                os.remove(video_path)
            except:
                logger.warning(f"无法删除临时视频文件: {video_path}")

        # 如果提供了会话ID，保存分析结果到数据库
        if session_id:
            # 获取最后一个问题记录
            current_question = InterviewQuestion.get_latest_for_session(
                session_id)

            if current_question:
                # 保存分析结果
                MultimodalAnalysis.create_or_update(
                    session_id, current_question["id"], analysis, None)

        return jsonify(analysis)

    except Exception as e:
        logger.exception(f"视频分析失败: {str(e)}")
        return jsonify({"error": f"视频分析失败: {str(e)}"}), 500


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
            "fillerWordsCount": 4,  # 填充词数量("嗯"、"啊"等)
            "recommendations": "整体表现良好，但注意减少填充词的使用，保持语速的一致性。"
        }

        # 如果提供了会话ID，保存分析结果到数据库
        if session_id:
            # 获取最后一个问题记录
            current_question = InterviewQuestion.get_latest_for_session(
                session_id)

            if current_question:
                # 保存分析结果
                MultimodalAnalysis.create_or_update(
                    session_id, current_question["id"], None, analysis)

        return jsonify(analysis)

    except Exception as e:
        logger.exception(f"音频分析失败: {str(e)}")
        return jsonify({"error": f"音频分析失败: {str(e)}"}), 500
