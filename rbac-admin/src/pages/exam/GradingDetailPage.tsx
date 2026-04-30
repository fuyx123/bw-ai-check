import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, InputNumber, Input,
  Spin, Alert, Progress, Typography, Space, Divider, message, Table,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined,
  EditOutlined, CheckOutlined, DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  type AnswerFile,
  type GradingDetail,
  type QuestionResult,
  type ManualQuestionScore,
  fetchGradingDetail,
  submitManualReview,
} from '../../services/exam';
import { useAuthStore } from '../../stores/authStore';
import { exportGradingDetailToExcel } from '../../utils/exportGradingDetail';

const { Text, Paragraph } = Typography;

// 解析 AIDetail JSON 字符串
function parseDetail(raw: string): GradingDetail | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GradingDetail;
  } catch {
    return null;
  }
}

// 解析 ManualDetail JSON 字符串为 题号→分数 映射
function parseManualDetail(raw: string): Record<number, number> {
  if (!raw) return {};
  try {
    const arr = JSON.parse(raw) as ManualQuestionScore[];
    const map: Record<number, number> = {};
    arr.forEach((item) => { map[item.no] = item.score; });
    return map;
  } catch {
    return {};
  }
}

function statusLabel(status: string) {
  const map: Record<string, { color: string; text: string }> = {
    uploaded: { color: 'default', text: '待阅卷' },
    grading:  { color: 'processing', text: '阅卷中' },
    graded:   { color: 'blue', text: '已 AI 阅卷' },
    reviewed: { color: 'success', text: '已人工复阅' },
    failed:   { color: 'error', text: '阅卷失败' },
  };
  const cfg = map[status] ?? { color: 'default', text: status };
  return <Tag color={cfg.color}>{cfg.text}</Tag>;
}

