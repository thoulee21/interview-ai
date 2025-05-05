// 帮助函数：从JSON字符串中提取评估信息并转换为Markdown格式
const formatEvaluationToMarkdown = (evaluationText: string) => {
  try {
    // 尝试提取JSON部分并解析
    const jsonMatch = evaluationText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : evaluationText;
    const data = JSON.parse(jsonStr.replace(/\n/g, " "));

    // 构建Markdown格式的评估内容
    let markdown = `## 评分：${data.score}/10\n\n`;

    if (data.strengths && Array.isArray(data.strengths)) {
      markdown += "### 优势\n";
      data.strengths.forEach((strength: string) => {
        markdown += `* ${strength}\n`;
      });
      markdown += "\n";
    }

    if (data.weaknesses && Array.isArray(data.weaknesses)) {
      markdown += "### 需要改进\n";
      data.weaknesses.forEach((weakness: string) => {
        markdown += `* ${weakness}\n`;
      });
      markdown += "\n";
    }

    if (data.suggestions) {
      markdown += "### 改进建议\n";
      markdown += data.suggestions + "\n\n";
    }

    if (data.feedback) {
      markdown += "### 总体评价\n";
      markdown += data.feedback;
    }

    return markdown;
  } catch (error) {
    // 如果解析失败，返回原始文本
    console.warn("评估结果解析失败:", error);
    return evaluationText;
  }
};

export default formatEvaluationToMarkdown;
