import pkg from "@/../package.json";
import "@/app/index.css";
import AppLayout from "@/components/layout/AppLayout";
import "@ant-design/v5-patch-for-react-19";
import type { Metadata } from "next";
import Script from "next/script";
import React from "react";

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
      <Script id="microsoft-clarity-analytics">
        {`
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "rdpfluipqk");
        `}
      </Script>

      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
