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
import type { UserInfo } from '../../types/rbac';

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
    主编辑: '#1677ff',
    内容主管: '#722ed1',
    外部审计员: '#fa8c16',
    内部评审员: '#8c8c8c',
    讲师: '#52c41a',
    专业负责人: '#13c2c2',
    院长: '#1677ff',
    校长: '#f5222d',
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
              background: '#1a2332',
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
      title: '部门',
      dataIndex: 'departmentName',
      key: 'department',
      render: (dept: string) => (
        <span style={{ fontSize: 13 }}>{dept}</span>
      ),
    },
    {
      title: '所属角色',
      dataIndex: 'roleName',
      key: 'role',
      render: (role: string) => (
        <Tag
          color={roleTagColor[role] || '#1677ff'}
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

      {/* 筛选栏 */}
      <div className="filter-bar">
        <span className="filter-label">筛选</span>
        <Select
          value={filters.departmentId || undefined}
          placeholder="所有部门"
          style={{ width: 180 }}
          allowClear
          onChange={(val) => setFilter({ departmentId: val || undefined })}
          options={[
            { value: 'dept-review', label: '学术评审部' },
            { value: 'dept-outreach', label: '全球外联部' },
            { value: 'dept-ethics', label: '机构伦理部' },
            { value: 'dept-editorial', label: '编辑委员会' },
            { value: 'dept-cs', label: '计算机科学与技术' },
            { value: 'dept-se', label: '软件工程' },
            { value: 'dept-ns', label: '网络安全' },
            { value: 'dept-ai', label: '人工智能研究中心' },
          ]}
        />
        <Select
          value={filters.roleId || undefined}
          placeholder="所有角色"
          style={{ width: 180 }}
          allowClear
          onChange={(val) => setFilter({ roleId: val || undefined })}
          prefix={<SettingOutlined />}
          options={[
            { value: 'role-editor', label: '主编辑' },
            { value: 'role-content-lead', label: '内容主管' },
            { value: 'role-auditor', label: '外部审计员' },
            { value: 'role-reviewer', label: '内部评审员' },
            { value: 'role-lecturer', label: '讲师' },
            { value: 'role-major-lead', label: '专业负责人' },
            { value: 'role-dean', label: '院长' },
            { value: 'role-president', label: '校长' },
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
