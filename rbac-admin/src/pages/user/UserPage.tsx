import React, { useEffect } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  SettingOutlined,
  EditOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useUserStore } from '../../stores/userStore';
import StatusTag from '../../components/common/StatusTag';
import type { UserInfo, UserType } from '../../types/rbac';

const UserPage: React.FC = () => {
  const {
    filteredUsers,
    filters,
    pagination,
    fetchUsers,
    setFilter,
    clearFilters,
    applyFilters,
  } = useUserStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const roleTagColor: Record<string, string> = {
    校长: '#f5222d',
    教务: '#fa8c16',
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

  const columns = [
    {
      title: '用户信息',
      dataIndex: 'name',
      key: 'name',
      render: (_: unknown, record: UserInfo) => (
        <div className="user-info-cell">
          <Avatar
            size={40}
            style={{
              background: record.userType === 'student' ? '#52c41a' : '#1a2332',
              fontSize: 14,
            }}
          >
            {record.initials || record.name.charAt(0)}
          </Avatar>
          <div className="user-details">
            <h4>{record.name}</h4>
            <p>{record.email}</p>
          </div>
        </div>
      ),
    },
    {
      title: '账号',
      dataIndex: 'loginId',
      key: 'loginId',
      render: (loginId: string, record: UserInfo) => (
        <div>
          <Tag
            color={userTypeTagColor[record.userType]}
            style={{ borderRadius: 4, fontSize: 11, marginBottom: 2 }}
          >
            {userTypeLabel[record.userType]}
          </Tag>
          <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#333' }}>{loginId}</div>
          {record.userType === 'student' && record.className && (
            <div style={{ fontSize: 11, color: '#999' }}>{record.grade} · {record.className}</div>
          )}
        </div>
      ),
    },
    {
      title: '部门',
      dataIndex: 'departmentName',
      key: 'department',
      render: (dept: string) => (
        <span style={{ fontSize: 13 }}>{dept}</span>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roleName',
      key: 'role',
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
      render: (status: UserInfo['accessStatus']) => (
        <StatusTag status={status} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: () => (
        <Space>
          <Button type="text" icon={<EditOutlined />} size="small" />
          <Button type="text" icon={<MoreOutlined />} size="small" />
        </Space>
      ),
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
          <Button type="primary" icon={<PlusOutlined />} size="large">
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
          options={[
            { label: '教务部门', value: 'dept-affairs' },
            { label: '全栈开发学院·专业阶段', value: 'dept-fs-pro' },
            { label: '全栈开发学院·专高阶段', value: 'dept-fs-adv' },
            { label: '云计算学院·专业阶段', value: 'dept-cc-pro' },
            { label: '云计算学院·专高阶段', value: 'dept-cc-adv' },
            { label: '传媒学院·专业阶段', value: 'dept-mc-pro' },
            { label: '传媒学院·专高阶段', value: 'dept-mc-adv' },
            { label: '游戏学院·专业阶段', value: 'dept-gd-pro' },
            { label: '游戏学院·专高阶段', value: 'dept-gd-adv' },
            { label: '鸿蒙学院·专业阶段', value: 'dept-hm-pro' },
            { label: '鸿蒙学院·专高阶段', value: 'dept-hm-adv' },
            { label: '大数据学院·专业阶段', value: 'dept-bd-pro' },
            { label: '大数据学院·专高阶段', value: 'dept-bd-adv' },
          ]}
        />
        <Select
          value={filters.roleId || undefined}
          placeholder="所有角色"
          style={{ width: 160 }}
          allowClear
          onChange={(val) => setFilter({ roleId: val || undefined })}
          prefix={<SettingOutlined />}
          options={[
            { value: 'role-president',        label: '校长' },
            { value: 'role-academic-affairs', label: '教务' },
            { value: 'role-pro-director',     label: '专业主任' },
            { value: 'role-adv-director',     label: '专高主任' },
            { value: 'role-lecturer',         label: '讲师' },
          ]}
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
          显示第 1 至 {filteredUsers.length} 名用户，共 {pagination.total} 名
        </span>
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          showSizeChanger={false}
        />
      </div>
    </div>
  );
};

export default UserPage;
