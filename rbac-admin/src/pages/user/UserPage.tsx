import React, { useEffect, useMemo, useState } from 'react';
import {
  Row,
  Col,
  Table,
  Button,
  Space,
  Avatar,
  Select,
  TreeSelect,
  Tag,
  Pagination,
  Segmented,
  Modal,
  Dropdown,
} from 'antd';
import message from '../../utils/message';
import { Form, Input } from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useUserStore } from '../../stores/userStore';
import { useDepartmentStore } from '../../stores/departmentStore';
import { useRoleStore } from '../../stores/roleStore';
import StatusTag from '../../components/common/StatusTag';
import UserFormModal from '../../components/user/UserFormModal';
import type { Department, Role, UserInfo, UserType } from '../../types/rbac';

interface DepartmentTreeNode {
  key: string;
  title: string;
  value: string;
  children?: DepartmentTreeNode[];
}

function convertDepartmentsToTreeData(
  departments: Department[],
  prefix = ''
): DepartmentTreeNode[] {
  return departments.map((department) => ({
    key: department.id,
    title: `${prefix}${department.name}`,
    value: department.id,
    children: department.children?.length
      ? convertDepartmentsToTreeData(department.children, `${prefix}  `)
      : undefined,
  }));
}

const dataScopeLabelMap = {
  school: '学校级角色',
  college: '院级角色',
  major: '专业级角色',
  class: '班级级角色',
} as const;

const dataScopeOrder = ['school', 'college', 'major', 'class'] as const;

