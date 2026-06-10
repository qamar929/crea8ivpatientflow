import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ClinicProvider } from './context/ClinicContext';
import LayoutNew from './components/layout/LayoutNew';

// Existing pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SubscriptionInactive from './pages/SubscriptionInactive';

// Platform owner portal
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLeads from './pages/admin/AdminLeads';
import AdminTenants from './pages/admin/AdminTenants';
import AdminPayments from './pages/admin/AdminPayments';
import AdminSupport from './pages/admin/AdminSupport';
import PublicSite from './pages/PublicSite';
import Dashboard from './pages/Dashboard';
import ReceptionDesk from './pages/ReceptionDesk';
import Appointments from './pages/Appointments';
import Clients from './pages/Clients';
import ClientProfile from './pages/ClientProfile';
import ClinicalWorkspace from './pages/ClinicalWorkspace';
import Staff from './pages/Staff';
import Services from './pages/Services';
import Financials from './pages/Financials';
import Settings from './pages/Settings';

// New pages
import Packages from './pages/Packages';
import Invoices from './pages/Invoices';
import Inventory from './pages/Inventory';
import Gallery from './pages/Gallery';
import Feedback from './pages/Feedback';
import Marketing from './pages/Marketing';
import WhatsAppCenter from './pages/WhatsAppCenter';
import Reports from './pages/Reports';
import AuditTrail from './pages/AuditTrail';
import MultiBranch from './pages/MultiBranch';
import AIHub from './pages/AIHub';
import MetaLeadCenter from './pages/MetaLeadCenter';
import ImportCenter from './pages/ImportCenter';
import Support from './pages/Support';
import { canAccessPath } from './config/roles';

function ProtectedRoute({ children }) {
  const isAuth = localStorage.getItem('clinic_auth') === 'true';
  return isAuth ? children : <Navigate to="/login" replace />;
}

function SuperadminRoute({ children }) {
  const isAuth = localStorage.getItem('clinic_auth') === 'true';
  if (!isAuth) return <Navigate to="/login" replace />;
  let role = '';
  try {
    role = (JSON.parse(localStorage.getItem('clinic_user') || '{}').role || '');
  } catch (_) { /* fall through */ }
  return role === 'superadmin' ? children : <Navigate to="/dashboard" replace />;
}

function RoleRoute({ path, children }) {
  return canAccessPath(`/${path}`) ? children : <Navigate to="/dashboard" replace />;
}

export default function AppNew() {
  return (
    <ThemeProvider>
      <ClinicProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/public" element={<PublicSite />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/subscription-inactive" element={<SubscriptionInactive />} />
            <Route
              path="/admin"
              element={
                <SuperadminRoute>
                  <AdminLayout />
                </SuperadminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="tenants" element={<AdminTenants />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="support" element={<AdminSupport />} />
            </Route>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <LayoutNew />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* Existing routes */}
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="reception" element={<RoleRoute path="reception"><ReceptionDesk /></RoleRoute>} />
              <Route path="appointments" element={<RoleRoute path="appointments"><Appointments /></RoleRoute>} />
              <Route path="clients" element={<RoleRoute path="clients"><Clients /></RoleRoute>} />
              <Route path="clients/:id" element={<RoleRoute path="clients"><ClientProfile /></RoleRoute>} />
              <Route path="clinical" element={<RoleRoute path="clinical"><ClinicalWorkspace /></RoleRoute>} />
              <Route path="staff" element={<RoleRoute path="staff"><Staff /></RoleRoute>} />
              <Route path="services" element={<RoleRoute path="services"><Services /></RoleRoute>} />
              <Route path="financials" element={<RoleRoute path="financials"><Financials /></RoleRoute>} />
              <Route path="settings" element={<RoleRoute path="settings"><Settings /></RoleRoute>} />

              {/* New routes */}
              <Route path="packages" element={<RoleRoute path="packages"><Packages /></RoleRoute>} />
              <Route path="invoices" element={<RoleRoute path="invoices"><Invoices /></RoleRoute>} />
              <Route path="inventory" element={<RoleRoute path="inventory"><Inventory /></RoleRoute>} />
              <Route path="gallery" element={<RoleRoute path="gallery"><Gallery /></RoleRoute>} />
              <Route path="feedback" element={<RoleRoute path="feedback"><Feedback /></RoleRoute>} />
              <Route path="marketing" element={<RoleRoute path="marketing"><Marketing /></RoleRoute>} />
              <Route path="whatsapp" element={<RoleRoute path="whatsapp"><WhatsAppCenter /></RoleRoute>} />
              <Route path="reports" element={<RoleRoute path="reports"><Reports /></RoleRoute>} />
              <Route path="audit" element={<RoleRoute path="audit"><AuditTrail /></RoleRoute>} />
              <Route path="branches" element={<RoleRoute path="branches"><MultiBranch /></RoleRoute>} />
              <Route path="ai" element={<RoleRoute path="ai"><AIHub /></RoleRoute>} />
              <Route path="meta-leads" element={<RoleRoute path="meta-leads"><MetaLeadCenter /></RoleRoute>} />
              <Route path="imports" element={<RoleRoute path="imports"><ImportCenter /></RoleRoute>} />
              <Route path="support" element={<RoleRoute path="support"><Support /></RoleRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ClinicProvider>
    </ThemeProvider>
  );
}
