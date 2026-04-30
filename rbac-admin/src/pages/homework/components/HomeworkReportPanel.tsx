import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Modal,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';

import type {
  HomeworkClassReport,
  HomeworkCommonIssue,
  HomeworkKeyStudent,
  HomeworkKnowledgeWeakness,
  HomeworkReport,
} from '../../../services/homework';
import { exportHomeworkReportToExcel } from '../../../utils/exportHomeworkReport';

const { Text } = Typography;

function riskTag(level: HomeworkKeyStudent['riskLevel']) {
  const map = {
    high: { color: 'error', text: '高风险' },
    medium: { color: 'warning', text: '中风险' },
    low: { color: 'default', text: '低风险' },
  };
  const current = map[level];
  return <Tag color={current.color}>{current.text}</Tag>;
}

function severityTag(severity: string) {
  const map: Record<string, { color: string; text: string }> = {
    high: { color: 'error', text: '严重' },
    medium: { color: 'warning', text: '一般' },
    low: { color: 'default', text: '个别' },
  };
  const current = map[severity] ?? { color: 'default', text: severity };
  return <Tag color={current.color}>{current.text}</Tag>;
}

function categoryText(category: string) {
  const map: Record<string, string> = {
    requirement: '需求实现',
    logic: '逻辑实现',
    quality: '代码质量',
    document: '文档匹配',
    structure: '项目结构',
    knowledge: '知识点掌握',
    other: '其他问题',
  };
  return map[category] ?? category;
}

interface HomeworkReportPanelProps {
  report: HomeworkReport | null;
  loading: boolean;
}

const classColumns: ColumnsType<HomeworkClassReport> = [
  { title: '学院', dataIndex: 'collegeName', key: 'collegeName', width: 180, ellipsis: true },
  { title: '专业', dataIndex: 'majorName', key: 'majorName', width: 180, ellipsis: true },
  { title: '班级', dataIndex: 'className', key: 'className', width: 140, ellipsis: true },
  { title: '应交', dataIndex: 'totalStudents', key: 'totalStudents', width: 80 },
  { title: '已交', dataIndex: 'submittedCount', key: 'submittedCount', width: 80 },
  { title: '未交', dataIndex: 'missingCount', key: 'missingCount', width: 80 },
  { title: '已审批', dataIndex: 'reviewedCount', key: 'reviewedCount', width: 90 },
  { title: '平均分', dataIndex: 'averageScore', key: 'averageScore', width: 90 },
  {
    title: '严重/一般/个别',
    key: 'severityStats',
    width: 150,
    render: (_, record) => `${record.severityStats.high}/${record.severityStats.medium}/${record.severityStats.low}`,
  },
  {
    title: '明细汇总',
    key: 'summary',
    width: 120,
    render: () => '查看汇总',
  },
];

const keyStudentColumns: ColumnsType<HomeworkKeyStudent> = [
  { title: '学生', dataIndex: 'studentName', key: 'studentName', width: 120 },
  { title: '班级', dataIndex: 'className', key: 'className', width: 220, ellipsis: true },
  { title: '风险等级', dataIndex: 'riskLevel', key: 'riskLevel', width: 100, render: riskTag },
  { title: '问题数', dataIndex: 'problemCount', key: 'problemCount', width: 80 },
  { title: '严重问题', dataIndex: 'highIssueCount', key: 'highIssueCount', width: 90 },
  { title: '薄弱知识点', dataIndex: 'weakKnowledgeCount', key: 'weakKnowledgeCount', width: 100 },
  {
    title: '主要问题',
    key: 'mainProblems',
    render: (_, record) => (
      <Space wrap>
        {record.mainProblems.map((item) => <Tag key={`${record.studentId}-${item}`}>{item}</Tag>)}
      </Space>
    ),
  },
  {
    title: '掌握薄弱点',
    key: 'weakKnowledgePoints',
    render: (_, record) => (
      <Space wrap>
        {record.weakKnowledgePoints.map((item) => <Tag color="gold" key={`${record.studentId}-${item}`}>{item}</Tag>)}
      </Space>
    ),
  },
];

const commonIssueColumns: ColumnsType<HomeworkCommonIssue> = [
  { title: '问题项', dataIndex: 'label', key: 'label' },
  { title: '分类', dataIndex: 'category', key: 'category', width: 120, render: categoryText },
  { title: '严重度', dataIndex: 'severity', key: 'severity', width: 100, render: severityTag },
  { title: '出现次数', dataIndex: 'count', key: 'count', width: 100 },
];