function buildRoleFilterOptions(roles: Role[]) {
  return dataScopeOrder
    .map((scope) => {
      const scopedRoles = roles
        .filter((role) => role.dataScope === scope)
        .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));

      if (scopedRoles.length === 0) {
        return null;
      }

      return {
        label: dataScopeLabelMap[scope],
        options: scopedRoles.map((role) => ({
          label: role.name,
          value: role.id,
        })),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

const UserPage: React.FC = () => {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [resetPwdModalOpen, setResetPwdModalOpen] = useState(false);
  const [resetPwdTarget, setResetPwdTarget] = useState<UserInfo | null>(null);
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const [resetPwdForm] = Form.useForm();

  const {
    filteredUsers,
    filters,
    pagination,
    totalActive,
    fetchUsers,
    setFilter,
    clearFilters,
    applyFilters,
    setPagination,
    addUser,
    updateUser,
    deleteUser,
    resetPassword,
  } = useUserStore();

  const departments = useDepartmentStore((s) => s.departments);
  const flattenDepartments = useDepartmentStore((s) => s.flatDepartments);
  const fetchDepartments = useDepartmentStore((s) => s.fetchDepartments);
  const roles = useRoleStore((s) => s.roles);
  const fetchRoles = useRoleStore((s) => s.fetchRoles);

  const departmentTreeData = useMemo(
    () => convertDepartmentsToTreeData(departments),
    [departments]
  );

  const departmentNameMap = useMemo(
    () => new Map(flattenDepartments.map((department) => [department.id, department.name])),
    [flattenDepartments]
  );

  const roleFilterOptions = useMemo(
    () => buildRoleFilterOptions(roles),
    [roles]
  );

  useEffect(() => {
    void Promise.all([fetchUsers(), fetchDepartments(), fetchRoles()]);
  }, [fetchDepartments, fetchRoles, fetchUsers]);

  const ensureReferenceData = async () => {
    setModalLoading(true);
    try {
      await Promise.all([fetchDepartments(), fetchRoles()]);
    } finally {
      setModalLoading(false);
    }
  };

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
  const openAddUserModal = async () => {
    await ensureReferenceData();
    setEditingUser(null);
    setModalMode('add');
    form.resetFields();
    setModalOpen(true);
  };

  // 打开编辑用户对话框
  const openEditUserModal = async (user: UserInfo) => {
    await ensureReferenceData();
    setEditingUser(user);
    setModalMode('edit');
    setModalOpen(true);
  };

  // 提交用户表单
  const handleUserSubmit = async (values: Partial<UserInfo>) => {
    try {
      if (modalMode === 'edit' && editingUser) {
        await updateUser(editingUser.id, values);
        message.success(`已更新用户「${values.name}」`);
      } else {
        await addUser(values);
        message.success(`已创建用户「${values.name}」`);
      }
      setModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存用户失败');
    }
  };

  // 打开重置密码弹窗
  const openResetPwdModal = (user: UserInfo) => {
    setResetPwdTarget(user);
    resetPwdForm.resetFields();
    setResetPwdModalOpen(true);
  };

  // 提交重置密码
  const handleResetPwd = async () => {
    const values = await resetPwdForm.validateFields();
    if (!resetPwdTarget) return;
    setResetPwdLoading(true);
    try {
      await resetPassword(resetPwdTarget.id, values.newPassword as string);
      message.success(`已重置「${resetPwdTarget.name}」的密码`);
      setResetPwdModalOpen(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重置密码失败');
    } finally {
      setResetPwdLoading(false);
    }
  };

  // 删除用户
  const handleDeleteUser = (user: UserInfo) => {
    Modal.confirm({
      title: '删除用户',
      content: `确定要删除用户「${user.name}」吗？此操作无法撤销。`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          await deleteUser(user.id);
          message.success(`已删除用户「${user.name}」`);
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除用户失败');
        }
      },
    });
  };

  // 禁用/启用用户
  const handleToggleActive = async (user: UserInfo) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      message.success(user.isActive ? '已禁用用户' : '已启用用户');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更新用户状态失败');
    }
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
      render: (dept: string, record: UserInfo) => (
        <span style={{ fontSize: 13 }}>
          {dept || departmentNameMap.get(record.departmentId) || '—'}
        </span>
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
            label: '重置密码',
            key: 'reset-password',
            icon: <KeyOutlined />,
            onClick: () => openResetPwdModal(record),
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
              onClick={() => { void openEditUserModal(record); }}
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
            <div className="stat-value">{totalActive.toLocaleString()}</div>
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
        <TreeSelect
          value={filters.departmentId || undefined}
          placeholder="所有部门"
          style={{ width: 240 }}
          treeData={departmentTreeData}
          treeDefaultExpandAll={false}
          showSearch
          treeNodeFilterProp="title"
          allowClear
          onChange={(val) => setFilter({ departmentId: val || undefined })}
          notFoundContent="未找到匹配的部门"
        />
        <Select
          value={filters.roleId || undefined}
          placeholder="所有角色"
          style={{ width: 200 }}
          showSearch
          optionFilterProp="label"
          allowClear
          onChange={(val) => setFilter({ roleId: val || undefined })}
          options={roleFilterOptions}
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
        dataSource={filteredUsers.slice(
          (pagination.current - 1) * pagination.pageSize,
          pagination.current * pagination.pageSize,
        )}
        rowKey="id"
        pagination={false}
        style={{ marginTop: 16 }}
      />

      {/* 分页 */}
      <div className="pagination-wrapper">
        <span className="pagination-info">
          显示第{' '}
          {filteredUsers.length === 0
            ? 0
            : (pagination.current - 1) * pagination.pageSize + 1}{' '}
          至{' '}
          {Math.min(pagination.current * pagination.pageSize, filteredUsers.length)} 名用户，共{' '}
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
        loading={modalLoading}
        onSubmit={handleUserSubmit}
      />

      {/* 重置密码对话框 */}
      <Modal
        title={`重置密码 — ${resetPwdTarget?.name ?? ''}`}
        open={resetPwdModalOpen}
        onOk={() => { void handleResetPwd(); }}
        onCancel={() => setResetPwdModalOpen(false)}
        confirmLoading={resetPwdLoading}
        okText="确认重置"
        cancelText="取消"
        width={400}
        destroyOnClose
      >
        <Form form={resetPwdForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码不少于 6 位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少 6 位）" />
          </Form.Item>
          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次密码输入不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserPage;
