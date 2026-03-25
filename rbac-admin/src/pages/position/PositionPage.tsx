import React, { useEffect, useState, useMemo } from 'react';
import {
  Row,
  Col,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  Popconfirm,
  Tooltip,
  Tabs,
  ColorPicker,
  message,
} from 'antd';
import type { Color } from 'antd/es/color-picker';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  TeamOutlined,
  UserOutlined,
  ExperimentOutlined,
  ToolOutlined,
  SolutionOutlined,
  AppstoreOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { usePositionStore } from '../../stores/positionStore';
import StatCard from '../../components/common/StatCard';
import type { Position, PositionCategory } from '../../types/rbac';

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
  SolutionOutlined: <SolutionOutlined />,
  ExperimentOutlined: <ExperimentOutlined />,
  UserOutlined: <UserOutlined />,
  ToolOutlined: <ToolOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  TeamOutlined: <TeamOutlined />,
  BgColorsOutlined: <BgColorsOutlined />,
};

const iconOptions = Object.keys(iconMap).map((k) => ({
  value: k,
  label: (
    <Space>
      {iconMap[k]}
      <span style={{ fontSize: 12 }}>{k.replace('Outlined', '')}</span>
    </Space>
  ),
}));

const PositionPage: React.FC = () => {
  const {
    positions,
    categories,
    fetchPositions,
    addPosition,
    editPosition,
    deletePosition,
    addCategory,
    editCategory,
    deleteCategory,
  } = usePositionStore();

  const [activeTab, setActiveTab] = useState('positions');
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // 职位弹窗
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [posForm] = Form.useForm();

  // 类别弹窗
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<PositionCategory | null>(null);
  const [catForm] = Form.useForm();

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  // 从 categories 生成映射
  const catLabels = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.code, c.name])),
    [categories]
  );
  const catColors = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.code, c.color])),
    [categories]
  );
  const catIcons = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.code, iconMap[c.icon] || <AppstoreOutlined />])),
    [categories]
  );
  const categoryOptions = useMemo(
    () => categories.sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ value: c.code, label: c.name })),
    [categories]
  );

  // ===== 职位筛选 =====
  const filtered = positions
    .filter((p) => !filterCategory || p.category === filterCategory)
    .filter(
      (p) =>
        !searchText ||
        p.name.includes(searchText) ||
        p.code.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.level - b.level;
    });

  const totalPositions = positions.length;
  const totalHeadcount = positions.reduce((s, p) => s + p.headcount, 0);
  const categoryCounts = categories
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      ...c,
      count: positions.filter((p) => p.category === c.code).length,
    }));

  // ===== 职位 CRUD =====
  const openAddPos = () => {
    setEditingPos(null);
    posForm.resetFields();
    setPosModalOpen(true);
  };
  const openEditPos = (pos: Position) => {
    setEditingPos(pos);
    posForm.setFieldsValue({
      name: pos.name,
      code: pos.code,
      category: pos.category,
      level: pos.level,
      description: pos.description,
      headcount: pos.headcount,
    });
    setPosModalOpen(true);
  };
  const handlePosSubmit = () => {
    posForm.validateFields().then((values) => {
      if (editingPos) {
        editPosition(editingPos.id, values);
        message.success(`已更新「${values.name}」`);
      } else {
        addPosition({
          id: `pos-${Date.now()}`,
          ...values,
          code: values.code.toUpperCase(),
          createdAt: new Date().toISOString().split('T')[0],
        });
        message.success(`已添加「${values.name}」`);
      }
      setPosModalOpen(false);
      posForm.resetFields();
    });
  };

  // ===== 类别 CRUD =====
  const openAddCat = () => {
    setEditingCat(null);
    catForm.resetFields();
    catForm.setFieldsValue({ color: '#1677ff', icon: 'AppstoreOutlined', sortOrder: categories.length + 1 });
    setCatModalOpen(true);
  };
  const openEditCat = (cat: PositionCategory) => {
    setEditingCat(cat);
    catForm.setFieldsValue({
      code: cat.code,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
      description: cat.description,
    });
    setCatModalOpen(true);
  };
  const handleCatSubmit = () => {
    catForm.validateFields().then((values) => {
      const color = typeof values.color === 'string' ? values.color : (values.color as Color).toHexString();
      if (editingCat) {
        editCategory(editingCat.id, { ...values, color });
        message.success(`已更新类别「${values.name}」`);
      } else {
        // 检查 code 唯一性
        if (categories.some((c) => c.code === values.code)) {
          message.error(`编码「${values.code}」已存在`);
          return;
        }
        addCategory({
          id: `cat-${Date.now()}`,
          ...values,
          color,
          code: values.code.toLowerCase(),
        });
        message.success(`已添加类别「${values.name}」`);
      }
      setCatModalOpen(false);
      catForm.resetFields();
    });
  };

  // ===== 导出 =====
  const handleExport = () => {
    const rows = positions.map((p) => ({
      职位ID: p.id,
      职位名称: p.name,
      职位编码: p.code,
      类别: catLabels[p.category] || p.category,
      职级: p.level,
      在岗人数: p.headcount,
      说明: p.description,
      创建时间: p.createdAt,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
      { wch: 8 }, { wch: 10 }, { wch: 40 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '职位列表');
    XLSX.writeFile(wb, `职位列表_${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success('职位列表已导出');
  };

  // ===== 职位表格列 =====
  const posColumns = [
    {
      title: '职位名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Position) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.code}</div>
        </div>
      ),
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (cat: string) => (
        <Tag color={catColors[cat]} icon={catIcons[cat]} style={{ borderRadius: 4 }}>
          {catLabels[cat] || cat}
        </Tag>
      ),
    },
    {
      title: '职级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: number) => (
        <span
          style={{
            display: 'inline-flex',
            width: 28, height: 28, borderRadius: '50%',
            background: '#f0f5ff', color: '#1677ff',
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, fontSize: 13,
          }}
        >
          {level}
        </span>
      ),
    },
    {
      title: '在岗人数',
      dataIndex: 'headcount',
      key: 'headcount',
      width: 100,
      render: (count: number) => <span style={{ fontWeight: 600, fontSize: 16 }}>{count}</span>,
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{ color: '#666', fontSize: 13 }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => <span style={{ color: '#666', fontSize: 13 }}>{date}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Position) => (
        <Space>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEditPos(record)} />
          </Tooltip>
          <Popconfirm
            title={`确定删除「${record.name}」吗？`}
            description={record.headcount > 0 ? `当前有 ${record.headcount} 人在岗` : undefined}
            onConfirm={() => { deletePosition(record.id); message.success(`已删除「${record.name}」`); }}
            okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button type="text" icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ===== 类别表格列 =====
  const catColumns = [
    {
      title: '类别名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: PositionCategory) => (
        <Space>
          <Tag color={record.color} icon={iconMap[record.icon]} style={{ borderRadius: 4 }}>
            {text}
          </Tag>
          <span style={{ fontSize: 12, color: '#999' }}>{record.code}</span>
        </Space>
      ),
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 100,
      render: (color: string) => (
        <Space>
          <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: color }} />
          <span style={{ fontSize: 12, color: '#999' }}>{color}</span>
        </Space>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      render: (order: number) => <span style={{ fontWeight: 600 }}>{order}</span>,
    },
    {
      title: '下属职位数',
      key: 'posCount',
      width: 110,
      render: (_: unknown, record: PositionCategory) => {
        const count = positions.filter((p) => p.category === record.code).length;
        return <span style={{ fontWeight: 600, color: count > 0 ? '#1677ff' : '#999' }}>{count}</span>;
      },
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => <span style={{ color: '#666', fontSize: 13 }}>{text}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: PositionCategory) => {
        const posCount = positions.filter((p) => p.category === record.code).length;
        return (
          <Space>
            <Tooltip title="编辑">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEditCat(record)} />
            </Tooltip>
            <Popconfirm
              title={`确定删除类别「${record.name}」吗？`}
              description={posCount > 0 ? `该类别下有 ${posCount} 个职位，需先迁移或删除` : undefined}
              onConfirm={() => {
                if (posCount > 0) {
                  message.error(`类别下有 ${posCount} 个职位，无法删除`);
                  return;
                }
                deleteCategory(record.id);
                message.success(`已删除类别「${record.name}」`);
              }}
              okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
            >
              <Tooltip title="删除">
                <Button type="text" icon={<DeleteOutlined />} size="small" danger />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>职位管理</h2>
            <p>维护机构职位/职称字典数据与类别分类，供部门和人员管理引用</p>
          </div>
          <div className="page-actions">
            {activeTab === 'positions' && (
              <>
                <Button icon={<ExportOutlined />} onClick={handleExport}>导出职位</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAddPos}>新增职位</Button>
              </>
            )}
            {activeTab === 'categories' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddCat}>新增类别</Button>
            )}
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <StatCard label="职位总数" value={totalPositions} icon={<SolutionOutlined />} color="blue" />
        </Col>
        <Col span={6}>
          <StatCard label="在岗总人数" value={totalHeadcount} icon={<TeamOutlined />} color="green" />
        </Col>
        <Col span={12}>
          <div className="stat-card" style={{ justifyContent: 'flex-start', gap: 24 }}>
            {categoryCounts.map((c) => (
              <div key={c.code} style={{ textAlign: 'center' }}>
                <Tag color={c.color} style={{ marginBottom: 4, borderRadius: 4 }}>{c.name}</Tag>
                <div style={{ fontWeight: 700, fontSize: 20, color: '#1a1a2e' }}>{c.count}</div>
              </div>
            ))}
          </div>
        </Col>
      </Row>

      {/* Tab 切换 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'positions', label: `职位列表 (${positions.length})` },
          { key: 'categories', label: `类别管理 (${categories.length})` },
        ]}
        style={{ marginBottom: 0 }}
      />

      {/* ===== 职位列表 Tab ===== */}
      {activeTab === 'positions' && (
        <>
          <div className="filter-bar">
            <Input
              placeholder="搜索职位名称或编码..."
              prefix={<SearchOutlined />}
              style={{ width: 260 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Select
              placeholder="所有类别"
              style={{ width: 160 }}
              allowClear
              value={filterCategory}
              onChange={(v) => setFilterCategory(v)}
              options={categoryOptions}
            />
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 13, color: '#999' }}>共 {filtered.length} 个职位</span>
          </div>
          <div className="data-table" style={{ marginTop: 16 }}>
            <Table
              columns={posColumns}
              dataSource={filtered}
              rowKey="id"
              pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
              size="middle"
            />
          </div>
        </>
      )}

      {/* ===== 类别管理 Tab ===== */}
      {activeTab === 'categories' && (
        <div className="data-table" style={{ marginTop: 16 }}>
          <Table
            columns={catColumns}
            dataSource={[...categories].sort((a, b) => a.sortOrder - b.sortOrder)}
            rowKey="id"
            pagination={false}
            size="middle"
          />
        </div>
      )}

      {/* ===== 职位弹窗 ===== */}
      <Modal
        title={editingPos ? `编辑职位 — ${editingPos.name}` : '新增职位'}
        open={posModalOpen}
        onOk={handlePosSubmit}
        onCancel={() => { setPosModalOpen(false); posForm.resetFields(); setEditingPos(null); }}
        okText={editingPos ? '保存修改' : '确认添加'}
        cancelText="取消"
        width={520}
      >
        <Form form={posForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="职位名称" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="如：副教授" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="职位编码" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="如：ASSOC-PROF" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="所属类别" rules={[{ required: true, message: '请选择' }]}>
                <Select options={categoryOptions} placeholder="选择类别" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="level" label="职级（越小越高）" rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="headcount" label="在岗人数" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="职位说明" rules={[{ required: true, message: '请输入' }]}>
            <Input.TextArea rows={3} placeholder="职位职责描述" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 类别弹窗 ===== */}
      <Modal
        title={editingCat ? `编辑类别 — ${editingCat.name}` : '新增类别'}
        open={catModalOpen}
        onOk={handleCatSubmit}
        onCancel={() => { setCatModalOpen(false); catForm.resetFields(); setEditingCat(null); }}
        okText={editingCat ? '保存修改' : '确认添加'}
        cancelText="取消"
        width={480}
      >
        <Form form={catForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="类别名称" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="如：教辅类" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="类别编码" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="如：support" disabled={!!editingCat} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="color" label="标签颜色" rules={[{ required: true, message: '请选择' }]}>
                <ColorPicker format="hex" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="icon" label="图标" rules={[{ required: true, message: '请选择' }]}>
                <Select options={iconOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sortOrder" label="排序" rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="类别说明" rules={[{ required: true, message: '请输入' }]}>
            <Input.TextArea rows={2} placeholder="该类别的职位职责范围" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PositionPage;
