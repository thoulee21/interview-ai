"""
多模态分析API模块
"""

import logging
import os
import uuid

import cv2
import ffmpeg
import numpy as np
from app.models.interview import InterviewQuestion, MultimodalAnalysis
from flask import current_app, jsonify, request

# 配置日志
logger = logging.getLogger(__name__)


def multimodal_analysis():
    """
    多模态分析接口
    接收视频文件和会话ID，分析视频中的面部表情、眼神接触、肢体语言等
    """
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

        # 验证视频文件完整性
        try:
            # 使用 ffmpeg 探测视频文件
            probe = ffmpeg.probe(video_path, v='error')
            if not probe or 'streams' not in probe or not probe['streams']:
                logger.warning(f"视频文件 {video_path} 无效或不完整")
                return jsonify({"error": "视频文件无效或不完整"}), 400
        except ffmpeg.Error as e:
            logger.error(
                f"视频文件验证失败: {e.stderr.decode() if hasattr(e, 'stderr') else str(e)}"
            )
            return jsonify({"error": "无法处理视频文件，格式可能不受支持或文件已损坏"}), 400

        # 使用OpenCV分析视频
        cap = cv2.VideoCapture(video_path)

        # 检查视频是否成功打开
        if not cap.isOpened():
            logger.error(f"OpenCV无法打开视频文件: {video_path}")
            return jsonify({"error": "无法打开视频文件进行分析"}), 400

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

        # 如果没有成功处理任何帧，返回默认值
        if frame_count == 0:
            logger.warning(f"无法从视频中提取任何有效帧: {video_path}")
            analysis = {
                "eyeContact": 7.0,
                "facialExpressions": 7.0,
                "bodyLanguage": 7.0,
                "confidence": 7.0,
                "recommendations": "视频分析失败，请确保摄像头正常工作并尝试重新录制。"
            }

            # 清理临时文件
            if not current_app.config.get("DEBUG"):
                try:
                    os.remove(video_path)
                except:
                    logger.warning(f"无法删除临时视频文件: {video_path}")

            return jsonify(analysis)

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

        # 处理同一视频的音频分析
        audio_analysis = None
        try:
            # 从视频文件提取音频
            audio_analysis = extract_and_evaluate_audio(video_path)
        except Exception as audio_error:
            logger.warning(f"从视频提取并分析音频失败: {str(audio_error)}")
            # 音频分析失败不影响视频分析结果的返回

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
                    session_id, current_question["id"], analysis, audio_analysis)

        combined_result = {
            "video": analysis,
            "audio": audio_analysis
        }
        return jsonify(combined_result)

    except Exception as e:
        logger.exception(f"视频分析失败: {str(e)}")
        return jsonify({"error": f"视频分析失败: {str(e)}"}), 500


def extract_and_evaluate_audio(video_path):
    """从视频文件提取音频并进行分析（模拟版本）"""
    # 返回模拟的音频分析数据
    return {
        "clarity": 7.5,
        "pace": 7.8,
        "tone": 7.2,
        "speechRate": 180.0,
        "pitchMean": 120.0,
        "fillerWordsCount": 3,
        "duration": 15.0,
        "overallScore": 7.5,
        "recommendations": "整体表现良好。建议稍微丰富语调变化，减少填充词的使用。"
    }
