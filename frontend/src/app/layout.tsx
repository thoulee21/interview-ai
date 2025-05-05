import "@/app/index.css";
import "@ant-design/v5-patch-for-react-19";
import Clarity from "@microsoft/clarity";
import type { Metadata } from "next";
import React from "react";
import AppLayout from "@/components/layout/AppLayout";

Clarity.init("rdpfluipqk");

export const metadata: Metadata = {
  title: "智能模拟面试系统",
  description: "中国软件杯参赛作品",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
