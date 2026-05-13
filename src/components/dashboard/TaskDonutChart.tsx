import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TaskDistributionItem } from '../../lib/supabaseTasks';

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/[0.08] bg-coal-800/95 px-4 py-3 shadow-xl backdrop-blur-md">
        <p className="text-sm font-medium text-silver-200">{payload[0].name}</p>
        <p className="mt-1 font-display text-lg font-bold text-silver-100">
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

interface TaskDonutChartProps {
  data: TaskDistributionItem[];
}

export const TaskDonutChart: React.FC<TaskDonutChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;

  return (
    <div className="relative rounded-2xl border border-white/[0.06] bg-coal-700/30 p-8 backdrop-blur-sm">
      <div className="mb-6">
        <h2 className="font-display text-lg font-semibold text-silver-100">
          Görev Dağılımı
        </h2>
        <p className="mt-1 text-sm text-silver-600">
          Mevcut görev durumunun genel görünümü
        </p>
      </div>

      <div className="relative mx-auto h-[360px] w-full max-w-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data : [{ name: 'Veri Yok', value: 1, color: '#1e2736' }]}
              cx="50%"
              cy="50%"
              innerRadius={85}
              outerRadius={130}
              paddingAngle={hasData ? 4 : 0}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              {(hasData ? data : [{ name: 'Veri Yok', value: 1, color: '#374151' }]).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold tracking-tight text-silver-100">
            {hasData ? total : '-'}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-silver-600">
            {hasData ? 'Toplam Görev' : 'Veri Yok'}
          </span>
        </div>
      </div>

      {/* Legend */}
      {hasData && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-silver-500">{item.name}</span>
              <span className="text-xs font-semibold text-silver-300">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
