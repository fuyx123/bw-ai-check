import React from 'react';
import { Empty } from 'antd';

interface ChartPoint {
  label: string;
  value: number | null;
}

interface SimpleLineChartProps {
  points: ChartPoint[];
  height?: number;
  color?: string;
}

const padding = 24;

function getPointPosition(index: number, value: number, total: number, width: number, height: number) {
  const x = padding + (index * (width - padding * 2)) / Math.max(total - 1, 1);
  const y = height - padding - (value / 100) * (height - padding * 2);
  return { x, y };
}

function buildPolyline(points: ChartPoint[], width: number, height: number): string {
  return points
    .map((item, index) => {
      if (item.value === null) return '';
      const { x, y } = getPointPosition(index, item.value, points.length, width, height);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(' ');
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  points,
  height = 120,
  color = '#1677ff',
}) => {
  if (points.length === 0 || points.every((item) => item.value === null)) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无曲线数据" />;
  }

  const width = Math.max(points.length * 72, 360);
  const polyline = buildPolyline(points, width, height);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={width} height={height} role="img" aria-label="成绩趋势图">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d9d9d9" />
        <line x1={padding} y1={padding / 2} x2={padding} y2={height - padding} stroke="#d9d9d9" />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2}
          points={polyline}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((item, index) => {
          if (item.value === null) return null;
          const { x, y } = getPointPosition(index, item.value, points.length, width, height);
          return (
            <g key={`${item.label}-${index}`}>
              <circle cx={x} cy={y} r={3} fill={color} />
              <text x={x} y={height - 6} fontSize="10" textAnchor="middle" fill="#666">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default SimpleLineChart;
