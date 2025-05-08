"""
多模态分析API模块
"""

import logging
import os
import uuid

import cv2
import librosa
import numpy as np
import speech_recognition
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

        # 创建临时文件夹保存音频（如果不存在）
        temp_dir = os.path.join(os.getcwd(), 'temp', 'audio')
        os.makedirs(temp_dir, exist_ok=True)

        # 生成唯一文件名并保存音频
        filename = f"{uuid.uuid4()}.wav"
        audio_path = os.path.join(temp_dir, filename)
        audio_file.save(audio_path)

        # 使用librosa加载音频
        y, sr = librosa.load(audio_path, sr=None)

        # 获取音频持续时间（秒）
        duration = librosa.get_duration(y=y, sr=sr)

        # === 语速分析 ===
        # 使用speech_recognition提取文本
        r = speech_recognition.Recognizer()
        with speech_recognition.AudioFile(audio_path) as source:
            audio_data = r.record(source)
            try:
                # 尝试使用Google API识别（需要网络连接）
                text = r.recognize_google(audio_data, language='zh-CN')
            except:
                # 如果失败，使用简单的假设值
                text = "无法识别语音内容"

        # 计算语速（字/分钟）- 简单版本
        word_count = len(text.replace(" ", ""))
        speech_rate = word_count / (duration / 60) if duration > 0 else 0

        # === 音调分析 ===
        # 提取基频 F0
        f0, voiced_flag, _ = librosa.pyin(y, fmin=librosa.note_to_hz('C2'),
                                          fmax=librosa.note_to_hz('C7'))
        f0 = f0[voiced_flag]  # 只保留有声部分

        # 计算平均音高
        mean_f0 = np.mean(f0) if len(f0) > 0 else 0

        # 计算音高变化
        f0_std = np.std(f0) if len(f0) > 0 else 0

        # 使用噪声估计作为清晰度指标
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        noise_ratio = np.sum(y_percussive**2) / \
            np.sum(y**2) if np.sum(y**2) > 0 else 0

        # === 填充词检测 ===
        # 检测常见填充词（在实际应用中应该使用更复杂的模型）
        filler_words = ["嗯", "啊", "呃", "那个", "就是"]
        filler_count = sum(text.count(word) for word in filler_words)

        # === 评分计算 ===
        # 语速评分：中文正常语速为180-220字/分钟
        if speech_rate < 100:
            pace_score = 6.0  # 语速较慢
        elif 150 <= speech_rate <= 220:
            pace_score = 9.0  # 理想语速
        elif speech_rate > 300:
            pace_score = 5.0  # 语速过快
        else:
            pace_score = 7.5  # 正常范围

        # 音调评分：基于音高变化和平均值
        tone_score = min(10.0, 5.0 + f0_std / 20)

        # 清晰度评分：基于多个因素
        clarity_base = 7.0
        clarity_score = clarity_base - noise_ratio * 10  # 噪声越多，分数越低
        clarity_score = max(1.0, min(10.0, clarity_score))  # 限制在1-10范围内

        # 根据填充词使用频率调整得分
        word_density = filler_count / word_count if word_count > 0 else 0
        # filler_penalty = min(2.0, word_density * 20)  # 最多扣2分

        # 生成建议
        recommendations = []
        if pace_score < 7:
            if speech_rate < 150:
                recommendations.append("语速可以适当加快，保持流畅")
            else:
                recommendations.append("语速过快，可以适当放慢，确保清晰表达")

        if tone_score < 6:
            recommendations.append("语调可以更加丰富，避免语调过于平淡")

        if clarity_score < 7:
            recommendations.append("注意发音清晰度，减少背景噪音")

        if word_density > 0.05:
            recommendations.append(f"减少填充词（如{'、'.join(filler_words)}）的使用")

        # 整体评分
        overall_score = (clarity_score + pace_score + tone_score) / 3

        # 最终分析结果
        analysis = {
            "clarity": round(clarity_score, 1),  # 清晰度评分(1-10)
            "pace": round(pace_score, 1),  # 语速评分
            "tone": round(tone_score, 1),  # 语调评分
            "speechRate": round(speech_rate, 1),  # 实际语速（字/分钟）
            "pitchMean": round(mean_f0, 1) if mean_f0 > 0 else 0,  # 平均音高
            "fillerWordsCount": filler_count,  # 填充词数量
            "duration": round(duration, 2),  # 音频时长（秒）
            "overallScore": round(overall_score, 1),  # 总体评分
            "recommendations": " ".join(recommendations) if recommendations else "整体表现良好，保持语速和清晰度。"
        }

        # 清理临时文件
        if not current_app.config.get("DEBUG"):
            try:
                os.remove(audio_path)
            except:
                logger.warning(f"无法删除临时音频文件: {audio_path}")

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
