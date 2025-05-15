import { Layout } from "antd";
import dynamic from "next/dynamic";
import React from "react";

const { Header } = Layout;

// 动态导入客户端组件，避免服务端渲染
const ClientAppHeader = dynamic(() => import("./ClientAppHeader"), {
  ssr: false,
  loading: () => (
    <Header
      className="site-header"
      style={{
        position: "fixed",
        zIndex: 1000,
        width: "100%",
        height: "64px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 24px",
        background: "linear-gradient(90deg, #1890ff 0%, #10239e 100%)",
        boxShadow: "none",
      }}
    >
      <div className="logo" style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: 36,
            height: 36,
            background: "white",
            borderRadius: "50%",
          }}
        ></div>
        <span
          style={{
            margin: "0 0 0 8px",
            color: "white",
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          智能模拟面试系统
        </span>
      </div>
    </Header>
  ),
});

// 简化的App Header，避免水合不一致
const AppHeader: React.FC = () => {
  return <ClientAppHeader />;
};

export default AppHeader;
