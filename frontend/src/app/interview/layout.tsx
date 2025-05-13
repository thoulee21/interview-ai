"use client";

import AuthGuard from "@/components/AuthGuard";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {children}
      <style jsx global>{`
        .interview-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .video-container {
          position: relative;
          width: 100%;
          height: 300px;
          overflow: hidden;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .video-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          background-color: #f0f0f0;
        }

        .text-center {
          text-align: center;
        }

        .recording-indicator {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.5);
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
        }

        .recording-dot {
          width: 12px;
          height: 12px;
          background-color: #ff4d4f;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 1;
          }
        }

        .markdown-content {
          line-height: 1.8;
        }
      `}</style>
    </AuthGuard>
  );
}
