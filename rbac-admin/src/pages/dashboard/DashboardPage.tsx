import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  TeamOutlined,
  ApartmentOutlined,
  SolutionOutlined,
  SafetyOutlined,
} from '@ant-design/icons';

const DashboardPage: React.FC = () => (
  <div>
    <div className="page-header">
      <h2>工作台</h2>
      <p>教务管理系统概览</p>
    </div>
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic title="部门总数" value={42} prefix={<ApartmentOutlined />} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="用户总数" value={1284} prefix={<TeamOutlined />} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="角色数" value={6} prefix={<SafetyOutlined />} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="职位数" value={17} prefix={<SolutionOutlined />} />
        </Card>
      </Col>
    </Row>
  </div>
);

export default DashboardPage;
