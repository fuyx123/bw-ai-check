import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';

import { fetchAuditLogs, type AuditLogFilters } from '../../services/audit';
import type { AuditLog } from '../../types/rbac';
import message from '../../utils/message';

const { RangePicker } = DatePicker;
const { Search } = Input;
const { Title, Text } = Typography;

const TYPE_META: Record<AuditLog['type'], { color: string; label: string }> = {
  info: { color: 'blue', label: '信息' },
  success: { color: 'green', label: '成功' },
  warning: { color: 'orange', label: '警告' },
};

const AuditLogPage: React.FC = () => {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
  });

  const dateRangeValue = useMemo<[Dayjs, Dayjs] | null>(() => {
    if (!filters.dateRange?.[0] || !filters.dateRange?.[1]) {
      return null;
    }
    return [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])];
  }, [filters.dateRange]);

  const load = async (next?: Partial<TablePaginationConfig>, nextFilters?: AuditLogFilters) => {
    const current = next?.current ?? pagination.current ?? 1;
    const pageSize = next?.pageSize ?? pagination.pageSize ?? 10;
    const appliedFilters = nextFilters ?? filters;

    setLoading(true);
    try {
      const result = await fetchAuditLogs(current, pageSize, appliedFilters);
      setItems(result.items);
      setPagination((prev) => ({
        ...prev,
        current: result.page,
        pageSize: result.pageSize,
        total: result.total,
      }));
    } catch {
      message.error('加载审计日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: ColumnsType<AuditLog> = [
    {
      title: '操作',
      dataIndex: 'action',
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          {record.detail ? <Text type="secondary">{record.detail}</Text> : null}
        </Space>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      width: 180,
      render: (value: string) => value || '-',
    },
    {
      title: '目标',
      dataIndex: 'target',
      width: 220,
      render: (value: string) => value || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (value: AuditLog['type']) => {
        const meta = TYPE_META[value] ?? { color: 'default', label: value };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
  ];

  const handleSearch = (patch: Partial<AuditLogFilters>) => {
    const nextFilters = { ...filters, ...patch };
    setFilters(nextFilters);
    void load({ ...pagination, current: 1 }, nextFilters);
  };

  const handleReset = () => {
    const nextFilters: AuditLogFilters = {};
    setFilters(nextFilters);
    void load({ current: 1, pageSize: pagination.pageSize }, nextFilters);
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ marginBottom: 8 }}>审计日志</Title>
        <Text type="secondary">查看系统关键操作记录，支持按操作、操作人、类型和日期筛选。</Text>
      </div>

      <Card>
        <Space wrap size={12}>
          <Search
            allowClear
            placeholder="搜索操作名称"
            style={{ width: 220 }}
            value={filters.action}
            onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value || undefined }))}
            onSearch={(value) => handleSearch({ action: value })}
          />
          <Search
            allowClear
            placeholder="搜索操作人"
            style={{ width: 220 }}
            value={filters.operator}
            onChange={(event) => setFilters((current) => ({ ...current, operator: event.target.value || undefined }))}
            onSearch={(value) => handleSearch({ operator: value })}
          />
          <Select<AuditLog['type'] | undefined>
            allowClear
            placeholder="选择类型"
            style={{ width: 140 }}
            value={filters.type}
            options={[
              { value: 'success', label: '成功' },
              { value: 'warning', label: '警告' },
              { value: 'info', label: '信息' },
            ]}
            onChange={(value) => handleSearch({ type: value })}
          />
          <RangePicker
            value={dateRangeValue}
            onChange={(value) =>
              handleSearch({
                dateRange: value ? [value[0]!.toISOString(), value[1]!.toISOString()] : null,
              })
            }
          />
          <Button onClick={handleReset}>重置筛选</Button>
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table<AuditLog>
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={pagination}
          onChange={(nextPagination) => void load(nextPagination)}
        />
      </Card>
    </Space>
  );
};

export default AuditLogPage;
