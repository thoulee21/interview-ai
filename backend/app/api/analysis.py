"""
多模态分析API模块
"""

import logging
import os
import subprocess
import time
import uuid

import cv2
import ffmpeg
import librosa
import numpy as np
from app.models.interview import InterviewQuestion, MultimodalAnalysis
from app.services.xfyun_services import stt
from app.utils.pcm_wav import wav2pcm
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
        filename = f"{uuid.uuid4()}.webm"
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
    """
    从视频文件提取音频并进行分析

    Args:
        video_path (str): 视频文件路径

    Returns:
        dict: 音频分析结果
    """
    try:
        # 创建临时文件夹保存音频文件
        temp_dir = os.path.join(os.getcwd(), 'temp', 'audios')
        os.makedirs(temp_dir, exist_ok=True)

        # 生成唯一音频文件名
        audio_filename = f"{uuid.uuid4()}.wav"
        audio_path = os.path.join(temp_dir, audio_filename)

        # 使用ffmpeg从视频中提取音频（高质量，16kHz采样率）
        logger.info(f"从视频 {video_path} 提取音频到 {audio_path}")
        try:
            (
                ffmpeg
                .input(video_path)
                .output(audio_path, acodec='pcm_s16le', ac=1, ar='16k')
                .overwrite_output()
                .run(quiet=True, capture_stdout=True, capture_stderr=True)
            )
        except ffmpeg.Error as e:
            logger.error(
                f"ffmpeg提取音频失败: {e.stderr.decode() if hasattr(e, 'stderr') else str(e)}")
            # 尝试使用subprocess作为备用方法
            cmd = ['ffmpeg', '-i', video_path, '-vn', '-acodec',
                   'pcm_s16le', '-ar', '16000', '-ac', '1', audio_path, '-y']
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE)

        # 确认音频文件已创建
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
            logger.error(f"无法创建或访问音频文件: {audio_path}")
            return None

        # ===== 使用librosa加载音频文件 =====
        try:
            y, sr = librosa.load(audio_path, sr=None)

            # 检查是否成功加载音频数据
            if y.size == 0:
                logger.warning(f"音频文件未包含数据或无法解析: {audio_path}")
                return None

            logger.info(f"成功加载音频文件: 采样率={sr}Hz, 时长={len(y)/sr:.2f}秒")
        except Exception as e:
            logger.error(f"加载音频文件失败: {str(e)}")
            return None

        # ===== 计算音频特征 =====
        # 1. 时长计算
        duration = len(y) / sr

        # 2. 语音活动检测 (VAD) - 区分语音和静音
        # 使用能量阈值进行简单VAD
        frame_length = 1024
        hop_length = 512

        # 计算短时能量
        energy = np.array([
            sum(abs(y[i:i+frame_length]**2))
            for i in range(0, len(y), hop_length)
        ])

        # 使用能量阈值区分语音和非语音
        threshold = 0.01 * np.mean(energy)
        speech_frames = np.where(energy > threshold)[0]

        if len(speech_frames) == 0:
            logger.warning(f"未检测到有效语音: {audio_path}")
            # 返回默认值
            return {
                "clarity": 5.0,
                "pace": 5.0,
                "tone": 5.0,
                "fillerWordsCount": 0,
                "recommendations": "未检测到有效语音，无法进行分析。请确保麦克风正常工作并尝试重新录制。"
            }

        # 3. 音高分析
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_mean = np.mean([np.mean(pitches[:, i][pitches[:, i] > 0])
                             for i in speech_frames if np.any(pitches[:, i] > 0)] or [0])

        # 音高变化度
        pitch_std = np.std([np.mean(pitches[:, i][pitches[:, i] > 0])
                           for i in speech_frames if np.any(pitches[:, i] > 0)] or [0])

        # 4. 语速分析
        # 使用过零率估计有意义的音节数量
        zero_crossings = librosa.zero_crossings(y)
        zero_crossing_rate = sum(zero_crossings) / len(y)

        # 估计音节数量 (简化版)
        estimated_syllables = int(zero_crossing_rate * duration * 1.5)
        speech_rate = estimated_syllables / duration if duration > 0 else 0

        # 5. 清晰度分析 (使用频谱对比)
        # 计算频谱质心作为清晰度指标
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        clarity_score = np.mean(spectral_centroid) / 1000  # 归一化

        # 6. 识别填充词
        # Convert .wav to .pcm for stt compatibility
        pcm_audio_path = audio_path.replace('.wav', '.pcm')
        try:
            wav2pcm(audio_path, pcm_audio_path)
            logger.info(f"成功将音频文件转换为 .pcm 格式: {pcm_audio_path}")
        except Exception as e:
            logger.error(
                f"Failed to convert .wav to .pcm: {str(e)}")
            return {
                "clarity": 7.0,
                "pace": 7.0,
                "tone": 7.0,
                "fillerWordsCount": 0,
                "recommendations": "Audio conversion failed."
            }

        filler_words_count = 0
        stt_completed = False

        def on_stt_close(ws, close_status_code, close_msg):
            """WebSocket 关闭处理"""
            logger.info(
                f"STT WebSocket closed with code: {close_status_code}, message: {close_msg}"
            )
            nonlocal stt_completed
            stt_completed = True

        def on_stt_result(stt_result: str):
            logger.info(f"STT 识别结果: {stt_result}")
            nonlocal filler_words_count
            try:
                if stt_result and isinstance(stt_result, str):
                    filler_words = ["嗯", "啊", "那个", "就是",
                                    "这个", "然后", "其实", "所以", "你知道"]
                    for word in filler_words:
                        filler_words_count += stt_result.count(word)
                    logger.info(
                        f"识别到填充词数量: {filler_words_count} ({stt_result})"
                    )
            except Exception as e:
                logger.warning(f"STT failed: {str(e)}")

        # Use the converted .pcm file for stt
        stt(
            pcm_audio_path,
            callback=on_stt_result,
            on_close=on_stt_close
        ).recognize_audio()

        # 等待STT完成
        while not stt_completed:
            # 等待一段时间，避免过于频繁的检查
            time.sleep(0.1)

        # Clean up temporary .pcm file
        if not current_app.config.get("DEBUG"):
            try:
                os.remove(pcm_audio_path)
            except Exception as e:
                logger.warning(
                    f"Failed to delete temporary .pcm file {pcm_audio_path}: {str(e)}"
                )

        # ===== 评分计算 =====
        # 清晰度评分 (1-10)
        # 清晰度基于频谱质心和信噪比
        clarity = min(10, max(1, clarity_score * 5))

        # 语速评分 (1-10)
        # 理想语速大约是 4-5 音节/秒
        ideal_speech_rate = 4.5
        pace = min(10, max(1, 10 - abs(speech_rate - ideal_speech_rate) * 2))

        # 音调评分 (基于音高变化)
        tone_variety = min(10, max(1, pitch_std / 10))

        # ===== 生成建议 =====
        recommendations = []

        if clarity < 7:
            recommendations.append("提高发音清晰度，避免含糊不清的表达")

        if pace < 6:
            if speech_rate > ideal_speech_rate:
                recommendations.append("放慢语速，给听众思考的时间")
            else:
                recommendations.append("适当加快语速，保持听众兴趣")

        if tone_variety < 6:
            recommendations.append("增加语调变化，避免单调的声音")

        if filler_words_count > 5:
            recommendations.append(f"减少填充词的使用（如'嗯'、'啊'、'那个'等），提高表达准确性")

        recommendation_text = "语音表现良好。" if not recommendations else "、".join(
            recommendations)+"。"

        # 清理临时文件
        if not current_app.config.get("DEBUG"):
            try:
                os.remove(audio_path)
            except Exception as e:
                logger.warning(f"无法删除临时音频文件 {audio_path}: {str(e)}")

        # 返回分析结果
        return {
            "clarity": round(clarity, 1),        # 清晰度评分
            "pace": round(pace, 1),              # 语速评分
            "tone": round(tone_variety, 1),      # 语调评分
            "fillerWordsCount": filler_words_count,  # 填充词数量
            "speechRate": round(speech_rate, 2),     # 语速（音节/秒）
            "pitchMean": round(pitch_mean, 2),       # 平均音高
            "duration": round(duration, 1),          # 音频时长
            "recommendations": recommendation_text    # 改进建议
        }

    except Exception as e:
        logger.exception(f"音频分析失败: {str(e)}")
        # 出错时返回默认数据
        return {
            "clarity": 7.0,
            "pace": 7.0,
            "tone": 7.0,
            "fillerWordsCount": 0,
            "recommendations": f"音频分析过程发生错误: {str(e)[:100]}"
        }
