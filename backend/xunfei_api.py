import base64
import hashlib
import hmac
import json
import logging
import os
import ssl
import threading
import time
import uuid
from datetime import datetime
from time import mktime
from urllib.parse import urlencode, urlparse
from wsgiref.handlers import format_date_time

from websocket import WebSocketApp, enableTrace
from dotenv import load_dotenv

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 加载环境变量
load_dotenv()

# 讯飞星火大模型API参数
XUNFEI_APP_ID = os.getenv('XUNFEI_APP_ID')
XUNFEI_API_KEY = os.getenv('XUNFEI_API_KEY')
XUNFEI_API_SECRET = os.getenv('XUNFEI_API_SECRET')
XUNFEI_WS_URL = "wss://spark-api.xf-yun.com/v3.5/chat"  # 讯飞星火API WebSocket V3.5版本

# 是否使用模拟模式（用于开发环境，当没有真实API凭证时）
USE_MOCK_MODE = os.getenv('USE_MOCK_MODE', 'True').lower() in ('true', '1', 't')

class WebSocketParam:
    """WebSocket连接参数生成类"""
    
    def __init__(self, app_id, api_key, api_secret, gpt_url):
        self.app_id = app_id
        self.api_key = api_key
        self.api_secret = api_secret
        self.host = urlparse(gpt_url).netloc
        self.path = urlparse(gpt_url).path
        self.gpt_url = gpt_url
    
    def create_url(self):
        """生成WebSocket连接URL"""
        # 生成RFC1123格式的时间戳
        now = datetime.now()
        date = format_date_time(mktime(now.timetuple()))

        # 拼接字符串
        signature_origin = "host: " + self.host + "\n"
        signature_origin += "date: " + date + "\n"
        signature_origin += "GET " + self.path + " HTTP/1.1"

        # 使用hmac-sha256进行加密
        signature_sha = hmac.new(self.api_secret.encode('utf-8'), 
                               signature_origin.encode('utf-8'),
                               digestmod=hashlib.sha256).digest()
        
        signature_sha_base64 = base64.b64encode(signature_sha).decode(encoding='utf-8')
        
        authorization_origin = f'api_key="{self.api_key}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature_sha_base64}"'
        
        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')

        # 将请求的鉴权参数组合为字典
        v = {
            "authorization": authorization,
            "date": date,
            "host": self.host
        }
        # 拼接鉴权参数，生成url
        url = self.gpt_url + '?' + urlencode(v)
        return url

