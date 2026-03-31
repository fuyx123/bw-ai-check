import React, { useCallback, useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import {
  Button,
  Card,
  Modal,
  Popconfirm,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import message from '../../utils/message';
import type { RcFile, UploadProps } from 'antd/es/upload';
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileWordOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import {
  batchUploadAnswerFiles,
  deleteAnswerFile,
  fetchAnswerFiles,
  uploadAnswerFile,
  type AnswerFile,
} from '../../services/exam';
import { useAuthStore } from '../../stores/authStore';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const WORD_ACCEPT = '.doc,.docx';
const ARCHIVE_ACCEPT = '.zip,.tar,.tar.gz,.tgz,.tar.bz2,.rar';
const MAX_SINGLE_MB = 50;
const MAX_ARCHIVE_MB = 200;

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

const ExamPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isStudent = currentUser?.userType === 'student';

  const [files, setFiles] = useState<AnswerFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [batchPercent, setBatchPercent] = useState<number | null>(null);

  const [previewFile, setPreviewFile] = useState<AnswerFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const openPreview = useCallback(async (file: AnswerFile) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    try {
      const { http } = await import('../../services/http');
      const resp = await http.get(`/exam/papers/${file.id}/file`, {
        responseType: 'arraybuffer',
        timeout: 0,
      });
      const blob = new Blob([resp.data]);
      // 等 DOM 挂载后渲染
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
        });
      }
    } catch {
      message.error('预览失败，请尝试下载后查看');
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // AbortController 用于取消上传
  const singleAbortRef = useRef<AbortController | null>(null);
  const batchAbortRef = useRef<AbortController | null>(null);

  const loadFiles = useCallback(
    async (p = page) => {
      setLoading(true);
      try {
        const result = await fetchAnswerFiles({ page: p, pageSize });
        setFiles(result.items);
        setTotal(result.total);
      } catch {
        message.error('加载文件列表失败');
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize],
  );

  useEffect(() => {
    loadFiles(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== 单文件上传 =====
  const beforeSingleUpload = (file: RcFile) => {
    return validateFileSize(file, MAX_SINGLE_MB);
  };

  const handleSingleUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    singleAbortRef.current = new AbortController();
    setUploadPercent(0);
    try {
      await uploadAnswerFile(file as File, {
        onProgress: setUploadPercent,
        signal: singleAbortRef.current.signal,
      });
      message.success('文件上传成功');
      onSuccess?.({});
      setUploadPercent(null);
      loadFiles(1);
      setPage(1);
    } catch (err: unknown) {
      const aborted = err instanceof Error && err.name === 'CanceledError';
      if (!aborted) {
        const msg = err instanceof Error ? err.message : '上传失败';
        message.error(msg);
        onError?.(new Error(msg));
      }
      setUploadPercent(null);
    }
  };

  const cancelSingleUpload = () => {
    singleAbortRef.current?.abort();
    setUploadPercent(null);
    message.info('已取消上传');
  };

  // ===== 压缩包批量上传 =====
  const beforeBatchUpload = (file: RcFile) => {
    return validateFileSize(file, MAX_ARCHIVE_MB);
  };

  const handleBatchUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    batchAbortRef.current = new AbortController();
    setBatchPercent(0);
    try {
      const result = await batchUploadAnswerFiles(file as File, {
        onProgress: setBatchPercent,
        signal: batchAbortRef.current.signal,
      });
      message.success(`批量上传成功，共提取 ${result.count} 个文件`);
      onSuccess?.({});
      setBatchPercent(null);
      loadFiles(1);
      setPage(1);
    } catch (err: unknown) {
      const aborted = err instanceof Error && err.name === 'CanceledError';
      if (!aborted) {
        const msg = err instanceof Error ? err.message : '批量上传失败';
        message.error(msg);
        onError?.(new Error(msg));
      }
      setBatchPercent(null);
    }
  };

  const cancelBatchUpload = () => {
    batchAbortRef.current?.abort();
    setBatchPercent(null);
    message.info('已取消上传');
  };

  // ===== 删除 =====
  const handleDelete = async (id: string) => {
    try {
      await deleteAnswerFile(id);
      message.success('删除成功');
      loadFiles(page);
    } catch {
      message.error('删除失败');
    }
  };

  // ===== 表格列 =====
  const columns: ColumnsType<AnswerFile> = [
    {
      title: '文件名',
      dataIndex: 'originalName',
      ellipsis: true,
      render: (name: string, record: AnswerFile) => (
        <Space>
          <FileWordOutlined style={{ color: '#2b5797' }} />
          <Text>{name}</Text>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            style={{ padding: 0 }}
            onClick={() => openPreview(record)}
          />
        </Space>
      ),
    },
    {
      title: '上传人',
      dataIndex: 'uploaderName',
      width: 110,
    },
    {
      title: '班级',
      dataIndex: 'className',
      width: 140,
      render: (v: string) => v || '-',
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: string) =>
        status === 'reviewed' ? (
          <Tag color="green">已批阅</Tag>
        ) : (
          <Tag color="blue">待批阅</Tag>
        ),
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => v?.replace('T', ' ').slice(0, 19) ?? '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: AnswerFile) => (
        <Popconfirm
          title="确认删除该文件吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="删除"
          cancelText="取消"
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      <Title level={4} style={{ marginBottom: 20 }}>
        阅卷管理
      </Title>

      {/* 上传区域 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isStudent ? '1fr' : '1fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* 单文件上传 */}
        <Card
          title={
            <Space>
              <CloudUploadOutlined />
              {isStudent ? '上传我的答题文件' : '单文件上传'}
            </Space>
          }
          size="small"
        >
          <Dragger
            accept={WORD_ACCEPT}
            showUploadList={false}
            customRequest={handleSingleUpload}
            beforeUpload={beforeSingleUpload}
            disabled={uploadPercent !== null}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽 Word 文件到此区域上传</p>
            <p className="ant-upload-hint" style={{ color: '#999' }}>
              支持 .doc、.docx，单文件最大 {MAX_SINGLE_MB} MB
            </p>
          </Dragger>

          {uploadPercent !== null && (
            <div style={{ marginTop: 12 }}>
              <Progress percent={uploadPercent} size="small" />
              <div style={{ textAlign: 'right', marginTop: 4 }}>
                <Button size="small" onClick={cancelSingleUpload}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* 压缩包批量上传（仅教职工） */}
        {!isStudent && (
          <Card
            title={
              <Space>
                <FolderOpenOutlined />
                批量上传（压缩包）
              </Space>
            }
            size="small"
          >
            <Dragger
              accept={ARCHIVE_ACCEPT}
              showUploadList={false}
              customRequest={handleBatchUpload}
              beforeUpload={beforeBatchUpload}
              disabled={batchPercent !== null}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽压缩包到此区域批量上传</p>
              <p className="ant-upload-hint" style={{ color: '#999' }}>
                支持 .zip、.tar.gz、.tgz、.tar.bz2、.rar，最大 {MAX_ARCHIVE_MB} MB
                <br />
                压缩包内所有 Word 文件将自动提取并上传
              </p>
            </Dragger>

            {batchPercent !== null && (
              <div style={{ marginTop: 12 }}>
                <Progress percent={batchPercent} size="small" status="active" />
                <div style={{ textAlign: 'right', marginTop: 4 }}>
                  <Button size="small" onClick={cancelBatchUpload}>
                    取消
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* 文件列表 */}
      <Card title="已上传文件" size="small">
        <Table<AnswerFile>
          columns={columns}
          dataSource={files}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showTotal: (t) => `共 ${t} 条`,
            showSizeChanger: false,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>

      {/* Word 文件预览 Modal（docx-preview 本地渲染，全屏） */}
      <Modal
        open={!!previewFile}
        title={
          <Space>
            <FileWordOutlined style={{ color: '#2b5797' }} />
            {previewFile?.originalName}
          </Space>
        }
        onCancel={() => { setPreviewFile(null); setPreviewLoading(false); }}
        footer={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={async () => {
                if (!previewFile) return;
                try {
                  const { http } = await import('../../services/http');
                  const resp = await http.get(`/exam/papers/${previewFile.id}/file`, {
                    responseType: 'blob',
                    timeout: 0,
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
            <Button onClick={() => { setPreviewFile(null); setPreviewLoading(false); }}>关闭</Button>
          </Space>
        }
        width="100vw"
        styles={{ body: { padding: '12px 16px' } }}
        wrapClassName="preview-fullscreen-wrap"
        destroyOnHidden
      >
        {previewLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Space direction="vertical" align="center">
              <LoadingOutlined style={{ fontSize: 36, color: '#1677ff' }} spin />
              <span style={{ color: '#888' }}>文件加载中…</span>
            </Space>
          </div>
        )}
        <div
          ref={previewContainerRef}
          style={{ display: previewLoading ? 'none' : 'block' }}
        />
      </Modal>
    </div>
  );
};

export default ExamPage;
