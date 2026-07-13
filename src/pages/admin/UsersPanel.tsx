import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, UserRoundCog } from 'lucide-react';
import { ApiError, apiFetch } from '../../lib/api';
import type { AdminUserItem, AdminUserListResponse } from '../../types/auth';

type UserPatch = { role?: 'user' | 'admin'; admin_level?: number; is_active?: boolean };

function message(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Could not update user.';
}

export default function UsersPanel() {
  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const pageSize = 20;
  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setFeedback(null);
    const params = new URLSearchParams({ page: String(nextPage), page_size: String(pageSize) });
    if (query.trim()) params.set('q', query.trim());
    if (role) params.set('role', role);
    if (active) params.set('is_active', active);
    try {
      const result = await apiFetch<AdminUserListResponse>(`/admin/users?${params}`);
      setItems(result.items);
      setTotal(result.total);
      setPage(result.page);
    } catch (error) {
      setFeedback({ kind: 'error', text: message(error) });
    } finally {
      setLoading(false);
    }
  }, [active, query, role]);

  useEffect(() => { void load(1); }, [load]);

  const update = async (item: AdminUserItem, patch: UserPatch, text: string) => {
    setBusyId(item.id);
    setFeedback(null);
    try {
      const updated = await apiFetch<AdminUserItem>(`/admin/users/${encodeURIComponent(item.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      setItems((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate));
      setFeedback({ kind: 'success', text });
    } catch (error) {
      setFeedback({ kind: 'error', text: message(error) });
    } finally { setBusyId(''); }
  };

  return <section className="admin-card glass">
    <header className="admin-card-head"><h2><UserRoundCog size={18} /><span>User management</span></h2>
      <div className="admin-query-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by email or user name" />
        <select value={role} onChange={(event) => setRole(event.target.value)}><option value="">All roles</option><option value="user">user</option><option value="admin">admin</option></select>
        <select value={active} onChange={(event) => setActive(event.target.value)}><option value="">All states</option><option value="true">Enable</option><option value="false">Disable</option></select>
        <button type="button" className="btn-secondary" disabled={loading} onClick={() => void load(1)}><Search size={14} />Search</button>
      </div>
    </header>
    {feedback && <p role={feedback.kind === 'error' ? 'alert' : 'status'} className={`admin-feedback ${feedback.kind}`}>{feedback.text}</p>}
    {loading ? <div className="admin-placeholder">Loading users...</div> : items.length === 0 ? <div className="admin-placeholder">No users found.</div> :
      <ul className="admin-list">{items.map((item) => <li className="admin-list-item" key={item.id}>
        <div className="admin-list-main"><strong>{item.display_name || item.email}</strong><p>{item.email}</p><p>role={item.role} / level={item.admin_level} / {item.is_active ? 'active' : 'inactive'}</p><p>Created: {new Date(item.created_at).toLocaleString('zh-CN', { hour12: false })}</p></div>
        <div className="admin-list-actions">
          <button type="button" className="btn-secondary" disabled={busyId === item.id} onClick={() => void update(item, { is_active: !item.is_active }, item.is_active ? 'User disabled.' : 'User enabled.')}>{item.is_active ? 'Disable' : 'Enable'}</button>
          <button type="button" className="btn-secondary" disabled={busyId === item.id} onClick={() => void update(item, { role: item.role === 'admin' ? 'user' : 'admin', admin_level: item.role === 'admin' ? 0 : 1 }, item.role === 'admin' ? 'User demoted to standard user.' : 'User promoted to admin.')}>{item.role === 'admin' ? 'Demote' : 'Promote'}</button>
          <button type="button" className="btn-secondary" disabled={busyId === item.id || item.role !== 'admin'} onClick={() => void update(item, { admin_level: item.admin_level + 1 }, 'Admin level increased.')}>Level +1</button>
        </div>
      </li>)}</ul>}
    <footer className="admin-pagination"><span>Page {page}/{pages} of {total} items</span><div><button type="button" className="btn-secondary" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>Previous</button><button type="button" className="btn-secondary" disabled={page >= pages || loading} onClick={() => void load(page + 1)}>Next</button></div></footer>
  </section>;
}
