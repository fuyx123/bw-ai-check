import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Button, Modal } from 'antd';
import {
  DashboardOutlined,
  ApartmentOutlined,
  TeamOutlined,
  UserOutlined,
  BarChartOutlined,
  MenuOutlined,
  LogoutOutlined,
  BookOutlined,
  SolutionOutlined,
  SettingOutlined,
  AppstoreOutlined,
  SafetyOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useMenuStore } from '../../stores/menuStore';
import { useAuthStore } from '../../stores/authStore';

type NavMenuItem = Required<MenuProps>['items'][number];

const iconMap: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  ApartmentOutlined: <ApartmentOutlined />,
  TeamOutlined: <TeamOutlined />,
  UserOutlined: <UserOutlined />,
  SolutionOutlined: <SolutionOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  MenuOutlined: <MenuOutlined />,
  SettingOutlined: <SettingOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  ToolOutlined: <ToolOutlined />,
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { menus } = useMenuStore();
  const { permissions, logout } = useAuthStore();

  // 从 store 动态生成导航项：仅 type=menu + visible + 用户有权限 + 根菜单
  const navItems: NavMenuItem[] = useMemo(() => {
    const permSet = new Set(permissions);
    return menus
      .filter(
        (m) =>
          m.type === 'menu' &&
          m.visible &&
          m.parentId === null &&
          permSet.has(m.id)
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({
        key: m.path,
        icon: iconMap[m.icon] || <AppstoreOutlined />,
        label: m.name,
      }));
  }, [menus, permissions]);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      okText: '退出',
      cancelText: '取消',
      onOk: () => {
        logout();
        navigate('/login', { replace: true });
      },
    });
  };

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <BookOutlined />
        </div>
        <div>
          <h1>八维智能阅卷平台</h1>
          <p>BAWEI AI MARKING</p>
        </div>
      </div>

      {/* Navigation */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={navItems}
        onClick={handleMenuClick}
        style={{ flex: 1 }}
      />

      {/* Logout */}
      <div className="sidebar-footer">
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{ color: 'rgba(255, 255, 255, 0.65)' }}
        >
          退出登录
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
