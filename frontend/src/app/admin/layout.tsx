import AuthGuard from "@/components/AuthGuard";
import type { Metadata } from "next/types";
import React from "react";

export const metadata: Metadata = {
  title: "管理后台",
  description: "管理员后台管理界面，用于系统配置和用户管理",
  keywords: ["管理员", "后台管理", "系统配置", "用户管理", "智能面试系统"],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireAdmin={true}>{children}</AuthGuard>;
}
