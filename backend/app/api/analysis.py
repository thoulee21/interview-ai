"""
多模态分析API模块
"""

import logging
import os
import subprocess
import time
import uuid
from pathlib import Path

import cv2
import ffmpeg
import librosa
import numpy as np
import soundfile as sf
from app.api.auth import token_required
from app.models.interview import MultimodalAnalysis
from app.services.xfyun_services import stt
from app.utils.pcm_wav import wav2pcm
from flask import current_app, jsonify, request

# 配置日志
logger = logging.getLogger(__name__)


@token_required
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

        # 肢体语言分析指标
        face_positions = []  # 记录人脸位置
        head_poses = []      # 记录头部姿势
        frame_diffs = []     # 记录帧间差异
        prev_frame = None    # 上一帧
        upper_body_regions = []  # 上半身区域

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # 转换为灰度图像
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # 帧间差异计算（用于评估动作频率）
            if prev_frame is not None:
                frame_diff = cv2.absdiff(prev_frame, gray)
                frame_diffs.append(np.mean(frame_diff))
            prev_frame = gray.copy()

            # 人脸检测
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            if len(faces) > 0:
                face_detected_frames += 1

                for (x, y, w, h) in faces:
                    # 记录人脸位置（中心点）
                    face_center = (x + w//2, y + h//2)
                    face_positions.append(face_center)

                    # 截取脸部区域
                    roi_gray = gray[y:y+h, x:x+w]

                    # 计算头部姿势（简化版，通过脸部矩形的宽高比来估计）
                    head_pose = w / h if h > 0 else 1.0
                    head_poses.append(head_pose)

                    # 估计上半身区域（面部下方区域）
                    upper_body_y = y + h
                    upper_body_h = int(h * 1.5)  # 假设上半身高度是脸部高度的1.5倍
                    # 确保不超出图像边界
                    if upper_body_y + upper_body_h < frame.shape[0]:
                        upper_body = gray[upper_body_y:upper_body_y +
                                          upper_body_h, x-w//2:x+w+w//2]
                        upper_body_regions.append(
                            np.std(upper_body))  # 上半身区域的标准差作为稳定性指标

                    # 眼睛检测
                    eyes = eye_cascade.detectMultiScale(roi_gray)
                    if len(eyes) >= 2:  # 检测到双眼
                        eye_contact_frames += 1

                    # 计算面部表情变化（使用像素值标准差作为简单指标）
                    face_variance = np.std(roi_gray)
                    facial_expression_variance.append(face_variance)

            # 每100帧检查一次，避免处理过大的视频
            frame_count += 1
            if frame_count > 300:
                break

        cap.release()

        # 如果没有成功处理任何帧，返回默认值
        if frame_count == 0:
            logger.warning(f"无法从视频中提取任何有效帧: {video_path}")
            # 默认的身体语言详细评分
            default_body_language_details = {
                "stability": 7.0,
                "headPose": 7.0,
                "upperBody": 7.0,
                "motion": 7.0
            }
            analysis = {
                "eyeContact": 7.0,
                "facialExpressions": 7.0,
                "bodyLanguage": 7.0,
                "bodyLanguageDetails": default_body_language_details,
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
        ) if facial_expression_variance else 0        # 计算评分（简化版）
        eye_contact_score = min(10, eye_contact_rate * 10)
        facial_expressions_score = min(
            10, (expression_variability / 50) * 10
        )  # 假设50是较好的变化值

        # 计算肢体语言得分
        body_language_score = 7.0  # 默认初始值
        body_language_details = {}

        # 1. 姿态稳定性评分（通过人脸位置的稳定性来评估）
        if len(face_positions) > 1:
            # 计算人脸位置的标准差（x和y方向）
            face_pos_x = [pos[0] for pos in face_positions]
            face_pos_y = [pos[1] for pos in face_positions]
            face_stability_x = np.std(face_pos_x)
            face_stability_y = np.std(face_pos_y)

            # 归一化稳定性得分（标准差越小越稳定，得分越高）
            # 理想的轻微移动范围在10-30像素之间
            stability_score_x = 10 - \
                min(10, max(0, (face_stability_x - 10) / 5))
            stability_score_y = 10 - \
                min(10, max(0, (face_stability_y - 10) / 5))
            stability_score = (stability_score_x + stability_score_y) / 2
            body_language_details['stability'] = round(stability_score, 1)
        else:
            body_language_details['stability'] = 5.0  # 默认中等值

        # 2. 头部姿势评分
        if head_poses:
            # 头部姿势的平均值和变异性
            head_pose_mean = np.mean(head_poses)
            head_pose_std = np.std(head_poses)

            # 头部姿势分数（理想的宽高比接近1.0，表示正面朝向）
            head_pose_score = 10 - min(10, abs(head_pose_mean - 1.0) * 10)

            # 头部姿势变化（适度变化是好的，但过度变化不好）
            head_movement_score = 10 - \
                min(10, max(0, (head_pose_std - 0.05) * 20))

            head_score = (head_pose_score + head_movement_score) / 2
            body_language_details['headPose'] = round(head_score, 1)
        else:
            body_language_details['headPose'] = 5.0  # 默认中等值

        # 3. 上半身稳定性
        if upper_body_regions:
            # 上半身区域的变异性（适度的变化是好的，表示自然的手势）
            upper_body_std = np.mean(upper_body_regions)

            # 理想的上半身变化在10-30之间
            upper_body_score = 10 if 10 <= upper_body_std <= 30 else 10 - \
                min(10, abs(upper_body_std - 20) / 3)
            body_language_details['upperBody'] = round(upper_body_score, 1)
        else:
            body_language_details['upperBody'] = 5.0  # 默认中等值

        # 4. 动作频率评分
        if frame_diffs:
            # 计算动作频率的均值
            motion_mean = np.mean(frame_diffs)

            # 理想的动作变化在5-15之间（太少表示僵硬，太多表示不稳定）
            motion_score = 10 if 5 <= motion_mean <= 15 else 10 - \
                min(10, abs(motion_mean - 10) / 2)
            body_language_details['motion'] = round(motion_score, 1)
        else:
            body_language_details['motion'] = 5.0  # 默认中等值

        # 综合肢体语言得分（各部分权重可以调整）
        if face_detected_frames > 0:
            body_language_score = (
                body_language_details['stability'] * 0.3 +
                body_language_details['headPose'] * 0.3 +
                body_language_details['upperBody'] * 0.2 +
                body_language_details['motion'] * 0.2
            )
        # 否则保持默认值

        # 记录详细评分到日志
        logger.info(f"肢体语言详细评分: {body_language_details}")

        # 自信度评分综合考虑眼神接触和肢体语言
        confidence_score = 0.5 * eye_contact_score + 0.3 * \
            body_language_score + 0.2 * facial_expressions_score

        # 生成建议
        recommendations = []
        if eye_contact_score < 7:
            recommendations.append("增加与面试官的眼神接触")
        if facial_expressions_score < 6:
            recommendations.append("尝试展示更多自然的面部表情")

        # 根据肢体语言的各个方面提供具体建议
        if 'stability' in body_language_details:
            if body_language_details['stability'] < 6:
                recommendations.append("面试时保持身体稳定，减少不必要的晃动")

        if 'headPose' in body_language_details:
            if body_language_details['headPose'] < 6:
                recommendations.append("保持头部正面朝向面试官，适当点头示意")

        if 'upperBody' in body_language_details:
            if body_language_details['upperBody'] < 6:
                recommendations.append("注意上半身姿态，保持挺胸自然的坐姿")

        if 'motion' in body_language_details:
            if body_language_details['motion'] < 5:
                recommendations.append("适当增加手势动作，避免过于僵硬")
            elif body_language_details['motion'] > 8:
                recommendations.append("减少过度频繁的动作，保持沉稳大方")        # 最终分析结果

        analysis = {
            "eyeContact": round(eye_contact_score, 1),  # 眼神接触评分(1-10)
            "facialExpressions": round(facial_expressions_score, 1),  # 面部表情评分
            "bodyLanguage": round(body_language_score, 1),  # 肢体语言评分
            "confidence": round(confidence_score, 1),  # 自信程度
            "recommendations": "、".join(recommendations) if recommendations else "保持良好的眼神接触和面部表情。"
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

        # 保存分析结果
        MultimodalAnalysis.create_or_update(
            session_id, analysis, audio_analysis
        )

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

        # 分割音频并处理
        segment_files = split_audio(audio_path)
        total_filler_words_count = 0

        for i, segment_path in enumerate(segment_files):
            try:
                filler_count = process_audio_segment(segment_path, i * 60)
                total_filler_words_count += filler_count
            finally:
                # 清理临时文件
                if not current_app.config.get("DEBUG"):
                    try:
                        os.remove(segment_path)
                    except Exception as e:
                        logger.warning(
                            f"无法删除临时音频片段文件 {segment_path}: {str(e)}")

        filler_words_count = total_filler_words_count

        # ===== 评分计算 =====
        # 清晰度评分 (1-10)
        # 清晰度基于频谱质心和信噪比
        clarity = min(10, max(1, clarity_score * 5))

        # 语速评分 (1-10)
        # 理想语速大约是 2-3 音节/秒
        ideal_speech_rate = 2.5
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
            recommendations
        )+"。"

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


def process_audio_segment(audio_segment_path: str, start_time: float = 0):
    """处理单个音频片段的STT识别"""
    filler_words_count = 0
    stt_completed = False

    def on_stt_close(ws, close_status_code, close_msg):
        logger.info(
            f"STT WebSocket closed with code: {close_status_code}, message: {close_msg}"
        )
        nonlocal stt_completed
        stt_completed = True

    def on_stt_result(stt_result: str):
        logger.info(f"STT 识别结果 (开始时间 {start_time}s): {stt_result}")
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

    # 执行STT识别
    stt(
        audio_segment_path,
        callback=on_stt_result,
        on_close=on_stt_close
    ).recognize_audio()

    # 等待STT完成
    while not stt_completed:
        time.sleep(0.1)

    return filler_words_count


def split_audio(audio_path: str, segment_duration: int = 60):
    """将音频文件分割成指定时长的片段"""
    audio_path = Path(audio_path)
    temp_dir = Path(os.getcwd(), 'temp', 'audios', 'segments')
    os.makedirs(temp_dir, exist_ok=True)

    y, sr = librosa.load(audio_path, sr=None)
    duration = len(y) / sr

    if duration <= segment_duration:
        return [audio_path]

    segment_files = []
    num_segments = int(np.ceil(duration / segment_duration))

    for i in range(num_segments):
        start_sample = i * segment_duration * sr
        end_sample = min((i + 1) * segment_duration * sr, len(y))
        segment = y[int(start_sample):int(end_sample)]

        if len(segment) == 0:
            continue

        segment_path = Path(
            temp_dir, f"{audio_path.stem}_segment_{i}.wav"
        )
        sf.write(str(segment_path), segment, sr)

        # 转换为pcm格式
        pcm_segment_path = str(segment_path).replace('.wav', '.pcm')
        wav2pcm(segment_path, pcm_segment_path)

        segment_files.append(pcm_segment_path)

        # 删除临时wav文件
        if not current_app.config.get("DEBUG"):
            try:
                os.remove(segment_path)
            except Exception as e:
                logger.warning(f"无法删除临时音频片段文件 {segment_path}: {str(e)}")

    return segment_files
