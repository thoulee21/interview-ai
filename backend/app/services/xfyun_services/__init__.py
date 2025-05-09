import os

from dotenv import load_dotenv

from .speech_recognition import SpeechRecognition
from .speech_synthesis import SpeechSynthesis
from .translation import TranslationService

load_dotenv()

app_id = os.getenv("XUNFEI_APP_ID")
api_key = os.getenv("XUNFEI_API_KEY")
api_secret = os.getenv("XUNFEI_API_SECRET")


def stt(audio_file: str, callback=None, on_close=None):
    return SpeechRecognition(
        "wss://iat-api.xfyun.cn/v2/iat",
        app_id,
        api_key,
        api_secret,
        audio_file,
        callback,
        on_close
    )
