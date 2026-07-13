import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '../../lib/api';
import type {
  AcceptedRuntimeModuleChange,
  RuntimeDesiredMode,
  RuntimeModuleAction,
  RuntimeModuleEvent,
  RuntimeModuleEventListResponse,
  RuntimeModuleListResponse,
  RuntimeModuleStatus,
} from './runtimeModuleTypes';
import {
  actualStateLabel,
  disablePolicyLabel,
  eventTypeLabel,
  isRevisionConflict,
  mergeRuntimeModuleStatuses,
  mfaStepUpFailureMessage,
  moduleDomain,
} from './runtimeModuleView';

type ModuleDraft = {
  desiredState: RuntimeDesiredMode;
  reason: string;
  baseDesiredState: RuntimeDesiredMode;
  baseRevision: number;
};

type PendingChange = AcceptedRuntimeModuleChange;

const DESIRED_MODES: RuntimeDesiredMode[] = ['inherit', 'enabled', 'disabled'];
const POLL_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 10_000] as const;

function initialDraft(module: RuntimeModuleStatus): ModuleDraft {
  return {
    desiredState: module.desired_state,
    reason: '',
    baseDesiredState: module.desired_state,
    baseRevision: module.revision,
  };
}

function isDirty(draft: ModuleDraft): boolean {
  return draft.desiredState !== draft.baseDesiredState || Boolean(draft.reason.trim());
}

