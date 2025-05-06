"use client";

import { authAPI } from "@/services/api";
import { Button, Result, Spin } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthGuard({
  children,
  requireAdmin = false,
}: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      // 检查是否登录
      const isAuthenticated = authAPI.isAuthenticated();

      if (!isAuthenticated) {
        router.push(
          `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
        );
        return;
      }

      // 如果需要管理员权限，进一步检查
      if (requireAdmin) {
        const isAdmin = authAPI.isAdmin();
        if (!isAdmin) {
          setIsAuthorized(false);
          return;
        }
      }

      setIsAuthorized(true);
    };

    checkAuth();
  }, [router, requireAdmin]);

  // 加载状态
  if (isAuthorized === null) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Spin size="large" tip="验证权限中..." fullscreen />
      </div>
    );
  }

  // 无权限状态（仅用于管理员页面）
  if (requireAdmin && !isAuthorized) {
    return (
      <Result
        status="403"
        title="无权访问"
        subTitle="您没有访问此页面的权限"
        extra={
          <Button type="primary" onClick={() => router.push("/")}>
            返回首页
          </Button>
        }
      />
    );
  }

  // 有权限状态
  return <>{children}</>;
}
