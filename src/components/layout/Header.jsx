import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, LogOut, User, Settings, Sun, Moon } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentRole, getCurrentUser, ROLE_LABELS } from '../../config/roles';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/reception': 'Reception Desk',
  '/appointments': 'Appointments',
  '/clients': 'Patients',
  '/clinical': 'Clinical Workspace',
  '/staff': 'Staff',
  '/services': 'Services',
  '/financials': 'Financials',
  '/packages': 'Packages',
  '/invoices': 'Invoices',
  '/inventory': 'Inventory',
  '/gallery': 'Gallery',
  '/feedback': 'Feedback',
  '/marketing': 'Marketing',
  '/whatsapp': 'WhatsApp Center',
  '/ai': 'AI Hub',
  '/meta-leads': 'Meta Lead Center',
  '/imports': 'Import Center',
  '/reports': 'Reports',
  '/audit': 'Audit Trail',
  '/branches': 'Branches',
  '/settings': 'Settings',
};

const notifications = [
  { id: 1, text: 'Farah Siddiqui confirmed her 11:00 AM appointment', time: '5m ago', read: false },
  { id: 2, text: 'New client registration: Rabia Noor', time: '32m ago', read: false },
  { id: 3, text: 'Staff reminder: Nida Farooq has a pending payroll review', time: '1h ago', read: false },
];

export default function Header() {
  const { clinicInfo } = useClinic();
  const { darkMode, toggleDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const user = getCurrentUser();
  const role = getCurrentRole();

  const pathParts = location.pathname.split('/').filter(Boolean);
  const title = pageTitles[location.pathname] || pageTitles['/' + pathParts[0]] || clinicInfo.name;
  const breadcrumb = pathParts.map((p, i) => ({ label: pageTitles['/' + p] || p, path: '/' + pathParts.slice(0, i + 1).join('/') }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    localStorage.removeItem('clinic_auth');
    localStorage.removeItem('clinic_user');
    navigate('/login');
  };

  return (
    <header className="relative z-20 h-16 bg-white/82 dark:bg-slate-950/70 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Left: Title + Breadcrumb */}
      <div>
        <h1 className="text-[15px] font-bold text-gray-950 dark:text-white tracking-tight">{title}</h1>
        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <span>{clinicInfo.name}</span>
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              <span>/</span>
              <span className={i === breadcrumb.length - 1 ? 'text-indigo-600 dark:text-indigo-400 font-medium' : ''}>{b.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Right: Search + Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            data-global-search
            type="text"
            placeholder="Search patients, appointments..."
            className="premium-input pl-9 pr-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 w-72"
          />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/70 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 transition-all duration-200 shadow-sm"
          aria-label="Toggle dark mode"
        >
          {darkMode
            ? <Sun className="w-3.5 h-3.5 text-amber-400" />
            : <Moon className="w-3.5 h-3.5 text-slate-500" />}
          <span className="text-[11px] font-medium hidden sm:inline">
            {darkMode ? 'Light' : 'Dark'}
          </span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            className="relative p-2 rounded-lg hover:bg-white dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors shadow-sm border border-transparent hover:border-gray-200/60"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] sm:w-80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-2xl rounded-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
                <button className="text-xs font-medium" style={{ color: 'var(--primary)' }}>Mark all read</button>
              </div>
              {notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-gray-100/50 dark:border-white/5 hover:bg-gray-50/80 dark:hover:bg-white/5 cursor-pointer transition-colors">
                  <div className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--primary)' }} />
                    <div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{n.text}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-colors border border-transparent hover:border-gray-200/60"
          >
            <div
              className="brand-mark w-8 h-8 text-xs"
            >
              {user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AU'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight">{user.name}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{ROLE_LABELS[role] || 'Owner'}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-2xl rounded-2xl z-50 overflow-hidden py-1">
              <button className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50/80 dark:hover:bg-white/10 transition-colors">
                <User className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Profile
              </button>
              <button onClick={() => navigate('/settings')} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50/80 dark:hover:bg-white/10 transition-colors">
                <Settings className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Settings
              </button>
              <div className="border-t border-gray-100/50 dark:border-white/10 mt-1" />
              <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/30 transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
