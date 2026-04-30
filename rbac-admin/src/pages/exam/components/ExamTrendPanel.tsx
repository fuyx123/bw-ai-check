import React, { useState } from 'react';
import { Alert, Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';

import SimpleLineChart from '../../../components/charts/SimpleLineChart';
import type {
  ExamClassTrendSummary,
  ExamRiskStudent,
  ExamStudentTrend,
  ExamTrendReport,
} from '../../../services/exam';
import { exportExamTrendReportToExcel } from '../../../utils/exportExamTrendReport';

const { Text } = Typography;

function riskTag(level: ExamRiskStudent['riskLevel']) {
  const map = {
    high: { color: 'error', text: '高风险' },
    medium: { color: 'warning', text: '中风险' },
    low: { color: 'default', text: '低风险' },
  };
  const current = map[level];
  return <Tag color={current.color}>{current.text}</Tag>;
}

const riskColumns: ColumnsType<ExamRiskStudent> = [
  { title: '学生', dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: '班级', dataIndex: 'className', key: 'className', width: 220, ellipsis: true },
  { title: '风险等级', dataIndex: 'riskLevel', key: 'riskLevel', width: 100, render: riskTag },
  { title: '连续低分天数', dataIndex: 'consecutiveLowDays', key: 'consecutiveLowDays', width: 120 },
  { title: '最新分数', dataIndex: 'latestScore', key: 'latestScore', width: 90, render: (value) => value ?? '-' },
  { title: '平均分', dataIndex: 'averageScore', key: 'averageScore', width: 90 },
  {
    title: '原因分析',
    key: 'reasonSummary',
    render: (_, record) => (
      <Space wrap>
        {record.reasonSummary.map((item) => <Tag key={`${record.studentKey}-${item}`}>{item}</Tag>)}
      </Space>
    ),
  },
];

const trendColumns: ColumnsType<ExamStudentTrend> = [
  { title: '学生', dataIndex: 'studentName', key: 'studentName', width: 120, fixed: 'left' },
  { title: '班级', dataIndex: 'className', key: 'className', width: 220, ellipsis: true },
  { title: '平均分', dataIndex: 'averageScore', key: 'averageScore', width: 90 },
  { title: '最新分数', dataIndex: 'latestScore', key: 'latestScore', width: 90, render: (value) => value ?? '-' },
  { title: '连续低分', dataIndex: 'consecutiveLowDays', key: 'consecutiveLowDays', width: 100 },
  { title: '风险', dataIndex: 'riskLevel', key: 'riskLevel', width: 100, render: riskTag },
  {
    title: '每日成绩曲线',
    key: 'points',
    width: 460,
    render: (_, record) => (
      <SimpleLineChart
        points={record.points.map((item) => ({
          label: item.examDate.slice(5),
          value: item.score,
        }))}
      />
    ),
  },
  {
    title: '风险原因',
    key: 'reasonSummary',
    width: 320,
    render: (_, record) => (
      <Space wrap>
        {record.reasonSummary.map((item) => <Tag key={`${record.studentKey}-${item}`}>{item}</Tag>)}
      </Space>
    ),
  },
];

const classColumns: ColumnsType<ExamClassTrendSummary> = [
  { title: '班级', dataIndex: 'className', key: 'className', width: 220, ellipsis: true },
  { title: '学生数', dataIndex: 'studentCount', key: 'studentCount', width: 90 },
  { title: '预警人数', dataIndex: 'flaggedStudentCount', key: 'flaggedStudentCount', width: 90 },
  { title: '班级均分', dataIndex: 'averageScore', key: 'averageScore', width: 90 },
  {
    title: '班级日均分曲线',
    key: 'dateAverages',
    render: (_, record) => (
      <SimpleLineChart
        points={record.dateAverages.map((item) => ({
          label: item.examDate.slice(5),
          value: item.averageScore || null,
        }))}
        color="#52c41a"
      />
    ),
  },
];

interface ExamTrendPanelProps {
  report: ExamTrendReport | null;
  loading: boolean;
}

const ExamTrendPanel: React.FC<ExamTrendPanelProps> = ({ report, loading }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportExamTrendReportToExcel(report);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card
      title="学生趋势与预警"
      loading={loading}
      extra={(
        <Button
          icon={<DownloadOutlined />}
          onClick={() => void handleExport()}
          loading={exporting}
          disabled={!report}
        >
          导出 Excel
        </Button>
      )}
    >
      {!report ? (
        <Alert type="info" showIcon message="当前周期暂无日考趋势数据。" />
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col xs={12} md={6}><Statistic title="监控周期" value={report.cycleName} /></Col>
            <Col xs={12} md={6}><Statistic title="监控班级" value={report.classSummaries.length} /></Col>
            <Col xs={12} md={6}><Statistic title="重点学生" value={report.riskStudents.length} /></Col>
            <Col xs={12} md={6}><Statistic title="预警阈值" value={report.threshold} suffix="分" /></Col>
          </Row>

          <Alert
            type="warning"
            showIcon
            message={`按每天一次日考统计；若连续 3 天低于 ${report.threshold} 分则自动标记问题学生。`}
          />

          <Card type="inner" title="重点学生预警">
            <Table
              rowKey="studentKey"
              columns={riskColumns}
              dataSource={report.riskStudents}
              pagination={false}
              scroll={{ x: 1100 }}
            />
          </Card>

          <Card type="inner" title="班级趋势">
            <Table
              rowKey="classId"
              columns={classColumns}
              dataSource={report.classSummaries}
              pagination={false}
              scroll={{ x: 900 }}
            />
          </Card>

          <Card type="inner" title="学生每日曲线">
            <Table
              rowKey="studentKey"
              columns={trendColumns}
              dataSource={report.students}
              pagination={{ pageSize: 8 }}
              scroll={{ x: 1600 }}
            />
          </Card>

          <Text type="secondary">
            原因分析优先基于连续低分、均分、波动幅度和高频失分点做规则归因。
          </Text>
        </Space>
      )}
    </Card>
  );
};

export default ExamTrendPanel;
