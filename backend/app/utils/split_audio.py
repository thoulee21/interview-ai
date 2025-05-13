import logging
import os
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from app.utils.pcm_wav import wav2pcm
from flask import current_app

logger = logging.getLogger(__name__)


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
