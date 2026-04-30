import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  TreeSelect,
  Typography,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { CloudUploadOutlined, InboxOutlined } from '@ant-design/icons';

import { useAuthStore } from '../../stores/authStore';
import { useDepartmentStore } from '../../stores/departmentStore';
import message from '../../utils/message';
import {
  fetchHomeworkMissing,
  fetchHomeworkReport,
  fetchHomeworkSubmissions,
  fetchMyHomeworkSubmissions,
  uploadHomeworkSubmission,
  type HomeworkMissingItem,
  type HomeworkReport,
  type HomeworkSubmission,
} from '../../services/homework';
import type { Department } from '../../types/rbac';
import HomeworkReportPanel from './components/HomeworkReportPanel';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface ClassTreeNode {
  key: string;
  value: string;
  title: string;
  disabled?: boolean;
  selectable?: boolean;
  children?: ClassTreeNode[];
}

function buildClassTreeData(depts: Department[]): ClassTreeNode[] {
  return depts.flatMap((dept) => {
    const children =
      dept.children && dept.children.length > 0 ? buildClassTreeData(dept.children) : undefined;

    return [{
      key: dept.id,
      value: dept.id,
      title: dept.name,
      selectable: true,
      children,
    }];
  });
}

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

const HomeworkPage: React.FC = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const isStudent = currentUser?.userType === 'student';
  const needsClassFilter = currentUser?.userType === 'staff' && currentUser?.dataScope !== 'class';
  const allDepartments = useDepartmentStore((state) => state.departments);
  const fetchDepartments = useDepartmentStore((state) => state.fetchDepartments);
  const classTreeData = useMemo(() => buildClassTreeData(allDepartments), [allDepartments]);

  const [studentPage, setStudentPage] = useState(1);
  const [studentSubmissions, setStudentSubmissions] = useState<HomeworkSubmission[]>([]);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentLoading, setStudentLoading] = useState(false);

  const [staffPage, setStaffPage] = useState(1);
  const [staffSubmissions, setStaffSubmissions] = useState<HomeworkSubmission[]>([]);
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffLoading, setStaffLoading] = useState(false);

  const [missingLoading, setMissingLoading] = useState(false);
  const [missingItems, setMissingItems] = useState<HomeworkMissingItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<HomeworkReport | null>(null);

  const [selectedArchive, setSelectedArchive] = useState<File | null>(null);
  const uploadFileList: UploadFile[] = selectedArchive
    ? [{
        uid: selectedArchive.name,
        name: selectedArchive.name,
        status: 'done',
        size: selectedArchive.size,
      }]
    : [];

  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);

  const [classFilter, setClassFilter] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>();
  const shouldShowStaffData = !isStudent && (!needsClassFilter || Boolean(classFilter));
  const today = dayjs().format('YYYY-MM-DD');

  const loadStudentSubmissions = async (page = 1) => {
    if (!isStudent) return;
    setStudentLoading(true);
    try {
      const data = await fetchMyHomeworkSubmissions({ page, pageSize: 10 });
      setStudentSubmissions(data.items ?? []);
      setStudentTotal(data.total ?? 0);
      setStudentPage(page);
    } catch {
      message.error('加载我的作业失败');
    } finally {
      setStudentLoading(false);
    }
  };

  const loadStaffSubmissions = async (page = 1) => {
    if (isStudent) return;
    setStaffLoading(true);
    try {
      const data = await fetchHomeworkSubmissions({
        page,
        pageSize: 10,
        departmentId: classFilter,
        status: statusFilter,
      });
      setStaffSubmissions(data.items ?? []);
      setStaffTotal(data.total ?? 0);
      setStaffPage(page);
    } catch {
      setStaffSubmissions([]);
      setStaffTotal(0);
      message.error('加载审批记录失败');
    } finally {
      setStaffLoading(false);
    }
  };

  const loadMissing = async () => {
    if (isStudent) return;
    setMissingLoading(true);
    try {
      const data = await fetchHomeworkMissing({
        departmentId: classFilter,
        checkDate: today,
      });
      setMissingItems(data);
    } catch {
      setMissingItems([]);
      message.error('加载未上传统计失败');
    } finally {
      setMissingLoading(false);
    }
  };

  const loadReport = async () => {
    if (isStudent) return;
    setReportLoading(true);
    try {
      const data = await fetchHomeworkReport({
        departmentId: classFilter,
        checkDate: today,
      });
      setReport(data);
    } catch {
      setReport(null);
      message.error('加载汇报看板失败');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (isStudent || !needsClassFilter || allDepartments.length > 0) {
      return;
    }
    fetchDepartments().catch(() => message.error('加载班级组织架构失败'));
  }, [allDepartments.length, fetchDepartments, isStudent, needsClassFilter]);

  useEffect(() => {
    if (isStudent) {
      void loadStudentSubmissions(studentPage);
      return;
    }
    if (!shouldShowStaffData) {
      setReport(null);
      setStaffSubmissions([]);
      setStaffTotal(0);
      setMissingItems([]);
      return;
    }
    void loadStaffSubmissions(1);
    void loadMissing();
    void loadReport();
  }, [classFilter, statusFilter, today, isStudent, shouldShowStaffData]); // eslint-disable-line react-hooks/exhaustive-deps

  const studentColumns: ColumnsType<HomeworkSubmission> = [
    { title: '作业', dataIndex: 'homeworkTitle', key: 'homeworkTitle' },
    { title: '压缩包', dataIndex: 'archiveOriginalName', key: 'archiveOriginalName', ellipsis: true },
    { title: '状态', dataIndex: 'reviewStatus', key: 'reviewStatus', render: reviewStatusTag },
    { title: '得分', dataIndex: 'reviewScore', key: 'reviewScore', width: 90 },
    { title: '提交时间', dataIndex: 'submittedAt', key: 'submittedAt', render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => <Link to={`/homework/submissions/${record.id}`}>查看明细</Link>,
    },
  ];

  const staffColumns: ColumnsType<HomeworkSubmission> = [
    { title: '作业', dataIndex: 'homeworkTitle', key: 'homeworkTitle' },
    { title: '学生', dataIndex: 'studentName', key: 'studentName', width: 120 },
    { title: '班级', dataIndex: 'className', key: 'className', ellipsis: true },
    { title: '压缩包', dataIndex: 'archiveOriginalName', key: 'archiveOriginalName', ellipsis: true },
    { title: '状态', dataIndex: 'reviewStatus', key: 'reviewStatus', render: reviewStatusTag, width: 110 },
    { title: '得分', dataIndex: 'reviewScore', key: 'reviewScore', width: 90 },
    { title: '提交时间', dataIndex: 'submittedAt', key: 'submittedAt', render: (value) => dayjs(value).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => <Link to={`/homework/submissions/${record.id}`}>查看明细</Link>,
    },
  ];

  const missingColumns: ColumnsType<HomeworkMissingItem> = [
    { title: '日期', dataIndex: 'checkDate', key: 'checkDate', width: 120 },
    { title: '作业', dataIndex: 'homeworkTitle', key: 'homeworkTitle' },
    { title: '班级', dataIndex: 'className', key: 'className', width: 220, ellipsis: true },
    { title: '学生', dataIndex: 'studentName', key: 'studentName', width: 120 },
  ];

  const handleUpload = async () => {
    if (!selectedArchive) {
      message.warning('请先选择作业压缩包');
      return;
    }
    setUploading(true);
    setUploadPercent(0);
    try {
      await uploadHomeworkSubmission(selectedArchive, setUploadPercent);
      message.success('当天作业已上传，系统开始自动审批');
      setSelectedArchive(null);
      await loadStudentSubmissions(1);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
          <div>
            <Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>作业审批</Title>
            <Text type="secondary">
              {isStudent ? '学生只需上传当天作业压缩包，系统会自动解析文档并生成审批结果。' : '按权限范围查看当天各班级的作业检查情况和未上传学生。'}
            </Text>
          </div>
        </Space>

        {isStudent ? (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 16 }}
            message={`当前仅处理当天作业：${today}`}
          />
        ) : (
          <Space wrap style={{ marginTop: 16 }}>
            {needsClassFilter && (
              <TreeSelect
                style={{ width: 260 }}
                placeholder="全部范围（按组织架构选择）"
                allowClear
                value={classFilter}
                onChange={(value) => setClassFilter(value ?? undefined)}
                treeData={classTreeData}
                showSearch
                treeNodeFilterProp="title"
                treeLine
                treeDefaultExpandAll={false}
                styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
              />
            )}
            <DatePicker value={dayjs(today)} disabled />
            <Select
              allowClear
              placeholder="审批状态"
              style={{ width: 180 }}
              value={statusFilter}
              options={[
                { label: '已上传', value: 'uploaded' },
                { label: '解析中', value: 'parsing' },
                { label: '审批中', value: 'reviewing' },
                { label: '已通过', value: 'approved' },
                { label: '未通过', value: 'rejected' },
                { label: '审批失败', value: 'failed' },
              ]}
              onChange={(value) => setStatusFilter(value)}
            />
          </Space>
        )}
      </Card>

      {isStudent ? (
        <>
          <Card title="上传作业">
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Dragger
                beforeUpload={(file) => {
                  setSelectedArchive(file);
                  return false;
                }}
                fileList={uploadFileList}
                onRemove={() => {
                  setSelectedArchive(null);
                  return true;
                }}
                accept=".zip,.tar,.tar.gz,.tgz,.tar.bz2"
                maxCount={1}
                style={{ width: '100%' }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽代码压缩包到这里上传</p>
                <p className="ant-upload-hint">
                  支持 `.zip`、`.tar`、`.tar.gz`、`.tgz`、`.tar.bz2`，仅上传当天作业
                </p>
              </Dragger>
              {uploading && <Progress percent={uploadPercent} status="active" />}
              <Button type="primary" icon={<CloudUploadOutlined />} loading={uploading} onClick={handleUpload}>
                上传当天作业并开始审批
              </Button>
            </Space>
          </Card>

          <Card title="我的提交记录">
            <Table
              rowKey="id"
              columns={studentColumns}
              dataSource={studentSubmissions}
              loading={studentLoading}
              pagination={{
                current: studentPage,
                pageSize: 10,
                total: studentTotal,
                onChange: (page) => void loadStudentSubmissions(page),
              }}
            />
          </Card>
        </>
      ) : shouldShowStaffData ? (
        <>
          <HomeworkReportPanel report={report} loading={reportLoading} />

          <Card title="审批记录">
            <Table
              rowKey="id"
              columns={staffColumns}
              dataSource={staffSubmissions}
              loading={staffLoading}
              pagination={{
                current: staffPage,
                pageSize: 10,
                total: staffTotal,
                onChange: (page) => void loadStaffSubmissions(page),
              }}
            />
          </Card>

          <Card title="未上传统计">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`当前统计日期：${today}（当天作业）`}
            />
            <Table
              rowKey={(record) => `${record.homeworkId}-${record.studentId}`}
              columns={missingColumns}
              dataSource={missingItems}
              loading={missingLoading}
              pagination={false}
            />
          </Card>
        </>
      ) : (
        <Card>
          <Alert
            type="info"
            showIcon
            message="请选择学院、专业或班级后，再查看作业汇报、审批记录和未上传统计。"
          />
        </Card>
      )}
    </div>
  );
};

export default HomeworkPage;
