import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, AppWindow, FileClock, ShieldCheck, Users } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { buildAuthRedirectWithNext } from '../../auth/next';
import { useAuth } from '../../auth/useAuth';
import { pageVariants } from '../../lib/motion';
import AccessRequestsPanel from './AccessRequestsPanel';
import ClientsPanel from './ClientsPanel';
import GrantsPanel from './GrantsPanel';
import RuntimeModulesPanel from './RuntimeModulesPanel';
import UsersPanel from './UsersPanel';
import '../Admin.css';

type AdminTab = 'users' | 'clients' | 'grants' | 'access-requests' | 'runtime-modules';

const TABS: Array<{ id: AdminTab; label: string; icon: typeof Users; level: number }> = [
  { id: 'users', label: 'Users', icon: Users, level: 1 },
  { id: 'clients', label: 'Clients', icon: AppWindow, level: 1 },
  { id: 'grants', label: 'Grants', icon: ShieldCheck, level: 1 },
  { id: 'access-requests', label: 'Access requests', icon: FileClock, level: 1 },
  { id: 'runtime-modules', label: 'Runtime Modules', icon: ShieldCheck, level: 2 },
];

export default function AdminPage() {
  const { user, loading, sessionChecked } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  if (loading || (!user && !sessionChecked)) {
    return <div className="container admin-loading">Checking admin session...</div>;
  }
  if (!user) {
    return <Navigate to={buildAuthRedirectWithNext('/admin')} replace />;
  }
  if (user.role !== 'admin' || user.admin_level < 1) {
    return <div className="container admin-access-denied"><div className="glass admin-access-denied-card"><AlertTriangle size={20} /><h1>No admin access</h1><p>This account is not an admin or does not have enough admin level.</p><Link to="/" className="btn-secondary">Back home</Link></div></div>;
  }

  return <motion.div className="page-transition-wrap admin-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
    <div className="container admin-container">
      <header className="admin-hero"><div><p className="admin-eyebrow">Administration</p><h1>Admin console</h1><p>Manage users, OAuth clients, access requests, grants, and runtime capabilities.</p></div></header>
      <motion.nav className="admin-tabs" layout aria-label="Admin sections">
        {TABS.filter((tab) => user.admin_level >= tab.level).map((tab) => { const Icon = tab.icon; return <motion.button key={tab.id} layout type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)} whileTap={{ scale: 0.98 }}><Icon size={16} /><span>{tab.label}</span></motion.button>; })}
      </motion.nav>
      {activeTab === 'users' && <UsersPanel />}
      {activeTab === 'clients' && <ClientsPanel />}
      {activeTab === 'grants' && <GrantsPanel />}
      {activeTab === 'access-requests' && <AccessRequestsPanel />}
      {activeTab === 'runtime-modules' && user.admin_level >= 2 && <RuntimeModulesPanel />}
    </div>
  </motion.div>;
}
