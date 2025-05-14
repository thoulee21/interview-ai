import logging
import os
import subprocess
import time
import uuid
from pathlib import Path

import ffmpeg
import librosa
import numpy as np
from app.services.xfyun_services import stt
from app.utils.pcm_wav import wav2pcm
from app.utils.split_audio import split_audio
from flask import current_app

logger = logging.getLogger(__name__)


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
                f"ffmpeg提取音频失败: {e.stderr.decode() if hasattr(e, 'stderr') else str(e)}"
            )
            # 尝试使用subprocess作为备用方法
            cmd = ['ffmpeg', '-i', video_path, '-vn', '-acodec',
                   'pcm_s16le', '-ar', '16000', '-ac', '1', audio_path, '-y']
            subprocess.run(cmd,
                           check=True,
                           stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE
                           )

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
            logger.info(
                f"音频文件转换成功: {Path(audio_path).name} -> {Path(pcm_audio_path).name}"
            )
        except Exception as e:
            logger.error(
                f"Failed to convert .wav to .pcm: {str(e)}"
            )

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
                os.remove(pcm_audio_path)
            except Exception as e:
                logger.warning(f"无法删除临时音频文件: {str(e)}")

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
