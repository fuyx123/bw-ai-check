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
import MenuPage from './pages/menu/MenuPage';
import ExamPage from './pages/exam/ExamPage';
import GradingDetailPage from './pages/exam/GradingDetailPage';
import HomeworkPage from './pages/homework/HomeworkPage';
import HomeworkDetailPage from './pages/homework/HomeworkDetailPage';
import CyclePage from './pages/cycle/CyclePage';
import ModelPage from './pages/model/ModelPage';
import AuditLogPage from './pages/audit/AuditLogPage';
import { useAuthStore } from './stores/authStore';
import AccessDeniedPage from './pages/access/AccessDeniedPage';

const AuthBootstrap: React.FC = () => {
  const hydrateSession = useAuthStore((state) => state.hydrateSession);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  return null;
};

// 路由守卫：未登录重定向到 /login
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initializing = useAuthStore((s) => s.initializing);
  const location = useLocation();

  if (initializing) {
    return null;
  }

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
  const initializing = useAuthStore((state) => state.initializing);
  const location = useLocation();

  if (initializing) {
    return null;
  }
  const hasAccess = permissionCodes.some((code) => permissions.includes(code));

  if (!hasAccess) {
    return <Navigate to="/access-denied" replace state={{ pageName, from: location.pathname }} />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AntdApp>
    <BrowserRouter>
      <AuthBootstrap />
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
          <Route path="access-denied" element={<AccessDeniedPage />} />
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
            path="menus"
            element={
              <RequirePermission pageName="菜单管理" permissionCodes={['menu-menu', 'menu-menus']}>
                <MenuPage />
              </RequirePermission>
            }
          />
          <Route
            path="audit-logs"
            element={
              <RequirePermission pageName="审计日志" permissionCodes={['menu-audit']}>
                <AuditLogPage />
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
          <Route
            path="exam/papers/:id/grading"
            element={
              <RequirePermission pageName="阅卷明细" permissionCodes={['menu-exam']}>
                <GradingDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="homework"
            element={
              <RequirePermission pageName="作业审批" permissionCodes={['menu-homework-approval']}>
                <HomeworkPage />
              </RequirePermission>
            }
          />
          <Route
            path="homework/submissions/:id"
            element={
              <RequirePermission pageName="作业审批明细" permissionCodes={['menu-homework-approval']}>
                <HomeworkDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="cycles"
            element={
              <RequirePermission pageName="教学周期管理" permissionCodes={['menu-cycle']}>
                <CyclePage />
              </RequirePermission>
            }
          />
          <Route
            path="models"
            element={
              <RequirePermission pageName="模型管理" permissionCodes={['menu-model']}>
                <ModelPage />
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
