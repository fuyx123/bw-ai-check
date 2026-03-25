import React from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';

const { Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={240}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'auto',
        }}
        className="sidebar"
      >
        <Sidebar />
      </Sider>
      <Layout style={{ marginLeft: 240 }}>
        <Layout.Header
          style={{
            padding: 0,
            background: '#fff',
            height: 64,
            lineHeight: '64px',
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <Header />
        </Layout.Header>
        <Content className="main-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
