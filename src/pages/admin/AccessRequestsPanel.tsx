import { useI18n } from '../../i18n';
import AdminDialog from '../../components/AdminDialog';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { FileClock, Search } from 'lucide-react';
import { ApiError, apiFetch } from '../../lib/api';
import {
  ClientAccessRequestStatus,
  clientAccessRequestStatusMeta,
  type AdminAccessRequestItem,
  type AdminAccessRequestListResponse,
} from '../../types/auth';
import ClientFormFields from './ClientFormFields';
import {
  normalizedClient,
  requestToForm,
  type ClientFormModel,
} from './clientFormModel';

const errorText = (error: unknown, fallback: string) =>
  error instanceof ApiError || error instanceof Error
    ? error.message
    : fallback;
export default function AccessRequestsPanel() {
  const { t } = useI18n();
  const queryInput = useRef<HTMLInputElement>(null);
  const listRequest = useRef<AbortController | null>(null);

  const [items, setItems] = useState<AdminAccessRequestItem[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState(''),
    [loading, setLoading] = useState(true),
    [feedback, setFeedback] = useState('');
  const [selected, setSelected] = useState<AdminAccessRequestItem | null>(null),
    [mode, setMode] = useState<'approve' | 'reject' | null>(null),
    [form, setForm] = useState<ClientFormModel | null>(null),
    [note, setNote] = useState(''),
    [saving, setSaving] = useState(false);
  const pageSize = 20,
    pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
  const load = useCallback(
    async (nextPage: number) => {
      listRequest.current?.abort();
      const controller = new AbortController();
      listRequest.current = controller;
      setLoading(true);
      const p = new URLSearchParams({
        page: String(nextPage),
        page_size: String(pageSize),
      });
      if (query.trim()) p.set('q', query.trim());
      if (status) p.set('status', status);
      try {
        const result = await apiFetch<AdminAccessRequestListResponse>(
          `/admin/access-requests?${p}`,
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        setItems(result.items);
        setTotal(result.total);
        setPage(result.page);
      } catch (error) {
        if (controller.signal.aborted) return;
        setFeedback(errorText(error, 'Could not load access requests.'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [query, status]
  );
  useEffect(() => {
    void load(1);
    return () => listRequest.current?.abort();
  }, [load]);
  const reject = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !note.trim()) {
      setFeedback('Enter a rejection reason.');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiFetch<AdminAccessRequestItem>(
        `/admin/access-requests/${encodeURIComponent(selected.id)}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_note: note.trim() }),
        }
      );
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setFeedback('Request rejected. The reason was emailed to the requester.');
      setMode(null);
    } catch (error) {
      setFeedback(errorText(error, 'Could not reject request.'));
    } finally {
      setSaving(false);
    }
  };
  const approve = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !form) return;
    let next;
    try {
      next = normalizedClient(form);
    } catch (error) {
      setFeedback(errorText(error, 'Invalid client.'));
      return;
    }
    setSaving(true);
    try {
      const updated = await apiFetch<AdminAccessRequestItem>(
        `/admin/access-requests/${encodeURIComponent(selected.id)}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name: next.clientName,
            client_type: next.clientType,
            redirect_uris: next.redirectUris,
            scopes: next.scopes,
            allowed_audiences: next.allowedAudiences,
            grant_types: next.grantTypes,
            token_endpoint_auth_method: next.tokenEndpointAuthMethod,
            admin_note: note.trim() || null,
          }),
        }
      );
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setFeedback(
        'Request approved. The requester can now open the one-time credential link from their access-request history.'
      );
      setMode(null);
    } catch (error) {
      setFeedback(errorText(error, 'Could not approve request.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="admin-card glass">
      <header className="admin-card-head">
        <h2>
          <FileClock size={18} />
          {t('admin.ui.accessRequests')}
        </h2>
        <div className="admin-query-row">
          <input
            ref={queryInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setQuery(event.currentTarget.value.trim());
            }}
            aria-label={t('admin.ui.searchRequests')}
            placeholder={t('admin.ui.searchRequests')}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('admin.ui.allStates')}</option>
            <option value="pending">{t('admin.ui.pending')}</option>
            <option value="approved">{t('admin.ui.approved')}</option>
            <option value="rejected">{t('admin.ui.rejected')}</option>
          </select>
          <button onClick={() => setQuery(queryInput.current?.value.trim() ?? '')}>
            <Search size={14} />
            {t('admin.ui.search')}
          </button>
        </div>
      </header>
      {feedback && (
        <p role="status" className="admin-feedback">
          {feedback}
        </p>
      )}
      {loading ? (
        <div className="admin-placeholder">
          {t('admin.ui.loadingAccessRequests')}
        </div>
      ) : (
        <ul className="admin-list">
          {items.map((item) => {
            const meta = clientAccessRequestStatusMeta[item.status];
            return (
              <li key={item.id} className="admin-list-item">
                <div>
                  <strong>{item.site_name}</strong>
                  <p>
                    {item.user_email} · {item.site_url}
                  </p>
                  <p>{item.request_description}</p>
                  <span className={meta.className}>{meta.label}</span>
                </div>
                {item.status === ClientAccessRequestStatus.Pending && (
                  <div className="admin-list-actions">
                    <button
                      onClick={() => {
                        setSelected(item);
                        setForm(requestToForm(item));
                        setNote('');
                        setMode('approve');
                      }}
                    >
                      {t('admin.ui.approve')}
                    </button>
                    <button
                      onClick={() => {
                        setSelected(item);
                        setNote('');
                        setMode('reject');
                      }}
                    >
                      {t('admin.ui.reject')}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <footer className="admin-pagination">
        <span>
          {t('admin.ui.page')} {page}/{pages} {t('admin.ui.of')} {total}{' '}
          {t('admin.ui.items')}
        </span>
        <button disabled={page <= 1} onClick={() => void load(page - 1)}>
          {t('admin.ui.previous')}
        </button>
        <button disabled={page >= pages} onClick={() => void load(page + 1)}>
          {t('admin.ui.next')}
        </button>
      </footer>
      {mode === 'approve' && form && (
        <AdminDialog
          label={t('admin.ui.approveAccessRequest')}
          onDismiss={() => setMode(null)}
        >
          <form onSubmit={approve}>
            <h3>{t('admin.ui.approveAccessRequest')}</h3>
            <ClientFormFields form={form} onChange={setForm} />
            <label>
              {t('admin.ui.adminNote')}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button type="button" onClick={() => setMode(null)}>
              {t('admin.ui.cancel')}
            </button>
            <button type="submit" disabled={saving}>
              {t('admin.ui.approveRequest')}
            </button>
          </form>
        </AdminDialog>
      )}
      {mode === 'reject' && (
        <AdminDialog
          label={t('admin.ui.rejectAccessRequest')}
          onDismiss={() => setMode(null)}
        >
          <form onSubmit={reject}>
            <h3>{t('admin.ui.rejectAccessRequest')}</h3>
            <label>
              {t('admin.ui.rejectionReason')}
              <textarea
                aria-label={t('admin.ui.rejectionReason')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button type="button" onClick={() => setMode(null)}>
              {t('admin.ui.cancel')}
            </button>
            <button type="submit" disabled={saving}>
              {t('admin.ui.rejectRequest')}
            </button>
          </form>
        </AdminDialog>
      )}
    </section>
  );
}
