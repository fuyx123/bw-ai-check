import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Descriptions, List, Spin, Table, Tag, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { fetchHomeworkSubmissionDetail, type HomeworkReviewDetail, type HomeworkSubmission } from '../../services/homework';
import message from '../../utils/message';

const { Title, Paragraph, Text } = Typography;

function reviewStatusTag(status: string) {
  const map: Record<string, { color: string; text: string }> = {
    uploaded: { color: 'default', text: '已上传' },
    parsing: { color: 'processing', text: '解析中' },
    reviewing: { color: 'processing', text: '审批中' },
    approved: { color: 'success', text: '已通过' },
    rejected: { color: 'error', text: '未通过' },
    failed: { color: 'warning', text: '审批失败' },
  };
  const current = map[status] ?? { color: 'default', text: status };
  return <Tag color={current.color}>{current.text}</Tag>;
}

function parseDetail(raw: string): HomeworkReviewDetail | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HomeworkReviewDetail;
  } catch {
    return null;
  }
}

function categoryText(value: string) {
  const map: Record<string, string> = {
    requirement: '需求实现',
    logic: '逻辑实现',
    quality: '代码质量',
    document: '文档匹配',
    structure: '项目结构',
    knowledge: '知识点掌握',
    other: '其他问题',
  };
  return map[value] ?? value;
}

const HomeworkDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<HomeworkSubmission | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchHomeworkSubmissionDetail(id)
      .then(setSubmission)
      .catch(() => {
        message.error('加载作业审批明细失败');
        navigate('/homework');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const detail = useMemo(() => parseDetail(submission?.reviewDetail ?? ''), [submission?.reviewDetail]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" tip="加载作业审批明细..." />
      </div>
    );
  }

  if (!submission) {
    return null;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card>
        <Title level={3} style={{ marginTop: 0 }}>{submission.homeworkTitle}</Title>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="学生">{submission.studentName}</Descriptions.Item>
          <Descriptions.Item label="班级">{submission.className}</Descriptions.Item>
          <Descriptions.Item label="提交文件">{submission.archiveOriginalName}</Descriptions.Item>
          <Descriptions.Item label="作业文档">{submission.docOriginalName || '-'}</Descriptions.Item>
          <Descriptions.Item label="审批状态">{reviewStatusTag(submission.reviewStatus)}</Descriptions.Item>
          <Descriptions.Item label="审批得分">{submission.reviewScore}</Descriptions.Item>
          <Descriptions.Item label="提交时间">{dayjs(submission.submittedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="完成时间">
            {submission.reviewedAt ? dayjs(submission.reviewedAt).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
        </Descriptions>
        {submission.reviewComment && (
          <Alert
            style={{ marginTop: 16 }}
            type={submission.reviewStatus === 'approved' ? 'success' : 'info'}
            showIcon
            message="审批摘要"
            description={<Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{submission.reviewComment}</Paragraph>}
          />
        )}
      </Card>

      {detail ? (
        <>
          <Card title="要求匹配情况">
            <Table
              rowKey={(record) => record.requirement}
              pagination={false}
              dataSource={detail.requirementMatches}
              columns={[
                { title: '要求项', dataIndex: 'requirement', key: 'requirement' },
                {
                  title: '匹配状态',
                  dataIndex: 'status',
                  key: 'status',
                  width: 120,
                  render: (value: string) => {
                    const map: Record<string, { color: string; text: string }> = {
                      matched: { color: 'success', text: '已满足' },
                      partial: { color: 'warning', text: '部分满足' },
                      missing: { color: 'error', text: '未满足' },
                    };
                    const current = map[value] ?? { color: 'default', text: value };
                    return <Tag color={current.color}>{current.text}</Tag>;
                  },
                },
                { title: '证据说明', dataIndex: 'evidence', key: 'evidence' },
              ]}
            />
          </Card>

          <Card title="问题明细">
            <Table
              rowKey={(record) => `${record.filePath}-${record.title}`}
              pagination={false}
              dataSource={detail.issues}
              columns={[
                {
                  title: '严重级别',
                  dataIndex: 'severity',
                  key: 'severity',
                  width: 110,
                  render: (value: string) => {
                    const map: Record<string, { color: string; text: string }> = {
                      high: { color: 'error', text: '高' },
                      medium: { color: 'warning', text: '中' },
                      low: { color: 'default', text: '低' },
                    };
                    const current = map[value] ?? { color: 'default', text: value };
                    return <Tag color={current.color}>{current.text}</Tag>;
                  },
                },
                {
                  title: '问题分类',
                  dataIndex: 'category',
                  key: 'category',
                  width: 120,
                  render: (value: string) => (value ? categoryText(value) : '-'),
                },
                { title: '问题标题', dataIndex: 'title', key: 'title', width: 180 },
                { title: '文件', dataIndex: 'filePath', key: 'filePath', width: 220, ellipsis: true },
                { title: '位置', dataIndex: 'lineHint', key: 'lineHint', width: 120 },
                { title: '问题说明', dataIndex: 'detail', key: 'detail' },
                { title: '修改建议', dataIndex: 'suggestion', key: 'suggestion' },
              ]}
            />
            {detail.issues.length === 0 && <Text type="secondary">未识别到明显问题。</Text>}
          </Card>

          <Card title="知识点掌握情况">
            <Table
              rowKey={(record) => record.name}
              pagination={false}
              dataSource={detail.knowledgePoints ?? []}
              columns={[
                { title: '知识点', dataIndex: 'name', key: 'name' },
                {
                  title: '掌握情况',
                  dataIndex: 'status',
                  key: 'status',
                  width: 120,
                  render: (value: string) => {
                    const map: Record<string, { color: string; text: string }> = {
                      mastered: { color: 'success', text: '已掌握' },
                      partial: { color: 'warning', text: '部分掌握' },
                      weak: { color: 'error', text: '未掌握' },
                    };
                    const current = map[value] ?? { color: 'default', text: value };
                    return <Tag color={current.color}>{current.text}</Tag>;
                  },
                },
                { title: '依据说明', dataIndex: 'evidence', key: 'evidence' },
              ]}
            />
          </Card>

          <Card title="总体建议">
            <List
              bordered
              dataSource={detail.overallSuggestions}
              locale={{ emptyText: '暂无总体建议' }}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Card>
        </>
      ) : (
        <Alert type="warning" showIcon message="结构化审批结果尚未生成，请稍后刷新。" />
      )}
    </div>
  );
};

export default HomeworkDetailPage;