function actionForMode(mode: RuntimeDesiredMode): RuntimeModuleAction {
  return mode === 'enabled' ? 'enable' : mode === 'disabled' ? 'disable' : 'inherit';
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

function isStable(module: RuntimeModuleStatus, acceptedRevision: number): boolean {
  if (module.actual_state === 'failed') {
    return (module.transition_revision ?? -1) >= acceptedRevision;
  }
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
  const [pending, setPending] = useState<Record<string, PendingChange>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingModule, setSavingModule] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mfaModuleId, setMfaModuleId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const pollAttemptRef = useRef(0);
  const moduleRequestRef = useRef(0);
  const appliedModuleRequestRef = useRef(0);

  const loadModules = useCallback(async () => {
    const requestId = ++moduleRequestRef.current;
    const response = await apiFetch<RuntimeModuleListResponse>('/admin/runtime-modules');
    if (requestId < appliedModuleRequestRef.current) {
      return response.items;
    }
    appliedModuleRequestRef.current = requestId;
    setModules((current) => mergeRuntimeModuleStatuses(current, response.items));
    setDrafts((current) => {
      const next = { ...current };
      for (const module of response.items) {
        const draft = next[module.module_id];
        if (!draft || (draft.baseRevision !== module.revision && !isDirty(draft))) {
          next[module.module_id] = initialDraft(module);
        }
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
    const onVisibilityChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
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
    if (!shouldPoll || !pageVisible) {
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
  }, [loadEvents, loadModules, pageVisible, pending, shouldPoll]);

  const updateDraft = (module: RuntimeModuleStatus, patch: Partial<ModuleDraft>) => {
    setDrafts((current) => ({
      ...current,
      [module.module_id]: { ...(current[module.module_id] ?? initialDraft(module)), ...patch },
    }));
  };

  const refreshAll = async () => {
    setRefreshing(true);
    setError('');
    try {
      await Promise.all([loadModules(), loadEvents()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not refresh runtime modules.');
    } finally {
      setRefreshing(false);
    }
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
          }),
          expectedStatus: 202,
        }
      );
      setPending((current) => ({ ...current, [module.module_id]: accepted }));
      setDrafts((current) => ({
        ...current,
        [module.module_id]: {
          desiredState: accepted.desired_state,
          reason: '',
          baseDesiredState: accepted.desired_state,
          baseRevision: accepted.revision,
        },
      }));
      setReviewing(null);
      pollAttemptRef.current = 0;
    } catch (caught) {
      if (isRevisionConflict(caught)) {
        setError(`${module.module_id} changed on the server. Authoritative state was reloaded.`);
        try {
          const latest = await loadModules();
          const authoritative = latest.find((item) => item.module_id === module.module_id);
          if (authoritative) {
            setDrafts((current) => ({
              ...current,
              [module.module_id]: initialDraft(authoritative),
            }));
          }
        } catch (reloadError) {
          const detail = reloadError instanceof Error ? reloadError.message : 'reload failed';
          setError(
            `${module.module_id} changed on the server, but authoritative reload failed: ${detail}`
          );
        }
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
      setError(mfaStepUpFailureMessage(caught));
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
        <button
          type="button"
          className="btn-secondary"
          disabled={refreshing}
          onClick={() => void refreshAll()}
        >
          {refreshing ? 'Refreshing…' : 'Refresh runtime state'}
        </button>
      </header>

      {error && <p className="admin-feedback error" role="alert">{error}</p>}
      {notice && <p className="admin-feedback success" role="status">{notice}</p>}

      <div className="runtime-module-grid">
        {modules.map((module) => {
          const draft = drafts[module.module_id] ?? initialDraft(module);
          const accepted = pending[module.module_id];
          const draftIsStale = draft.baseRevision !== module.revision;
          const selectedActionAllowed =
            draft.desiredState === module.desired_state ||
            module.allowed_actions.includes(actionForMode(draft.desiredState));
          return (
            <article className="admin-card runtime-module-card" key={module.module_id}>
              <header>
                <h3>{module.description}</h3>
                <code>{module.module_id}</code>
              </header>
              <dl className="admin-readonly-grid">
                <div><dt>Domain owner</dt><dd>{moduleDomain(module.module_id)}</dd></div>
                <div><dt>Desired</dt><dd>{module.desired_state}</dd></div>
                <div><dt>Resolved inherited value</dt><dd>{module.resolved_enabled ? 'enabled' : 'disabled'}</dd></div>
                <div><dt>Actual</dt><dd>{actualStateLabel(module.actual_state)}</dd></div>
                <div><dt>Revision</dt><dd>{module.revision}</dd></div>
                <div><dt>Transition revision</dt><dd>{module.transition_revision ?? '—'}</dd></div>
                <div><dt>Applied revision</dt><dd>{module.applied_revision ?? '—'}</dd></div>
                <div><dt>Disable policy</dt><dd>{disablePolicyLabel(module.disable_policy)}</dd></div>
                <div><dt>Drain deadline</dt><dd>{formatTimestamp(module.drain_deadline)}</dd></div>
                <div><dt>Failure</dt><dd>{module.failure_code ?? '—'}</dd></div>
                <div><dt>Last state update</dt><dd>{formatTimestamp(module.updated_at)}</dd></div>
              </dl>
              <p><strong>Dependencies:</strong> {module.dependencies.join(', ') || 'None'}</p>
              <p><strong>Dependents:</strong> {module.dependents.join(', ') || 'None'}</p>
              {accepted && (
                <p role="status">
                  HTTP 202 Accepted — transition pending at revision {accepted.revision}. Actual state
                  remains {actualStateLabel(module.actual_state)} until reconciliation completes.
                </p>
              )}
              {draftIsStale && (
                <p role="alert">
                  Server revision changed from {draft.baseRevision} to {module.revision} while this
                  draft was being edited. Review the authoritative state before continuing.
                  {' '}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setDrafts((current) => ({
                        ...current,
                        [module.module_id]: initialDraft(module),
                      }))
                    }
                  >
                    Reset draft to server state
                  </button>
                </p>
              )}
              <label>
                Desired mode for {module.module_id}
                <select
                  aria-label={`Desired mode for ${module.module_id}`}
                  value={draft.desiredState}
                  onChange={(event) => updateDraft(module, { desiredState: event.target.value as RuntimeDesiredMode })}
                >
                  {DESIRED_MODES.map((mode) => (
                    <option
                      key={mode}
                      value={mode}
                      disabled={
                        mode !== module.desired_state &&
                        !module.allowed_actions.includes(actionForMode(mode))
                      }
                    >
                      {mode}
                    </option>
                  ))}
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
              <button
                type="button"
                className="btn-primary"
                disabled={
                  draftIsStale ||
                  draft.desiredState === module.desired_state ||
                  !selectedActionAllowed ||
                  !draft.reason.trim() ||
                  savingModule === module.module_id
                }
                onClick={() => {
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
                <strong>{eventTypeLabel(event.event_type)}</strong> · {event.module_id} · revision {event.revision}
                {' · '}{formatTimestamp(event.created_at)}
                <br />
                Actor: {event.actor_id ?? 'system'} · Instance: {event.instance_id ?? '—'} · State:{' '}
                {event.before_state ?? '—'} → {event.after_state ?? '—'} · Outcome:{' '}
                {event.outcome_code ?? '—'}
                {event.reason ? <><br />Reason: {event.reason}</> : null}
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
          <p>Dependent modules are never changed implicitly. Resolve dependency conflicts explicitly.</p>
          <button type="button" className="btn-secondary" onClick={() => setReviewing(null)}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            disabled={savingModule === reviewing.module_id}
            onClick={() => void submitChange(reviewing)}
          >
            Confirm {reviewing.module_id} change
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
