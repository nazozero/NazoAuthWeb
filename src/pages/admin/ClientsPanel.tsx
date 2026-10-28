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
import { AppWindow, PencilLine, Plus, Search } from 'lucide-react';
import { ApiError, apiFetch } from '../../lib/api';
import type {
  AdminClientItem,
  AdminClientListResponse,
} from '../../types/auth';
import ClientFormFields from './ClientFormFields';
import {
  clientToForm,
  initialClientForm,
  normalizedClient,
  type ClientFormModel,
} from './clientFormModel';

const errorText = (error: unknown, fallback: string) =>
  error instanceof ApiError || error instanceof Error
    ? error.message
    : fallback;
export default function ClientsPanel() {
  const { t } = useI18n();
  const queryInput = useRef<HTMLInputElement>(null);
  const listRequest = useRef<AbortController | null>(null);
  const mutationInFlight = useRef(false);

  const [items, setItems] = useState<AdminClientItem[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1);
  const [query, setQuery] = useState(''),
    [active, setActive] = useState(''),
    [loading, setLoading] = useState(true),
    [feedback, setFeedback] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null),
    [form, setForm] = useState<ClientFormModel>(initialClientForm()),
    [editId, setEditId] = useState(''),
    [secret, setSecret] = useState(''),
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
      if (active) p.set('is_active', active);
      try {
        const result = await apiFetch<AdminClientListResponse>(
          `/admin/clients?${p}`,
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        setItems(result.items);
        setTotal(result.total);
        setPage(result.page);
      } catch (error) {
        if (controller.signal.aborted) return;
        setFeedback(errorText(error, 'Could not load clients.'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [active, query]
  );
  useEffect(() => {
    void load(1);
    return () => listRequest.current?.abort();
  }, [load]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (mutationInFlight.current || secret) return;
    setFeedback('');
    setSecret('');
    let next;
    try {
      next = normalizedClient(form);
    } catch (error) {
      setFeedback(errorText(error, 'Invalid client.'));
      return;
    }
    mutationInFlight.current = true;
    setSaving(true);
    const owner = listRequest.current;
    try {
      const creating = modal === 'create';
      const result = await apiFetch<AdminClientItem>(
        creating
          ? '/admin/clients'
          : `/admin/clients/${encodeURIComponent(editId)}`,
        {
          method: creating ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name: next.clientName,
            ...(creating
              ? {
                  client_type: next.clientType,
                  token_endpoint_auth_method: next.tokenEndpointAuthMethod,
                }
              : { is_active: next.isActive }),
            redirect_uris: next.redirectUris,
            scopes: next.scopes,
            allowed_audiences: next.allowedAudiences,
            grant_types: next.grantTypes,
          }),
        }
      );
      if (owner?.signal.aborted) return;
      setFeedback(
        creating ? `Client created: ${result.client_id}` : 'Client updated.'
      );
      setSecret(result.client_secret ?? '');
      setModal(creating && result.client_secret ? 'create' : null);
      await load(1);
    } catch (error) {
      if (!owner?.signal.aborted) setFeedback(errorText(error, 'Could not save client.'));
    } finally {
      mutationInFlight.current = false;
      setSaving(false);
    }
  };
  const toggle = async (item: AdminClientItem) => {
    if (mutationInFlight.current || modal) return;
    mutationInFlight.current = true;
    setSaving(true);
    try {
      const updated = await apiFetch<AdminClientItem>(
        `/admin/clients/${encodeURIComponent(item.client_id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !item.is_active }),
        }
      );
      setItems((current) =>
        current.map((candidate) =>
          candidate.client_id === item.client_id ? updated : candidate
        )
      );
    } catch (error) {
      setFeedback(errorText(error, 'Could not update client.'));
    } finally {
      mutationInFlight.current = false;
      setSaving(false);
    }
  };
  return (
    <section className="admin-card glass">
      <header className="admin-card-head">
        <h2>
          <AppWindow size={18} />
          {t('admin.ui.clientManagement')}
        </h2>
        <div className="admin-query-row">
          <input
            ref={queryInput}
            disabled={saving}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setQuery(event.currentTarget.value.trim());
            }}
            aria-label={t('admin.ui.searchClients')}
            placeholder={t('admin.ui.searchClients')}
          />
          <select disabled={saving} value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="">{t('admin.ui.allStates')}</option>
            <option value="true">{t('admin.ui.active')}</option>
            <option value="false">{t('admin.ui.inactive')}</option>
          </select>
          <button disabled={saving} className="btn-secondary" onClick={() => setQuery(queryInput.current?.value.trim() ?? '')}>
            <Search size={14} />
            {t('admin.ui.search')}
          </button>
          <button
            className="btn-primary"
            disabled={saving}
            onClick={() => {
              setForm(initialClientForm());
              setModal('create');
            }}
          >
            <Plus size={14} />
            {t('admin.ui.createClient')}
          </button>
        </div>
      </header>
      {feedback && (
        <p role="status" className="admin-feedback">
          {feedback}
        </p>
      )}
      {loading ? (
        <div className="admin-placeholder">{t('admin.ui.loadingClients')}</div>
      ) : (
        <ul className="admin-list">
          {items.map((item) => (
            <li key={item.client_id} className="admin-list-item">
              <div>
                <strong>{item.client_name}</strong>
                <p>{item.client_id}</p>
                <p>
                  {item.client_type} · {item.is_active ? 'active' : 'inactive'}
                </p>
              </div>
              <div className="admin-list-actions">
                <button
                  className="btn-secondary"
                  disabled={saving}
                  onClick={() => {
                    setEditId(item.client_id);
                    setForm(clientToForm(item));
                    setModal('edit');
                  }}
                >
                  <PencilLine size={14} />
                  {t('admin.ui.edit')}
                </button>
                <button
                  className="btn-secondary"
                  disabled={saving}
                  onClick={() => void toggle(item)}
                >
                  {item.is_active
                    ? t('admin.ui.disable')
                    : t('admin.ui.enable')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <footer className="admin-pagination">
        <span>
          {t('admin.ui.page')} {page}/{pages} {t('admin.ui.of')} {total}{' '}
          {t('admin.ui.items')}
        </span>
        <button disabled={saving || page <= 1} onClick={() => void load(page - 1)}>
          {t('admin.ui.previous')}
        </button>
        <button disabled={saving || page >= pages} onClick={() => void load(page + 1)}>
          {t('admin.ui.next')}
        </button>
      </footer>
      {modal && (
        <AdminDialog
          label={
            modal === 'create'
              ? t('admin.ui.createClient')
              : t('admin.ui.editClient')
          }
          onDismiss={() => { if (!saving) { setModal(null); setSecret(''); } }}
        >
          <form onSubmit={save}>
            <h3>
              {modal === 'create'
                ? t('admin.ui.createClient')
                : t('admin.ui.editClient')}
            </h3>
            {!secret && <fieldset disabled={saving}>
            <ClientFormFields
              form={form}
              onChange={setForm}
              includeActive={modal === 'edit'}
            />
            </fieldset>}
            {secret && (
              <p>
                {t('admin.ui.clientSecretShownOnce')} <code>{secret}</code>
              </p>
            )}
            <button type="button" disabled={saving} onClick={() => { setModal(null); setSecret(''); }}>
              {secret ? t('admin.ui.done') : t('admin.ui.cancel')}
            </button>
            {!secret && <button type="submit" className="btn-primary" disabled={saving}>
              {modal === 'create'
                ? t('admin.ui.saveNewClient')
                : t('admin.ui.saveClientChanges')}
            </button>}
          </form>
        </AdminDialog>
      )}
    </section>
  );
}
