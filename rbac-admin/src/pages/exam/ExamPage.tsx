import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Drawer, Empty, Modal, Popconfirm, Progress,
  Row, Select, Space, Table, Tabs, Tag, Tooltip, TreeSelect, Typography, Upload, Spin,
} from 'antd';
import {
  CalendarOutlined, CheckCircleOutlined,
  CloudUploadOutlined, DeleteOutlined, DownloadOutlined,
  EyeOutlined, FileWordOutlined, FolderOpenOutlined, InboxOutlined,
  LoadingOutlined, ReloadOutlined, AuditOutlined, RobotOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile, UploadProps } from 'antd/es/upload';
import dayjs from 'dayjs';

import {
  batchUploadAnswerFiles,
  deleteAnswerFile,
  fetchAnswerFiles,
  uploadAnswerFile,
  type AnswerFile,
} from '../../services/exam';
import { fetchCycles, fetchCycleDetail, type ExamSession, type TeachingCycle } from '../../services/cycle';
import { useAuthStore } from '../../stores/authStore';
import { useDepartmentStore } from '../../stores/departmentStore';
import type { Department } from '../../types/rbac';
import message from '../../utils/message';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const WORD_ACCEPT = '.doc,.docx';
const ARCHIVE_ACCEPT = '.zip,.tar,.tar.gz,.tgz,.tar.bz2,.rar';
const MAX_SINGLE_MB = 50;
const MAX_ARCHIVE_MB = 200;

interface ClassTreeNode {
  key: string;
  value: string;
  title: string;
  disabled?: boolean;
  selectable?: boolean;
  children?: ClassTreeNode[];
}

/** 将部门树转换为 TreeSelect 数据，仅班级节点可选，中间层节点作导航用 */
function buildClassTreeData(depts: Department[]): ClassTreeNode[] {
  return depts.flatMap((dept) => {
    const children =
      dept.children && dept.children.length > 0 ? buildClassTreeData(dept.children) : undefined;

    if (dept.level !== 'class' && (!children || children.length === 0)) {
      return [];
    }

    return [
      {
        key: dept.id,
        value: dept.id,
        title: dept.name,
        disabled: dept.level !== 'class',
        selectable: dept.level === 'class',
        children,
      },
    ];
  });
}

