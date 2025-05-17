"use client";

import { authAPI } from "@/services/api";
import {
  ApartmentOutlined,
  DashboardOutlined,
  HomeOutlined,
  LoginOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, Layout, Menu, message } from "antd";
import type { ItemType, MenuItemType } from "antd/es/menu/interface";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const { Header } = Layout;

const ClientAppHeader = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [messageApi, contextHolder] = message.useMessage();

  // 在组件加载时检查登录状态
  useEffect(() => {
    const checkAuthStatus = () => {
      const authenticated = authAPI.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        setIsAdmin(authAPI.isAdmin());

        // 从localStorage获取用户信息
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            setUserName(user.username || "用户");
          }
        } catch (e) {
          console.error("获取用户信息失败:", e);
        }
      }
    };

    checkAuthStatus();
  }, [pathname]); // 当路径变化时重新检查

  // 处理用户登出
  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUserName("");
    messageApi.success("已成功退出登录");

    // 重定向到首页
    router.push("/");
  };

  // 设置固定样式，避免客户端和服务端渲染差异
  const headerStyle = useMemo(
    () =>
      ({
        position: "fixed",
        zIndex: 1000,
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 24px",
        transition: "all 0.3s ease",
        background: "linear-gradient(90deg, #1890ff 0%, #10239e 100%)",
        height: "64px",
      }) as React.CSSProperties,
    [],
  );

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

  // 根据用户登录状态决定显示的菜单项
  const getMenuItems = useCallback(() => {
    const baseItems: ItemType<MenuItemType>[] = [
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
    ];

    // 只有管理员才能看到管理后台菜单
    if (isAdmin) {
      baseItems.push({
        key: "admin",
        icon: <DashboardOutlined />,
        label: "管理后台",
        children: [
          {
            key: "/admin",
            icon: <UserOutlined />,
            label: <Link href="/admin">面试会话管理</Link>,
          },
          {
            key: "/admin/position-types",
            icon: <ApartmentOutlined />,
            label: <Link href="/admin/position-types">职位类型管理</Link>,
          },
          {
            key: "/admin/users",
            icon: <TeamOutlined />,
            label: <Link href="/admin/users">用户管理</Link>,
          },
          {
            key: "/admin/presets",
            icon: <SettingOutlined />,
            label: <Link href="/admin/presets">预设场景管理</Link>,
          },
        ],
      });
    }

    return baseItems;
  }, [isAdmin]);

  const menuItems = getMenuItems();

  // 用户下拉菜单选项
  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人资料",
      onClick: () => router.push("/profile"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  return (
    <Header className="site-header" style={headerStyle}>
      {contextHolder}
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

        {/* 用户认证相关组件 */}
        <div style={{ marginLeft: 16 }}>
          {isAuthenticated ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button
                type="text"
                icon={<UserOutlined />}
                style={{ color: "white" }}
              >
                {userName}
              </Button>
            </Dropdown>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                type="text"
                icon={<LoginOutlined />}
                style={{ color: "white" }}
                onClick={() => router.push("/login")}
              >
                登录
              </Button>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => router.push("/register")}
              >
                注册
              </Button>
            </div>
          )}
        </div>
      </div>
    </Header>
  );
};

export default ClientAppHeader;
