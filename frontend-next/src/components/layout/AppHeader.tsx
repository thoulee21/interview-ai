"use client";

import {
  ApartmentOutlined,
  DashboardOutlined,
  HomeOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Layout, Menu } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

const { Header } = Layout;

const AppHeader = () => {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 根据页面滚动状态动态设置Header样式
  const headerStyle = {
    position: "fixed",
    zIndex: 1000,
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 24px",
    transition: "all 0.3s ease",
    background: "linear-gradient(90deg, #1890ff 0%, #10239e 100%)",
    boxShadow: scrolled ? "0 2px 8px rgba(0, 0, 0, 0.15)" : "none",
  } as React.CSSProperties;

  const logoStyle = {
    display: "flex",
    alignItems: "center",
  };

  const logoTextStyle = {
    margin: "0 0 0 8px",
    color: "white",
    fontSize: "20px",
    fontWeight: "bold",
  };

  const menuItems = [
    {
      key: "/",
      icon: <HomeOutlined />,
      label: <Link href="/">首页</Link>,
    },
    {
      key: "/setup",
      icon: <SettingOutlined />,
      label: <Link href="/setup">开始面试</Link>,
    },
    {
      key: "admin",
      icon: <DashboardOutlined />,
      label: "管理后台",
      children: [
        {
          key: "/admin",
          label: <Link href="/admin">面试会话管理</Link>,
        },
        {
          key: "/admin/position-types",
          icon: <ApartmentOutlined />,
          label: <Link href="/admin/position-types">职位类型管理</Link>,
        },
      ],
    },
  ];

  return (
    <Header
      className={`site-header ${scrolled ? "scrolled" : ""}`}
      style={headerStyle}
    >
      <div className="logo" style={logoStyle}>
        <Link href="/">
          <Avatar
            size={36}
            icon={<UserOutlined />}
            style={{
              background: "white",
              color: "#1890ff",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          />
          <span style={logoTextStyle}>智能模拟面试系统</span>
        </Link>
      </div>

      {/* 桌面导航菜单 */}
      <div
        className="desktop-menu"
        style={{ display: "flex", alignItems: "center" }}
      >
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[pathname]}
          className="nav-menu"
          style={{
            background: "transparent",
            borderBottom: "none",
            minWidth: "400px",
          }}
          items={menuItems}
        />
      </div>
    </Header>
  );
};

export default AppHeader;
