import React from 'react';
import { Typography, Row, Col, Button, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { FileTextOutlined, VideoCameraOutlined, SoundOutlined, RobotOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="text-center">
        <Title level={1}>智能模拟面试评测系统</Title>
        <Paragraph className="page-description">
          基于多模态AI技术，为高校学生提供专业的模拟面试体验与评测
        </Paragraph>
        <Button 
          type="primary" 
          size="large"
          onClick={() => navigate('/setup')}
        >
          开始体验
        </Button>
      </div>
      
      <Row gutter={[24, 24]} style={{ marginTop: '48px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            cover={<div style={{ padding: '24px', textAlign: 'center' }}><FileTextOutlined style={{ fontSize: '64px', color: '#1890ff' }} /></div>}
          >
            <Card.Meta 
              title="文本分析" 
              description="智能分析回答内容，评估专业度和相关性" 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            cover={<div style={{ padding: '24px', textAlign: 'center' }}><VideoCameraOutlined style={{ fontSize: '64px', color: '#1890ff' }} /></div>}
          >
            <Card.Meta 
              title="视频分析" 
              description="分析面部表情和肢体语言，评估自信度" 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            cover={<div style={{ padding: '24px', textAlign: 'center' }}><SoundOutlined style={{ fontSize: '64px', color: '#1890ff' }} /></div>}
          >
            <Card.Meta 
              title="语音分析" 
              description="分析语速、语调和清晰度，提升表达能力" 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            cover={<div style={{ padding: '24px', textAlign: 'center' }}><RobotOutlined style={{ fontSize: '64px', color: '#1890ff' }} /></div>}
          >
            <Card.Meta 
              title="AI评测" 
              description="基于讯飞星火大模型的全面智能评测与建议" 
            />
          </Card>
        </Col>
      </Row>
      
      <div style={{ marginTop: '48px' }}>
        <Title level={2} className="text-center">系统特点</Title>
        <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
          <Col xs={24} md={8}>
            <Title level={4}>真实模拟</Title>
            <Paragraph>
              模拟真实面试场景与问题，涵盖多种职业类型和面试难度，让你提前适应实际面试环境。
            </Paragraph>
          </Col>
          <Col xs={24} md={8}>
            <Title level={4}>多维度分析</Title>
            <Paragraph>
              全方位分析语言表达、回答内容、非语言行为等多个维度，提供全面的评价反馈。
            </Paragraph>
          </Col>
          <Col xs={24} md={8}>
            <Title level={4}>个性化建议</Title>
            <Paragraph>
              基于大模型分析，针对个人表现提供有针对性的改进建议，帮助持续提升面试技巧。
            </Paragraph>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default HomePage;