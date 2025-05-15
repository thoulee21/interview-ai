import AuthGuard from "@/components/AuthGuard";
import type { Metadata } from "next/types";
import React from "react";

export const metadata: Metadata = {
  title: "设置模拟面试",
  description: "选择你希望模拟的面试类型和难度，我们将为你创建个性化的面试体验",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
