import React, { useEffect, useState } from 'react';
import {
  Badge, Button, Card, Col, Form, Input, Modal, Popconfirm,
  Row, Select, Space, Switch, Table, Tag, Tooltip, Typography,
} from 'antd';
import {
  ApiOutlined, CheckCircleOutlined, DeleteOutlined,
  EditOutlined, PlusOutlined, StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import {
  PROVIDERS, type AIModel,
  fetchModels, createModel, updateModel, deleteModel, enableModel, disableModel,
} from '../../services/model';
import message from '../../utils/message';

const { Title, Text } = Typography;
const { TextArea } = Input;

/** 已选 provider 是否需要填写 API Endpoint */
const NEED_ENDPOINT: Record<string, boolean> = {
  openai:    false,
  azure:     true,
  deepseek:  false,
  anthropic: true,
  custom:    true,
};

/** 每个 provider 的 Endpoint 提示 */
const ENDPOINT_HINT: Record<string, string> = {
  azure:     '例：https://your-resource.openai.azure.com/openai/deployments/your-deployment',
  anthropic: 'Claude 需填写 OpenAI 兼容代理地址，如 https://api.openai-proxy.org/anthropic/v1（直连 Anthropic 官方 API 需通过代理）',
  custom:    '自定义 base URL，例：http://localhost:11434/v1',
};

interface FormValues {
  name: string;
  provider: string;
  modelName: string;
  apiKey: string;
  apiEndpoint?: string;
  description?: string;
}

const ModelPage: React.FC = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>();
  const selectedProvider = Form.useWatch('provider', form);

  const load = async () => {
    setLoading(true);
    try {
      setModels(await fetchModels());
    } catch {
      message.error('加载模型列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingModel(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (m: AIModel) => {
    setEditingModel(m);
    form.setFieldsValue({
      name:        m.name,
      provider:    m.provider,
      modelName:   m.modelName,
      apiKey:      m.apiKey, // 显示脱敏值，提交时后端判断是否全*
      apiEndpoint: m.apiEndpoint,
      description: m.description,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editingModel) {
        await updateModel(editingModel.id, values);
        message.success('模型更新成功');
      } else {
        await createModel(values);
        message.success('模型创建成功');
      }
      setModalOpen(false);
      load();
    } catch {
      message.error(editingModel ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteModel(id);
      message.success('删除成功');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg ?? '删除失败');
    }
  };

  const handleToggle = async (m: AIModel, checked: boolean) => {
    setSwitchingId(m.id);
    try {
      if (checked) {
        await enableModel(m.id);
        message.success(`已启用「${m.name}」，其他模型已自动停用`);
      } else {
        await disableModel(m.id);
        message.success(`已停用「${m.name}」`);
      }
      load();
    } catch {
      message.error('操作失败');
    } finally {
      setSwitchingId(null);
    }
  };

  const columns: ColumnsType<AIModel> = [
    {
      title: '状态',
      key: 'enabled',
      width: 80,
      align: 'center',
      render: (_, r) => (
        <Tooltip title={r.enabled ? '点击停用' : '点击启用'}>
          <Switch
            checked={r.enabled}
            loading={switchingId === r.id}
            onChange={(checked) => handleToggle(r, checked)}
            checkedChildren="启用"
            unCheckedChildren="停用"
          />
        </Tooltip>
      ),
    },
    {
      title: '模型名称',
      dataIndex: 'name',
      render: (name, r) => (
        <Space>
          <Text strong>{name}</Text>
          {r.enabled && <Badge status="success" text={<Text style={{ color: '#52c41a', fontSize: 12 }}>当前启用</Text>} />}
        </Space>
      ),
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      width: 130,
      render: (p) => {
        const colorMap: Record<string, string> = {
          openai: 'blue', azure: 'geekblue', deepseek: 'purple',
          anthropic: 'orange', custom: 'default',
        };
        const label = PROVIDERS.find((x) => x.value === p)?.label ?? p;
        return <Tag color={colorMap[p] ?? 'default'}>{label}</Tag>;
      },
    },
    {
      title: '模型型号',
      dataIndex: 'modelName',
      width: 210,
      render: (v) => <Text code>{v}</Text>,
    },
    {
      title: 'API Key',
      dataIndex: 'apiKey',
      width: 160,
      render: (v) => <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'API Endpoint',
      dataIndex: 'apiEndpoint',
      ellipsis: true,
      render: (v) => v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 155,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, r) => (
        <Space>
          <Tooltip title="编辑">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Popconfirm
            title={r.enabled ? '请先停用再删除' : '确认删除该模型吗？'}
            disabled={r.enabled}
            onConfirm={() => handleDelete(r.id)}
            okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
          >
            <Tooltip title={r.enabled ? '请先停用再删除' : '删除'}>
              <Button
                type="link" danger size="small"
                icon={<DeleteOutlined />}
                disabled={r.enabled}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const enabledModel = models.find((m) => m.enabled);

  return (
    <div style={{ padding: '0 4px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Space align="center">
            <ApiOutlined style={{ fontSize: 20, color: '#1677ff' }} />
            <Title level={4} style={{ margin: 0 }}>模型管理</Title>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增模型
          </Button>
        </Col>
      </Row>

      {/* 当前启用状态提示 */}
      {enabledModel ? (
        <Card
          size="small"
          style={{
            marginBottom: 16,
            borderColor: '#b7eb8f',
            background: '#f6ffed',
          }}
        >
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
            <Text>当前启用模型：</Text>
            <Text strong>{enabledModel.name}</Text>
            <Tag color="blue">{PROVIDERS.find((p) => p.value === enabledModel.provider)?.label}</Tag>
            <Text code style={{ fontSize: 12 }}>{enabledModel.modelName}</Text>
          </Space>
        </Card>
      ) : (
        <Card
          size="small"
          style={{
            marginBottom: 16,
            borderColor: '#ffd591',
            background: '#fffbe6',
          }}
        >
          <Space>
            <StopOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
            <Text type="warning">暂无启用的模型，阅卷功能将无法使用。请启用一个模型。</Text>
          </Space>
        </Card>
      )}

      <Card size="small">
        <Table<AIModel>
          columns={columns}
          dataSource={models}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
          rowClassName={(r) => r.enabled ? 'row-enabled' : ''}
        />
      </Card>

      {/* 新增 / 编辑模态框 */}
      <Modal
        open={modalOpen}
        title={
          <Space>
            <ApiOutlined />
            {editingModel ? '编辑模型' : '新增模型'}
          </Space>
        }
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editingModel ? '保存' : '创建'}
        cancelText="取消"
        width={560}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={{ provider: 'openai' }}
        >
          <Form.Item
            name="name"
            label="展示名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="例：生产环境 GPT-4o" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="provider"
                label="提供商"
                rules={[{ required: true, message: '请选择提供商' }]}
              >
                <Select options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="modelName"
                label="模型型号"
                rules={[{ required: true, message: '请输入模型型号' }]}
              >
                <Input placeholder="请输入模型型号，如 qwen-vl-max" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: !editingModel, message: '请输入 API Key' }]}
            extra={editingModel ? '如不修改 Key，保持原值不变即可' : undefined}
          >
            <Input.Password
              placeholder={editingModel ? '不修改请留空' : '请输入 API Key'}
              autoComplete="new-password"
            />
          </Form.Item>

          {NEED_ENDPOINT[selectedProvider] && (
            <Form.Item
              name="apiEndpoint"
              label="API Endpoint"
              rules={[{ required: true, message: '该提供商需要填写 Endpoint' }]}
              extra={ENDPOINT_HINT[selectedProvider]}
            >
              <Input placeholder="https://..." />
            </Form.Item>
          )}

          <Form.Item name="description" label="备注说明">
            <TextArea rows={2} placeholder="可选，描述该模型的用途或环境" />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-enabled td { background: #f6ffed !important; }
      `}</style>
    </div>
  );
};

export default ModelPage;
