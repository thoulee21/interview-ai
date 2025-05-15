import AuthGuard from "@/components/AuthGuard";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "用户管理",
  description: "管理员用户管理界面，用于查看和管理系统用户",
  keywords: ["管理员", "用户管理", "系统管理", "智能面试系统"],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireAdmin={true}>{children}</AuthGuard>;
}
