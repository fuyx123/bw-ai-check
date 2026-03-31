import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Tooltip,
  Popconfirm,
} from 'antd';
import message from '../../utils/message';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MenuOutlined,
  DashboardOutlined,
  ApartmentOutlined,
  TeamOutlined,
  UserOutlined,
  SolutionOutlined,
  BarChartOutlined,
  SettingOutlined,
  AppstoreOutlined,
  SafetyOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useMenuStore } from '../../stores/menuStore';
import type { MenuItem } from '../../types/rbac';

const iconMap: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  ApartmentOutlined: <ApartmentOutlined />,
  TeamOutlined: <TeamOutlined />,
  UserOutlined: <UserOutlined />,
  SolutionOutlined: <SolutionOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  MenuOutlined: <MenuOutlined />,
  SettingOutlined: <SettingOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  ToolOutlined: <ToolOutlined />,
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

const MenuPage: React.FC = () => {
  const { menus, menuTree, fetchMenus, addMenu, editMenu, deleteMenu } =
    useMenuStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  // 父菜单选项 (仅 type=menu 且 visible)
  const parentOptions = [
    { value: '', label: '— 无（根菜单）' },
    ...menus
      .filter((m) => m.type === 'menu' && m.parentId === null)
      .map((m) => ({ value: m.id, label: m.name })),
  ];

  const openAdd = (pid: string | null = null) => {
    setEditing(null);
    setParentId(pid);
    form.resetFields();
    form.setFieldsValue({
      type: pid ? 'button' : 'menu',
      visible: true,
      sortOrder: menus.filter((m) => m.parentId === pid).length + 1,
      parentId: pid || '',
    });
    setModalOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setParentId(item.parentId);
    form.setFieldsValue({
      name: item.name,
      path: item.path,
      icon: item.icon || undefined,
      type: item.type,
      visible: item.visible,
      sortOrder: item.sortOrder,
      parentId: item.parentId || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      const menuParentId = values.parentId || null;
      if (editing) {
        await editMenu(editing.id, {
          name: values.name,
          path: values.type === 'menu' ? values.path : '',
          icon: values.type === 'menu' ? values.icon : '',
          type: values.type,
          visible: values.visible,
          sortOrder: values.sortOrder,
          parentId: menuParentId,
        });
        message.success(`已更新「${values.name}」`);
      } else {
        const newMenu: MenuItem = {
          id: '',
          name: values.name,
          path: values.type === 'menu' ? values.path : '',
          icon: values.type === 'menu' ? (values.icon || '') : '',
          parentId: menuParentId,
          sortOrder: values.sortOrder,
          visible: values.visible,
          type: values.type,
        };
        await addMenu(newMenu);
        message.success(`已添加「${values.name}」`);
      }
      setModalOpen(false);
      form.resetFields();
    }).catch((error) => {
      if (error instanceof Error) {
        message.error(error.message);
      }
    });
  };

  const handleDelete = (item: MenuItem) => {
    const children = menus.filter((m) => m.parentId === item.id);
    if (children.length > 0) {
      Modal.confirm({
        title: '确认删除',
        content: `「${item.name}」下有 ${children.length} 个子项，将一并删除。`,
        okText: '确认删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            await deleteMenu(item.id);
            message.success(`已删除「${item.name}」`);
          } catch (error) {
            message.error(error instanceof Error ? error.message : '删除菜单失败');
          }
        },
      });
    } else {
      deleteMenu(item.id)
        .then(() => message.success(`已删除「${item.name}」`))
        .catch((error) => message.error(error instanceof Error ? error.message : '删除菜单失败'));
    }
  };

  const columns = [
    {
      title: '菜单名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: MenuItem) => (
        <Space>
          {record.type === 'menu' && record.icon && iconMap[record.icon] ? (
            <span style={{ color: '#1677ff' }}>{iconMap[record.icon]}</span>
          ) : null}
          <span style={{ fontWeight: record.parentId === null ? 600 : 400 }}>
            {text}
          </span>
          {record.type === 'button' && (
            <Tag color="orange" style={{ borderRadius: 4, fontSize: 11 }}>
              按钮
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '菜单ID',
      dataIndex: 'id',
      key: 'id',
      width: 180,
      render: (id: string) => (
        <span style={{ fontSize: 12, color: '#999', fontFamily: 'monospace' }}>
          {id}
        </span>
      ),
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      width: 150,
      render: (path: string) =>
        path ? (
          <Tag style={{ fontFamily: 'monospace', borderRadius: 4 }}>{path}</Tag>
        ) : (
          <span style={{ color: '#ccc' }}>—</span>
        ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'menu' ? 'blue' : 'orange'} style={{ borderRadius: 4 }}>
          {type === 'menu' ? '菜单' : '按钮'}
        </Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 70,
      render: (order: number) => <span style={{ fontWeight: 600 }}>{order}</span>,
    },
    {
      title: '状态',
      dataIndex: 'visible',
      key: 'visible',
        width: 80,
        render: (visible: boolean, record: MenuItem) => (
          <Switch
            size="small"
            checked={visible}
            onChange={async (v) => {
              try {
                await editMenu(record.id, { visible: v });
              } catch (error) {
                message.error(error instanceof Error ? error.message : '更新菜单状态失败');
              }
            }}
          />
        ),
      },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: MenuItem) => (
        <Space>
          {record.type === 'menu' && (
            <Tooltip title="新增子项">
              <Button
                type="text"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => openAdd(record.id)}
              />
            </Tooltip>
          )}
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
            onConfirm={() => handleDelete(record)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button type="text" icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const menuType = Form.useWatch('type', form);

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
            <h2>菜单管理</h2>
            <p>维护系统菜单与按钮权限，角色通过关联菜单获得对应访问权限</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd(null)}>
            新增根菜单
          </Button>
        </div>
      </div>

      {/* 统计 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 24 }}>
        <span style={{ fontSize: 13, color: '#666' }}>
          菜单总数：<strong>{menus.filter((m) => m.type === 'menu').length}</strong>
        </span>
        <span style={{ fontSize: 13, color: '#666' }}>
          按钮权限：<strong>{menus.filter((m) => m.type === 'button').length}</strong>
        </span>
        <span style={{ fontSize: 13, color: '#666' }}>
          总计：<strong>{menus.length}</strong> 个权限节点
        </span>
      </div>

      {/* 树形表格 */}
      <div className="data-table">
        <Table
          columns={columns}
          dataSource={menuTree}
          rowKey="id"
          pagination={false}
          size="middle"
          expandable={{ defaultExpandAllRows: true, childrenColumnName: 'children' }}
        />
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editing ? `编辑 — ${editing.name}` : parentId ? '新增子菜单/按钮' : '新增根菜单'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditing(null);
        }}
        okText={editing ? '保存修改' : '确认添加'}
        cancelText="取消"
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如：用户管理" />
          </Form.Item>

          <Form.Item
            name="parentId"
            label="上级菜单"
          >
            <Select
              options={parentOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'menu', label: '菜单（导航项）' },
                { value: 'button', label: '按钮（操作权限）' },
              ]}
            />
          </Form.Item>

          {menuType === 'menu' && (
            <>
              <Form.Item
                name="path"
                label="路由路径"
                rules={[{ required: true, message: '请输入路由' }]}
              >
                <Input placeholder="如：/users" />
              </Form.Item>
              <Form.Item name="icon" label="图标">
                <Select
                  options={iconOptions}
                  placeholder="选择图标"
                  allowClear
                />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="sortOrder"
            label="排序（越小越靠前）"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="visible" label="是否显示" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MenuPage;
