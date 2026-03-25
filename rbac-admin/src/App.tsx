import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import DepartmentPage from './pages/department/DepartmentPage';
import RolePage from './pages/role/RolePage';
import UserPage from './pages/user/UserPage';
import PositionPage from './pages/position/PositionPage';
import GradePage from './pages/grade/GradePage';
import MenuPage from './pages/menu/MenuPage';
import { useAuthStore } from './stores/authStore';

// 路由守卫：未登录重定向到 /login
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="departments" element={<DepartmentPage />} />
          <Route path="roles" element={<RolePage />} />
          <Route path="users" element={<UserPage />} />
          <Route path="positions" element={<PositionPage />} />
          <Route path="grades" element={<GradePage />} />
          <Route path="menus" element={<MenuPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
