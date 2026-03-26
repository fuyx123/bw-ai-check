import React from 'react';
import { Row, Col, Card, Statistic, Table, Tag } from 'antd';
import {
  TeamOutlined,
  ApartmentOutlined,
  SolutionOutlined,
  SafetyOutlined,
  BookOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { flatDepartmentList } from '../../mocks/data/departments';
import { users } from '../../mocks/data/users';
import { roles } from '../../mocks/data/roles';
import { positions } from '../../mocks/data/positions';
import { useAuthStore } from '../../stores/authStore';

// 各学院概览数据
const colleges = [
  { name: '全栈开发学院', proId: 'dept-fs-pro', advId: 'dept-fs-adv' },
  { name: '云计算学院',   proId: 'dept-cc-pro', advId: 'dept-cc-adv' },
  { name: '传媒学院',     proId: 'dept-mc-pro', advId: 'dept-mc-adv' },
  { name: '游戏学院',     proId: 'dept-gd-pro', advId: 'dept-gd-adv' },
  { name: '鸿蒙学院',     proId: 'dept-hm-pro', advId: 'dept-hm-adv' },
  { name: '大数据学院',   proId: 'dept-bd-pro', advId: 'dept-bd-adv' },
];

const roleTagColor: Record<string, string> = {
  校长: '#f5222d',
  教务: '#fa8c16',
  专业主任: '#1677ff',
  专高主任: '#722ed1',
  讲师: '#13c2c2',
};

const DashboardPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);

  const staffCount  = users.filter((u) => u.userType === 'staff').length;
  const studentCount = users.filter((u) => u.userType === 'student').length;
  const deptCount   = flatDepartmentList.length;

  // 各学院班级数量汇总
  const collegeRows = colleges.map((c) => {
    const proClasses = flatDepartmentList.filter((d) => d.parentId === c.proId).length;
    const advClasses = flatDepartmentList.filter((d) => d.parentId === c.advId).length;
    const proDirector = users.find((u) => u.departmentId === c.proId);
    const advDirector = users.find((u) => u.departmentId === c.advId);
    return {
      key: c.name,
      name: c.name,
      proClasses,
      advClasses,
      totalClasses: proClasses + advClasses,
      proDirector: proDirector?.name ?? '—',
      advDirector: advDirector?.name ?? '—',
    };
  });

  const collegeColumns = [
    { title: '学院', dataIndex: 'name', key: 'name', render: (v: string) => <b>{v}</b> },
    {
      title: '专业主任',
      dataIndex: 'proDirector',
      key: 'proDirector',
      render: (v: string) => (
        <span><UserOutlined style={{ marginRight: 4, color: '#1677ff' }} />{v}</span>
      ),
    },
    {
      title: '专业阶段班级数',
      dataIndex: 'proClasses',
      key: 'proClasses',
      render: (v: number) => <Tag color="blue">{v} 个班</Tag>,
    },
    {
      title: '专高主任',
      dataIndex: 'advDirector',
      key: 'advDirector',
      render: (v: string) => (
        <span><UserOutlined style={{ marginRight: 4, color: '#722ed1' }} />{v}</span>
      ),
    },
    {
      title: '专高阶段班级数',
      dataIndex: 'advClasses',
      key: 'advClasses',
      render: (v: number) => <Tag color="purple">{v} 个班</Tag>,
    },
    {
      title: '合计班级',
      dataIndex: 'totalClasses',
      key: 'totalClasses',
      render: (v: number) => <b style={{ color: '#1a2332' }}>{v}</b>,
    },
  ];

  // 角色分布
  const roleRows = roles.map((r) => ({
    key: r.id,
    name: r.name,
    description: r.description,
    userCount: r.userCount,
    dataScope: r.dataScope,
  }));

  const scopeLabel: Record<string, string> = {
    school: '全校',
    college: '学院',
    major: '阶段',
    class: '班级',
  };

  const roleColumns = [
    {
      title: '角色',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => (
        <Tag color={roleTagColor[v] || '#8c8c8c'} style={{ fontWeight: 600 }}>{v}</Tag>
      ),
    },
    { title: '职责说明', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '数据范围',
      dataIndex: 'dataScope',
      key: 'dataScope',
      render: (v: string) => <Tag>{scopeLabel[v] ?? v}</Tag>,
    },
    {
      title: '人数',
      dataIndex: 'userCount',
      key: 'userCount',
      render: (v: number) => <b>{v}</b>,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>工作台</h2>
        <p>
          欢迎回来，<b>{currentUser?.name}</b>（{currentUser?.role}）· 巴威职业技术学院教务管理系统
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="组织节点总数"
              value={deptCount}
              prefix={<ApartmentOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="教职工人数"
              value={staffCount}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在校学生数"
              value={studentCount}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#722ed1' }}
              suffix="（示例）"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="角色 / 岗位"
              value={`${roles.length} / ${positions.length}`}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 学院概览 */}
      <Card
        title={<><ApartmentOutlined style={{ marginRight: 8 }} />各学院概览</>}
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={collegeColumns}
          dataSource={collegeRows}
          pagination={false}
          size="middle"
        />
      </Card>

      {/* 角色权限分布 */}
      <Card title={<><SafetyOutlined style={{ marginRight: 8 }} />角色权限分布</>}>
        <Table
          columns={roleColumns}
          dataSource={roleRows}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default DashboardPage;
