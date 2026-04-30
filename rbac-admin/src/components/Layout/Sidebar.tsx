import React, { useEffect, useMemo, useState } from 'react';
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
  AuditOutlined,
  CalendarOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useMenuStore } from '../../stores/menuStore';
import { useAuthStore } from '../../stores/authStore';
import type { MenuItem } from '../../types/rbac';

interface NavMenuItem {
  key: string;
  icon?: React.ReactNode;
  label: React.ReactNode;
  children?: NavMenuItem[];
}

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
  AuditOutlined: <AuditOutlined />,
  BookOutlined: <BookOutlined />,
  CalendarOutlined: <CalendarOutlined />,
  ApiOutlined: <ApiOutlined />,
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationTree = useMenuStore((state) => state.navigationTree);
  const logout = useAuthStore((state) => state.logout);
  const [menuOpenKeys, setMenuOpenKeys] = useState<string[]>([]);

  const buildNavItems = (items: MenuItem[]): NonNullable<NavMenuItem>[] =>
    items
      .filter((item) => item.type === 'menu' && item.visible)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item) => {
        const children = item.children ? buildNavItems(item.children) : [];
        return {
          key: item.path || item.id,
          icon: iconMap[item.icon] || <AppstoreOutlined />,
          label: <span>{item.name}</span>,
          children: children.length > 0 ? children : undefined,
        };
      });

  const navItems: NavMenuItem[] = useMemo(() => {
    return buildNavItems(navigationTree);
  }, [navigationTree]);

  const openKeys = useMemo(() => {
    const parentKeys: string[] = [];
    const walk = (items: NavMenuItem[], parents: string[] = []): boolean => {
      for (const item of items) {
        if (!item) {
          continue;
        }
        if (item.key === location.pathname) {
          parentKeys.push(...parents);
          return true;
        }
        if (item.children && walk(item.children, [...parents, String(item.key)])) {
          return true;
        }
      }
      return false;
    };
    walk(navItems);
    return parentKeys;
  }, [location.pathname, navItems]);

  useEffect(() => {
    setMenuOpenKeys((current) => Array.from(new Set([...current, ...openKeys])));
  }, [openKeys]);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (typeof key === 'string' && key.startsWith('/')) {
      navigate(key);
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      okText: '退出',
      cancelText: '取消',
      onOk: async () => {
        await logout();
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
        openKeys={menuOpenKeys}
        items={navItems as MenuProps['items']}
        onClick={handleMenuClick}
        onOpenChange={(keys) => setMenuOpenKeys(keys as string[])}
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
