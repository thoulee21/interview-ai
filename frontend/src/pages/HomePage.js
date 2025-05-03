import {
  ArrowRightOutlined,
  BookOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  RobotOutlined,
  SoundOutlined,
  StarOutlined,
  TrophyOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Col,
  Rate,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const { Title, Paragraph, Text } = Typography;

const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 添加页面进入动画效果
    document.querySelectorAll(".animate-on-scroll").forEach((element) => {
      element.classList.add("animated");
    });

    const handleScroll = () => {
      const elements = document.querySelectorAll(
        ".animate-on-scroll:not(.animated)"
      );
      elements.forEach((element) => {
        const position = element.getBoundingClientRect();
        // 元素进入视口时添加动画类
        if (position.top < window.innerHeight - 150) {
          element.classList.add("animated");
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-page">
      {/* 英雄区域 */}
      <div
        className="hero-section"
        style={{
          background: "linear-gradient(120deg, #1890ff 0%, #10239e 100%)",
          padding: "80px 24px",
          borderRadius: "0 0 50px 50px",
          marginBottom: "60px",
          boxShadow: "0 10px 30px rgba(24, 144, 255, 0.2)",
        }}
      >
        <Row
          align="middle"
          justify="center"
          gutter={[48, 48]}
          style={{ maxWidth: "1200px", margin: "0 auto" }}
        >
          <Col xs={24} md={14} className="text-center animate-on-scroll">
            <Title
              style={{ color: "white", fontSize: "48px", marginBottom: "24px" }}
            >
              智能模拟面试评测系统
            </Title>
            <Paragraph
              style={{
                color: "rgba(255, 255, 255, 0.85)",
                fontSize: "20px",
                marginBottom: "40px",
              }}
            >
              基于多模态AI技术，为高校学生提供专业的模拟面试体验与评测
              <br />
              大数据驱动，助力职场竞争力提升
            </Paragraph>
            <Space size="large">
              <Button
                type="primary"
                size="large"
                onClick={() => navigate("/setup")}
                style={{
                  height: "50px",
                  padding: "0 32px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  borderRadius: "25px",
                  background: "white",
                  color: "#1890ff",
                  border: "none",
                  boxShadow: "0 8px 16px rgba(255, 255, 255, 0.3)",
                }}
              >
                立即体验 <ArrowRightOutlined />
              </Button>
              <Button
                type="default"
                ghost
                size="large"
                onClick={() =>
                  document
                    .getElementById("features")
                    .scrollIntoView({ behavior: "smooth" })
                }
                style={{
                  height: "50px",
                  padding: "0 32px",
                  fontSize: "18px",
                  borderRadius: "25px",
                  color: "white",
                  borderColor: "white",
                }}
              >
                了解更多
              </Button>
            </Space>
          </Col>
          <Col xs={24} md={10} className="animate-on-scroll">
            <div
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                borderRadius: "24px",
                padding: "30px",
                backdropFilter: "blur(10px)",
                boxShadow: "0 15px 30px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div className="feature-highlight">
                <Space direction="vertical" size={20} style={{ width: "100%" }}>
                  <Space>
                    <Avatar
                      size={64}
                      icon={<RobotOutlined />}
                      style={{ background: "#1890ff" }}
                    />
                    <div>
                      <Text
                        style={{
                          color: "white",
                          fontSize: "20px",
                          fontWeight: "bold",
                          display: "block",
                        }}
                      >
                        讯飞星火大模型
                      </Text>
                      <Text style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                        业界领先的AI技术支持
                      </Text>
                    </div>
                  </Space>

                  <Space>
                    <Avatar
                      size={64}
                      icon={<VideoCameraOutlined />}
                      style={{ background: "#1890ff" }}
                    />
                    <div>
                      <Text
                        style={{
                          color: "white",
                          fontSize: "20px",
                          fontWeight: "bold",
                          display: "block",
                        }}
                      >
                        多模态分析技术
                      </Text>
                      <Text style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                        同时分析视频、语音和文本内容
                      </Text>
                    </div>
                  </Space>

                  <Space>
                    <Avatar
                      size={64}
                      icon={<FileProtectOutlined />}
                      style={{ background: "#1890ff" }}
                    />
                    <div>
                      <Text
                        style={{
                          color: "white",
                          fontSize: "20px",
                          fontWeight: "bold",
                          display: "block",
                        }}
                      >
                        专业评测报告
                      </Text>
                      <Text style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                        多维度数据分析和改进建议
                      </Text>
                    </div>
                  </Space>
                </Space>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* 数据亮点 */}
      <div
        className="stats-section animate-on-scroll"
        style={{ marginBottom: "60px" }}
      >
        <Row
          gutter={[24, 24]}
          justify="center"
          style={{ maxWidth: "1200px", margin: "0 auto" }}
        >
          <Col xs={12} sm={6}>
            <Card
              bordered={false}
              style={{
                textAlign: "center",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              }}
            >
              <Statistic
                title="准确度"
                value={97.8}
                suffix="%"
                valueStyle={{ color: "#1890ff", fontWeight: "bold" }}
              />
              <Paragraph
                style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}
              >
                面试评估准确率
              </Paragraph>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              bordered={false}
              style={{
                textAlign: "center",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              }}
            >
              <Statistic
                title="岗位覆盖"
                value={50}
                suffix="+"
                valueStyle={{ color: "#52c41a", fontWeight: "bold" }}
              />
              <Paragraph
                style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}
              >
                不同职业类别
              </Paragraph>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              bordered={false}
              style={{
                textAlign: "center",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              }}
            >
              <Statistic
                title="满意度"
                value={96.2}
                suffix="%"
                valueStyle={{ color: "#fa8c16", fontWeight: "bold" }}
              />
              <Paragraph
                style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}
              >
                用户评价满意度
              </Paragraph>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              bordered={false}
              style={{
                textAlign: "center",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              }}
            >
              <Statistic
                title="推荐率"
                value={94.5}
                suffix="%"
                valueStyle={{ color: "#722ed1", fontWeight: "bold" }}
              />
              <Paragraph
                style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}
              >
                用户推荐率
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 核心功能展示 */}
      <div
        id="features"
        className="features-section animate-on-scroll"
        style={{ marginBottom: "80px" }}
      >
        <Title
          level={2}
          className="text-center"
          style={{
            marginBottom: "48px",
            position: "relative",
            fontSize: "32px",
            fontWeight: "bold",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "4px",
              background: "#1890ff",
              margin: "0 auto 16px",
              borderRadius: "2px",
            }}
          />
          核心功能
        </Title>
        <Row gutter={[32, 32]} style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              className="feature-card"
              style={{
                height: "100%",
                borderRadius: "16px",
                boxShadow: "0 10px 20px rgba(0, 0, 0, 0.05)",
                transition: "all 0.3s ease",
              }}
              cover={
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    background:
                      "linear-gradient(120deg, #e6f7ff 0%, #bae7ff 100%)",
                  }}
                >
                  <FileTextOutlined
                    style={{ fontSize: "72px", color: "#1890ff" }}
                  />
                </div>
              }
            >
              <Card.Meta
                title={
                  <span style={{ fontSize: "20px", fontWeight: "bold" }}>
                    文本分析
                  </span>
                }
                description={
                  <Paragraph style={{ fontSize: "14px", marginTop: "16px" }}>
                    智能分析回答内容，评估专业度、逻辑性和相关性，为您提供专业面试官级别的评价
                  </Paragraph>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              className="feature-card"
              style={{
                height: "100%",
                borderRadius: "16px",
                boxShadow: "0 10px 20px rgba(0, 0, 0, 0.05)",
                transition: "all 0.3s ease",
              }}
              cover={
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    background:
                      "linear-gradient(120deg, #f0f5ff 0%, #d6e4ff 100%)",
                  }}
                >
                  <VideoCameraOutlined
                    style={{ fontSize: "72px", color: "#2f54eb" }}
                  />
                </div>
              }
            >
              <Card.Meta
                title={
                  <span style={{ fontSize: "20px", fontWeight: "bold" }}>
                    视频分析
                  </span>
                }
                description={
                  <Paragraph style={{ fontSize: "14px", marginTop: "16px" }}>
                    分析面部表情、眼神接触和肢体语言，评估自信度和专业形象，全方位提升非语言表达能力
                  </Paragraph>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              className="feature-card"
              style={{
                height: "100%",
                borderRadius: "16px",
                boxShadow: "0 10px 20px rgba(0, 0, 0, 0.05)",
                transition: "all 0.3s ease",
              }}
              cover={
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    background:
                      "linear-gradient(120deg, #fff7e6 0%, #ffe7ba 100%)",
                  }}
                >
                  <SoundOutlined
                    style={{ fontSize: "72px", color: "#fa8c16" }}
                  />
                </div>
              }
            >
              <Card.Meta
                title={
                  <span style={{ fontSize: "20px", fontWeight: "bold" }}>
                    语音分析
                  </span>
                }
                description={
                  <Paragraph style={{ fontSize: "14px", marginTop: "16px" }}>
                    分析语速、语调、清晰度和填充词使用，提升口头表达能力，增强表达的专业性和感染力
                  </Paragraph>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              className="feature-card"
              style={{
                height: "100%",
                borderRadius: "16px",
                boxShadow: "0 10px 20px rgba(0, 0, 0, 0.05)",
                transition: "all 0.3s ease",
              }}
              cover={
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    background:
                      "linear-gradient(120deg, #f9f0ff 0%, #efdbff 100%)",
                  }}
                >
                  <RobotOutlined
                    style={{ fontSize: "72px", color: "#722ed1" }}
                  />
                </div>
              }
            >
              <Card.Meta
                title={
                  <span style={{ fontSize: "20px", fontWeight: "bold" }}>
                    AI评测
                  </span>
                }
                description={
                  <Paragraph style={{ fontSize: "14px", marginTop: "16px" }}>
                    基于讯飞星火大模型的全面智能评测与建议，提供个性化的面试技巧和能力提升方案
                  </Paragraph>
                }
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 系统特点 */}
      <div
        className="advantages-section animate-on-scroll"
        style={{
          background: "#f5f8ff",
          padding: "80px 24px",
          marginBottom: "80px",
          borderRadius: "30px",
        }}
      >
        <Title
          level={2}
          className="text-center"
          style={{
            marginBottom: "48px",
            position: "relative",
            fontSize: "32px",
            fontWeight: "bold",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "4px",
              background: "#1890ff",
              margin: "0 auto 16px",
              borderRadius: "2px",
            }}
          />
          系统特点
        </Title>
        <Row gutter={[48, 48]} style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Col xs={24} md={8} className="animate-on-scroll">
            <div style={{ textAlign: "center" }}>
              <Avatar
                icon={<UserOutlined />}
                style={{
                  background: "#1890ff",
                  fontSize: "28px",
                  marginBottom: "24px",
                }}
                size={80}
              />
              <Title
                level={3}
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  marginBottom: "16px",
                }}
              >
                真实模拟
              </Title>
              <Paragraph style={{ fontSize: "16px", lineHeight: "1.8" }}>
                模拟真实面试场景与问题，涵盖多种职业类型和面试难度，针对不同岗位特点生成专业问题，让你提前适应实际面试环境，充分准备从容应对。
              </Paragraph>
            </div>
          </Col>
          <Col xs={24} md={8} className="animate-on-scroll">
            <div style={{ textAlign: "center" }}>
              <Avatar
                icon={<BookOutlined />}
                style={{
                  background: "#52c41a",
                  fontSize: "28px",
                  marginBottom: "24px",
                }}
                size={80}
              />
              <Title
                level={3}
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  marginBottom: "16px",
                }}
              >
                多维度分析
              </Title>
              <Paragraph style={{ fontSize: "16px", lineHeight: "1.8" }}>
                全方位分析语言表达、专业内容、非语言行为等多个维度，通过数据可视化展示个人表现，提供全面而精准的评价反馈，找出关键优势与不足。
              </Paragraph>
            </div>
          </Col>
          <Col xs={24} md={8} className="animate-on-scroll">
            <div style={{ textAlign: "center" }}>
              <Avatar
                icon={<StarOutlined />}
                style={{
                  background: "#fa8c16",
                  fontSize: "28px",
                  marginBottom: "24px",
                }}
                size={80}
              />
              <Title
                level={3}
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  marginBottom: "16px",
                }}
              >
                个性化建议
              </Title>
              <Paragraph style={{ fontSize: "16px", lineHeight: "1.8" }}>
                基于大模型分析，针对个人表现提供有针对性的改进建议，结合心理学和沟通学理论，形成个性化提升方案，帮助持续提升面试技巧和职场竞争力。
              </Paragraph>
            </div>
          </Col>
        </Row>
      </div>

      {/* 中国软件杯大赛项目 */}
      <div
        className="competition-section animate-on-scroll"
        style={{
          background: "linear-gradient(120deg, #fff8e6 0%, #fff1b8 100%)",
          padding: "60px 24px",
          borderRadius: "30px",
          marginBottom: "80px",
          boxShadow: "0 10px 30px rgba(250, 219, 95, 0.2)",
        }}
      >
        <Row
          align="middle"
          gutter={[40, 40]}
          style={{ maxWidth: "1200px", margin: "0 auto" }}
        >
          <Col xs={24} md={6} className="text-center">
            <div
              style={{
                background: "white",
                borderRadius: "50%",
                width: "180px",
                height: "180px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
                boxShadow: "0 15px 30px rgba(250, 173, 20, 0.2)",
              }}
            >
              <TrophyOutlined style={{ fontSize: "100px", color: "#faad14" }} />
            </div>
          </Col>
          <Col xs={24} md={18}>
            <Title
              level={2}
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#873800",
                marginBottom: "24px",
              }}
            >
              中国软件杯大赛项目
            </Title>
            <div style={{ marginBottom: "20px" }}>
              <Tag
                color="#1677ff"
                style={{
                  fontSize: "16px",
                  padding: "6px 12px",
                  borderRadius: "16px",
                  fontWeight: "bold",
                }}
              >
                A组赛题
              </Tag>
              <Tag
                color="#52c41a"
                style={{
                  fontSize: "16px",
                  padding: "6px 12px",
                  borderRadius: "16px",
                  marginLeft: "12px",
                  fontWeight: "bold",
                }}
              >
                2025年度
              </Tag>
              <Tag
                color="#722ed1"
                style={{
                  fontSize: "16px",
                  padding: "6px 12px",
                  borderRadius: "16px",
                  marginLeft: "12px",
                  fontWeight: "bold",
                }}
              >
                科大讯飞出题
              </Tag>
            </div>
            <Paragraph
              style={{ fontSize: "16px", lineHeight: "1.8", color: "#5c3c00" }}
            >
              本项目基于第十四届中国软件杯大赛"面向高校学生的多模态智能模拟面试评测智能体开发"赛题进行设计与实现。
              旨在帮助高校学生提升面试能力，通过多模态技术实现对面试过程的全方位评测，从而增强就业竞争力。
            </Paragraph>
            <Paragraph
              style={{ fontSize: "16px", lineHeight: "1.8", color: "#5c3c00" }}
            >
              <strong style={{ fontSize: "18px" }}>技术特点：</strong>{" "}
              采用科大讯飞星火大模型作为核心AI引擎，结合文本、语音和视频多模态分析技术，
              通过WebRTC采集用户面试实况，应用深度学习算法进行情感与行为分析，提供专业、全面的面试评测服务。
            </Paragraph>
          </Col>
        </Row>
      </div>

      {/* 用户评价 */}
      <div
        className="testimonials-section animate-on-scroll"
        style={{ marginBottom: "80px" }}
      >
        <Title
          level={2}
          className="text-center"
          style={{
            marginBottom: "48px",
            position: "relative",
            fontSize: "32px",
            fontWeight: "bold",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "4px",
              background: "#1890ff",
              margin: "0 auto 16px",
              borderRadius: "2px",
            }}
          />
          用户评价
        </Title>
        <Row gutter={[24, 24]} style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Col xs={24} md={8}>
            <Card
              style={{
                borderRadius: "16px",
                boxShadow: "0 10px 20px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <Avatar
                  size={50}
                  icon={<UserOutlined />}
                  style={{ background: "#1890ff" }}
                />
                <div style={{ marginLeft: "16px" }}>
                  <Text
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      display: "block",
                    }}
                  >
                    王同学
                  </Text>
                  <Text type="secondary">计算机科学专业</Text>
                </div>
              </div>
              <Rate
                disabled
                defaultValue={5}
                style={{ fontSize: "16px", marginBottom: "12px" }}
              />
              <Paragraph style={{ fontSize: "14px", lineHeight: "1.8" }}>
                "这个系统帮助我发现了在面试中的一些盲点，尤其是我不自觉的肢体动作和语言习惯。通过有针对性的练习，我最终成功拿到了心仪公司的offer！"
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              style={{
                borderRadius: "16px",
                boxShadow: "0 10px 20px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <Avatar
                  size={50}
                  icon={<UserOutlined />}
                  style={{ background: "#52c41a" }}
                />
                <div style={{ marginLeft: "16px" }}>
                  <Text
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      display: "block",
                    }}
                  >
                    李同学
                  </Text>
                  <Text type="secondary">金融学专业</Text>
                </div>
              </div>
              <Rate
                disabled
                defaultValue={5}
                style={{ fontSize: "16px", marginBottom: "12px" }}
              />
              <Paragraph style={{ fontSize: "14px", lineHeight: "1.8" }}>
                "系统的问题非常专业，几乎覆盖了我在真实面试中遇到的所有问题类型。评测报告详细而具体，给了我很大的帮助，让我在面试中更加自信。"
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              style={{
                borderRadius: "16px",
                boxShadow: "0 10px 20px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <Avatar
                  size={50}
                  icon={<UserOutlined />}
                  style={{ background: "#722ed1" }}
                />
                <div style={{ marginLeft: "16px" }}>
                  <Text
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      display: "block",
                    }}
                  >
                    赵老师
                  </Text>
                  <Text type="secondary">就业指导中心</Text>
                </div>
              </div>
              <Rate
                disabled
                defaultValue={5}
                style={{ fontSize: "16px", marginBottom: "12px" }}
              />
              <Paragraph style={{ fontSize: "14px", lineHeight: "1.8" }}>
                "我们学校就业指导中心引入这个系统后，学生的面试通过率显著提高。系统的多模态分析能力非常专业，真正帮助学生发现并改进面试中的不足。"
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 行动召唤 */}
      <div
        className="cta-section animate-on-scroll"
        style={{
          background: "linear-gradient(120deg, #1890ff 0%, #10239e 100%)",
          padding: "60px 24px",
          borderRadius: "30px",
          textAlign: "center",
          marginBottom: "60px",
        }}
      >
        <Title
          level={2}
          style={{
            color: "white",
            marginBottom: "24px",
            fontSize: "32px",
            fontWeight: "bold",
          }}
        >
          准备好提升你的面试技巧了吗？
        </Title>
        <Paragraph
          style={{
            color: "rgba(255, 255, 255, 0.85)",
            fontSize: "18px",
            marginBottom: "40px",
            maxWidth: "800px",
            margin: "0 auto 40px",
          }}
        >
          立即体验我们的智能模拟面试系统，获得专业的评测和建议，提高你的就业竞争力！
        </Paragraph>
        <Button
          type="primary"
          size="large"
          onClick={() => navigate("/setup")}
          style={{
            height: "50px",
            padding: "0 40px",
            fontSize: "18px",
            fontWeight: "bold",
            borderRadius: "25px",
            background: "white",
            color: "#1890ff",
            border: "none",
            boxShadow: "0 8px 16px rgba(255, 255, 255, 0.3)",
          }}
        >
          开始你的模拟面试 <ArrowRightOutlined />
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
