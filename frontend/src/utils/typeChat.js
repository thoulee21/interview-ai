/**
 * TypeChat 工具类
 * 用于处理和规范大模型输出的结构
 */

import Ajv from 'ajv';

// 初始化 ajv 实例
const ajv = new Ajv({ allErrors: true });

/**
 * 将大模型原始文本输出解析为结构化的面试评估结果
 * 
 * @param {string} rawText - 大模型生成的原始文本
 * @param {Object} schema - TypeScript 类型的 JSON Schema
 * @returns {Object} - 结构化后的评估结果对象
 */
export const parseModelOutput = (rawText, schema) => {
  try {
    // 首先尝试直接解析文本为 JSON
    try {
      const directParsed = JSON.parse(rawText);
      if (isValidAgainstSchema(directParsed, schema)) {
        return directParsed;
      }
    } catch (e) {
      // 直接解析失败，继续尝试提取 JSON
    }

    // 尝试从文本中提取 JSON 部分
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      rawText.match(/{[\s\S]*}/) ||
                      rawText.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      if (isValidAgainstSchema(parsed, schema)) {
        return parsed;
      }
    }

    // 如果没有找到有效的 JSON，尝试从文本中提取结构化信息
    return extractStructuredData(rawText, schema);
  } catch (error) {
    console.error("解析模型输出失败:", error);
    return null;
  }
};

/**
 * 验证对象是否符合指定的 schema
 * 
 * @param {Object} obj - 要验证的对象 
 * @param {Object} schema - JSON Schema 对象
 * @returns {boolean} - 是否符合 schema
 */
const isValidAgainstSchema = (obj, schema) => {
  if (!obj || typeof obj !== 'object') return false;
  
  // 使用 ajv 进行完整的 JSON Schema 验证
  const validate = ajv.compile(schema);
  const valid = validate(obj);

  if (!valid) {
    console.debug('Schema 验证失败:', validate.errors);
  }

  return valid;
};

/**
 * 从非结构化文本中提取结构化数据
 * 
 * @param {string} text - 原始文本
 * @param {Object} schema - 期望的数据结构 schema
 * @returns {Object} - 提取的结构化数据
 */
const extractStructuredData = (text, schema) => {
  // 提取总体评分
  const overallScoreMatch = text.match(/总体评分[：:.]\s*(\d+)/i) ||
                           text.match(/整体得分[：:.]\s*(\d+)/i) ||
                           text.match(/总分[：:.]\s*(\d+)/i);
  
  // 提取内容评分
  const contentScoreMatch = text.match(/内容评分[：:.]\s*(\d+)/i) ||
                           text.match(/专业[知识]*评分[：:.]\s*(\d+)/i);
  
  // 提取表达评分
  const deliveryScoreMatch = text.match(/表达评分[：:.]\s*(\d+)/i) || 
                            text.match(/表达能力[：:.]\s*(\d+)/i);
  
  // 提取非语言表现评分
  const nonVerbalScoreMatch = text.match(/非语言[表现]*评分[：:.]\s*(\d+)/i) ||
                             text.match(/形体语言评分[：:.]\s*(\d+)/i);

  // 提取优势列表
  const strengthsMatches = text.match(/优[点势][\s\S]*?(?=不足|改进|不够|问题|$)/i);
  const strengths = strengthsMatches 
    ? extractListItems(strengthsMatches[0])
    : [];

  // 提取需改进列表
  const improvementsMatches = text.match(/(?:不足|改进|问题)[\s\S]*?(?=建议|总结|$)/i);
  const improvements = improvementsMatches
    ? extractListItems(improvementsMatches[0])
    : [];
    
  // 提取建议
  const recommendationsMatch = text.match(/(?:建议|提升建议|改进措施)[:：]?([\s\S]*?)(?=总结|$)/i);
  
  // 构建结构化结果
  return {
    overallScore: overallScoreMatch ? parseInt(overallScoreMatch[1], 10) : 0,
    contentScore: contentScoreMatch ? parseInt(contentScoreMatch[1], 10) : 0,
    deliveryScore: deliveryScoreMatch ? parseInt(deliveryScoreMatch[1], 10) : 0,
    nonVerbalScore: nonVerbalScoreMatch ? parseInt(nonVerbalScoreMatch[1], 10) : 0,
    strengths,
    improvements,
    recommendations: recommendationsMatch ? recommendationsMatch[1].trim() : "",
    // 其他字段需要根据实际情况进行提取
  };
};

