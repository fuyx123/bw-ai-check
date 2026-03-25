import React from 'react';
import { Tag } from 'antd';

type StatusType = 'operational' | 'reviewing' | 'full' | 'partial' | 'inactive';

interface StatusTagProps {
  status: StatusType;
  text?: string;
}

const statusConfig: Record<StatusType, { color: string; defaultText: string }> = {
  operational: { color: 'green', defaultText: '正常运行' },
  full: { color: 'green', defaultText: '完全访问' },
  reviewing: { color: 'orange', defaultText: '审查中' },
  partial: { color: 'orange', defaultText: '受限访问' },
  inactive: { color: 'default', defaultText: '未激活' },
};

const StatusTag: React.FC<StatusTagProps> = ({ status, text }) => {
  const config = statusConfig[status];

  return (
    <Tag color={config.color}>
      {text ?? config.defaultText}
    </Tag>
  );
};

export default StatusTag;
