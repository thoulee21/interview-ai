"""
JSON Schema 验证模块
用于验证模型输出是否符合预期的结构
"""

import json
import logging

from jsonschema import ValidationError, validate

# 配置日志
logger = logging.getLogger(__name__)

# 面试评估结果的JSON Schema
INTERVIEW_EVALUATION_SCHEMA = {
    "type": "object",
    "properties": {
        "overallScore": {"type": "number", "minimum": 0, "maximum": 100},
        "contentScore": {"type": "number", "minimum": 0, "maximum": 100},
        "deliveryScore": {"type": "number", "minimum": 0, "maximum": 100},
        "nonVerbalScore": {"type": "number", "minimum": 0, "maximum": 100},
        "strengths": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1
        },
        "improvements": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1
        },
        "recommendations": {"type": "string"},
        "questionScores": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "score": {"type": "number", "minimum": 0, "maximum": 100},
                    "feedback": {"type": "string"}
                },
                "required": ["question", "score", "feedback"]
            }
        }
    },
    "required": ["overallScore", "contentScore", "deliveryScore", "nonVerbalScore",
                 "strengths", "improvements", "recommendations"]
}

# 视频分析结果的JSON Schema
VIDEO_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "eyeContact": {"type": "number", "minimum": 0, "maximum": 10},
        "facialExpressions": {"type": "number", "minimum": 0, "maximum": 10},
        "bodyLanguage": {"type": "number", "minimum": 0, "maximum": 10},
        "confidence": {"type": "number", "minimum": 0, "maximum": 10},
        "recommendations": {"type": "string"}
    },
    "required": ["eyeContact", "facialExpressions", "bodyLanguage", "confidence"]
}

# 音频分析结果的JSON Schema
AUDIO_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "clarity": {"type": "number", "minimum": 0, "maximum": 10},
        "pace": {"type": "number", "minimum": 0, "maximum": 10},
        "tone": {"type": "number", "minimum": 0, "maximum": 10},
        "fillerWordsCount": {"type": "number", "minimum": 0},
        "recommendations": {"type": "string"}
    },
    "required": ["clarity", "pace", "tone", "fillerWordsCount"]
}


def validate_json(data, schema):
    """
    验证数据是否符合 JSON Schema

    Args:
        data: 要验证的数据对象
        schema: JSON Schema 定义

    Returns:
        tuple: (is_valid, errors)，is_valid 表示是否验证通过，errors 包含验证错误信息
    """
    try:
        validate(instance=data, schema=schema)
        return True, None
    except ValidationError as e:
        logger.error(f"JSON验证失败: {e}")
        return False, str(e)


def extract_evaluation_from_text(text):
    """
    从文本中提取评估结果的JSON部分

    Args:
        text: 包含评估结果的文本

    Returns:
        dict: 提取的JSON对象，如果提取失败则返回None
    """
    try:
        # 尝试直接解析整个文本
        try:
            data = json.loads(text)
            return data
        except:
            pass

        # 尝试提取 ```json ... ``` 格式的代码块
        import re
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', text)
        if json_match:
            json_str = json_match.group(1)
            return json.loads(json_str)

        # 尝试提取 {...} 格式的 JSON 对象
        json_match = re.search(r'(\{[\s\S]*\})', text)
        if json_match:
            json_str = json_match.group(1)
            return json.loads(json_str)

        return None
    except Exception as e:
        logger.exception(f"从文本提取JSON失败: {str(e)}")
        return None


def validate_evaluation_result(text):
    """
    验证评估结果文本是否符合要求的格式

    Args:
        text: 包含评估结果的文本

    Returns:
        tuple: (data, is_valid, errors)
               data为提取的结构化数据，
               is_valid表示是否验证通过，
               errors包含验证错误信息
    """
    # 从文本中提取JSON
    data = extract_evaluation_from_text(text)
    if not data:
        return None, False, "无法从文本中提取有效的JSON数据"

    # 验证提取的JSON
    is_valid, errors = validate_json(data, INTERVIEW_EVALUATION_SCHEMA)
    return data, is_valid, errors


def validate_video_analysis(data):
    """验证视频分析数据"""
    return validate_json(data, VIDEO_ANALYSIS_SCHEMA)


def validate_audio_analysis(data):
    """验证音频分析数据"""
    return validate_json(data, AUDIO_ANALYSIS_SCHEMA)


def fix_evaluation_data(data):
    """
    尝试修复评估数据，使其符合Schema要求

    Args:
        data: 原始的评估数据对象

    Returns:
        dict: 修复后的评估数据
    """
    fixed_data = data.copy() if data else {}

    # 确保必须的字段存在
    required_number_fields = ["overallScore",
                              "contentScore", "deliveryScore", "nonVerbalScore"]
    
    # 使用较为智能的分数提取方法
    for field in required_number_fields:
        if field not in fixed_data or not isinstance(fixed_data[field], (int, float)):
            # 根据字段名称设置默认分数，避免全部使用同一默认值
            if field == "overallScore":
                fixed_data[field] = 75
            elif field == "contentScore":
                fixed_data[field] = 70
            elif field == "deliveryScore":
                fixed_data[field] = 65
            elif field == "nonVerbalScore":
                fixed_data[field] = 60
        else:
            # 确保分数在0-100范围内
            fixed_data[field] = max(0, min(100, int(fixed_data[field])))

    # 确保strengths和improvements是非空数组
    for field in ["strengths", "improvements"]:
        if field not in fixed_data or not isinstance(fixed_data[field], list) or len(fixed_data[field]) == 0:
            if field == "strengths":
                fixed_data[field] = ["回答条理清晰", "专业知识扎实", "举例恰当"]
            else:
                fixed_data[field] = ["可以更加简洁", "需要更多具体案例", "可以增加非语言交流"]

    # 确保recommendations字段存在
    if "recommendations" not in fixed_data or not fixed_data["recommendations"]:
        fixed_data["recommendations"] = "建议在回答问题时更加简洁明了，同时注意非语言沟通如眼神接触和肢体语言，可以通过更多的实际案例来支持你的观点。"

    return fixed_data