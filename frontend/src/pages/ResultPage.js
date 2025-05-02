import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Card, Col, Empty, List, Progress, Row, Spin, Statistic, Tag, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const ResultPage = () => {
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  
  // 模拟评估数据，在实际应用中应通过API获取
  const mockResults = {
    overallScore: 82,
    contentScore: 85,
    deliveryScore: 78,
    nonVerbalScore: 83,
    strengths: ['清晰表达核心技能', '回答结构合理', '专业知识扎实'],
    improvements: ['需要提高回答的简洁性', '可以提供更多具体的工作实例', '减少填充词的使用'],
    questionScores: [
      { question: '请简单介绍一下你自己以及你的专业背景。', score: 88, feedback: '介绍清晰全面，但略显冗长。建议更加突出核心优势和与职位相关的技能。' },
      { question: '请描述一个你在团队中解决复杂问题的经历。', score: 75, feedback: '案例选择恰当，但缺少具体的问题解决步骤和你的贡献。建议使用STAR法则来组织回答。' },
      { question: '你如何应对工作中的压力和截止日期？', score: 82, feedback: '你提到了一些有效的压力管理策略，回答较为全面。可以再增加一个具体的例子来说明这些策略的实际应用。' },
      { question: '你认为自己的优势和短板是什么？', score: 90, feedback: '非常好的自我认知，既坦诚承认了短板，又强调了如何积极改进。这是本次面试中表现最好的回答。' },
      { question: '你对这个职位有什么问题想问我们的吗？', score: 76, feedback: '提出的问题展示了对公司的一定了解，但可以准备更深入的问题，以展示你对行业和职位的研究。' },
    ],
    videoAnalysis: {
      eyeContact: 8.5,
      facialExpressions: 7.2,
      bodyLanguage: 6.8,
      confidence: 7.5,
    },
    audioAnalysis: {
      clarity: 8.2,
      pace: 7.5,
      tone: 8.0,
      fillerWordsCount: 4,
    },
    recommendations: '整体表现良好，特别是在专业知识展示方面。建议在今后的面试中更加注意简洁有力地表达核心观点，并准备更多具体的工作案例来支持你的能力陈述。此外，可以适当减少填充词的使用，保持更自然的面部表情和肢体语言，这将进一步提升你的整体表现。'
  };

  useEffect(() => {
    // 模拟从API获取数据
    const fetchResults = async () => {
      try {
        // 实际应用中应该调用真实API
        // const response = await axios.get(`http://localhost:5000/api/interview_results/${sessionId}`);
        // setResults(response.data);
        
        // 模拟API调用延迟
        setTimeout(() => {
          setResults(mockResults);
          setLoading(false);
        }, 1500);
      } catch (error) {
        console.error('获取面试结果失败:', error);
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);
  
  // 根据分数返回评价等级和颜色
  const getScoreLevel = (score) => {
    if (score >= 85) return { text: '优秀', color: 'green' };
    if (score >= 70) return { text: '良好', color: 'blue' };
    if (score >= 60) return { text: '合格', color: 'orange' };
    return { text: '需改进', color: 'red' };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <p style={{ marginTop: 20 }}>正在加载面试评估结果...</p>
      </div>
    );
  }
  
  if (!results) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Empty description="未找到面试结果" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2} className="text-center">面试评估结果</Title>
      <Paragraph className="text-center">
        基于多模态AI技术的综合分析评估
      </Paragraph>
      
      {/* 总体得分卡片 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Statistic 
              title="总体得分" 
              value={results.overallScore} 
              suffix={`/100 (${getScoreLevel(results.overallScore).text})`}
              valueStyle={{ color: getScoreLevel(results.overallScore).color }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Statistic 
              title="内容评分" 
              value={results.contentScore} 
              suffix="/100"
              valueStyle={{ color: getScoreLevel(results.contentScore).color }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Statistic 
              title="表达评分" 
              value={results.deliveryScore} 
              suffix="/100"
              valueStyle={{ color: getScoreLevel(results.deliveryScore).color }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Statistic 
              title="非语言表现" 
              value={results.nonVerbalScore} 
              suffix="/100"
              valueStyle={{ color: getScoreLevel(results.nonVerbalScore).color }}
            />
          </Col>
        </Row>
      </Card>
      
      {/* 优势和改进点 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="优势" extra={<CheckCircleOutlined style={{ color: '#52c41a' }} />}>
            <List
              dataSource={results.strengths}
              renderItem={item => (
                <List.Item>
                  <Text>✓ {item}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="需要改进" extra={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}>
            <List
              dataSource={results.improvements}
              renderItem={item => (
                <List.Item>
                  <Text>• {item}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 各问题得分 */}
      <Card title="各问题评估" style={{ marginBottom: 24 }}>
        <List
          itemLayout="vertical"
          dataSource={results.questionScores}
          renderItem={item => (
            <List.Item>
              <Text strong>{item.question}</Text>
              <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
                <Progress 
                  percent={item.score} 
                  size="small" 
                  status={item.score >= 60 ? "success" : "exception"}
                  style={{ flex: 1, marginRight: 16 }}
                />
                <Tag color={getScoreLevel(item.score).color}>{item.score}分</Tag>
              </div>
              <Text type="secondary">{item.feedback}</Text>
            </List.Item>
          )}
        />
      </Card>
      
      {/* 视频和音频分析 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="视频分析">
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>眼神接触</Text>
                <Text strong>{results.videoAnalysis.eyeContact}/10</Text>
              </div>
              <Progress percent={results.videoAnalysis.eyeContact * 10} size="small" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>面部表情</Text>
                <Text strong>{results.videoAnalysis.facialExpressions}/10</Text>
              </div>
              <Progress percent={results.videoAnalysis.facialExpressions * 10} size="small" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>肢体语言</Text>
                <Text strong>{results.videoAnalysis.bodyLanguage}/10</Text>
              </div>
              <Progress percent={results.videoAnalysis.bodyLanguage * 10} size="small" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>自信程度</Text>
                <Text strong>{results.videoAnalysis.confidence}/10</Text>
              </div>
              <Progress percent={results.videoAnalysis.confidence * 10} size="small" />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="音频分析">
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>清晰度</Text>
                <Text strong>{results.audioAnalysis.clarity}/10</Text>
              </div>
              <Progress percent={results.audioAnalysis.clarity * 10} size="small" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>语速</Text>
                <Text strong>{results.audioAnalysis.pace}/10</Text>
              </div>
              <Progress percent={results.audioAnalysis.pace * 10} size="small" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>语调</Text>
                <Text strong>{results.audioAnalysis.tone}/10</Text>
              </div>
              <Progress percent={results.audioAnalysis.tone * 10} size="small" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>填充词使用</Text>
                <Text strong>{results.audioAnalysis.fillerWordsCount} 次</Text>
              </div>
              <Progress 
                percent={(10 - Math.min(10, results.audioAnalysis.fillerWordsCount)) * 10} 
                size="small"
                status={results.audioAnalysis.fillerWordsCount <= 5 ? "success" : "exception"}
              />
            </div>
          </Card>
        </Col>
      </Row>
      
      {/* 整体建议 */}
      <Card title="改进建议" style={{ marginBottom: 24 }}>
        <Paragraph>{results.recommendations}</Paragraph>
      </Card>
    </div>
  );
};

export default ResultPage;