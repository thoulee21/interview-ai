import AuthGuard from "@/components/AuthGuard";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireAdmin={true}>{children}</AuthGuard>;
}
