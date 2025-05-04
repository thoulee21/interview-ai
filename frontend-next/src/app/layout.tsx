"use client";

import AppHeader from "@/components/layout/AppHeader";
import "@ant-design/v5-patch-for-react-19";
import Clarity from "@microsoft/clarity";
import { Layout } from "antd";
import React from "react";
import "./index.css";

Clarity.init("rdpfluipqk");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { Footer } = Layout;

  return (
    <html lang="zh-CN">
      <body>
        <Layout className="layout">
          <AppHeader />
          <div
            className="site-content"
            style={{
              minHeight: "calc(100vh - 134px)", // 保证内容区域至少占满视窗高度减去头部和底部高度
            }}
          >
            <div
              className="container"
              style={{ maxWidth: "1200px", marginTop: 80 }}
            >
              {children}
            </div>
          </div>
          <Footer
            style={{
              textAlign: "center",
              marginTop: "6px",
            }}
          >
            智能模拟面试系统 ©{new Date().getFullYear()} 中国软件杯参赛作品
          </Footer>
        </Layout>
      </body>
    </html>
  );
}
