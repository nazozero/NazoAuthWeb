import { useI18n } from '../../i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, Search, ShieldCheck } from 'lucide-react';
import { ApiError, apiFetch } from '../../lib/api';
import type {
  AdminGrantItem,
  AdminGrantListResponse,
  AdminGrantRevokeResponse,
} from '../../types/auth';

export default function GrantsPanel() {
  const { t } = useI18n();
  const queryInput = useRef<HTMLInputElement>(null);
  const listRequest = useRef<AbortController | null>(null);

  const [items, setItems] = useState<AdminGrantItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  const pageSize = 20;
  const pages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total]
  );
  const load = useCallback(
    async (nextPage: number) => {
      listRequest.current?.abort();
      const controller = new AbortController();
      listRequest.current = controller;
      setLoading(true);
      const params = new URLSearchParams({
        page: String(nextPage),
        page_size: String(pageSize),
      });
      if (query.trim()) params.set('q', query.trim());
      try {
        const result = await apiFetch<AdminGrantListResponse>(
          `/admin/grants?${params}`,
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        setItems(result.items);
        setTotal(result.total);
        setPage(result.page);
      } catch (error) {
        if (controller.signal.aborted) return;
        setFeedback({
          error: true,
          text:
            error instanceof ApiError || error instanceof Error
              ? error.message
              : 'Could not load grants.',
        });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [query]
  );
  useEffect(() => {
    void load(1);
    return () => listRequest.current?.abort();
  }, [load]);
  const revoke = async (item: AdminGrantItem) => {
    const key = `${item.user_id}:${item.client_id}`;
    setBusy(key);
    setFeedback(null);
    try {
      const result = await apiFetch<AdminGrantRevokeResponse>(
        '/admin/grants/revoke',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: item.user_id,
            client_id: item.client_id,
          }),
        }
      );
      setFeedback({
        error: false,
        text: `Revoked: ${result.revoked_refresh_tokens} refresh tokens, ${result.removed_grants} grant records.`,
      });
      await load(page);
    } catch (error) {
      setFeedback({
        error: true,
        text:
          error instanceof ApiError || error instanceof Error
            ? error.message
            : 'Could not revoke grant.',
      });
    } finally {
      setBusy('');
    }
  };
  return (
    <section className="admin-card glass">
      <header className="admin-card-head">
        <h2>
          <ShieldCheck size={18} />
          <span>{t('admin.ui.grants')}</span>
        </h2>
        <div className="admin-query-row">
          <input
            ref={queryInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setQuery(event.currentTarget.value.trim());
            }}
            aria-label={t('admin.ui.searchByEmailClientIdOrClientName')}
            placeholder={t('admin.ui.searchByEmailClientIdOrClientName')}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={loading}
            onClick={() => setQuery(queryInput.current?.value.trim() ?? '')}
          >
            <Search size={14} />
            {t('admin.ui.search')}
          </button>
        </div>
      </header>
      {feedback && (
        <p
          role={feedback.error ? 'alert' : 'status'}
          className={`admin-feedback ${feedback.error ? 'error' : 'success'}`}
        >
          {feedback.text}
        </p>
      )}
      {loading ? (
        <div className="admin-placeholder">{t('admin.ui.loadingGrants')}</div>
      ) : items.length === 0 ? (
        <div className="admin-placeholder">{t('admin.ui.noGrantsFound')}</div>
      ) : (
        <ul className="admin-list">
          {items.map((item) => {
            const key = `${item.user_id}:${item.client_id}`;
            return (
              <li className="admin-list-item" key={key}>
                <div className="admin-list-main">
                  <strong>{item.client_name}</strong>
                  <p>
                    {t('admin.ui.client')} {item.client_id}
                  </p>
                  <p>
                    {t('admin.ui.user')} {item.email}
                  </p>
                  <p>
                    {t('admin.ui.lastAuthorized')}{' '}
                    {new Date(item.last_authorized_at).toLocaleString('zh-CN', {
                      hour12: false,
                    })}
                  </p>
                  <p>
                    {t('admin.ui.scope')} {item.last_scopes.join(' ') || '-'}
                  </p>
                </div>
                <div className="admin-list-actions">
                  <button
                    type="button"
                    className="btn-secondary danger"
                    disabled={busy === key}
                    onClick={() => void revoke(item)}
                  >
                    <Ban size={14} />
                    {busy === key
                      ? t('admin.ui.revoking')
                      : t('admin.ui.revokeGrant')}
                  </button>
                </div>
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
        <div>
          <button
            type="button"
            className="btn-secondary"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1)}
          >
            {t('admin.ui.previous')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= pages || loading}
            onClick={() => void load(page + 1)}
          >
            {t('admin.ui.next')}
          </button>
        </div>
      </footer>
    </section>
  );
}
