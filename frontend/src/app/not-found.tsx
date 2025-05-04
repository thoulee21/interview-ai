"use client";

import { Button, Result } from "antd";
import { useRouter } from "next/navigation";
import React from "react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
      <Result
        status="404"
        title="404 - 页面不存在"
        subTitle="抱歉，您访问的页面不存在或已被移动。"
        extra={[
          <Button 
            type="primary" 
            key="home" 
            onClick={() => router.push("/")}
          >
            返回首页
          </Button>,
          <Button 
            key="back" 
            onClick={() => router.back()}
          >
            返回上一页
          </Button>,
        ]}
      />
    </div>
  );
}