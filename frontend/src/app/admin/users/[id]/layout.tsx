import AuthGuard from "@/components/AuthGuard";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "用户详情",
  description: "查看和管理特定用户的详细信息",
  keywords: ["管理员", "用户详情", "用户管理", "系统管理", "智能面试系统"],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireAdmin={true}>{children}</AuthGuard>;
}
