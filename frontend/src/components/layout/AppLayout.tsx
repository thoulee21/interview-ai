"use client";

import pkg from "@/../package.json";
import AppHeader from "@/components/layout/AppHeader";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "@ant-design/v5-patch-for-react-19";
import { Layout } from "antd";
import Link from "next/link";
import React, { useMemo } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { Footer } = Layout;

  const year = useMemo(() => new Date().getFullYear(), []);

  const [version, author] = useMemo(() => {
    return [pkg.version, pkg.author];
  }, []);

  return (
    <AntdRegistry>
      <Layout className="layout">
        <AppHeader />

        <div
          className="site-content"
          style={{
            // 保证内容区域至少占满视窗高度减去头部和底部高度
            minHeight: "calc(100vh - 134px)",
          }}
        >
          <div
            className="container"
            style={{
              maxWidth: "1200px",
              marginTop: "74px",
              marginBottom: "24px",
            }}
          >
            {children}
          </div>
        </div>

        <Footer
          style={{
            textAlign: "center",
            backgroundColor: "#f0f2f5",
          }}
        >
          智能模拟面试系统 v{version} ©{year}{" "}
          <Link href={author.url} target="_blank" rel="noopener noreferrer">
            {author.name}
          </Link>
        </Footer>
      </Layout>
    </AntdRegistry>
  );
}