const knowledgeColumns: ColumnsType<HomeworkKnowledgeWeakness> = [
  { title: '知识点', dataIndex: 'name', key: 'name' },
  { title: '未掌握', dataIndex: 'weakCount', key: 'weakCount', width: 100 },
  { title: '部分掌握', dataIndex: 'partialCount', key: 'partialCount', width: 100 },
  { title: '已掌握', dataIndex: 'masteredCount', key: 'masteredCount', width: 100 },
];

const HomeworkReportPanel: React.FC<HomeworkReportPanelProps> = ({ report, loading }) => {
  const [exporting, setExporting] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string>();
  const activeClass = useMemo(
    () => report?.classes.find((item) => item.classId === activeClassId) ?? null,
    [activeClassId, report],
  );

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportHomeworkReportToExcel(report);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card
      title="汇报看板"
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
        <Alert type="info" showIcon message="当前暂无可汇报的作业审批数据。" />
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col xs={12} md={6}><Statistic title="覆盖班级" value={report.overview.classCount} /></Col>
            <Col xs={12} md={6}><Statistic title="应交人数" value={report.overview.totalStudents} /></Col>
            <Col xs={12} md={6}><Statistic title="已交人数" value={report.overview.submittedCount} /></Col>
            <Col xs={12} md={6}><Statistic title="平均分" value={report.overview.averageScore} precision={2} /></Col>
          </Row>

          <Alert
            type="warning"
            showIcon
            message={`重点学生 ${report.keyStudents.length} 人，严重问题 ${report.overview.severityStats.high} 个，一般问题 ${report.overview.severityStats.medium} 个，个别问题 ${report.overview.severityStats.low} 个`}
          />

          <Card type="inner" title="班级作业汇总">
            <Table
              rowKey="classId"
              columns={classColumns.map((column) => (
                column.key === 'summary'
                  ? {
                      ...column,
                      render: (_, record) => (
                        <Button type="link" onClick={() => setActiveClassId(record.classId)}>
                          查看汇总
                        </Button>
                      ),
                    }
                  : column
              ))}
              dataSource={report.classes}
              pagination={false}
              scroll={{ x: 1180 }}
            />
          </Card>

          <Text type="secondary">
            汇报口径：重点学生按问题数量、严重问题数量和知识点掌握情况综合标记；知识点状态分为已掌握、部分掌握、未掌握。
          </Text>

          <Modal
            title={activeClass ? `${activeClass.collegeName || '-'} / ${activeClass.majorName || '-'} / ${activeClass.className}` : '班级汇总'}
            open={Boolean(activeClass)}
            onCancel={() => setActiveClassId(undefined)}
            footer={null}
            width={1100}
            destroyOnClose
          >
            {activeClass && (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Descriptions bordered size="small" column={4}>
                  <Descriptions.Item label="学院">{activeClass.collegeName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="专业">{activeClass.majorName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="班级">{activeClass.className}</Descriptions.Item>
                  <Descriptions.Item label="完整路径">{activeClass.classPath}</Descriptions.Item>
                  <Descriptions.Item label="应交">{activeClass.totalStudents}</Descriptions.Item>
                  <Descriptions.Item label="已交">{activeClass.submittedCount}</Descriptions.Item>
                  <Descriptions.Item label="未交">{activeClass.missingCount}</Descriptions.Item>
                  <Descriptions.Item label="平均分">{activeClass.averageScore}</Descriptions.Item>
                </Descriptions>

                <Row gutter={16}>
                  <Col xs={24} lg={12}>
                    <Card type="inner" title="共性问题">
                      <Table
                        rowKey={(record) => `${record.category}-${record.label}`}
                        columns={commonIssueColumns}
                        dataSource={activeClass.commonIssues}
                        pagination={false}
                        size="small"
                      />
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card type="inner" title="薄弱知识点">
                      <Table
                        rowKey="name"
                        columns={knowledgeColumns}
                        dataSource={activeClass.knowledgeWeaknesses}
                        pagination={false}
                        size="small"
                      />
                    </Card>
                  </Col>
                </Row>

                <Card type="inner" title="重点学生标记">
                  <Table
                    rowKey={(record) => `${record.classId}-${record.studentId || record.studentName}`}
                    columns={keyStudentColumns}
                    dataSource={activeClass.keyStudents}
                    pagination={false}
                    scroll={{ x: 900 }}
                    size="small"
                  />
                </Card>
              </Space>
            )}
          </Modal>
        </Space>
      )}
    </Card>
  );
};

export default HomeworkReportPanel;
