import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Input,
  Badge,
  Avatar,
  Space,
  Dropdown,
  Modal,
  Form,
  message,
} from 'antd';
import {
  SearchOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  EditOutlined,
  LockOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout, updateProfile, updatePassword } = useAuthStore();

  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // 打开编辑资料
  const openProfile = () => {
    if (!currentUser) return;
    profileForm.setFieldsValue({
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
    });
    setProfileOpen(true);
  };

  const handleProfileSave = () => {
    profileForm.validateFields().then((values) => {
      updateProfile(values);
      message.success('个人信息已更新');
      setProfileOpen(false);
    });
  };

  const handlePasswordSave = () => {
    passwordForm.validateFields().then((values) => {
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次密码输入不一致');
        return;
      }
      const ok = updatePassword(values.oldPassword, values.newPassword);
      if (ok) {
        message.success('密码修改成功');
        setPasswordOpen(false);
        passwordForm.resetFields();
      } else {
        message.error('旧密码验证失败');
      }
    });
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

  const dropdownItems = [
    {
      key: 'role',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{currentUser?.name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{currentUser?.role} · {currentUser?.email}</div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'profile',
      icon: <EditOutlined />,
      label: '编辑个人信息',
      onClick: openProfile,
    },
    {
      key: 'password',
      icon: <LockOutlined />,
      label: '修改密码',
      onClick: () => {
        passwordForm.resetFields();
        setPasswordOpen(true);
      },
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <>
      <div className="app-header">
        <div className="header-search">
          <Input
            placeholder="搜索功能、用户、部门..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            variant="filled"
            style={{ borderRadius: 8 }}
          />
        </div>
        <div className="header-actions">
          <Space size={16}>
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: 18, color: '#666', cursor: 'pointer' }} />
            </Badge>
            <QuestionCircleOutlined style={{ fontSize: 18, color: '#666', cursor: 'pointer' }} />
            <Dropdown menu={{ items: dropdownItems }} trigger={['click']} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar
                  size={32}
                  style={{ backgroundColor: '#1a2332', fontSize: 13, flexShrink: 0 }}
                >
                  {currentUser?.name?.charAt(0) || <UserOutlined />}
                </Avatar>
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a2e', whiteSpace: 'nowrap' }}>{currentUser?.name || '未登录'}</div>
                  <div style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap' }}>{currentUser?.role || ''}</div>
                </div>
              </div>
            </Dropdown>
          </Space>
        </div>
      </div>

      {/* 编辑个人信息弹窗 */}
      <Modal
        title="编辑个人信息"
        open={profileOpen}
        onOk={handleProfileSave}
        onCancel={() => setProfileOpen(false)}
        okText="保存"
        cancelText="取消"
        width={440}
      >
        <Form form={profileForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[{ required: true, message: '请输入手机号' }]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <div style={{ padding: 12, background: '#f5f7fa', borderRadius: 8, fontSize: 13, color: '#999' }}>
            <div>角色：{currentUser?.role}</div>
            <div>数据范围：{currentUser?.dataScope}</div>
          </div>
        </Form>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改密码"
        open={passwordOpen}
        onOk={handlePasswordSave}
        onCancel={() => {
          setPasswordOpen(false);
          passwordForm.resetFields();
        }}
        okText="确认修改"
        cancelText="取消"
        width={420}
      >
        <Form form={passwordForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次密码输入不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Header;
