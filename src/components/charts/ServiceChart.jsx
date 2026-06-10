import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchApi } from '../../config/api';

const colors = ['#0f766e', '#2563eb', '#be3455', '#7e22ce', '#f59e0b', '#0891b2'];

export default function ServiceChart() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchApi('/services')
      .then(rows => setServices(Array.isArray(rows) ? rows : []))
      .catch(() => setServices([]));
  }, []);

  const data = useMemo(() => {
    const grouped = {};
    services.forEach(service => {
      const key = service.category || 'Services';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }));
  }, [services]);

  const chartData = data.length ? data : [{ name: 'No services', value: 1, color: '#e5e7eb' }];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Service Categories</h3>
        <p className="mt-0.5 text-xs text-gray-400">Live service setup, not demo case volume</p>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="45%" innerRadius="55%" outerRadius="80%" paddingAngle={3} dataKey="value">
              {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
            </Pie>
            <Tooltip formatter={(value) => [value, 'Services']} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
