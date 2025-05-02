import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import AppHeader from './components/AppHeader';
import HomePage from './pages/HomePage';
import InterviewSetupPage from './pages/InterviewSetupPage';
import InterviewPage from './pages/InterviewPage';
import ResultPage from './pages/ResultPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

const { Content, Footer } = Layout;

function App() {
  return (
    <Layout className="layout">
      <AppHeader />
      <Content className="site-content">
        <div className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/setup" element={<InterviewSetupPage />} />
            <Route path="/interview/:sessionId" element={<InterviewPage />} />
            <Route path="/results/:sessionId" element={<ResultPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        智能模拟面试系统 ©{new Date().getFullYear()} 中国软件杯参赛作品
      </Footer>
    </Layout>
  );
}

export default App;