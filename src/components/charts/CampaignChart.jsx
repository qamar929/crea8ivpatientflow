import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';

const weeklyData = [
  { week: 'Week 1', SMS: 320, Email: 210, WhatsApp: 280, Push: 55 },
  { week: 'Week 2', SMS: 410, Email: 290, WhatsApp: 340, Push: 80 },
  { week: 'Week 3', SMS: 380, Email: 250, WhatsApp: 310, Push: 65 },
  { week: 'Week 4', SMS: 450, Email: 320, WhatsApp: 390, Push: 90 },
];

const channelData = [
  { name: 'SMS', value: 35, color: '#6366f1' },
  { name: 'WhatsApp', value: 30, color: '#22c55e' },
  { name: 'Email', value: 28, color: '#0ea5e9' },
  { name: 'Push', value: 7, color: '#f59e0b' },
];

const COLORS = { SMS: '#6366f1', Email: '#0ea5e9', WhatsApp: '#22c55e', Push: '#f59e0b' };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-2">{label}</p>
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-600">{p.dataKey}:</span>
            <span className="font-medium text-gray-900">{p.value} sent</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function CampaignBarChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="SMS" fill={COLORS.SMS} radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Bar dataKey="Email" fill={COLORS.Email} radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Bar dataKey="WhatsApp" fill={COLORS.WhatsApp} radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Bar dataKey="Push" fill={COLORS.Push} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CampaignDonut() {
  return (
    <div className="flex flex-col items-center h-full">
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={channelData}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={3}
              dataKey="value"
            >
              {channelData.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [`${v}%`, 'Share']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2">
        {channelData.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-gray-600">{d.name}</span>
            <span className="text-xs font-bold text-gray-900 ml-auto">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
