"""
AI服务模块
封装讯飞星火API的调用
"""

import logging

# 导入讯飞星火API
from xunfei_api import XunFeiSparkAPI

# 配置日志
logger = logging.getLogger(__name__)


class AIService:
    """
    AI服务类
    封装对讯飞星火API的调用
    """

    def __init__(self):
        """初始化AI服务"""
        self.api = XunFeiSparkAPI()

    def generate_interview_question(self, position_type, difficulty, previous_questions=None, previous_answers=None):
        """
        生成面试问题

        Args:
            position_type (str): 职位类型
            difficulty (str): 难度级别
            previous_questions (list, optional): 之前的问题列表
            previous_answers (list, optional): 之前的回答列表

        Returns:
            dict: 包含生成的问题的响应
        """
        # 直接调用 XunFeiSparkAPI 中的 generate_interview_question 方法
        try:
            response = self.api.generate_interview_question(
                position_type, 
                difficulty, 
                previous_questions, 
                previous_answers
            )
            
            if response.get("status") == "success":
                return {
                    "status": "success",
                    "question": response.get("question")
                }
            else:
                logger.error(f"生成面试问题失败: {response.get('message')}")
                return response
        except Exception as e:
            logger.exception(f"生成面试问题时发生异常: {str(e)}")
            return {
                "status": "error",
                "message": f"生成面试问题时发生异常: {str(e)}"
            }

    def evaluate_answer(self, question, answer, position_type):
        """
        评估面试回答

        Args:
            question (str): 面试问题
            answer (str): 应聘者的回答
            position_type (str): 职位类型

        Returns:
            dict: 包含评估结果的响应
        """
        # 直接调用 XunFeiSparkAPI 中的 evaluate_answer 方法
        try:
            response = self.api.evaluate_answer(question, answer, position_type)
            
            if response.get("status") == "success":
                return {
                    "status": "success",
                    "evaluation": response.get("evaluation")
                }
            else:
                logger.error(f"评估回答失败: {response.get('message')}")
                return response
        except Exception as e:
            logger.exception(f"评估回答时发生异常: {str(e)}")
            return {
                "status": "error",
                "message": f"评估回答时发生异常: {str(e)}"
            }

    def generate_final_evaluation(self, position_type, questions, answers, video_analysis=None, audio_analysis=None):
        """
        生成最终评估报告

        Args:
            position_type (str): 职位类型
            questions (list): 所有面试问题
            answers (list): 所有面试回答
            video_analysis (dict, optional): 视频分析数据
            audio_analysis (dict, optional): 音频分析数据

        Returns:
            dict: 包含最终评估的响应
        """
        # 直接调用 XunFeiSparkAPI 中的 generate_final_evaluation 方法
        try:
            response = self.api.generate_final_evaluation(
                position_type, 
                questions, 
                answers, 
                video_analysis, 
                audio_analysis
            )
            
            if response.get("status") == "success":
                return {
                    "status": "success",
                    "evaluation": response.get("evaluation")
                }
            else:
                logger.error(f"生成最终评估失败: {response.get('message')}")
                return response
        except Exception as e:
            logger.exception(f"生成最终评估时发生异常: {str(e)}")
            return {
                "status": "error",
                "message": f"生成最终评估时发生异常: {str(e)}"
            }


# 创建AI服务实例
ai_service = AIService()
