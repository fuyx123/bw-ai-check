import React, { useEffect, useState, useMemo } from 'react';
import {
  Row,
  Col,
  Button,
  Space,
  Input,
  Tabs,
  Tag,
  Tree,
  Table,
  Modal,
  Form,
  Select,
  Timeline,
  Empty,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  UserOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { useRoleStore } from '../../stores/roleStore';
import { useMenuStore } from '../../stores/menuStore';
import { useAuditStore } from '../../stores/auditStore';
import { useAuthStore } from '../../stores/authStore';
import type { Role, DataScope, MenuItem } from '../../types/rbac';

const dataScopeOptions: { key: DataScope; level: string; name: string; desc: string }[] = [
  { key: 'school', level: '1级', name: '学校 (全校)', desc: '全部数据' },
  { key: 'college', level: '2级', name: '学院 (学院)', desc: '本学院数据' },
  { key: 'major', level: '3级', name: '专业 (专业)', desc: '本专业数据' },
  { key: 'class', level: '4级', name: '班级 (班级)', desc: '本班级数据' },
];

const scopeLabels: Record<string, string> = {
  school: '学校', college: '学院', major: '专业', class: '班级',
};

function buildPersistedPermissions(permissionIds: string[], ancestorsById: Map<string, string[]>) {
  const persisted = new Set(permissionIds);
  for (const permissionId of permissionIds) {
    ancestorsById.get(permissionId)?.forEach((ancestorId) => persisted.add(ancestorId));
  }
  return [...persisted].sort();
}

function buildDraftPermissions(permissionIds: string[], tree: MenuItem[]) {
  const persisted = new Set(permissionIds);
  const explicit = new Set<string>();

  const visit = (item: MenuItem): { hasAny: boolean; all: boolean } => {
    const children = item.children ?? [];
    const childStates = children.map((child) => visit(child));
    const hasSelectedDescendant = childStates.some((state) => state.hasAny);
    const allChildrenSelected = children.length > 0 && childStates.every((state) => state.all);
    const selfSelected = persisted.has(item.id);

    if (selfSelected && (!hasSelectedDescendant || allChildrenSelected)) {
      explicit.add(item.id);
    }

    return {
      hasAny: selfSelected || hasSelectedDescendant,
      all: selfSelected && (children.length === 0 || allChildrenSelected),
    };
  };

  tree.forEach((item) => visit(item));
  return [...explicit].sort();
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

const actionLabels: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
  create: { text: '创建角色', color: 'green', icon: <CheckCircleOutlined style={{ color: '#52c41a' }} /> },
  update: { text: '编辑角色', color: 'blue', icon: <InfoCircleOutlined style={{ color: '#1677ff' }} /> },
  delete: { text: '删除角色', color: 'red', icon: <WarningOutlined style={{ color: '#ff4d4f' }} /> },
  permission: { text: '权限变更', color: 'orange', icon: <WarningOutlined style={{ color: '#fa8c16' }} /> },
  scope: { text: '数据范围', color: 'purple', icon: <InfoCircleOutlined style={{ color: '#722ed1' }} /> },
};

const RolePage: React.FC = () => {
  const {
    roles, selectedRole, fetchRoles, selectRole,
    addRole, editRole, deleteRole,
    saveRoleAccess,
  } = useRoleStore();
  const { menus, menuTree, fetchMenus } = useMenuStore();
  const { logs, addLog } = useAuditStore();
  const { currentUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [searchText, setSearchText] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const [draftDataScope, setDraftDataScope] = useState<DataScope>('school');
  const [savingAccess, setSavingAccess] = useState(false);
  const [roleForm] = Form.useForm();

  const operator = currentUser?.name || '系统管理员';

  useEffect(() => {
    fetchRoles();
    fetchMenus();
  }, [fetchRoles, fetchMenus]);

  useEffect(() => {
    if (!selectedRole && roles.length > 0) selectRole('role-dean');
  }, [selectedRole, roles, selectRole]);

  useEffect(() => {
    if (!selectedRole) {
      setDraftPermissions([]);
      setDraftDataScope('school');
      return;
    }

    setDraftPermissions(buildDraftPermissions(selectedRole.permissions, menuTree));
    setDraftDataScope(selectedRole.dataScope);
  }, [menuTree, selectedRole]);

  // 构建菜单树
  const buildTreeNodes = (items: MenuItem[]): DataNode[] => {
    return items.map((item) => ({
      key: item.id,
      title: (
        <span>
          {item.name}
          {item.type === 'button' && (
            <Tag color="orange" style={{ marginLeft: 6, fontSize: 10, borderRadius: 4 }}>按钮</Tag>
          )}
        </span>
      ),
      children: item.children?.length ? buildTreeNodes(item.children) : undefined,
    }));
  };

  const treeNodes = useMemo(() => buildTreeNodes(menuTree), [menuTree]);
  const allMenuIds = useMemo(() => menus.map((m) => m.id), [menus]);

  const { descendantsById, ancestorsById } = useMemo(() => {
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string | null>();

    for (const menu of menus) {
      parentMap.set(menu.id, menu.parentId);
      if (!menu.parentId) continue;
      const siblings = childrenMap.get(menu.parentId) ?? [];
      siblings.push(menu.id);
      childrenMap.set(menu.parentId, siblings);
    }

    const descendantsCache = new Map<string, string[]>();
    const collectDescendants = (id: string): string[] => {
      const cached = descendantsCache.get(id);
      if (cached) {
        return cached;
      }

      const childIds = childrenMap.get(id) ?? [];
      const descendants = childIds.flatMap((childId) => [childId, ...collectDescendants(childId)]);
      descendantsCache.set(id, descendants);
      return descendants;
    };

    const ancestors = new Map<string, string[]>();
    for (const menu of menus) {
      const parentIds: string[] = [];
      let currentParentId = parentMap.get(menu.id) ?? null;
      while (currentParentId) {
        parentIds.unshift(currentParentId);
        currentParentId = parentMap.get(currentParentId) ?? null;
      }
      ancestors.set(menu.id, parentIds);
    }

    for (const menu of menus) {
      collectDescendants(menu.id);
    }

    return {
      descendantsById: descendantsCache,
      ancestorsById: ancestors,
    };
  }, [menus]);

  const { checkedKeys, halfCheckedKeys } = useMemo(() => {
    const perms = new Set(draftPermissions);
    const checked: string[] = [];
    const half: string[] = [];

    const visit = (item: MenuItem): 'checked' | 'half' | 'none' => {
      const children = item.children ?? [];
      const selfChecked = perms.has(item.id);

      if (children.length === 0) {
        if (selfChecked) {
          checked.push(item.id);
          return 'checked';
        }
        return 'none';
      }

      const childStates = children.map((child) => visit(child));
      const hasCheckedChild = childStates.some((state) => state !== 'none');
      const allChildrenChecked = childStates.length > 0 && childStates.every((state) => state === 'checked');

      if (selfChecked && (allChildrenChecked || !hasCheckedChild)) {
        checked.push(item.id);
        return 'checked';
      }

      if (selfChecked || hasCheckedChild) {
        half.push(item.id);
        return 'half';
      }

      return 'none';
    };

    menuTree.forEach((item) => visit(item));
    return { checkedKeys: checked, halfCheckedKeys: half };
  }, [draftPermissions, menuTree]);

  const persistedDraftPermissions = useMemo(
    () => buildPersistedPermissions(draftPermissions, ancestorsById),
    [ancestorsById, draftPermissions]
  );

  const permissionsDirty = useMemo(() => {
    if (!selectedRole) return false;
    const current = [...selectedRole.permissions].sort().join('|');
    const draft = persistedDraftPermissions.join('|');
    return current !== draft;
  }, [persistedDraftPermissions, selectedRole]);

  const scopeDirty = !!selectedRole && selectedRole.dataScope !== draftDataScope;
  const hasPendingChanges = permissionsDirty || scopeDirty;

  // ===== 权限勾选 =====
  const handlePermCheck: TreeProps['onCheck'] = (_, info) => {
    const targetId = String(info.node.key);
    const nextPermissions = new Set(draftPermissions);

    if (info.checked) {
      nextPermissions.add(targetId);
      descendantsById.get(targetId)?.forEach((id) => nextPermissions.add(id));
    } else {
      nextPermissions.delete(targetId);
      descendantsById.get(targetId)?.forEach((id) => nextPermissions.delete(id));
    }

    setDraftPermissions([...nextPermissions].sort());
  };

  // ===== 数据范围 =====
  const handleDataScopeChange = (scope: DataScope) => {
    setDraftDataScope(scope);
  };

  const handleResetAccess = () => {
    if (!selectedRole) return;
    setDraftPermissions(buildDraftPermissions(selectedRole.permissions, menuTree));
    setDraftDataScope(selectedRole.dataScope);
  };

  const handleSaveAccess = async () => {
    if (!selectedRole || !hasPendingChanges) return;

    const nextPermissions = persistedDraftPermissions;
    const oldPermissions = new Set(selectedRole.permissions);
    const nextPermissionSet = new Set(nextPermissions);
    const menuNameMap = new Map(menus.map((menu) => [menu.id, menu.name]));
    const added = nextPermissions
      .filter((id) => !oldPermissions.has(id))
      .map((id) => menuNameMap.get(id) || id);
    const removed = selectedRole.permissions
      .filter((id) => !nextPermissionSet.has(id))
      .map((id) => menuNameMap.get(id) || id);
    const permissionParts: string[] = [];
    if (added.length > 0) permissionParts.push(`新增「${added.join('、')}」`);
    if (removed.length > 0) permissionParts.push(`移除「${removed.join('、')}」`);

    try {
      setSavingAccess(true);
      await saveRoleAccess(selectedRole.id, nextPermissions, draftDataScope);

      if (permissionParts.length > 0) {
        addLog({
          action: 'permission',
          targetType: 'role',
          targetName: selectedRole.name,
          detail: permissionParts.join('；'),
          operator,
        });
      }

      if (scopeDirty) {
        addLog({
          action: 'scope',
          targetType: 'role',
          targetName: selectedRole.name,
          detail: `数据范围从「${scopeLabels[selectedRole.dataScope]}」变更为「${scopeLabels[draftDataScope]}」`,
          operator,
        });
      }

      message.success('权限配置已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存权限配置失败');
    } finally {
      setSavingAccess(false);
    }
  };

  const filteredRoles = roles.filter((r) => r.name.includes(searchText));

  // ===== 角色 CRUD =====
  const openAddRole = () => {
    setEditingRole(null);
    roleForm.resetFields();
    setRoleModalOpen(true);
  };
  const openEditRole = () => {
    if (!selectedRole) return;
    setEditingRole(selectedRole);
    roleForm.setFieldsValue({
      name: selectedRole.name,
      description: selectedRole.description,
      dataScope: selectedRole.dataScope,
    });
    setRoleModalOpen(true);
  };
  const handleRoleSubmit = () => {
    roleForm.validateFields().then(async (values) => {
      if (editingRole) {
        await editRole(editingRole.id, values);
        addLog({
          action: 'update',
          targetType: 'role',
          targetName: values.name,
          detail: `更新角色信息：${values.description}`,
          operator,
        });
        message.success(`已更新角色「${values.name}」`);
      } else {
        await addRole({
          id: '',
          name: values.name,
          description: values.description,
          dataScope: values.dataScope,
          permissions: ['menu-dashboard'],
          userCount: 0,
        });
        addLog({
          action: 'create',
          targetType: 'role',
          targetName: values.name,
          detail: `创建新角色，数据范围：${scopeLabels[values.dataScope as DataScope]}`,
          operator,
        });
        message.success(`已创建角色「${values.name}」`);
      }
      setRoleModalOpen(false);
      roleForm.resetFields();
    }).catch((error) => {
      if (error instanceof Error) {
        message.error(error.message);
      }
    });
  };
  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    if (selectedRole.userCount > 0) {
      message.error(`角色下有 ${selectedRole.userCount} 个用户，无法删除`);
      return;
    }
    const name = selectedRole.name;
    try {
      await deleteRole(selectedRole.id);
      addLog({
        action: 'delete',
        targetType: 'role',
        targetName: name,
        detail: `删除角色「${name}」`,
        operator,
      });
      message.success(`已删除角色「${name}」`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除角色失败');
    }
  };

  // ===== 审计日志表格 =====
  const auditColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (ts: number) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#999' }} />
          <span style={{ fontSize: 13, color: '#666' }}>{timeAgo(ts)}</span>
        </Space>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => {
        const config = actionLabels[action] || actionLabels.update;
        return (
          <Tag color={config.color} icon={config.icon} style={{ borderRadius: 4 }}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '目标角色',
      dataIndex: 'targetName',
      key: 'targetName',
      width: 120,
      render: (name: string) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
    {
      title: '变更详情',
      dataIndex: 'detail',
      key: 'detail',
      render: (text: string) => <span style={{ color: '#666', fontSize: 13 }}>{text}</span>,
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
      render: (name: string) => (
        <Space>
          <UserOutlined style={{ color: '#999' }} />
          <span style={{ fontSize: 13 }}>{name}</span>
        </Space>
      ),
    },
  ];

  // 底部条显示最近3条
  const recentLogs = logs.slice(0, 3);

  return (
    <div>
      {/* 顶部搜索 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Input
          placeholder="搜索角色..."
          prefix={<SearchOutlined />}
          style={{ width: 280 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'overview', label: '系统概览' },
            { key: 'audit', label: `权限审计 (${logs.length})` },
          ]}
          style={{ marginBottom: 0 }}
        />
        <div style={{ flex: 1 }} />
        <Button icon={<UserOutlined />}>个人资料</Button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="page-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2>角色管理</h2>
                <p>定义角色并分配菜单权限与数据范围。所有权限变更自动记入审计日志。</p>
              </div>
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddRole}>
                创建新角色
              </Button>
            </div>
          </div>

          <Row gutter={24}>
            {/* 左侧角色列表 */}
            <Col span={10}>
              <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>
                共 {filteredRoles.length} 个角色
              </div>
              {filteredRoles.map((role: Role) => (
                <div
                  key={role.id}
                  className={`role-card ${selectedRole?.id === role.id ? 'active' : ''}`}
                  onClick={() => selectRole(role.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 4, height: 40, borderRadius: 2,
                        background: selectedRole?.id === role.id ? '#1677ff' : '#e8eaed',
                      }}
                    />
                    <div>
                      <div className="role-name">
                        {role.name}
                        {role.id === 'role-president' && (
                          <Tag color="red" style={{ marginLeft: 8, fontSize: 11, borderRadius: 4 }}>超级管理</Tag>
                        )}
                      </div>
                      <div className="role-desc">{role.description}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="role-users">{role.userCount} 位用户</span>
                    <span style={{ fontSize: 12, color: '#999' }}>
                      {role.permissions.length}/{allMenuIds.length} 权限
                    </span>
                  </div>
                </div>
              ))}
            </Col>

            {/* 右侧权限面板 */}
            <Col span={14}>
              {selectedRole ? (
                <div className="permission-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                      <h3>权限配置：{selectedRole.name}</h3>
                      <p className="panel-desc">勾选菜单项分配访问权限，按钮项控制操作权限</p>
                    </div>
                    <Space>
                      <Button size="small" onClick={openEditRole}>编辑角色</Button>
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={handleDeleteRole}>删除</Button>
                    </Space>
                  </div>

                  <div className="permission-section">
                    <h4>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a1a2e', display: 'inline-block' }} />
                      菜单与按钮权限
                      <span style={{ fontSize: 12, color: '#999', fontWeight: 400, marginLeft: 8 }}>
                        已选 {persistedDraftPermissions.length}/{allMenuIds.length}
                      </span>
                    </h4>
                    <div style={{ border: '1px solid #e8eaed', borderRadius: 8, padding: 12, maxHeight: 320, overflow: 'auto' }}>
                      <Tree
                        checkable
                        checkStrictly
                        checkedKeys={{ checked: checkedKeys, halfChecked: halfCheckedKeys }}
                        onCheck={handlePermCheck}
                        treeData={treeNodes}
                        defaultExpandAll
                        selectable={false}
                      />
                    </div>
                  </div>

                  <div className="permission-section" style={{ marginTop: 20 }}>
                    <h4>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a1a2e', display: 'inline-block' }} />
                      数据范围
                    </h4>
                    <div className="data-scope-grid">
                      {dataScopeOptions.map((scope) => (
                        <div
                          key={scope.key}
                          className={`data-scope-item ${draftDataScope === scope.key ? 'active' : ''}`}
                          onClick={() => handleDataScopeChange(scope.key)}
                        >
                          <div className="scope-level">{scope.level}</div>
                          <div className="scope-name">{scope.name}</div>
                          <div className="scope-desc">
                            {draftDataScope === scope.key && <CheckCircleOutlined style={{ marginRight: 4 }} />}
                            {scope.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <Button
                      type="primary"
                      size="large"
                      style={{ flex: 1 }}
                      onClick={handleSaveAccess}
                      loading={savingAccess}
                      disabled={!hasPendingChanges}
                    >
                      保存修改
                    </Button>
                    <Button size="large" onClick={handleResetAccess} disabled={!hasPendingChanges || savingAccess}>
                      重置
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="permission-panel" style={{ textAlign: 'center', padding: 60 }}>
                  <UserOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                  <p style={{ color: '#999' }}>请选择一个角色查看权限配置</p>
                </div>
              )}
            </Col>
          </Row>

          {/* 底部最近审计 */}
          {recentLogs.length > 0 && (
            <div className="audit-bar">
              <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>近期变更</span>
              {recentLogs.map((log) => {
                const config = actionLabels[log.action] || actionLabels.update;
                return (
                  <div className="audit-item" key={log.id}>
                    {config.icon}
                    <span>{log.targetName}：{log.detail}</span>
                    <span style={{ color: '#bbb', fontSize: 11 }}>{timeAgo(log.timestamp)}</span>
                  </div>
                );
              })}
              <Button type="link" size="small" style={{ marginLeft: 'auto' }} onClick={() => setActiveTab('audit')}>
                查看全部 →
              </Button>
            </div>
          )}
        </>
      )}

      {/* ===== 权限审计 Tab ===== */}
      {activeTab === 'audit' && (
        <div>
          <div className="page-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2>权限审计日志</h2>
                <p>记录所有角色权限变更操作，包括创建、修改、删除角色以及权限和数据范围调整</p>
              </div>
              {logs.length > 0 && (
                <Button
                  danger
                  onClick={() => {
                    Modal.confirm({
                      title: '清空审计日志',
                      content: '确定要清空所有审计日志吗？此操作不可撤销。',
                      okText: '清空',
                      okType: 'danger',
                      cancelText: '取消',
                      onOk: () => {
                        useAuditStore.getState().clearLogs();
                        message.success('审计日志已清空');
                      },
                    });
                  }}
                >
                  清空日志
                </Button>
              )}
            </div>
          </div>

          {logs.length > 0 ? (
            <Row gutter={24}>
              <Col span={16}>
                <div className="data-table">
                  <Table
                    columns={auditColumns}
                    dataSource={logs}
                    rowKey="id"
                    pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
                    size="middle"
                  />
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: 'white', border: '1px solid #e8eaed', borderRadius: 12, padding: 20 }}>
                  <h4 style={{ fontWeight: 600, marginBottom: 16 }}>操作时间线</h4>
                  <Timeline
                    items={logs.slice(0, 8).map((log) => {
                      const config = actionLabels[log.action] || actionLabels.update;
                      return {
                        color: config.color,
                        children: (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>
                              {config.text}：{log.targetName}
                            </div>
                            <div style={{ fontSize: 12, color: '#999' }}>{log.detail}</div>
                            <div style={{ fontSize: 11, color: '#bbb' }}>{log.operator} · {timeAgo(log.timestamp)}</div>
                          </div>
                        ),
                      };
                    })}
                  />
                </div>
              </Col>
            </Row>
          ) : (
            <Empty description="暂无审计记录" style={{ marginTop: 80 }}>
              <p style={{ color: '#999', fontSize: 13 }}>
                在「系统概览」中对角色进行操作后，变更记录将自动出现在这里
              </p>
              <Button type="primary" onClick={() => setActiveTab('overview')}>
                返回系统概览
              </Button>
            </Empty>
          )}
        </div>
      )}

      {/* 角色弹窗 */}
      <Modal
        title={editingRole ? `编辑角色 — ${editingRole.name}` : '创建新角色'}
        open={roleModalOpen}
        onOk={handleRoleSubmit}
        onCancel={() => { setRoleModalOpen(false); roleForm.resetFields(); }}
        okText={editingRole ? '保存' : '创建'}
        cancelText="取消"
        width={440}
      >
        <Form form={roleForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入' }]}>
            <Input placeholder="如：教务处长" />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ required: true, message: '请输入' }]}>
            <Input.TextArea rows={2} placeholder="角色职责描述" />
          </Form.Item>
          <Form.Item name="dataScope" label="默认数据范围" rules={[{ required: true }]}>
            <Select
              options={dataScopeOptions.map((s) => ({ value: s.key, label: s.name }))}
              placeholder="选择数据范围"
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RolePage;
