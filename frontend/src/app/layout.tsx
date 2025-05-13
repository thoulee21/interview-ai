import pkg from "@/../package.json";
import "@/app/index.css";
import AppLayout from "@/components/layout/AppLayout";
import "@ant-design/v5-patch-for-react-19";
import Clarity from "@microsoft/clarity";
import type { Metadata } from "next";
import React from "react";

Clarity.init("rdpfluipqk");

export const metadata: Metadata = {
  title: "智能模拟面试系统",
  description: "中国软件杯参赛作品",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  authors: [pkg.author],
  abstract: "中国软件杯参赛作品",
  creator: pkg.author.name,
  keywords: [
    "中国软件杯",
    "智能模拟面试系统",
    "面试",
    "模拟面试",
    "AI",
    "人工智能",
    "面试助手",
  ],
  generator: "Next.js",
  publisher: pkg.author.name,
  applicationName: "智能模拟面试系统",
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
