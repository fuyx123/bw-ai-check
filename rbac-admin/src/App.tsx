import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import { setMessageInstance } from './utils/message';

/** 将 App.useApp() 的 message 注入全局 holder */
const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { message } = AntdApp.useApp();
  useEffect(() => {
    setMessageInstance(message);
  }, [message]);
  return <>{children}</>;
};
import MainLayout from './components/Layout/MainLayout';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import DepartmentPage from './pages/department/DepartmentPage';
import RolePage from './pages/role/RolePage';
import UserPage from './pages/user/UserPage';
import PositionPage from './pages/position/PositionPage';
import GradePage from './pages/grade/GradePage';
import MenuPage from './pages/menu/MenuPage';
import ExamPage from './pages/exam/ExamPage';
import { useAuthStore } from './stores/authStore';
import AccessDeniedPage from './pages/access/AccessDeniedPage';

// 路由守卫：未登录重定向到 /login
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const RequirePermission: React.FC<{
  pageName: string;
  permissionCodes: string[];
  children: React.ReactNode;
}> = ({ pageName, permissionCodes, children }) => {
  const permissions = useAuthStore((state) => state.permissions);
  const hasAccess = permissionCodes.some((code) => permissions.includes(code));

  if (!hasAccess) {
    return <AccessDeniedPage pageName={pageName} />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AntdApp>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<MessageProvider><LoginPage /></MessageProvider>} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <MessageProvider>
                <MainLayout />
              </MessageProvider>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="departments"
            element={
              <RequirePermission pageName="部门管理" permissionCodes={['menu-dept']}>
                <DepartmentPage />
              </RequirePermission>
            }
          />
          <Route
            path="roles"
            element={
              <RequirePermission pageName="角色管理" permissionCodes={['menu-role', 'menu-roles']}>
                <RolePage />
              </RequirePermission>
            }
          />
          <Route
            path="users"
            element={
              <RequirePermission pageName="用户管理" permissionCodes={['menu-user', 'menu-users']}>
                <UserPage />
              </RequirePermission>
            }
          />
          <Route
            path="positions"
            element={
              <RequirePermission pageName="职位管理" permissionCodes={['menu-position', 'menu-positions']}>
                <PositionPage />
              </RequirePermission>
            }
          />
          <Route
            path="grades"
            element={
              <RequirePermission pageName="职级管理" permissionCodes={['menu-grade', 'menu-grades']}>
                <GradePage />
              </RequirePermission>
            }
          />
          <Route
            path="menus"
            element={
              <RequirePermission pageName="菜单管理" permissionCodes={['menu-menu', 'menu-menus']}>
                <MenuPage />
              </RequirePermission>
            }
          />
          <Route
            path="exam"
            element={
              <RequirePermission pageName="阅卷管理" permissionCodes={['menu-exam']}>
                <ExamPage />
              </RequirePermission>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
    </AntdApp>
  );
};

export default App;
