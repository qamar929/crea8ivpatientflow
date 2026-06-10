import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, UserCheck, Stethoscope,
  DollarSign, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { useClinic } from '../../context/ClinicContext';
import { useState } from 'react';
import ClinicLogoMark from '../branding/ClinicLogoMark';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/staff', icon: UserCheck, label: 'Staff' },
  { to: '/services', icon: Stethoscope, label: 'Services' },
  { to: '/financials', icon: DollarSign, label: 'Financials' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const specialtyFilters = [
  { key: 'all', label: 'All', color: '#6366f1' },
  { key: 'dental', label: 'Dental', color: '#3b82f6' },
];

export default function Sidebar() {
  const { activeSpecialty, setActiveSpecialty, clinicInfo } = useClinic();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'flex flex-col bg-slate-900 h-full transition-all duration-300 ease-in-out relative',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 z-10 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-500" /> : <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />}
      </button>

      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <ClinicLogoMark
            logo={clinicInfo.logo}
            alt={`${clinicInfo.name} logo`}
            className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 overflow-hidden"
            textClassName="text-white font-bold text-xs"
          />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-semibold text-sm leading-tight truncate">{clinicInfo.name}</p>
              <p className="text-slate-400 text-xs truncate">{clinicInfo.tagline}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-2 mb-2">Main Menu</p>
        )}
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-2 border-transparent'
              )
            }
          >
            <Icon className="w-4.5 h-4.5 shrink-0 w-[18px] h-[18px]" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Specialty Filter */}
      <div className="px-2 py-4 border-t border-slate-800">
        {!collapsed && (
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-2 mb-2">Filter by</p>
        )}
        <div className={clsx('flex gap-1', collapsed ? 'flex-col items-center' : 'flex-col')}>
          {specialtyFilters.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setActiveSpecialty(key)}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 w-full',
                activeSpecialty === key
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              )}
              title={collapsed ? label : ''}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              {!collapsed && label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
