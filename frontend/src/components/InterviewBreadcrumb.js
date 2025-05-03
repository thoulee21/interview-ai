import { Breadcrumb } from "antd";
import React from "react";
import { Link } from "react-router-dom";

/**
 * 面试流程面包屑导航组件
 * @param {Object} props - 组件属性
 * @param {String} props.currentStep - 当前步骤名称: "setup", "interview", "results"
 * @param {String} props.sessionId - 面试会话ID (可选，用于interview和results页面)
 * @param {Number} props.questionIndex - 当前问题索引 (仅用于interview页面)
 * @param {Boolean} props.isComplete - 面试是否已完成 (仅用于interview页面)
 * @returns {JSX.Element} 面包屑导航组件
 */
const InterviewBreadcrumb = ({ currentStep, sessionId, questionIndex, isComplete }) => {
  // 确定当前步骤的索引
  const steps = ["setup", "interview", "results"];
  const currentStepIndex = steps.indexOf(currentStep);
  
  // 根据面试阶段动态调整导航文案
  let interviewText = "面试进行中";
  if (currentStep === "interview" && isComplete) {
    interviewText = "面试已完成";
  } else if (currentStep === "interview" && questionIndex > 0) {
    interviewText = `问题 ${questionIndex + 1}`;
  }

  return (
    <div className="interview-breadcrumb" style={{ margin: "16px 0 24px" }}>
      <Breadcrumb>
        <Breadcrumb.Item>
          <Link to="/">首页</Link>
        </Breadcrumb.Item>
        
        <Breadcrumb.Item>
          {currentStepIndex >= 0 ? (
            <Link to="/setup">面试设置</Link>
          ) : (
            "面试设置"
          )}
        </Breadcrumb.Item>
        
        {(currentStepIndex >= 1 || currentStep === "interview") && (
          <Breadcrumb.Item>
            {sessionId && currentStepIndex > 1 ? (
              <Link to={`/interview/${sessionId}`}>{interviewText}</Link>
            ) : (
              interviewText
            )}
          </Breadcrumb.Item>
        )}
        
        {(currentStepIndex >= 2 || currentStep === "results") && (
          <Breadcrumb.Item>评估结果</Breadcrumb.Item>
        )}
      </Breadcrumb>
    </div>
  );
};

export default InterviewBreadcrumb;