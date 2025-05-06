import { Breadcrumb } from "antd";
import Link from "next/link";
import React from "react";

interface InterviewBreadcrumbProps {
  currentStep: "setup" | "interview" | "results";
  sessionId?: string;
  questionIndex?: number;
  isComplete?: boolean;
}

/**
 * 面试流程面包屑导航组件
 * @param props - 组件属性
 * @param props.currentStep - 当前步骤名称: "setup", "interview", "results"
 * @param props.sessionId - 面试会话ID (可选，用于interview和results页面)
 * @param props.questionIndex - 当前问题索引 (仅用于interview页面)
 * @param props.isComplete - 面试是否已完成 (仅用于interview页面)
 * @returns 面包屑导航组件
 */
const InterviewBreadcrumb: React.FC<InterviewBreadcrumbProps> = ({
  currentStep,
  sessionId,
  questionIndex = 0,
  isComplete = false,
}) => {
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
      <Breadcrumb
        items={[
          {
            title: <Link href="/">首页</Link>,
          },
          {
            title:
              currentStepIndex >= 0 ? (
                <Link href="/setup">面试设置</Link>
              ) : (
                "面试设置"
              ),
          },
          ...(currentStepIndex >= 1 || currentStep === "interview"
            ? [
                {
                  title:
                    sessionId && currentStepIndex > 1 ? (
                      <Link href={`/interview/${sessionId}`}>
                        {interviewText}
                      </Link>
                    ) : (
                      interviewText
                    ),
                },
              ]
            : []),
          ...(currentStepIndex >= 2 || currentStep === "results"
            ? [
                {
                  title: "评估结果",
                },
              ]
            : []),
        ]}
      />
    </div>
  );
};

export default InterviewBreadcrumb;
