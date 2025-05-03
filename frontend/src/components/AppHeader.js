import React from "react";
import { Layout, Menu } from "antd";
import { Link, useLocation } from "react-router-dom";
import { HomeOutlined, SettingOutlined } from "@ant-design/icons";

const { Header } = Layout;

const AppHeader = () => {
  const location = useLocation();

  return (
    <Header className="site-header">
      <div className="logo">
        <h1>智能模拟面试系统</h1>
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        className="nav-menu"
      >
        <Menu.Item key="/" icon={<HomeOutlined />}>
          <Link to="/">首页</Link>
        </Menu.Item>
        <Menu.Item key="/setup" icon={<SettingOutlined />}>
          <Link to="/setup">开始面试</Link>
        </Menu.Item>
      </Menu>
    </Header>
  );
};

export default AppHeader;