// 单题卡片
const QuestionCard: React.FC<{ q: QuestionResult; idx: number; manualScore?: number }> = ({ q, idx, manualScore }) => {
  const passed = q.correctRate > 80;
  const hasManual = manualScore !== undefined;
  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>第 {q.no || idx + 1} 题</span>
          {hasManual ? (
            <Tag icon={<CheckCircleOutlined />} color="success" style={{ flexShrink: 0 }}>
              人工 {manualScore}/{q.maxScore}
            </Tag>
          ) : (
            passed
              ? <Tag icon={<CheckCircleOutlined />} color="success" style={{ flexShrink: 0 }}>得分 {q.score}/{q.maxScore}</Tag>
              : <Tag icon={<CloseCircleOutlined />} color="error" style={{ flexShrink: 0 }}>得分 {q.score}/{q.maxScore}</Tag>
          )}
          {hasManual && (
            <Tag color="default" style={{ flexShrink: 0, color: '#999' }}>AI {q.score}/{q.maxScore}</Tag>
          )}
          {q.title && (
            <span style={{ fontSize: 13, color: '#595959', fontWeight: 400, wordBreak: 'break-all' }}>
              {q.title}
            </span>
          )}
        </div>
      }
      extra={
        <Space>
          <span style={{ fontSize: 12, color: '#666' }}>正确率</span>
          <Progress
            type="circle"
            size={40}
            percent={q.correctRate}
            strokeColor={passed ? '#52c41a' : '#ff4d4f'}
            format={(p) => `${p}%`}
          />
        </Space>
      }
    >
      {q.errorPoints?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Text type="danger" strong>错误点：</Text>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {q.errorPoints.map((ep, i) => <li key={i}><Text type="danger">{ep}</Text></li>)}
          </ul>
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <Text strong>正确实现思路：</Text>
        <Paragraph style={{ marginTop: 4, marginBottom: 0, color: '#595959' }}>
          {q.correctApproach || '—'}
        </Paragraph>
      </div>
      <div>
        <Text strong>答案补全：</Text>
        <pre style={{
          marginTop: 4, padding: '8px 12px',
          background: '#f5f5f5', borderRadius: 4,
          fontSize: 13, overflowX: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {q.answerCompletion || '—'}
        </pre>
      </div>
    </Card>
  );
};

const GradingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);

  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<AnswerFile | null>(null);
  const [detail, setDetail] = useState<GradingDetail | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 逐题人工评分状态：题号 → 分数
  const [questionScores, setQuestionScores] = useState<Record<number, number>>({});
  const [manualComment, setManualComment] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchGradingDetail(id)
      .then((f) => {
        setFile(f);
        const parsedDetail = parseDetail(f.aiDetail);
        setDetail(parsedDetail);
        setManualComment(f.manualComment ?? '');

        // 预填已有人工逐题评分；若无则用 AI 分数作为默认值
        const existingMap = parseManualDetail(f.manualDetail ?? '');
        if (Object.keys(existingMap).length > 0) {
          setQuestionScores(existingMap);
        } else if (parsedDetail?.questions) {
          const defaultMap: Record<number, number> = {};
          parsedDetail.questions.forEach((q) => { defaultMap[q.no] = q.score; });
          setQuestionScores(defaultMap);
        }
      })
      .catch((err) => {
        if (err?.response?.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 人工总分实时计算
  const manualTotal = useMemo(
    () => Object.values(questionScores).reduce((s, v) => s + (v || 0), 0),
    [questionScores],
  );

  const handleExport = async () => {
    if (!file) return;
    setExporting(true);
    try {
      await exportGradingDetailToExcel(file, detail);
    } catch {
      message.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!id || !detail?.questions) return;
    setSubmitting(true);
    try {
      const scores: ManualQuestionScore[] = detail.questions.map((q) => ({
        no: q.no,
        score: questionScores[q.no] ?? 0,
      }));
      await submitManualReview(id, { questionScores: scores, comment: manualComment });
      message.success('复阅结果已保存');
      const updated = await fetchGradingDetail(id);
      setFile(updated);
    } catch {
      message.error('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" tip="加载阅卷明细..." />
      </div>
    );
  }

  if (forbidden) {
    return (
      <Alert
        type="warning"
        showIcon
        message="暂无权限"
        description="阅卷老师尚未完成复阅，您暂时无法查看该阅卷明细。"
        action={<Button onClick={() => navigate(-1)}>返回</Button>}
        style={{ margin: '40px auto', maxWidth: 600 }}
      />
    );
  }

  if (!file) return null;

  // 是否可以人工复阅：当前用户与 graderId 匹配，或高权限角色，且考次类型为周考/月考
  const canReview = currentUser && (
    currentUser.dataScope === 'school' ||
    currentUser.dataScope === 'college' ||
    currentUser.dataScope === 'major' ||
    file.graderId === currentUser.id
  );

  const displayScore = file.manualScore != null ? file.manualScore : (detail?.totalScore ?? file.aiScore);
  const isManualDone = file.status === 'reviewed';
  const manualScoreMap = parseManualDetail(file.manualDetail ?? '');
  const maxTotal = detail?.questions?.reduce((s, q) => s + q.maxScore, 0) ?? 0;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px' }}>
      {/* 顶部操作栏 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
        <span style={{ fontSize: 18, fontWeight: 600 }}>阅卷明细</span>
        <div style={{ flex: 1 }} />
        <Button
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={() => { void handleExport(); }}
          disabled={file.status === 'uploaded' || file.status === 'grading'}
        >
          导出 Excel
        </Button>
      </div>

      {/* 文件基本信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Descriptions size="small" column={3} bordered>
          <Descriptions.Item label="文件名">{file.originalName}</Descriptions.Item>
          <Descriptions.Item label="上传人">{file.uploaderName}</Descriptions.Item>
          <Descriptions.Item label="班级">{file.className || '—'}</Descriptions.Item>
          <Descriptions.Item label="状态">{statusLabel(file.status)}</Descriptions.Item>
          <Descriptions.Item label="AI 总分">
            <Tag color="blue" style={{ fontSize: 14 }}>{detail?.totalScore ?? file.aiScore ?? 0} 分</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="最终得分">
            <Tag color={isManualDone ? 'success' : 'blue'} style={{ fontSize: 14 }}>
              {displayScore} 分 {isManualDone ? '（人工复阅）' : '（AI）'}
            </Tag>
          </Descriptions.Item>
          {file.gradedAt && (
            <Descriptions.Item label="复阅时间">
              {dayjs(file.gradedAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          )}
        </Descriptions>
        {detail?.summary && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 4 }}>
            <Text strong>AI 综合评价：</Text>
            <Text style={{ marginLeft: 8 }}>{detail.summary}</Text>
          </div>
        )}
        {isManualDone && file.manualComment && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#f6ffed', borderRadius: 4, border: '1px solid #b7eb8f' }}>
            <Text strong style={{ color: '#52c41a' }}>人工复阅批注：</Text>
            <Text style={{ marginLeft: 8 }}>{file.manualComment}</Text>
          </div>
        )}
      </Card>

      {/* 逐题评分 */}
      {detail?.questions && detail.questions.length > 0 ? (
        <Card title="逐题评分" style={{ marginBottom: 16 }}>
          {detail.questions.map((q, idx) => (
            <QuestionCard
              key={idx}
              q={q}
              idx={idx}
              manualScore={isManualDone ? manualScoreMap[q.no] : undefined}
            />
          ))}
        </Card>
      ) : (
        file.aiComment && (
          <Card title="AI 阅卷批注" style={{ marginBottom: 16 }}>
            <pre style={{
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: 'inherit', fontSize: 14, margin: 0,
              lineHeight: 1.7, color: '#333',
            }}>
              {file.aiComment}
            </pre>
          </Card>
        )
      )}

      {/* 人工复阅区域（仅阅卷老师 + 高权限可见，且状态不是 uploaded/grading） */}
      {canReview && file.status !== 'uploaded' && file.status !== 'grading' && detail?.questions && (
        <>
          <Divider><EditOutlined /> 人工复阅</Divider>
          <Card>
            {/* 逐题打分表格 */}
            <Table
              size="small"
              pagination={false}
              style={{ marginBottom: 16 }}
              dataSource={detail.questions.map((q) => ({ ...q, key: q.no }))}
              columns={[
                {
                  title: '题号',
                  dataIndex: 'no',
                  width: 60,
                  render: (v: number) => `第 ${v} 题`,
                },
                {
                  title: '题目',
                  dataIndex: 'title',
                  ellipsis: true,
                  render: (v: string) => <span title={v} style={{ fontSize: 12 }}>{v || '—'}</span>,
                },
                {
                  title: '满分',
                  dataIndex: 'maxScore',
                  width: 60,
                  align: 'center' as const,
                },
                {
                  title: 'AI 分',
                  dataIndex: 'score',
                  width: 70,
                  align: 'center' as const,
                  render: (v: number) => <Tag color="blue">{v}</Tag>,
                },
                {
                  title: '人工分',
                  width: 120,
                  align: 'center' as const,
                  render: (_: unknown, record: QuestionResult) => (
                    <InputNumber
                      min={0}
                      max={record.maxScore}
                      value={questionScores[record.no] ?? 0}
                      onChange={(val) =>
                        setQuestionScores((prev) => ({ ...prev, [record.no]: val ?? 0 }))
                      }
                      size="small"
                      style={{ width: 80 }}
                    />
                  ),
                },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4} align="right">
                    <Text strong>人工总分</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="center">
                    <Text strong style={{ color: '#1677ff', fontSize: 15 }}>
                      {manualTotal} / {maxTotal}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />

            {/* 整体批注 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 6, fontWeight: 500 }}>整体批注（可选）</div>
              <Input.TextArea
                rows={4}
                placeholder="请输入复阅批注"
                maxLength={1000}
                showCount
                value={manualComment}
                onChange={(e) => setManualComment(e.target.value)}
              />
            </div>

            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={submitting}
              onClick={() => { void handleReviewSubmit(); }}
            >
              {isManualDone ? '更新复阅结果' : '提交复阅'}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
};

export default GradingDetailPage;
