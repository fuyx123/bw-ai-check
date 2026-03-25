import React, { useEffect, useState, useCallback } from 'react';
import {
  Row,
  Col,
  Tree,
  Table,
  Button,
  Space,
  Avatar,
  Pagination,
  Tooltip,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Dropdown,
} from 'antd';
import type { MenuProps as AntMenuProps } from 'antd';
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  SyncOutlined,
  PlusOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import * as XLSX from 'xlsx';
import { useDepartmentStore } from '../../stores/departmentStore';
import { usePositionStore } from '../../stores/positionStore';
import StatCard from '../../components/common/StatCard';
import type { Department } from '../../types/rbac';

type ModalMode = 'addChild' | 'addRoot' | 'edit';

const DepartmentPage: React.FC = () => {
  const {
    departments,
    selectedDepartment,
    flatDepartments,
    fetchDepartments,
    selectDepartment,
    addDepartment,
    addRootDepartment,
    editDepartment,
    deleteDepartment,
  } = useDepartmentStore();

  const { positions } = usePositionStore();
  const positionOptions = positions.map((p) => ({ value: p.name, label: `${p.name}（${p.code}）` }));

  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([
    'dept-root',
    'dept-ie',
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('addChild');
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [detailDept, setDetailDept] = useState<Department | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form] = Form.useForm();
  const pageSize = 5;

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (!selectedDepartment && flatDepartments.length > 0) {
      selectDepartment('dept-ie');
    }
  }, [selectedDepartment, flatDepartments, selectDepartment]);

  const selectedId = selectedDepartment?.id || 'dept-ie';

  // ===== 构建树 =====
  const buildTreeData = (depts: Department[]): DataNode[] => {
    return depts.map((dept) => ({
      key: dept.id,
      title: dept.name,
      icon: dept.level === 'university' ? <ApartmentOutlined /> : undefined,
      children: dept.children?.length ? buildTreeData(dept.children) : undefined,
    }));
  };

  const treeData = buildTreeData(departments);

  // ===== 子部门列表 =====
  const currentDepts = flatDepartments.filter((d) => d.parentId === selectedId);
  const paginatedDepts = currentDepts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const childCount = currentDepts.length;
  const totalStaff = currentDepts.reduce((sum, d) => sum + d.staffCount, 0);

  const selectedDeptInfo =
    selectedDepartment || flatDepartments.find((d) => d.id === 'dept-ie');

  // ===== 导出 Excel =====
  const handleExport = useCallback(() => {
    const rows = flatDepartments.map((d) => ({
      部门ID: d.id,
      部门名称: d.name,
      部门编码: d.code,
      层级: d.level === 'university' ? '学校' : d.level === 'college' ? '学院' : '专业/实验室',
      上级部门ID: d.parentId || '—',
      负责人: d.leader.name,
      负责人职称: d.leader.title,
      在职工数: d.staffCount,
      最后修改: d.updatedAt,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // 设置列宽
    ws['!cols'] = [
      { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 14 },
      { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '组织架构');
    XLSX.writeFile(wb, `组织架构_${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success('组织架构已导出为 Excel');
  }, [flatDepartments]);

  // ===== 新增根部门 =====
  const openAddRoot = () => {
    setModalMode('addRoot');
    setEditingDept(null);
    form.resetFields();
    setModalOpen(true);
  };

  // ===== 新增子部门 =====
  const openAddChild = (parentId?: string) => {
    setModalMode('addChild');
    setEditingDept(null);
    setAddParentId(parentId ?? selectedId);
    form.resetFields();
    setModalOpen(true);
  };

  // ===== 编辑 =====
  const openEdit = (dept: Department) => {
    setModalMode('edit');
    setEditingDept(dept);
    form.setFieldsValue({
      name: dept.name,
      code: dept.code,
      leaderName: dept.leader.name,
      leaderTitle: dept.leader.title,
      staffCount: dept.staffCount,
    });
    setModalOpen(true);
  };

  // ===== 查看详情 =====
  const openDetail = (dept: Department) => {
    setDetailDept(dept);
    setDetailOpen(true);
  };

  // ===== 删除 =====
  const handleDelete = (dept: Department) => {
    const children = flatDepartments.filter((d) => d.parentId === dept.id);
    if (children.length > 0) {
      Modal.confirm({
        title: '确认删除',
        content: `「${dept.name}」下有 ${children.length} 个子部门，删除后将一并移除。确定继续吗？`,
        okText: '确认删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => {
          deleteDepartment(dept.id);
          message.success(`已删除「${dept.name}」及其子部门`);
        },
      });
    } else {
      deleteDepartment(dept.id);
      message.success(`已删除「${dept.name}」`);
    }
  };

  // ===== 提交表单 =====
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (modalMode === 'edit' && editingDept) {
        editDepartment(editingDept.id, {
          name: values.name,
          code: values.code.toUpperCase(),
          leader: { name: values.leaderName, title: values.leaderTitle },
          staffCount: values.staffCount || 0,
        });
        message.success(`已更新「${values.name}」`);
      } else if (modalMode === 'addChild') {
        const parentId = addParentId || selectedId;
        const newDept: Department = {
          id: `dept-${Date.now()}`,
          name: values.name,
          code: values.code.toUpperCase(),
          parentId,
          level: 'major',
          leader: { name: values.leaderName, title: values.leaderTitle },
          staffCount: values.staffCount || 0,
          status: 'operational',
          updatedAt: new Date().toISOString().split('T')[0],
        };
        addDepartment(parentId, newDept);
        if (!expandedKeys.includes(parentId)) {
          setExpandedKeys([...expandedKeys, parentId]);
        }
        message.success(`已添加子部门「${values.name}」`);
      } else if (modalMode === 'addRoot') {
        const newDept: Department = {
          id: `dept-${Date.now()}`,
          name: values.name,
          code: values.code.toUpperCase(),
          parentId: null,
          level: 'university',
          leader: { name: values.leaderName, title: values.leaderTitle },
          staffCount: values.staffCount || 0,
          status: 'operational',
          updatedAt: new Date().toISOString().split('T')[0],
        };
        addRootDepartment(newDept);
        message.success(`已添加根部门「${values.name}」`);
      }
      setModalOpen(false);
      form.resetFields();
    });
  };

  // ===== 表格行操作菜单 =====
  const getRowActions = (record: Department): AntMenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: '查看详情',
      onClick: () => openDetail(record),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑',
      onClick: () => openEdit(record),
    },
    {
      key: 'addChild',
      icon: <PlusOutlined />,
      label: '新增子部门',
      onClick: () => openAddChild(record.id),
    },
    { type: 'divider' as const },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: () => handleDelete(record),
    },
  ];

  const columns = [
    {
      title: '部门名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Department) => (
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => {
            selectDepartment(record.id);
            if (!expandedKeys.includes(record.id)) {
              setExpandedKeys([...expandedKeys, record.id]);
            }
            setCurrentPage(1);
          }}
        >
          <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.code}</div>
        </div>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'leader',
      key: 'leader',
      render: (_: unknown, record: Department) => (
        <Space>
          <Avatar size={32} style={{ background: '#1a2332', fontSize: 12 }}>
            {record.leader.name.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{record.leader.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.leader.title}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '在职工数',
      dataIndex: 'staffCount',
      key: 'staffCount',
      render: (count: number) => (
        <span style={{ fontWeight: 600, fontSize: 16 }}>{count}</span>
      ),
    },
    {
      title: '下属部门',
      key: 'childCount',
      render: (_: unknown, record: Department) => {
        const count = flatDepartments.filter((d) => d.parentId === record.id).length;
        return (
          <span style={{ color: count > 0 ? '#1677ff' : '#999', fontSize: 13 }}>
            {count} 个
          </span>
        );
      },
    },
    {
      title: '最后修改',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => (
        <span style={{ color: '#666', fontSize: 13 }}>{date}</span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: Department) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title={`确定删除「${record.name}」吗？`}
            description={
              flatDepartments.filter((d) => d.parentId === record.id).length > 0
                ? '该部门下有子部门，将一并删除'
                : undefined
            }
            onConfirm={() => {
              deleteDepartment(record.id);
              message.success(`已删除「${record.name}」`);
            }}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button type="text" icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
          <Dropdown menu={{ items: getRowActions(record) }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const addChildParentName = addParentId
    ? flatDepartments.find((d) => d.id === addParentId)?.name
    : selectedDeptInfo?.name;

  const modalTitle = {
    addChild: `新增子部门 — 归属于「${addChildParentName || ''}」`,
    addRoot: '新增根部门',
    edit: `编辑部门 — ${editingDept?.name || ''}`,
  }[modalMode];

  return (
    <div>
      <div className="page-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h2>部门管理</h2>
            <p>组织架构、学院及专业的层级配置与状态监控</p>
          </div>
          <div className="page-actions">
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出架构
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddRoot}>
              新增部门
            </Button>
          </div>
        </div>
      </div>

      <Row gutter={24}>
        {/* 左侧组织树 */}
        <Col span={6}>
          <div className="org-tree-panel">
            <div className="panel-title">
              <span>组织层级树</span>
              <Tooltip title="刷新">
                <SyncOutlined
                  style={{ color: '#999', cursor: 'pointer' }}
                  onClick={() => {
                    fetchDepartments();
                    message.info('已刷新');
                  }}
                />
              </Tooltip>
            </div>
            <Tree
              showLine={{ showLeafIcon: false }}
              showIcon
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys)}
              selectedKeys={[selectedId]}
              onSelect={(keys) => {
                if (keys.length > 0) {
                  selectDepartment(keys[0] as string);
                  setCurrentPage(1);
                }
              }}
              treeData={treeData}
              style={{ fontSize: 13 }}
            />
          </div>
        </Col>

        {/* 右侧内容 */}
        <Col span={18}>
          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={8}>
              <StatCard
                label="下属部门数"
                value={childCount}
                icon={<ApartmentOutlined />}
                color="blue"
              />
            </Col>
            <Col span={8}>
              <StatCard
                label="下属总人数"
                value={totalStaff}
                icon={<TeamOutlined />}
                color="green"
              />
            </Col>
            <Col span={8}>
              <StatCard
                label="正常运行"
                value={childCount}
                icon={<CheckCircleOutlined />}
                color="blue"
              />
            </Col>
          </Row>

          {/* 部门表格 */}
          <div className="data-table">
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e8eaed',
              }}
            >
              <Space>
                <ApartmentOutlined style={{ fontSize: 16 }} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>
                  {selectedDeptInfo?.name || ''} - 子部门列表
                </span>
              </Space>
              <Space>
                <span style={{ fontSize: 13, color: '#999' }}>
                  共 {currentDepts.length} 个子节点
                </span>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => openAddChild()}
                >
                  新增子部门
                </Button>
              </Space>
            </div>
            <Table
              columns={columns}
              dataSource={paginatedDepts}
              rowKey="id"
              pagination={false}
              size="middle"
            />
            {currentDepts.length > 0 && (
              <div className="pagination-wrapper" style={{ padding: '12px 20px' }}>
                <span className="pagination-info">
                  显示第 {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, currentDepts.length)} 条，共{' '}
                  {currentDepts.length} 条
                </span>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={currentDepts.length}
                  onChange={setCurrentPage}
                  size="small"
                />
              </div>
            )}
          </div>

          {/* 底部信息 */}
          <Row gutter={16} style={{ marginTop: 20 }}>
            <Col span={16}>
              <div className="info-card">
                <h4>
                  <InfoCircleOutlined />
                  层级规则说明
                </h4>
                <p>配置组织架构时，请遵循国家教育部标准。可在任意部门节点下继续新增子部门。</p>
                <div className="info-rule" style={{ marginTop: 12 }}>
                  <span className="rule-icon blue">●</span>
                  <span>点击表格中的部门名称可快速进入该部门查看其下级</span>
                </div>
                <div className="info-rule">
                  <span className="rule-icon blue">●</span>
                  <span>点击更多按钮（⋯）可查看详情、编辑、新增子部门或删除</span>
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div className="help-float">
                <QuestionCircleOutlined style={{ fontSize: 24, marginBottom: 12 }} />
                <h4>需要协助配置架构吗？</h4>
                <p>联系校务系统管理员或查阅配置手册</p>
                <Button
                  ghost
                  size="small"
                  style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
                >
                  查看配置手册
                </Button>
              </div>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* ===== 新增/编辑弹窗 ===== */}
      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditingDept(null);
        }}
        okText={modalMode === 'edit' ? '保存修改' : '确认添加'}
        cancelText="取消"
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="部门名称"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input placeholder="如：数据科学与大数据技术" />
          </Form.Item>
          <Form.Item
            name="code"
            label="部门编码"
            rules={[{ required: true, message: '请输入部门编码' }]}
          >
            <Input placeholder="如：DS" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="leaderName"
                label="负责人姓名"
                rules={[{ required: true, message: '请输入负责人' }]}
              >
                <Input placeholder="如：张三" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="leaderTitle"
                label="负责人职称"
                rules={[{ required: true, message: '请选择职称' }]}
              >
                <Select
                  placeholder="选择职称"
                  showSearch
                  optionFilterProp="label"
                  options={positionOptions}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="staffCount" label="在职工数" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 详情弹窗 ===== */}
      <Modal
        title={`部门详情 — ${detailDept?.name || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="edit" type="primary" onClick={() => {
            setDetailOpen(false);
            if (detailDept) openEdit(detailDept);
          }}>
            编辑
          </Button>,
          <Button key="close" onClick={() => setDetailOpen(false)}>
            关闭
          </Button>,
        ]}
        width={480}
      >
        {detailDept && (
          <div style={{ lineHeight: 2.2 }}>
            <Row>
              <Col span={8} style={{ color: '#999' }}>部门名称</Col>
              <Col span={16} style={{ fontWeight: 500 }}>{detailDept.name}</Col>
            </Row>
            <Row>
              <Col span={8} style={{ color: '#999' }}>部门编码</Col>
              <Col span={16}>{detailDept.code}</Col>
            </Row>
            <Row>
              <Col span={8} style={{ color: '#999' }}>层级</Col>
              <Col span={16}>
                {detailDept.level === 'university' ? '学校' : detailDept.level === 'college' ? '学院' : '专业/实验室'}
              </Col>
            </Row>
            <Row>
              <Col span={8} style={{ color: '#999' }}>负责人</Col>
              <Col span={16}>{detailDept.leader.name}（{detailDept.leader.title}）</Col>
            </Row>
            <Row>
              <Col span={8} style={{ color: '#999' }}>在职工数</Col>
              <Col span={16}>{detailDept.staffCount} 人</Col>
            </Row>
            <Row>
              <Col span={8} style={{ color: '#999' }}>下属部门</Col>
              <Col span={16}>
                {flatDepartments.filter((d) => d.parentId === detailDept.id).length} 个
              </Col>
            </Row>
            <Row>
              <Col span={8} style={{ color: '#999' }}>最后修改</Col>
              <Col span={16}>{detailDept.updatedAt}</Col>
            </Row>
            <Row>
              <Col span={8} style={{ color: '#999' }}>上级部门</Col>
              <Col span={16}>
                {detailDept.parentId
                  ? flatDepartments.find((d) => d.id === detailDept.parentId)?.name || '—'
                  : '无（根部门）'}
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DepartmentPage;
