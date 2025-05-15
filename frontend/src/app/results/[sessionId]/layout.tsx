import AuthGuard from "@/components/AuthGuard";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "面试详细结果",
  description: "查看面试的详细结果分析、反馈和改进建议",
  keywords: ["面试结果", "面试评分", "面试分析", "面试反馈", "面试建议", "智能面试系统"],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
