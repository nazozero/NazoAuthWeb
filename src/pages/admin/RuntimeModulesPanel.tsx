import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type {
  AcceptedRuntimeModuleChange,
  RuntimeDesiredMode,
  RuntimeModuleEvent,
  RuntimeModuleEventListResponse,
  RuntimeModuleListResponse,
  RuntimeModuleStatus,
} from './runtimeModuleTypes';

type ModuleDraft = {
  desiredState: RuntimeDesiredMode;
  reason: string;
  cascade: boolean;
};

type PendingChange = AcceptedRuntimeModuleChange;

const DESIRED_MODES: RuntimeDesiredMode[] = ['inherit', 'enabled', 'disabled'];
const POLL_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 10_000] as const;

function initialDraft(module: RuntimeModuleStatus): ModuleDraft {
  return { desiredState: module.desired_state, reason: '', cascade: false };
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

function isStable(module: RuntimeModuleStatus, acceptedRevision: number): boolean {
  return (
    module.actual_state !== 'starting' &&
    module.actual_state !== 'draining' &&
    (module.applied_revision ?? -1) >= acceptedRevision
  );
}

function requiresMfaStepUp(error: unknown): error is ApiError {
  if (!(error instanceof ApiError)) {
    return false;
  }
  if (error.status === 428) {
    return true;
  }
  const payload = error.payload;
  if (!payload || Array.isArray(payload)) {
    return false;
  }
  return payload.error === 'mfa_step_up_required' || payload.code === 'mfa_step_up_required';
}

export default function RuntimeModulesPanel() {
  const [modules, setModules] = useState<RuntimeModuleStatus[]>([]);
  const [events, setEvents] = useState<RuntimeModuleEvent[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ModuleDraft>>({});
  const [reviewing, setReviewing] = useState<RuntimeModuleStatus | null>(null);
  const [cascadeConfirmed, setCascadeConfirmed] = useState(false);
  const [pending, setPending] = useState<Record<string, PendingChange>>({});
  const [loading, setLoading] = useState(true);
  const [savingModule, setSavingModule] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mfaModuleId, setMfaModuleId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const pollAttemptRef = useRef(0);

  const loadModules = useCallback(async () => {
    const response = await apiFetch<RuntimeModuleListResponse>('/admin/runtime-modules');
    setModules(response.items);
    setDrafts((current) => {
      const next = { ...current };
      for (const module of response.items) {
        next[module.module_id] ??= initialDraft(module);
      }
      return next;
    });
    setPending((current) => {
      const next = { ...current };
      for (const module of response.items) {
        const accepted = next[module.module_id];
        if (accepted && isStable(module, accepted.revision)) {
          delete next[module.module_id];
        }
      }
      return next;
    });
    return response.items;
  }, []);

  const loadEvents = useCallback(async () => {
    const response = await apiFetch<RuntimeModuleEventListResponse>(
      '/admin/runtime-modules/events?page=1&page_size=20'
    );
    setEvents(response.items);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([loadModules(), loadEvents()])
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Could not load runtime modules.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [loadEvents, loadModules]);

  const shouldPoll = modules.some(
    (module) =>
      module.actual_state === 'starting' ||
      module.actual_state === 'draining' ||
      (pending[module.module_id] && !isStable(module, pending[module.module_id].revision))
  );

  useEffect(() => {
    if (!shouldPoll || document.hidden) {
      pollAttemptRef.current = 0;
      return;
    }
    const delay = POLL_DELAYS_MS[Math.min(pollAttemptRef.current, POLL_DELAYS_MS.length - 1)];
    const timer = window.setTimeout(() => {
      pollAttemptRef.current += 1;
      void Promise.all([loadModules(), loadEvents()]).catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Could not refresh runtime modules.');
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [loadEvents, loadModules, pending, shouldPoll]);

  const updateDraft = (module: RuntimeModuleStatus, patch: Partial<ModuleDraft>) => {
    setDrafts((current) => ({
      ...current,
      [module.module_id]: { ...(current[module.module_id] ?? initialDraft(module)), ...patch },
    }));
  };

  const submitChange = async (module: RuntimeModuleStatus) => {
    const draft = drafts[module.module_id] ?? initialDraft(module);
    setSavingModule(module.module_id);
    setError('');
    setNotice('');
    try {
      const accepted = await apiFetch<AcceptedRuntimeModuleChange>(
        `/admin/runtime-modules/${encodeURIComponent(module.module_id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            desired_state: draft.desiredState,
            expected_revision: module.revision,
            reason: draft.reason.trim(),
            cascade: draft.cascade,
          }),
        }
      );
      setPending((current) => ({ ...current, [module.module_id]: accepted }));
      setNotice(`${module.module_id} change accepted/pending at revision ${accepted.revision}.`);
      setReviewing(null);
      pollAttemptRef.current = 0;
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError(`${module.module_id} changed on the server. Authoritative state was reloaded.`);
        await loadModules();
      } else if (requiresMfaStepUp(caught)) {
        setMfaModuleId(module.module_id);
        setError('');
      } else {
        setError(caught instanceof Error ? caught.message : 'Could not update runtime module.');
      }
      setReviewing(null);
    } finally {
      setSavingModule('');
    }
  };

  const verifyMfa = async () => {
    if (!mfaModuleId || !mfaCode.trim()) {
      return;
    }
    setVerifyingMfa(true);
    setError('');
    try {
      await apiFetch<{ csrf_token?: string }>('/auth/me/mfa/step-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode.trim() }),
      });
      const moduleId = mfaModuleId;
      setMfaCode('');
      setMfaModuleId(null);
      setNotice(`MFA verified for ${moduleId}; review and confirm the module change again.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'MFA verification failed.');
      setMfaCode('');
    } finally {
      setVerifyingMfa(false);
    }
  };

  if (loading) {
    return <p>Loading runtime modules…</p>;
  }

  return (
    <section className="admin-card runtime-modules-panel" aria-labelledby="runtime-modules-title">
      <header className="admin-card-head">
        <div>
          <h2 id="runtime-modules-title">Runtime Modules</h2>
          <p>Desired intent and observed runtime state are shown separately.</p>
        </div>
      </header>

      {error && <p className="admin-feedback error" role="alert">{error}</p>}
      {notice && <p className="admin-feedback success" role="status">{notice}</p>}

      <div className="runtime-module-grid">
        {modules.map((module) => {
          const draft = drafts[module.module_id] ?? initialDraft(module);
          const accepted = pending[module.module_id];
          return (
            <article className="admin-card runtime-module-card" key={module.module_id}>
              <header>
                <h3>{module.description}</h3>
                <code>{module.module_id}</code>
              </header>
              <dl className="admin-readonly-grid">
                <div><dt>Desired</dt><dd>{module.desired_state}</dd></div>
                <div><dt>Resolved inherited value</dt><dd>{module.resolved_enabled ? 'enabled' : 'disabled'}</dd></div>
                <div><dt>Actual</dt><dd>{module.actual_state}</dd></div>
                <div><dt>Revision</dt><dd>{module.revision}</dd></div>
                <div><dt>Applied revision</dt><dd>{module.applied_revision ?? '—'}</dd></div>
                <div><dt>Disable policy</dt><dd>{module.disable_policy}</dd></div>
                <div><dt>Drain deadline</dt><dd>{formatTimestamp(module.drain_deadline)}</dd></div>
                <div><dt>Failure</dt><dd>{module.failure_code ?? '—'}</dd></div>
              </dl>
              <p><strong>Dependencies:</strong> {module.dependencies.join(', ') || 'None'}</p>
              <p><strong>Dependents:</strong> {module.dependents.join(', ') || 'None'}</p>
              {accepted && (
                <p role="status">Change accepted/pending at revision {accepted.revision}.</p>
              )}
              <label>
                Desired mode for {module.module_id}
                <select
                  aria-label={`Desired mode for ${module.module_id}`}
                  value={draft.desiredState}
                  onChange={(event) => updateDraft(module, { desiredState: event.target.value as RuntimeDesiredMode })}
                >
                  {DESIRED_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </label>
              <label>
                Reason for {module.module_id}
                <textarea
                  aria-label={`Reason for ${module.module_id}`}
                  maxLength={500}
                  value={draft.reason}
                  onChange={(event) => updateDraft(module, { reason: event.target.value })}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  aria-label={`Cascade dependency changes for ${module.module_id}`}
                  checked={draft.cascade}
                  onChange={(event) => updateDraft(module, { cascade: event.target.checked })}
                />
                Cascade dependency changes (default off)
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={!draft.reason.trim() || savingModule === module.module_id}
                onClick={() => {
                  setCascadeConfirmed(false);
                  setReviewing(module);
                }}
              >
                Review {module.module_id} change
              </button>
            </article>
          );
        })}
      </div>

      <section className="admin-card" aria-labelledby="runtime-events-title">
        <h3 id="runtime-events-title">Recent runtime audit events</h3>
        {events.length === 0 ? <p>No runtime events.</p> : (
          <ul>
            {events.map((event) => (
              <li key={event.event_id}>
                <strong>{event.event_type}</strong> · {event.module_id} · revision {event.revision}
                {event.reason ? ` · ${event.reason}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviewing && (
        <section className="admin-modal" role="dialog" aria-modal="true" aria-label={`Confirm ${reviewing.module_id} change`}>
          <h3>Confirm runtime module change</h3>
          <p>
            {reviewing.module_id}: {reviewing.desired_state} → {drafts[reviewing.module_id]?.desiredState}
          </p>
          <p>Dependencies: {reviewing.dependencies.join(', ') || 'None'}.</p>
          <p>Dependents: {reviewing.dependents.join(', ') || 'None'}.</p>
          {drafts[reviewing.module_id]?.cascade && <p>Explicit cascade requested; affected dependents must be changed together.</p>}
          {cascadeConfirmed && <p role="alert">Confirm the cascade impact one final time.</p>}
          <button type="button" className="btn-secondary" onClick={() => setReviewing(null)}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            disabled={savingModule === reviewing.module_id}
            onClick={() => {
              if (drafts[reviewing.module_id]?.cascade && !cascadeConfirmed) {
                setCascadeConfirmed(true);
                return;
              }
              void submitChange(reviewing);
            }}
          >
            {cascadeConfirmed ? 'Confirm cascade impact' : `Confirm ${reviewing.module_id} change`}
          </button>
        </section>
      )}

      {mfaModuleId && (
        <section className="admin-modal" role="dialog" aria-modal="true" aria-label="MFA step-up">
          <h3>Verify recent MFA</h3>
          <p>The rejected mutation will not be replayed automatically.</p>
          <label>
            MFA code
            <input
              aria-label="MFA code"
              autoComplete="one-time-code"
              inputMode="numeric"
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={!mfaCode.trim() || verifyingMfa}
            onClick={() => void verifyMfa()}
          >
            Verify MFA
          </button>
        </section>
      )}
    </section>
  );
}
