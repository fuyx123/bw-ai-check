import React, { useEffect, useState } from 'react';
import {
  Button, Card, Col, DatePicker, Descriptions, Divider, Drawer, Form, Input, Modal,
  Popconfirm, Row, Select, Space, Spin, Table, Tag, Typography, Upload,
} from 'antd';
import {
  CalendarOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined,
  TeamOutlined, UploadOutlined, UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import {
  createCycle, deleteCycle, fetchCycleDetail, fetchCycles,
  importSchedule,
  type ExamSession, type TeachingCycle,
} from '../../services/cycle';
import {
  fetchSessionGraders, upsertSessionGrader, deleteSessionGrader,
  type ExamGrader,
} from '../../services/exam';
import { fetchUsers } from '../../services/users';
import message from '../../utils/message';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const TYPE_TAG: Record<string, { color: string; label: string }> = {
  daily:   { color: 'blue',   label: '日考' },
  weekly:  { color: 'orange', label: '周考' },
  monthly: { color: 'red',    label: '月考' },
};

// 阅卷老师配置面板（仅周考/月考可见）
const GraderPanel: React.FC<{ session: ExamSession }> = ({ session }) => {
  const [graders, setGraders] = useState<ExamGrader[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffOptions, setStaffOptions] = useState<{ value: string; label: string }[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedGrader, setSelectedGrader] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // 从现有提交记录中推导可选班级（实际项目可改为独立班级下拉接口）
  const classOptions = Array.from(
    new Map(graders.map((g) => [g.classId, g.className])).entries()
  ).map(([value, label]) => ({ value, label: label || value }));

  const loadGraders = async () => {
    setLoading(true);
    try {
      setGraders(await fetchSessionGraders(session.id));
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      const res = await fetchUsers(1, 200, { userType: 'staff' });
      setStaffOptions(res.items.map((u) => ({ value: u.id, label: `${u.name}（${u.loginId ?? u.email ?? ''}）` })));
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    loadGraders();
    loadStaff();
  }, [session.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!selectedClass || !selectedGrader) {
      message.warning('请选择班级和阅卷老师');
      return;
    }
    const graderName = staffOptions.find((o) => o.value === selectedGrader)?.label ?? '';
    const className = classOptions.find((o) => o.value === selectedClass)?.label ?? selectedClassName;
    setSaving(true);
    try {
      await upsertSessionGrader(session.id, {
        classId: selectedClass,
        className,
        graderId: selectedGrader,
        graderName,
      });
      message.success('阅卷老师设置成功');
      setSelectedClass('');
      setSelectedGrader('');
      loadGraders();
    } catch {
      message.error('设置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSessionGrader(id);
      message.success('已删除');
      loadGraders();
    } catch {
      message.error('删除失败');
    }
  };

  const graderColumns: ColumnsType<ExamGrader> = [
    { title: '班级', dataIndex: 'className', render: (v, r) => v || r.classId },
    { title: '阅卷老师', dataIndex: 'graderName', render: (v, r) => <Space><UserOutlined />{v || r.graderId}</Space> },
    {
      title: '操作', key: 'action', width: 80,
      render: (_, r) => (
        <Popconfirm title="确认删除该阅卷老师分配？" onConfirm={() => handleDelete(r.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
          <Button type="link" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: '12px 0' }}>
      <Divider titlePlacement="left" style={{ margin: '8px 0 12px' }}>
        <TeamOutlined /> 阅卷老师配置
      </Divider>

      {/* 新增分配行 */}
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          style={{ width: 180 }}
          placeholder="选择班级"
          value={selectedClass || undefined}
          onChange={(v, opt: any) => {
            setSelectedClass(v);
            setSelectedClassName(opt?.label ?? '');
          }}
          allowClear
          showSearch
          optionFilterProp="label"
          options={classOptions.length > 0 ? classOptions : undefined}
          notFoundContent={
            <div>
              <div style={{ padding: '4px 8px', color: '#999', fontSize: 12 }}>若无班级可选，请先在阅卷管理中上传文件</div>
              <Input
                size="small"
                placeholder="或手动输入班级 ID"
                style={{ margin: '4px 8px', width: 'calc(100% - 16px)' }}
                onChange={(e) => setSelectedClass(e.target.value)}
              />
            </div>
          }
        />
        <Select
          style={{ width: 240 }}
          placeholder="选择阅卷老师（教职工）"
          value={selectedGrader || undefined}
          onChange={setSelectedGrader}
          allowClear
          showSearch
          loading={staffLoading}
          optionFilterProp="label"
          options={staffOptions}
        />
        <Button type="primary" size="small" onClick={handleSave} loading={saving}>
          保存
        </Button>
      </Space>

      {/* 已配置列表 */}
      {loading ? (
        <Spin size="small" />
      ) : (
        <Table
          columns={graderColumns}
          dataSource={graders}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: '暂未配置阅卷老师' }}
        />
      )}
    </div>
  );
};

const CyclePage: React.FC = () => {
  const [cycles, setCycles] = useState<TeachingCycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<TeachingCycle | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [form] = Form.useForm();

  const loadCycles = async () => {
    setLoading(true);
    try {
      setCycles(await fetchCycles());
    } catch {
      message.error('加载教学周期失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCycles(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    const [start, end] = values.dateRange;
    try {
      await createCycle({
        name: values.name,
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
      });
      message.success('创建成功');
      setCreateOpen(false);
      form.resetFields();
      loadCycles();
    } catch {
      message.error('创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCycle(id);
      message.success('删除成功');
      loadCycles();
    } catch {
      message.error('删除失败');
    }
  };

  const handleOpenDetail = async (cycle: TeachingCycle) => {
    try {
      const detail = await fetchCycleDetail(cycle.id);
      setSelectedCycle(detail);
      setExpandedSessions(new Set());
      setDetailOpen(true);
    } catch {
      message.error('加载详情失败');
    }
  };

  const handleOpenImport = (cycle: TeachingCycle) => {
    setSelectedCycle(cycle);
    setImportFile(null);
    setImportOpen(true);
  };

  const handleImport = async () => {
    if (!importFile || !selectedCycle) {
      message.warning('请选择 Excel 文件');
      return;
    }
    setImportLoading(true);
    try {
      const res = await importSchedule(selectedCycle.id, importFile);
      message.success(`导入成功，共 ${res.count} 个考次`);
      setImportOpen(false);
      if (detailOpen) {
        const detail = await fetchCycleDetail(selectedCycle.id);
        setSelectedCycle(detail);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '导入失败';
      message.error(msg);
    } finally {
      setImportLoading(false);
    }
  };

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const sessionColumns: ColumnsType<ExamSession> = [
    {
      title: '考次名称',
      dataIndex: 'name',
      key: 'name',
      render: (name, r) => (
        <Space>
          <Tag color={TYPE_TAG[r.type]?.color}>{TYPE_TAG[r.type]?.label}</Tag>
          <Text>{name}</Text>
          {(r.type === 'weekly' || r.type === 'monthly') && (
            <Button
              type="link"
              size="small"
              icon={<TeamOutlined />}
              style={{ padding: 0, color: expandedSessions.has(r.id) ? '#fa8c16' : '#1677ff' }}
              onClick={() => toggleSessionExpand(r.id)}
            >
              阅卷老师{expandedSessions.has(r.id) ? '（收起）' : ''}
            </Button>
          )}
        </Space>
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
      render: (v) => <Text strong style={{ color: v > 0 ? '#1677ff' : '#999' }}>{v}</Text>,
    },
  ];

  const columns: ColumnsType<TeachingCycle> = [
    {
      title: '周期名称',
      dataIndex: 'name',
      key: 'name',
      render: (name, r) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => handleOpenDetail(r)}>
          <CalendarOutlined style={{ marginRight: 4 }} />{name}
        </Button>
      ),
    },
    { title: '开始日期', dataIndex: 'startDate', key: 'startDate', width: 110 },
    { title: '结束日期', dataIndex: 'endDate', key: 'endDate', width: 110 },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 175,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<UploadOutlined />} onClick={() => handleOpenImport(r)}>
            导入安排表
          </Button>
          <Popconfirm
            title="确认删除该周期及其所有考次吗？"
            onConfirm={() => handleDelete(r.id)}
            okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>教学周期管理</Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadCycles}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建周期
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={cycles}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      {/* 新建周期弹窗 */}
      <Modal
        title="新建教学周期"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="name" label="周期名称" rules={[{ required: true, message: '请输入周期名称' }]}>
            <Input placeholder="如：3月教学周期" />
          </Form.Item>
          <Form.Item name="dateRange" label="周期日期范围" rules={[{ required: true, message: '请选择日期范围' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入考试安排表弹窗 */}
      <Modal
        title={`导入考试安排表 — ${selectedCycle?.name ?? ''}`}
        open={importOpen}
        onOk={handleImport}
        onCancel={() => setImportOpen(false)}
        okText="开始导入"
        confirmLoading={importLoading}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
          <Text type="secondary">
            上传 Excel 格式的考试安排表，系统将自动解析日考、周考、月考考次。
            重复导入会覆盖当前周期的全部考次。
          </Text>
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={(file) => { setImportFile(file); return false; }}
            maxCount={1}
            onRemove={() => setImportFile(null)}
          >
            <Button icon={<UploadOutlined />}>选择 Excel 文件</Button>
          </Upload>
        </Space>
      </Modal>

      {/* 考次详情抽屉（含阅卷老师配置） */}
      <Drawer
        title={
          <Space>
            <CalendarOutlined />
            <span>{selectedCycle?.name}</span>
            <Tag>{selectedCycle?.startDate} ~ {selectedCycle?.endDate}</Tag>
          </Space>
        }
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setExpandedSessions(new Set()); }}
        size={720}
        extra={
          <Button
            icon={<UploadOutlined />}
            onClick={() => { if (selectedCycle) handleOpenImport(selectedCycle); }}
          >
            导入安排表
          </Button>
        }
      >
        {selectedCycle && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="开始日期">{selectedCycle.startDate}</Descriptions.Item>
              <Descriptions.Item label="结束日期">{selectedCycle.endDate}</Descriptions.Item>
              <Descriptions.Item label="考次总数">{selectedCycle.sessions?.length ?? 0}</Descriptions.Item>
            </Descriptions>

            {/* 按考次展示，周考/月考可展开阅卷老师配置 */}
            <Table
              columns={sessionColumns}
              dataSource={selectedCycle.sessions ?? []}
              rowKey="id"
              size="small"
              pagination={false}
              expandable={{
                expandedRowKeys: Array.from(expandedSessions),
                expandedRowRender: (record) => <GraderPanel session={record} />,
                rowExpandable: (record) => record.type === 'weekly' || record.type === 'monthly',
                showExpandColumn: false,
              }}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default CyclePage;
