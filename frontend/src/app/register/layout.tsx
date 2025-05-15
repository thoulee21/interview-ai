import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "用户注册",
  description: "注册智能模拟面试系统账户，开始你的面试准备之旅",
  keywords: ["用户注册", "注册", "创建账户", "智能面试系统", "面试准备"],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