class XunFeiSparkAPI:
    """讯飞星火大模型API客户端类"""
    
    def __init__(self):
        self._app_id = XUNFEI_APP_ID
        self._api_key = XUNFEI_API_KEY
        self._api_secret = XUNFEI_API_SECRET
        
        if not all([self._app_id, self._api_key, self._api_secret]):
            if USE_MOCK_MODE:
                logger.warning("使用模拟模式，API响应将被模拟")
                self._use_mock = True
            else:
                logger.error("讯飞星火API配置缺失，请检查环境变量")
                raise ValueError("讯飞星火API配置缺失")
        else:
            self._use_mock = False
            
    def _create_auth_url(self, host):
        """创建鉴权URL（HTTP API）"""
        # 生成RFC1123格式的时间戳
        now = datetime.now()
        date = now.strftime('%a, %d %b %Y %H:%M:%S GMT')
        
        # 解析URL
        parsed_url = urlparse(host)
        host = parsed_url.netloc
        path = parsed_url.path
        
        # 生成签名原文
        signature_origin = f"host: {host}\ndate: {date}\nGET {path} HTTP/1.1"
        
        # 使用hmac-sha256进行加密
        signature_sha = hmac.new(
            self._api_secret.encode('utf-8'),
            signature_origin.encode('utf-8'),
            digestmod=hashlib.sha256).digest()
            
        signature_sha_base64 = base64.b64encode(signature_sha).decode('utf-8')
        
        authorization_origin = f'api_key="{self._api_key}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature_sha_base64}"'
        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode('utf-8')
        
        # 拼接鉴权URL
        params = {
            'authorization': authorization,
            'date': date,
            'host': host
        }
        auth_url = host + path + '?' + urlencode(params)
        
        return auth_url
    
    def _mock_response(self, prompt):
        """生成模拟响应（用于开发测试）"""
        # 睡眠一小段时间模拟API调用延迟
        time.sleep(0.5)
        
        # 根据不同提示词生成不同的模拟响应
        if "面试官" in prompt and "问题" in prompt:
            return {
                "status": "success",
                "response": "请介绍一下你的项目经验，特别是你在其中担任的角色和解决的技术挑战。",
                "request_id": str(uuid.uuid4())
            }
        elif "评估" in prompt:
            return {
                "status": "success",
                "response": "评分：8/10\n\n优点：\n1. 回答条理清晰，思路明确\n2. 专业术语使用恰当\n3. 举例具体，有说服力\n\n不足：\n1. 部分细节描述不够具体\n2. 可以更好地突出个人贡献\n\n改进建议：\n在描述项目时，可以使用STAR法则（情境、任务、行动、结果）来使回答更加完整。同时，量化你的成就会使回答更有说服力。",
                "request_id": str(uuid.uuid4())
            }
        else:
            return {
                "status": "success",
                "response": f"这是对'{prompt[:30]}...'的模拟回复。在实际项目中，这里应该是星火大模型的回复。",
                "request_id": str(uuid.uuid4())
            }

    def _gen_websocket_params(self, prompt, history=None, domain="generalv3.5", temperature=0.5, max_tokens=4096):
        """生成WebSocket请求参数"""
        messages = []
        
        # 添加历史消息
        if history:
            messages.extend(history)
            
        # 添加当前提问
        messages.append({"role": "user", "content": prompt})
        
        data = {
            "header": {
                "app_id": self._app_id,
                "uid": str(uuid.uuid4())
            },
            "parameter": {
                "chat": {
                    "domain": domain,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "auditing": "default"
                }
            },
            "payload": {
                "message": {
                    "text": messages
                }
            }
        }
        return data

    def _chat_with_websocket(self, prompt, history=None, domain="generalv3.5", temperature=0.5, max_tokens=4096):
        """使用WebSocket与讯飞星火大模型进行对话"""
        result = {"status": "error", "message": "未收到有效响应"}
        response_text = []
        
        def on_message(ws, message):
            data = json.loads(message)
            code = data['header']['code']
            if code != 0:
                logger.error(f"请求错误: {code}, {data}")
                result["message"] = f"API请求失败，错误码: {code}"
                ws.close()
            else:
                choices = data["payload"]["choices"]
                status = choices["status"]
                content = choices["text"][0]["content"]
                response_text.append(content)
                if status == 2:  # 对话结束
                    result["status"] = "success"
                    result["response"] = "".join(response_text)
                    result["request_id"] = data['header'].get('sid', str(uuid.uuid4()))
                    ws.close()
                
        def on_error(ws, error):
            logger.error(f"WebSocket错误: {error}")
            result["message"] = f"WebSocket错误: {str(error)}"
            
        def on_close(ws, *args):
            logger.info("WebSocket连接已关闭")
            
        def on_open(ws):
            def run():
                params = self._gen_websocket_params(prompt, history, domain, temperature, max_tokens)
                ws.send(json.dumps(params))
            threading.Thread(target=run).start()
            
        # 生成WebSocket连接URL
        ws_param = WebSocketParam(self._app_id, self._api_key, self._api_secret, XUNFEI_WS_URL)
        ws_url = ws_param.create_url()
        
        # 创建WebSocket连接
        enableTrace(False)
        ws = WebSocketApp(
            ws_url,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
            on_open=on_open
        )
        
        # 运行WebSocket连接，设置超时时间
        ws.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE}, ping_interval=30, ping_timeout=10)
        
        return result
    
    def chat(self, prompt, history=None, temperature=0.7, max_tokens=2048):
        """调用讯飞星火大模型API进行对话"""
        # 如果是模拟模式，返回模拟响应
        if self._use_mock:
            return self._mock_response(prompt)

        try:
            # 使用WebSocket连接与星火大模型进行对话
            return self._chat_with_websocket(prompt, history, temperature=temperature, max_tokens=max_tokens)
        except Exception as e:
            logger.exception(f"讯飞星火API调用异常: {str(e)}")
            return {
                "status": "error",
                "message": f"API调用异常: {str(e)}"
            }
            
    def generate_interview_question(self, position_type, difficulty, previous_questions=None, previous_answers=None):
        """生成面试问题"""
        try:
            # 构建提示词
            prompt = f"你是一位专业的面试官，现在正在面试一位申请{position_type}职位的候选人。"
            
            if previous_questions and previous_answers:
                prompt += f"\n已经问过的问题: {'; '.join(previous_questions)}"
                prompt += f"\n候选人的回答: {'; '.join(previous_answers)}"
                prompt += f"\n请根据候选人之前的回答，提供一个{difficulty}难度的后续面试问题。问题应该针对性强，能够深入考察候选人的专业能力和综合素质。"
            else:
                prompt += f"\n请提供一个{difficulty}难度的第一个面试问题，问题应该专业且有针对性。"

            prompt += f"\n\n请给出问题的具体内容，不需要其他任何解释。"

            # 调用API
            response = self.chat(prompt)
            
            if response.get("status") == "success":
                return {
                    "status": "success",
                    "question": response.get("response"),
                    "request_id": response.get("request_id")
                }
            else:
                return {
                    "status": "error",
                    "message": response.get("message", "生成问题失败")
                }
                
        except Exception as e:
            logger.exception(f"生成面试问题异常: {str(e)}")
            return {
                "status": "error",
                "message": f"生成面试问题异常: {str(e)}"
            }
    
    def evaluate_answer(self, question, answer, position_type=None):
        """评估面试回答"""
        try:
            position_info = f"申请{position_type}职位的" if position_type else ""
            
            prompt = f"""你是一位资深面试官，现在需要你对{position_info}候选人的回答进行专业评估。
            
问题: {question}

候选人回答: {answer}

请提供以下评估:
1. 给出1-10的分数评价回答质量
2. 分析回答的优点
3. 指出存在的问题
4. 给出具体的改进建议
            """
            
            # 调用API
            response = self.chat(prompt)
            
            if response.get("status") == "success":
                return {
                    "status": "success",
                    "evaluation": response.get("response"),
                    "request_id": response.get("request_id")
                }
            else:
                return {
                    "status": "error",
                    "message": response.get("message", "评估回答失败")
                }
                
        except Exception as e:
            logger.exception(f"评估面试回答异常: {str(e)}")
            return {
                "status": "error",
                "message": f"评估面试回答异常: {str(e)}"
            }
    
    def generate_final_evaluation(self, position_type, questions, answers, video_analysis=None, audio_analysis=None):
        """生成最终的面试评估报告"""
        try:
            # 构建提示词
            prompt = f"""你是一位专业的面试评估专家，现在需要你对一位申请{position_type}职位的候选人的整个面试过程进行全面评估，并生成详细的评估报告。

面试记录:
"""
            
            # 添加问答记录
            for i in range(len(questions)):
                if i < len(answers):
                    prompt += f"\n问题{i+1}: {questions[i]}\n回答{i+1}: {answers[i]}\n"
                    
            # 添加视频分析数据
            if video_analysis:
                prompt += "\n视频行为分析数据:\n"
                prompt += f"眼神接触评分: {video_analysis.get('eye_contact', 'N/A')}/10\n"
                prompt += f"面部表情评分: {video_analysis.get('facial_expressions', 'N/A')}/10\n"
                prompt += f"肢体语言评分: {video_analysis.get('body_language', 'N/A')}/10\n"
                prompt += f"自信程度评分: {video_analysis.get('confidence', 'N/A')}/10\n"
                
            # 添加音频分析数据
            if audio_analysis:
                prompt += "\n音频表现分析数据:\n"
                prompt += f"语音清晰度评分: {audio_analysis.get('clarity', 'N/A')}/10\n"
                prompt += f"语速评分: {audio_analysis.get('pace', 'N/A')}/10\n"
                prompt += f"语调评分: {audio_analysis.get('tone', 'N/A')}/10\n"
                prompt += f"填充词使用次数: {audio_analysis.get('filler_words_count', 'N/A')}\n"
                
            prompt += """
请提供以下内容的评估报告:
1. 总体评分(1-100分)
2. 内容评分(专业知识、逻辑思维等)
3. 表达评分(语言组织、表达流畅性等)
4. 非语言表现评分(肢体语言、面部表情等)
5. 三个主要优势
6. 三个需要改进的方面
7. 针对性的改进建议
            """
            
            # 调用API
            response = self.chat(prompt, max_tokens=4096)
            
            if response.get("status") == "success":
                return {
                    "status": "success",
                    "evaluation": response.get("response"),
                    "request_id": response.get("request_id")
                }
            else:
                return {
                    "status": "error",
                    "message": response.get("message", "生成评估报告失败")
                }
                
        except Exception as e:
            logger.exception(f"生成最终评估报告异常: {str(e)}")
            return {
                "status": "error",
                "message": f"生成最终评估报告异常: {str(e)}"
            }
            

# 测试代码
if __name__ == "__main__":
    api = XunFeiSparkAPI()
    result = api.chat("你好，请介绍一下你自己")
    print(json.dumps(result, ensure_ascii=False, indent=2))