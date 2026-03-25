import React from 'react';
import { Result } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

const GradePage: React.FC = () => (
  <div>
    <div className="page-header">
      <h2>成绩管理</h2>
      <p>学生成绩录入、查询与统计分析</p>
    </div>
    <Result icon={<BarChartOutlined />} title="成绩管理模块开发中" subTitle="该模块正在规划中，敬请期待" />
  </div>
);

export default GradePage;
