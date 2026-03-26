import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Table,
  Button,
  Space,
  Avatar,
  Select,
  Tag,
  Pagination,
  Segmented,
  Modal,
  message,
  Dropdown,
} from 'antd';
import { Form } from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useUserStore } from '../../stores/userStore';
import { useDepartmentStore } from '../../stores/departmentStore';
import { useRoleStore } from '../../stores/roleStore';
import StatusTag from '../../components/common/StatusTag';
import UserFormModal from '../../components/user/UserFormModal';
import type { UserInfo, UserType } from '../../types/rbac';

const UserPage: React.FC = () => {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);

  const {
    filteredUsers,
    filters,
    pagination,
    fetchUsers,
    setFilter,
    clearFilters,
    applyFilters,
    setPagination,
    addUser,
    updateUser,
    deleteUser,
  } = useUserStore();

  const flattenDepartments = useDepartmentStore((s) => s.flatDepartments);
  const roles = useRoleStore((s) => s.roles);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const roleTagColor: Record<string, string> = {
    校长: '#f5222d',
    教务: '#fa8c16',
    教务处长: '#fa8c16',
    院长: '#1677ff',
    专业负责人: '#1677ff',
    专业主任: '#1677ff',
    专高主任: '#722ed1',
    讲师: '#13c2c2',
    学生: '#52c41a',
  };

  const userTypeTagColor: Record<UserType, string> = {
    staff: '#1677ff',
    student: '#52c41a',
  };

  const userTypeLabel: Record<UserType, string> = {
    staff: '教职工',
    student: '学生',
  };

  // 打开新增用户对话框
  const openAddUserModal = () => {
    setEditingUser(null);
    setModalMode('add');
    form.resetFields();
    setModalOpen(true);
  };

  // 打开编辑用户对话框
  const openEditUserModal = (user: UserInfo) => {
    setEditingUser(user);
    setModalMode('edit');
    setModalOpen(true);
  };

  // 提交用户表单
  const handleUserSubmit = (values: Partial<UserInfo>) => {
    if (modalMode === 'edit' && editingUser) {
      updateUser(editingUser.id, values);
      message.success(`已更新用户「${values.name}」`);
    } else {
      addUser(values);
      message.success(`已创建用户「${values.name}」`);
    }
    setModalOpen(false);
    form.resetFields();
  };

  // 删除用户
  const handleDeleteUser = (user: UserInfo) => {
    Modal.confirm({
      title: '删除用户',
      content: `确定要删除用户「${user.name}」吗？此操作无法撤销。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        deleteUser(user.id);
        message.success(`已删除用户「${user.name}」`);
      },
    });
  };

  // 禁用/启用用户
  const handleToggleActive = (user: UserInfo) => {
    updateUser(user.id, { isActive: !user.isActive });
    message.success(user.isActive ? '已禁用用户' : '已启用用户');
  };

  const columns = [
    {
      title: '用户信息',
      dataIndex: 'name',
      key: 'name',
      render: (_: unknown, record: UserInfo) => (
        <div className="user-info-cell" style={{ display: 'flex', gap: 12 }}>
          <Avatar
            size={40}
            src={record.avatar}
            style={{
              background: record.userType === 'student' ? '#52c41a' : '#1a2332',
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {record.initials || record.name.charAt(0)}
          </Avatar>
          <div className="user-details" style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{record.name}</h4>
            <p style={{ margin: 0, fontSize: 12, color: '#999', marginTop: 2 }}>
              {record.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: '账号',
      dataIndex: 'loginId',
      key: 'loginId',
      width: 140,
      render: (loginId: string, record: UserInfo) => (
        <div>
          <Tag
            color={userTypeTagColor[record.userType]}
            style={{ borderRadius: 4, fontSize: 11, marginBottom: 4 }}
          >
            {userTypeLabel[record.userType]}
          </Tag>
          <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#333' }}>
            {loginId}
          </div>
          {record.userType === 'student' && record.className && (
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
              {record.grade} · {record.className}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '部门',
      dataIndex: 'departmentName',
      key: 'department',
      width: 150,
      render: (dept: string) => (
        <span style={{ fontSize: 13 }}>{dept}</span>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roleName',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag
          color={roleTagColor[role] || '#8c8c8c'}
          style={{ borderRadius: 4, fontSize: 12 }}
        >
          {role}
        </Tag>
      ),
    },
    {
      title: '访问状态',
      dataIndex: 'accessStatus',
      key: 'accessStatus',
      width: 100,
      render: (status: UserInfo['accessStatus']) => (
        <StatusTag status={status} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: UserInfo) => {
        const items = [
          {
            label: '编辑',
            key: 'edit',
            icon: <EditOutlined />,
            onClick: () => openEditUserModal(record),
          },
          {
            label: record.isActive ? '禁用' : '启用',
            key: 'toggle',
            onClick: () => handleToggleActive(record),
          },
          {
            label: '删除',
            key: 'delete',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDeleteUser(record),
          },
        ];

        return (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => openEditUserModal(record)}
            />
            <Dropdown menu={{ items }} trigger={['click']}>
              <Button type="text" icon={<MoreOutlined />} size="small" />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {/* 面包屑 */}
      <div className="breadcrumb-bar">管理员 / 用户管理</div>

      <div className="page-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h2>用户管理</h2>
            <p>管理机构访问权限，分配部门层级，并定义角色。</p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={openAddUserModal}
          >
            新增用户
          </Button>
        </div>
      </div>

      {/* 用户授权生命周期 + 统计 */}
      <Row gutter={20} style={{ marginBottom: 24 }}>
        <Col span={16}>
          <div className="lifecycle-card">
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#999' }}>入职流程</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                用户授权生命周期
              </h3>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                flex: 1,
                marginTop: 16,
              }}
            >
              <div className="lifecycle-step">
                <div className="lifecycle-step-icon">
                  <TeamOutlined />
                </div>
                <span className="lifecycle-step-label">选择部门</span>
              </div>
              <div className="lifecycle-connector" />
              <div className="lifecycle-step">
                <div className="lifecycle-step-icon">
                  <UserOutlined />
                </div>
                <span className="lifecycle-step-label">设置角色</span>
              </div>
              <div className="lifecycle-connector" />
              <div className="lifecycle-step">
                <div className="lifecycle-step-icon">
                  <SafetyOutlined />
                </div>
                <span className="lifecycle-step-label">分配权限</span>
              </div>
            </div>
          </div>
        </Col>
        <Col span={8}>
          <div className="stat-card-dark" style={{ height: '100%' }}>
            <div className="stat-label">总活跃教务人员</div>
            <div className="stat-value">1,284</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar.Group size={24}>
                <Avatar style={{ background: '#1677ff' }}>
                  <UserOutlined />
                </Avatar>
                <Avatar style={{ background: '#52c41a' }}>
                  <UserOutlined />
                </Avatar>
                <Avatar style={{ background: '#722ed1' }}>
                  <UserOutlined />
                </Avatar>
              </Avatar.Group>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                +24
              </span>
              <span className="stat-growth" style={{ marginLeft: 'auto' }}>
                本月增长 12%
              </span>
            </div>
          </div>
        </Col>
      </Row>

      {/* 用户类型切换 */}
      <div style={{ marginBottom: 12 }}>
        <Segmented
          value={filters.userType ?? 'all'}
          onChange={(val) =>
            setFilter({ userType: val === 'all' ? undefined : (val as UserType) })
          }
          options={[
            { label: '全部用户', value: 'all' },
            { label: '教职工', value: 'staff' },
            { label: '学生', value: 'student' },
          ]}
        />
      </div>

      {/* 筛选栏 */}
      <div className="filter-bar">
        <span className="filter-label">筛选</span>
        <Select
          value={filters.departmentId || undefined}
          placeholder="所有部门"
          style={{ width: 200 }}
          allowClear
          onChange={(val) => setFilter({ departmentId: val || undefined })}
          options={flattenDepartments.map((dept: any) => ({
            label: dept.name,
            value: dept.id,
          }))}
        />
        <Select
          value={filters.roleId || undefined}
          placeholder="所有角色"
          style={{ width: 160 }}
          allowClear
          onChange={(val) => setFilter({ roleId: val || undefined })}
          options={roles.map((role) => ({
            label: role.name,
            value: role.id,
          }))}
        />
        <div style={{ flex: 1 }} />
        <Button onClick={clearFilters}>清除</Button>
        <Button type="primary" onClick={applyFilters}>
          应用筛选
        </Button>
      </div>

      {/* 用户列表 */}
      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        pagination={false}
        style={{ marginTop: 16 }}
      />

      {/* 分页 */}
      <div className="pagination-wrapper">
        <span className="pagination-info">
          显示第 {filteredUsers.length === 0 ? 0 : 1} 至 {filteredUsers.length} 名用户，共{' '}
          {pagination.total} 名
        </span>
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          showSizeChanger={false}
          onChange={(page, pageSize) => setPagination(page, pageSize)}
        />
      </div>

      {/* 用户表单对话框 */}
      <UserFormModal
        mode={modalMode}
        visible={modalOpen}
        user={editingUser}
        form={form}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditingUser(null);
        }}
        onSubmit={handleUserSubmit}
      />
    </div>
  );
};

export default UserPage;
