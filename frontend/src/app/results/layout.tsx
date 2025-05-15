import AuthGuard from "@/components/AuthGuard";
import type { Metadata } from "next/types";
import React from "react";

export const metadata: Metadata = {
  title: "面试结果",
  description: "查看你的面试结果和反馈",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
