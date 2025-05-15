import AuthGuard from "@/components/AuthGuard";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "创建用户",
  description: "管理员创建新用户界面",
  keywords: ["管理员", "创建用户", "用户管理", "系统管理", "智能面试系统"],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireAdmin={true}>{children}</AuthGuard>;
}