const TYPE_TABS = [
  { key: 'daily',   label: '日考', color: 'blue',   borderColor: '#1677ff' },
  { key: 'weekly',  label: '周考', color: 'orange',  borderColor: '#fa8c16' },
  { key: 'monthly', label: '月考', color: 'red',    borderColor: '#f5222d' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFileSize(file: RcFile, maxMB: number): boolean {
  const sizeMB = file.size / 1024 / 1024;
  if (sizeMB > maxMB) {
    message.error(`文件大小 ${sizeMB.toFixed(1)} MB 超出上限 ${maxMB} MB`);
    return false;
  }
  return true;
}

// 状态标签（覆盖新 status 枚举）
function fileStatusTag(status: string) {
  const map: Record<string, { color: string; text: string }> = {
    uploaded:  { color: 'default',    text: '待阅卷' },
    grading:   { color: 'processing', text: '阅卷中' },
    graded:    { color: 'blue',       text: '已AI阅卷' },
    reviewed:  { color: 'success',    text: '已复阅' },
    failed:    { color: 'error',      text: '阅卷失败' },
  };
  const cfg = map[status] ?? { color: 'default', text: status };
  return <Tag color={cfg.color}>{cfg.text}</Tag>;
}

const ExamPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isStudent = currentUser?.userType === 'student';
  const isLecturer = currentUser?.userType === 'staff' && currentUser?.dataScope === 'class';
  const needsClassFilter = currentUser?.userType === 'staff' && currentUser?.dataScope !== 'class';
  const canUpload = isStudent || isLecturer;
  const canBatchUpload = isLecturer;

  // ===== 部门树（用于班级筛选器） =====
  const allDepartments = useDepartmentStore((s) => s.departments);
  const fetchDepartments = useDepartmentStore((s) => s.fetchDepartments);
  const classTreeData = useMemo(() => buildClassTreeData(allDepartments), [allDepartments]);

  // ===== 周期 & 考次 =====
  const [cycles, setCycles] = useState<TeachingCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleDetail, setCycleDetail] = useState<TeachingCycle | null>(null);
  const [cycleLoading, setCycleLoading] = useState(false);

  // 班级筛选（仅高权限教职工可见）
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);

  // 上传时选择的考次
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null);

  // ===== 学生提交记录 =====
  const [myFiles, setMyFiles] = useState<AnswerFile[]>([]);
  const [myFilesLoading, setMyFilesLoading] = useState(false);
  const [myFilesTab, setMyFilesTab] = useState<string>('all');

  // sessionId -> ExamSession 映射，用于卡片展示
  const sessionMap = useMemo(() => {
    const map: Record<string, ExamSession> = {};
    (cycleDetail?.sessions ?? []).forEach((s) => { map[s.id] = s; });
    return map;
  }, [cycleDetail]);

  // ===== 文件列表抽屉（教职工用） =====
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSession, setDrawerSession] = useState<ExamSession | null>(null);
  const [drawerFiles, setDrawerFiles] = useState<AnswerFile[]>([]);
  const [drawerTotal, setDrawerTotal] = useState(0);
  const [drawerPage, setDrawerPage] = useState(1);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // ===== 上传 =====
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [batchPercent, setBatchPercent] = useState<number | null>(null);
  const singleAbortRef = useRef<AbortController | null>(null);
  const batchAbortRef = useRef<AbortController | null>(null);

  // ===== 预览 =====
  const [previewFile, setPreviewFile] = useState<AnswerFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // 当 LibreOffice 未安装时，.doc 文件无法转换，标记为只能下载
  const [previewUnsupported, setPreviewUnsupported] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // ===== 初始化 =====
  useEffect(() => {
    fetchCycles()
      .then((list) => {
        setCycles(list);
        if (list.length > 0) setSelectedCycleId(list[0].id);
      })
      .catch(() => message.error('加载教学周期失败'));

    if (needsClassFilter && allDepartments.length === 0) {
      fetchDepartments().catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== 周期/班级变化：重新加载考次统计 =====
  useEffect(() => {
    if (!selectedCycleId) { setCycleDetail(null); return; }
    setCycleLoading(true);
    fetchCycleDetail(selectedCycleId, selectedClassId)
      .then(setCycleDetail)
      .catch(() => message.error('加载考次失败'))
      .finally(() => setCycleLoading(false));
  }, [selectedCycleId, selectedClassId]);

  // ===== 学生：周期变化时加载自己的提交记录 =====
  useEffect(() => {
    if (!isStudent || !selectedCycleId) { setMyFiles([]); return; }
    setMyFilesLoading(true);
    fetchAnswerFiles({ cycleId: selectedCycleId, pageSize: 100 })
      .then((res) => setMyFiles(res.items))
      .catch(() => message.error('加载提交记录失败'))
      .finally(() => setMyFilesLoading(false));
  }, [isStudent, selectedCycleId]);

  // 刷新学生提交记录的辅助函数
  const refreshMyFiles = useCallback(() => {
    if (!isStudent || !selectedCycleId) return;
    fetchAnswerFiles({ cycleId: selectedCycleId, pageSize: 100 })
      .then((res) => setMyFiles(res.items))
      .catch(() => {});
  }, [isStudent, selectedCycleId]);

  // ===== 抽屉：加载某考次文件（教职工用） =====
  const loadDrawerFiles = useCallback(async (session: ExamSession, p = 1) => {
    setDrawerLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, pageSize: 20, examSessionId: session.id };
      if (selectedClassId) params['classId'] = selectedClassId;
      const res = await fetchAnswerFiles(params);
      setDrawerFiles(res.items);
      setDrawerTotal(res.total);
      setDrawerPage(p);
    } catch {
      message.error('加载文件失败');
    } finally {
      setDrawerLoading(false);
    }
  }, [selectedClassId]);

  const openSessionDrawer = (session: ExamSession) => {
    setDrawerSession(session);
    setDrawerOpen(true);
    loadDrawerFiles(session, 1);
  };

  // ===== 预览 =====
  const openPreview = useCallback(async (file: AnswerFile) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewUnsupported(false);

    // .doc（旧版二进制格式）需要走后端转换接口
    const isOldDoc =
      file.originalName.toLowerCase().endsWith('.doc') &&
      !file.originalName.toLowerCase().endsWith('.docx');

    try {
      const { http } = await import('../../services/http');

      // .doc 先请求 /preview-docx 让后端用 LibreOffice 转换；.docx 直接拉文件
      const endpoint = isOldDoc
        ? `/exam/papers/${file.id}/preview-docx`
        : `/exam/papers/${file.id}/file`;

      const resp = await http.get(endpoint, {
        responseType: 'arraybuffer',
        timeout: 0,
      });

      const blob = new Blob([resp.data]);
      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      if (previewContainerRef.current) {
        previewContainerRef.current.innerHTML = '';
        await renderAsync(blob, previewContainerRef.current, undefined, {
          className: 'docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          // 强制图片使用 base64 DataURL，避免跨域/路径问题导致图片无法显示
          useBase64URL: true,
        });
      }
    } catch (err: unknown) {
      // 后端返回 501 表示 LibreOffice 未安装，展示友好的下载提示
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (isOldDoc && status === 501) {
        setPreviewUnsupported(true);
      } else {
        message.error('预览失败，请尝试下载后查看');
      }
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // ===== 单文件上传 =====
  const handleSingleUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    if (!uploadSessionId) {
      message.warning('请先选择考次');
      onError?.(new Error('未选择考次'));
      return;
    }
    singleAbortRef.current = new AbortController();
    setUploadPercent(0);
    try {
      await uploadAnswerFile(file as File, {
        examSessionId: uploadSessionId,
        classId: currentUser?.classId,
        className: currentUser?.className,
        onProgress: setUploadPercent,
        signal: singleAbortRef.current.signal,
      });
      message.success('文件上传成功');
      onSuccess?.({});
      setUploadPercent(null);
      if (selectedCycleId) fetchCycleDetail(selectedCycleId, selectedClassId).then(setCycleDetail).catch(() => {});
      refreshMyFiles();
    } catch (err: unknown) {
      const aborted = err instanceof Error && err.name === 'CanceledError';
      if (!aborted) {
        message.error(err instanceof Error ? err.message : '上传失败');
        onError?.(new Error('上传失败'));
      }
      setUploadPercent(null);
    }
  };

  // ===== 批量上传 =====
  const handleBatchUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    if (!uploadSessionId) {
      message.warning('请先选择考次');
      onError?.(new Error('未选择考次'));
      return;
    }
    batchAbortRef.current = new AbortController();
    setBatchPercent(0);
    try {
      const result = await batchUploadAnswerFiles(file as File, {
        examSessionId: uploadSessionId,
        classId: currentUser?.classId,
        className: currentUser?.className,
        onProgress: setBatchPercent,
        signal: batchAbortRef.current.signal,
      });
      message.success(`批量上传成功，共 ${result.count} 个文件`);
      onSuccess?.({});
      setBatchPercent(null);
      if (selectedCycleId) fetchCycleDetail(selectedCycleId, selectedClassId).then(setCycleDetail).catch(() => {});
    } catch (err: unknown) {
      const aborted = err instanceof Error && err.name === 'CanceledError';
      if (!aborted) {
        message.error(err instanceof Error ? err.message : '批量上传失败');
        onError?.(new Error('批量上传失败'));
      }
      setBatchPercent(null);
    }
  };

  // ===== 删除 =====
  const handleDelete = async (id: string) => {
    try {
      await deleteAnswerFile(id);
      message.success('删除成功');
      if (drawerSession) loadDrawerFiles(drawerSession, drawerPage);
      if (selectedCycleId) fetchCycleDetail(selectedCycleId, selectedClassId).then(setCycleDetail).catch(() => {});
      refreshMyFiles();
    } catch {
      message.error('删除失败');
    }
  };

  // ===== 会话选项（上传区考次下拉） =====
  const allSessions = cycleDetail?.sessions ?? [];
  const sessionOptions = allSessions.map((s) => ({
    value: s.id,
    label: (
      <Space>
        <Tag color={TYPE_TABS.find((t) => t.key === s.type)?.color ?? 'default'} style={{ margin: 0 }}>
          {TYPE_TABS.find((t) => t.key === s.type)?.label}
        </Tag>
        {s.name}
        <Text type="secondary" style={{ fontSize: 12 }}>{s.examDate}</Text>
      </Space>
    ),
  }));

  // ===== 学生提交记录卡片 =====
  const renderMySubmissionCards = () => {
    const filteredFiles = myFilesTab === 'all'
      ? myFiles
      : myFiles.filter((f) => {
          const s = sessionMap[f.examSessionId];
          return s?.type === myFilesTab;
        });

    const typeTabItems = [
      { key: 'all', label: `全部（${myFiles.length}）` },
      ...TYPE_TABS.map(({ key, label, color }) => {
        const count = myFiles.filter((f) => sessionMap[f.examSessionId]?.type === key).length;
        return {
          key,
          label: (
            <Space size={4}>
              <Tag color={color} style={{ margin: 0 }}>{label}</Tag>
              <span>{count}</span>
            </Space>
          ),
        };
      }),
    ];

    return (
      <Card
        title={
          <Space>
            <FileWordOutlined />
            我的提交记录
          </Space>
        }
        size="small"
        loading={myFilesLoading && myFiles.length === 0}
      >
        <Tabs
          size="small"
          activeKey={myFilesTab}
          onChange={setMyFilesTab}
          items={typeTabItems}
          style={{ marginBottom: 12 }}
        />

        {myFilesLoading && myFiles.length > 0 && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <Spin size="small" />
          </div>
        )}

        {!myFilesLoading && filteredFiles.length === 0 && (
          <Empty
            description={myFilesTab === 'all' ? '本周期暂无提交记录' : '该考试类型暂无提交记录'}
            style={{ padding: '32px 0' }}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredFiles.map((file) => {
            const session = sessionMap[file.examSessionId];
            const typeInfo = TYPE_TABS.find((t) => t.key === session?.type);

            const scoreTag = file.manualScore != null
              ? <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0 }}>{file.manualScore} 分（复阅）</Tag>
              : file.aiScore > 0
                ? <Tag icon={<RobotOutlined />} color="blue" style={{ margin: 0 }}>{file.aiScore} 分（AI）</Tag>
                : null;

            const statusNode = file.status === 'failed' && file.aiComment
              ? <Tooltip title={file.aiComment}><span style={{ cursor: 'help' }}>{fileStatusTag(file.status)}</span></Tooltip>
              : fileStatusTag(file.status);

            return (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid #f0f0f0',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft: `3px solid ${typeInfo?.borderColor ?? '#d9d9d9'}`,
                  minWidth: 0,
                }}
              >
                {/* 考次标签 */}
                {typeInfo && (
                  <Tag color={typeInfo.color} style={{ margin: 0, flexShrink: 0, fontWeight: 600 }}>
                    {typeInfo.label}
                  </Tag>
                )}

                {/* 考次名称 */}
                <Text strong style={{ flexShrink: 0, fontSize: 13 }}>
                  {session?.name ?? '未知考次'}
                </Text>

                {/* 文件名（可点击预览，flex 自动压缩） */}
                <Space size={4} style={{ flex: 1, minWidth: 0 }}>
                  <FileWordOutlined style={{ color: '#2b5797', flexShrink: 0 }} />
                  <Text
                    style={{ cursor: 'pointer', color: '#1677ff', minWidth: 0 }}
                    ellipsis={{ tooltip: file.originalName }}
                    onClick={() => openPreview(file)}
                  >
                    {file.originalName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                    {formatFileSize(file.fileSize)}
                  </Text>
                </Space>

                {/* 状态 + 分数（右侧固定区域） */}
                <Space size={6} style={{ flexShrink: 0 }}>
                  {statusNode}
                  {scoreTag}
                </Space>

                {/* 上传时间 */}
                <Text type="secondary" style={{ fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {dayjs(file.createdAt).format('MM-DD HH:mm')}
                </Text>

                {/* 操作按钮 */}
                <Space size={4} style={{ flexShrink: 0 }}>
                  <Button size="small" type="link" icon={<EyeOutlined />} style={{ padding: '0 4px' }} onClick={() => openPreview(file)}>
                    预览
                  </Button>
                  {(file.status === 'graded' || file.status === 'reviewed') && (
                    <Button size="small" type="link" icon={<AuditOutlined />} style={{ padding: '0 4px' }} onClick={() => navigate(`/exam/papers/${file.id}/grading`)}>
                      阅卷明细
                    </Button>
                  )}
                  <Button
                    size="small" type="link" icon={<DownloadOutlined />} style={{ padding: '0 4px' }}
                    onClick={async () => {
                      try {
                        const { http } = await import('../../services/http');
                        const resp = await http.get(`/exam/papers/${file.id}/file`, { responseType: 'blob', timeout: 0 });
                        const url = URL.createObjectURL(resp.data);
                        const a = document.createElement('a'); a.href = url; a.download = file.originalName; a.click();
                        URL.revokeObjectURL(url);
                      } catch { message.error('下载失败'); }
                    }}
                  >
                    下载
                  </Button>
                  <Popconfirm title="确认删除该文件吗？" onConfirm={() => handleDelete(file.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                    <Button size="small" type="link" danger icon={<DeleteOutlined />} style={{ padding: '0 4px' }} />
                  </Popconfirm>
                </Space>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  // ===== 教职工考次列表列（抽屉内，每行一条记录） =====
  const fileColumns: ColumnsType<AnswerFile> = [
    {
      title: '答题人',
      key: 'uploader',
      width: 110,
      render: (_: unknown, r: AnswerFile) => (
        <Space size={4}>
          <Text strong style={{ fontSize: 13 }}>{r.uploaderName || '-'}</Text>
          {r.uploaderType === 'student'
            ? <Tag color="blue" style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}>学生</Tag>
            : <Tag color="orange" style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}>教职工</Tag>
          }
        </Space>
      ),
    },
    {
      title: '文件',
      key: 'file',
      render: (_: unknown, r: AnswerFile) => (
        <Space size={6}>
          <FileWordOutlined style={{ color: '#2b5797', fontSize: 13, flexShrink: 0 }} />
          <Text
            style={{ cursor: 'pointer', color: '#1677ff', maxWidth: 200 }}
            ellipsis={{ tooltip: r.originalName }}
            onClick={() => openPreview(r)}
          >
            {r.originalName}
          </Text>
          <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
            {formatFileSize(r.fileSize)}
          </Text>
        </Space>
      ),
    },
    {
      title: '班级',
      dataIndex: 'className',
      width: 110,
      render: (v: string) => v
        ? <Tag color="geekblue" style={{ margin: 0 }}>{v}</Tag>
        : <Text type="secondary" style={{ fontSize: 12 }}>未设置</Text>,
    },
    {
      title: '评分',
      key: 'score',
      width: 120,
      render: (_: unknown, r: AnswerFile) => {
        if (r.manualScore != null) return <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>{r.manualScore} 分（复阅）</Tag>;
        if (r.aiScore > 0) return <Tag color="blue" icon={<RobotOutlined />} style={{ margin: 0 }}>{r.aiScore} 分（AI）</Tag>;
        return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string, r: AnswerFile) => {
        const tag = fileStatusTag(s);
        if (s === 'failed' && r.aiComment) {
          return <Tooltip title={r.aiComment} placement="left"><span style={{ cursor: 'help' }}>{tag}</span></Tooltip>;
        }
        return tag;
      },
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      width: 130,
      render: (v: string) => (
        <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{dayjs(v).format('YYYY-MM-DD HH:mm')}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, r: AnswerFile) => (
        <Space size={0}>
          {(r.status === 'graded' || r.status === 'reviewed') && (
            <Button type="link" size="small" icon={<AuditOutlined />} onClick={() => navigate(`/exam/papers/${r.id}/grading`)}>阅卷明细</Button>
          )}
          <Popconfirm title="确认删除该文件吗？" onConfirm={() => handleDelete(r.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ===== 教职工：考次列表（按类型分 Tab） =====
  const renderSessionTable = (type: string) => {
    const sessions = allSessions.filter((s) => s.type === type);
    if (sessions.length === 0) {
      return <Empty description="暂无该类型考次，请先导入考试安排表" style={{ padding: '24px 0' }} />;
    }
    const cols: ColumnsType<ExamSession> = [
      {
        title: '考次名称',
        dataIndex: 'name',
        key: 'name',
        render: (name, r) => (
          <Button type="link" style={{ padding: 0 }} onClick={() => openSessionDrawer(r)}>
            {name}
          </Button>
        ),
      },
      { title: '考试日期', dataIndex: 'examDate', key: 'examDate', width: 110 },
      {
        title: '覆盖单元', dataIndex: 'unitRange', key: 'unitRange', width: 120,
        render: (v) => v || '-',
      },
      {
        title: '已提交人数', dataIndex: 'submitCount', key: 'submitCount', width: 110,
        align: 'right',
        render: (v) => (
          <Text strong style={{ color: v > 0 ? '#1677ff' : '#999' }}>
            {v}
          </Text>
        ),
      },
      {
        title: '操作', key: 'action', width: 80,
        render: (_, r) => (
          <Button size="small" onClick={() => openSessionDrawer(r)}>查看文件</Button>
        ),
      },
    ];
    return (
      <Table
        columns={cols}
        dataSource={sessions}
        rowKey="id"
        size="small"
        pagination={false}
      />
    );
  };

  return (
    <div style={{ padding: '0 4px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>阅卷管理</Title>
        </Col>
        <Col>
          <Space wrap>
            <Space>
              <CalendarOutlined />
              <Text strong>教学周期：</Text>
              <Select
                style={{ minWidth: 200 }}
                placeholder="请选择教学周期"
                value={selectedCycleId}
                onChange={(v) => { setSelectedCycleId(v); setUploadSessionId(null); }}
                loading={cycleLoading}
                options={cycles.map((c) => ({
                  value: c.id,
                  label: `${c.name}（${c.startDate} ~ ${c.endDate}）`,
                }))}
              />
            </Space>

            {/* 班级筛选：仅校长/教务处长/院长/专业主任可见 */}
            {needsClassFilter && (
              <Space>
                <Text strong>筛选班级：</Text>
                <TreeSelect
                  style={{ minWidth: 200 }}
                  placeholder="全部班级（按组织架构选择）"
                  allowClear
                  value={selectedClassId}
                  onChange={(v) => setSelectedClassId(v)}
                  treeData={classTreeData}
                  showSearch
                  treeNodeFilterProp="title"
                  treeLine
                  treeDefaultExpandAll={false}
                  styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
                />
              </Space>
            )}

            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                if (selectedCycleId) {
                  setCycleLoading(true);
                  fetchCycleDetail(selectedCycleId, selectedClassId)
                    .then(setCycleDetail)
                    .catch(() => message.error('刷新失败'))
                    .finally(() => setCycleLoading(false));
                }
                refreshMyFiles();
              }}
            />
          </Space>
        </Col>
      </Row>

      {/* 上传区：仅学生和讲师显示 */}
      {canUpload && (
        <Card
          title={
            <Space>
              <CloudUploadOutlined />
              {isStudent ? '上传我的答题试卷' : '上传班级答题试卷'}
            </Space>
          }
          size="small"
          style={{ marginBottom: 20 }}
        >
          {/* 考次选择 */}
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ marginRight: 8 }}>选择考次：</Text>
            <Select
              style={{ width: 320 }}
              placeholder="请先选择本次上传对应的考次"
              value={uploadSessionId}
              onChange={setUploadSessionId}
              options={sessionOptions}
              disabled={!selectedCycleId || allSessions.length === 0}
              showSearch
              optionFilterProp="label"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: canBatchUpload ? '1fr 1fr' : '1fr',
              gap: 16,
            }}
          >
            {/* 单文件上传 */}
            <div>
              <Dragger
                accept={WORD_ACCEPT}
                showUploadList={false}
                customRequest={handleSingleUpload}
                beforeUpload={(f) => validateFileSize(f, MAX_SINGLE_MB)}
                disabled={uploadPercent !== null || !uploadSessionId}
              >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">
                  {isStudent ? '点击或拖拽上传答题 Word 文件' : '点击或拖拽单个 Word 文件上传'}
                </p>
                <p className="ant-upload-hint" style={{ color: '#999' }}>
                  .doc / .docx，最大 {MAX_SINGLE_MB} MB
                </p>
              </Dragger>
              {uploadPercent !== null && (
                <div style={{ marginTop: 8 }}>
                  <Progress percent={uploadPercent} size="small" />
                  <div style={{ textAlign: 'right', marginTop: 4 }}>
                    <Button size="small" onClick={() => { singleAbortRef.current?.abort(); setUploadPercent(null); }}>取消</Button>
                  </div>
                </div>
              )}
            </div>

            {/* 批量上传（仅讲师） */}
            {canBatchUpload && (
              <div>
                <Dragger
                  accept={ARCHIVE_ACCEPT}
                  showUploadList={false}
                  customRequest={handleBatchUpload}
                  beforeUpload={(f) => validateFileSize(f, MAX_ARCHIVE_MB)}
                  disabled={batchPercent !== null || !uploadSessionId}
                >
                  <p className="ant-upload-drag-icon"><FolderOpenOutlined /></p>
                  <p className="ant-upload-text">点击或拖拽压缩包批量上传整班试卷</p>
                  <p className="ant-upload-hint" style={{ color: '#999' }}>
                    .zip / .tar.gz / .rar，最大 {MAX_ARCHIVE_MB} MB
                    <br />压缩包内所有 Word 文件将自动提取上传
                  </p>
                </Dragger>
                {batchPercent !== null && (
                  <div style={{ marginTop: 8 }}>
                    <Progress percent={batchPercent} size="small" status="active" />
                    <div style={{ textAlign: 'right', marginTop: 4 }}>
                      <Button size="small" onClick={() => { batchAbortRef.current?.abort(); setBatchPercent(null); }}>取消</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 下半部分：学生→提交记录卡片，教职工→考次统计表 */}
      {!selectedCycleId ? (
        <Card>
          <Empty description="请先选择教学周期" />
        </Card>
      ) : isStudent ? (
        renderMySubmissionCards()
      ) : (
        <Card
          title="考次提交统计"
          size="small"
          loading={cycleLoading}
        >
          <Tabs
            type="card"
            items={TYPE_TABS.map(({ key, label, color }) => ({
              key,
              label: (
                <Space>
                  <Tag color={color} style={{ margin: 0 }}>{label}</Tag>
                  <span>{allSessions.filter((s) => s.type === key).length} 场</span>
                </Space>
              ),
              children: renderSessionTable(key),
            }))}
          />
        </Card>
      )}

      {/* 考次文件列表抽屉（教职工用） */}
      <Drawer
        title={
          <Space>
            <FileWordOutlined />
            {drawerSession?.name ?? '文件列表'}
            {drawerSession && (
              <Tag color={TYPE_TABS.find((t) => t.key === drawerSession.type)?.color}>
                {TYPE_TABS.find((t) => t.key === drawerSession.type)?.label}
              </Tag>
            )}
          </Space>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={900}
      >
        {drawerSession && (
          <div style={{
            marginBottom: 16,
            padding: '10px 16px',
            background: '#f5f7fa',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}>
            <Space>
              <CalendarOutlined style={{ color: '#1677ff' }} />
              <Text type="secondary" style={{ fontSize: 13 }}>考试日期</Text>
              <Text strong style={{ fontSize: 13 }}>{drawerSession.examDate}</Text>
            </Space>
            {drawerSession.unitRange && (
              <Space>
                <Text type="secondary" style={{ fontSize: 13 }}>覆盖单元</Text>
                <Text style={{ fontSize: 13 }}>{drawerSession.unitRange}</Text>
              </Space>
            )}
            <Space>
              <Text type="secondary" style={{ fontSize: 13 }}>已提交</Text>
              <Text strong style={{ fontSize: 13, color: '#1677ff' }}>{drawerSession.submitCount} 人</Text>
            </Space>
          </div>
        )}
        <Table<AnswerFile>
          columns={fileColumns}
          dataSource={drawerFiles}
          rowKey="id"
          loading={drawerLoading}
          size="small"
          pagination={{
            current: drawerPage,
            pageSize: 20,
            total: drawerTotal,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => {
              if (drawerSession) loadDrawerFiles(drawerSession, p);
            },
          }}
        />
      </Drawer>

      {/* Word 预览 Modal（全屏） */}
      <Modal
        open={!!previewFile}
        title={
          <Space>
            <FileWordOutlined style={{ color: '#2b5797' }} />
            {previewFile?.originalName}
            {previewFile && fileStatusTag(previewFile.status)}
          </Space>
        }
        onCancel={() => { setPreviewFile(null); setPreviewLoading(false); setPreviewUnsupported(false); }}
        footer={
          <Space>
            <Button
              type={previewUnsupported ? 'primary' : 'default'}
              icon={<DownloadOutlined />}
              onClick={async () => {
                if (!previewFile) return;
                try {
                  const { http } = await import('../../services/http');
                  const resp = await http.get(`/exam/papers/${previewFile.id}/file`, {
                    responseType: 'blob', timeout: 0,
                  });
                  const url = URL.createObjectURL(resp.data);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = previewFile.originalName;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  message.error('下载失败');
                }
              }}
            >
              下载
            </Button>
            <Button onClick={() => { setPreviewFile(null); setPreviewLoading(false); setPreviewUnsupported(false); }}>关闭</Button>
          </Space>
        }
        width="100vw"
        styles={{ body: { padding: '12px 16px' } }}
        wrapClassName="preview-fullscreen-wrap"
        destroyOnHidden
      >
        {previewLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <Space direction="vertical" align="center">
              <LoadingOutlined style={{ fontSize: 36, color: '#1677ff' }} spin />
              <span style={{ color: '#888' }}>文件加载中…</span>
            </Space>
          </div>
        )}

        {/* LibreOffice 未安装时的友好提示 */}
        {previewUnsupported && !previewLoading && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '40vh', gap: 16,
          }}>
            <FileWordOutlined style={{ fontSize: 64, color: '#2b5797', opacity: 0.7 }} />
            <Text strong style={{ fontSize: 16 }}>
              暂不支持 .doc 格式在线预览
            </Text>
            <Text type="secondary" style={{ textAlign: 'center', maxWidth: 420 }}>
              该文件为旧版 Word 格式（.doc），服务器尚未安装文档转换工具。
              <br />请点击下方「下载」按钮，在本地 Word 或 WPS 中打开查看。
            </Text>
            <Text type="secondary" style={{ fontSize: 12, color: '#bbb' }}>
              服务器管理员可通过安装 LibreOffice 来启用 .doc 在线预览功能
            </Text>
          </div>
        )}

        <div
          ref={previewContainerRef}
          style={{ display: (previewLoading || previewUnsupported) ? 'none' : 'block' }}
        />
      </Modal>
    </div>
  );
};

export default ExamPage;
