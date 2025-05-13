"""
配置文件
"""

import logging
import os

from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


class Config:
    """基本配置"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_key_for_interview_ai')
    DATABASE = os.path.join(os.path.dirname(__file__), 'interview_ai.db')
    INTERVIEW_QUESTION_COUNT = int(os.getenv('INTERVIEW_QUESTION_COUNT', '5'))


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    LOGGING_LEVEL = logging.DEBUG


class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    LOGGING_LEVEL = logging.INFO


# 配置映射
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