/**
 * 从文本中提取列表项
 * 
 * @param {string} text - 包含列表的文本
 * @returns {string[]} - 提取出的列表项
 */
const extractListItems = (text) => {
  // 移除标题部分
  const contentText = text.replace(/^.*?[：:]/m, '');
  
  // 尝试匹配编号列表项 (1. 项目内容) 或 带标记的列表项 (• 项目内容)
  const items = contentText.match(/(?:^|\n)(?:\d+\.\s*|\*\s*|•\s*|[-+]\s*)([^\n]+)/g) || [];
  
  return items
    .map(item => item.replace(/(?:^|\n)(?:\d+\.\s*|\*\s*|•\s*|[-+]\s*)/, '').trim())
    .filter(item => item.length > 0);
};

/**
 * 将非结构化的模型输出转换为结构化的 TypeScript 类型定义对象
 * 
 * @param {string} llmOutput - 大模型的原始输出
 * @param {Object} schemaObj - TypeScript 类型对应的 schema 对象
 * @returns {Object|null} - 转换后的结构化对象，如果转换失败则为 null
 */
export const typeChatTransform = (llmOutput, schemaObj) => {
  try {
    // 使用 TypeChat 的核心思想: 先解析，无法解析则提取结构
    return parseModelOutput(llmOutput, schemaObj);
  } catch (error) {
    console.error("TypeChat 转换失败:", error);
    return null;
  }
};

/**
 * 创建一个基于 schema 的 JSON Schema 对象
 * 
 * @param {Object} typeDefObj - 从 TypeScript 类型定义生成的对象
 * @returns {Object} - 对应的 JSON Schema 对象
 */
export const createJsonSchema = (typeDefObj) => {
  // 简化版的 schema 创建，实际中可以使用更完整的库
  return {
    type: "object",
    properties: typeDefObj,
    required: Object.keys(typeDefObj)
  };
};

// 导出面试评估结构的 JSON Schema 对象
export const interviewEvaluationSchema = {
  type: "object",
  properties: {
    overallScore: { type: "number", minimum: 1, maximum: 100 },
    contentScore: { type: "number", minimum: 1, maximum: 100 },
    deliveryScore: { type: "number", minimum: 1, maximum: 100 },
    nonVerbalScore: { type: "number", minimum: 1, maximum: 100 },
    strengths: { 
      type: "array", 
      items: { type: "string" }
    },
    improvements: { 
      type: "array", 
      items: { type: "string" }
    },
    recommendations: { type: "string" },
    questionScores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          score: { type: "number", minimum: 1, maximum: 100 },
          feedback: { type: "string" }
        }
      }
    },
    videoAnalysis: {
      type: "object",
      properties: {
        eyeContact: { type: "number", minimum: 1, maximum: 10 },
        facialExpressions: { type: "number", minimum: 1, maximum: 10 },
        bodyLanguage: { type: "number", minimum: 1, maximum: 10 },
        confidence: { type: "number", minimum: 1, maximum: 10 },
        recommendations: { type: "string" }
      }
    },
    audioAnalysis: {
      type: "object",
      properties: {
        clarity: { type: "number", minimum: 1, maximum: 10 },
        pace: { type: "number", minimum: 1, maximum: 10 },
        tone: { type: "number", minimum: 1, maximum: 10 },
        fillerWordsCount: { type: "number", minimum: 0 },
        recommendations: { type: "string" }
      }
    }
  },
  required: ["overallScore", "contentScore", "deliveryScore", "nonVerbalScore", 
            "strengths", "improvements", "recommendations"]
};