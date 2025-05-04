import { Layout } from "antd";
import React from "react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import AppHeader from "./components/AppHeader";
import AdminPage from "./pages/AdminPage";
import AdminSessionDetailPage from "./pages/AdminSessionDetailPage";
import HomePage from "./pages/HomePage";
import InterviewPage from "./pages/InterviewPage";
import InterviewSetupPage from "./pages/InterviewSetupPage";
import NotFoundPage from "./pages/NotFoundPage";
import PositionTypeDetailPage from "./pages/PositionTypeDetailPage";
import PositionTypesPage from "./pages/PositionTypesPage";
import ResultPage from "./pages/ResultPage";

const { Footer } = Layout;

function App() {
  return (
    <Layout className="layout">
      <AppHeader />
      <div className="site-content">
        <div className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/setup" element={<InterviewSetupPage />} />
            <Route path="/interview/:sessionId" element={<InterviewPage />} />
            <Route path="/results/:sessionId" element={<ResultPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route
              path="/admin/sessions/:sessionId"
              element={<AdminSessionDetailPage />}
            />
            <Route
              path="/admin/position-types"
              element={<PositionTypesPage />}
            />
            <Route
              path="/admin/position-types/create"
              element={<PositionTypeDetailPage />}
            />
            <Route
              path="/admin/position-types/:id"
              element={<PositionTypeDetailPage />}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
      <Footer
        style={{
          textAlign: "center",
          marginTop: "6px",
        }}
      >
        智能模拟面试系统 ©{new Date().getFullYear()} 中国软件杯参赛作品
      </Footer>
    </Layout>
  );
}

export default App;
