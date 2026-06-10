import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchApi } from '../../config/api';

export default function AppointmentChart() {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetchApi('/appointments').then(rows => setAppointments(Array.isArray(rows) ? rows : [])).catch(() => setAppointments([]));
  }, []);

  const data = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const grouped = days.map(day => ({ day, appointments: 0 }));
    appointments.forEach(appt => {
      const date = new Date(appt.date);
      if (!Number.isNaN(date.getTime())) grouped[date.getDay()].appointments += 1;
    });
    return grouped;
  }, [appointments]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Appointments This Week</h3>
        <p className="mt-0.5 text-xs text-gray-400">Live appointment volume</p>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => [value, 'Appointments']} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="appointments" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
