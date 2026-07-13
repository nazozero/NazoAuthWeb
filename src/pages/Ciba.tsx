import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Clock3,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildAuthRedirectWithNext, buildCurrentPath } from '../auth/next';
import { useI18n } from '../i18n';
import { ApiError, apiFetch } from '../lib/api';
import {
  contentSwitchVariants,
  pageVariants,
  revealContainerVariants,
  revealItemVariants,
} from '../lib/motion';
import type { CibaVerificationView } from '../types/auth';
import './Ciba.css';

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function formatDateTime(value: string | undefined, unknownLabel: string): string {
  if (!value) {
    return unknownLabel;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function Ciba() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { authReqId = '' } = useParams();
  const [view, setView] = useState<CibaVerificationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<'approve' | 'deny' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultMsg, setResultMsg] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg('');
    setResultMsg('');

    const loadCibaView = async () => {
      try {
        const payload = await apiFetch<CibaVerificationView>(
          `/auth/ciba/${encodeURIComponent(authReqId)}`
        );
        if (!active) {
          return;
        }
        setView(payload);
        if (!payload.request) {
          setErrorMsg(t('ciba.error.invalid'));
        }
      } catch (error) {
        if (!active) {
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          navigate(buildAuthRedirectWithNext(buildCurrentPath(window.location)), {
            replace: true,
          });
          return;
        }
        setView(null);
        setErrorMsg(resolveErrorMessage(error, t('ciba.error.load')));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCibaView();
    return () => {
      active = false;
    };
  }, [authReqId, navigate, t]);

  const request = view?.request ?? null;
  const scopes = request?.scopes ?? [];
  const audiences = request?.audiences ?? [];

  const submitDecision = async (decision: 'approve' | 'deny') => {
    if (!view?.auth_req_id) {
      setErrorMsg(t('ciba.error.unavailable'));
      return;
    }

    setSubmitting(decision);
    setErrorMsg('');
    setResultMsg('');
    try {
      await apiFetch<{ success: boolean }>(
        `/auth/ciba/${encodeURIComponent(view.auth_req_id)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            decision,
            csrf_token: view.csrf_token ?? undefined,
          }),
        }
      );
      setResultMsg(
        decision === 'approve'
          ? t('ciba.success.approved')
          : t('ciba.success.denied')
      );
      setView((current) => (current ? { ...current, request: null } : current));
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          navigate(buildAuthRedirectWithNext(buildCurrentPath(window.location)), {
            replace: true,
          });
          return;
        }
        setErrorMsg(error.message || t('ciba.error.decision'));
        return;
      }

      try {
        const latest = await apiFetch<CibaVerificationView>(
          `/auth/ciba/${encodeURIComponent(view.auth_req_id)}`
        );
        setView(latest);
        setErrorMsg(
          latest.request
            ? t('ciba.warning.statusReloaded')
            : t('ciba.warning.mayBeProcessed')
        );
      } catch (reloadError) {
        if (reloadError instanceof ApiError && reloadError.status === 401) {
          navigate(buildAuthRedirectWithNext(buildCurrentPath(window.location)), {
            replace: true,
          });
          return;
        }
        setErrorMsg(t('ciba.warning.statusUnknown'));
      }
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <motion.div
      className="page-transition-wrap ciba-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="ciba-shell">
        <motion.section className="ciba-card glass" layout>
          <header className="ciba-head">
            <span className="ciba-icon">
              <Smartphone size={20} />
            </span>
            <div>
              <h1>{t('ciba.title')}</h1>
              <p>{t('ciba.subtitle')}</p>
            </div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            {loading && (
              <motion.div
                key="ciba-loading"
                className="ciba-status"
                variants={contentSwitchVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {t('ciba.loading')}
              </motion.div>
            )}

            {!loading && errorMsg && (
              <motion.div
                key="ciba-error"
                className="ciba-alert error"
                variants={contentSwitchVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <AlertTriangle size={18} />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {!loading && resultMsg && (
              <motion.div
                key="ciba-result"
                className="ciba-alert success"
                variants={contentSwitchVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <CheckCircle2 size={18} />
                <span>{resultMsg}</span>
              </motion.div>
            )}

            {!loading && request && (
              <motion.div
                key="ciba-ready"
                className="ciba-request"
                variants={contentSwitchVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
              >
                <section className="ciba-client-box">
                  <div className="ciba-block-title">
                    <ShieldCheck size={16} />
                    <span>{t('ciba.requestingClient')}</span>
                  </div>
                  <div className="ciba-client-grid">
                    <div>
                      <span>{t('ciba.application')}</span>
                      <strong>{request.client_name}</strong>
                    </div>
                    <div>
                      <span>{t('ciba.clientId')}</span>
                      <strong>{request.client_id}</strong>
                    </div>
                    <div>
                      <span>{t('ciba.issued')}</span>
                      <strong>{formatDateTime(request.issued_at, t('ciba.unknown'))}</strong>
                    </div>
                    <div>
                      <span>{t('ciba.expires')}</span>
                      <strong>{formatDateTime(request.expires_at, t('ciba.unknown'))}</strong>
                    </div>
                  </div>
                </section>

                {request.binding_message && (
                  <section className="ciba-message-box">
                    <div className="ciba-block-title">
                      <MessageSquareText size={16} />
                      <span>{t('ciba.bindingMessage')}</span>
                    </div>
                    <p>{request.binding_message}</p>
                  </section>
                )}

                <section className="ciba-scope-box">
                  <div className="ciba-block-title">
                    <LockKeyhole size={16} />
                    <span>{t('ciba.permissions')}</span>
                  </div>
                  <motion.ul
                    className="ciba-chip-list"
                    variants={revealContainerVariants}
                    initial="initial"
                    animate="animate"
                    layout
                  >
                    {(scopes.length ? scopes : [t('ciba.noScopes')]).map((scope) => (
                      <motion.li key={scope} variants={revealItemVariants} layout>
                        {scope}
                      </motion.li>
                    ))}
                  </motion.ul>
                </section>

                <section className="ciba-scope-box">
                  <div className="ciba-block-title">
                    <Clock3 size={16} />
                    <span>{t('ciba.resources')}</span>
                  </div>
                  <motion.ul
                    className="ciba-chip-list resource"
                    variants={revealContainerVariants}
                    initial="initial"
                    animate="animate"
                    layout
                  >
                    {(audiences.length ? audiences : [t('ciba.defaultResource')]).map((audience) => (
                      <motion.li key={audience} variants={revealItemVariants} layout>
                        {audience}
                      </motion.li>
                    ))}
                  </motion.ul>
                </section>

                <div className="ciba-actions">
                  <button
                    id="nazo-ciba-deny"
                    type="button"
                    className="ciba-btn deny"
                    disabled={submitting !== null}
                    onClick={() => void submitDecision('deny')}
                  >
                    <CircleSlash size={16} />
                    <span>{submitting === 'deny' ? t('ciba.denying') : t('ciba.deny')}</span>
                  </button>
                  <button
                    id="nazo-ciba-approve"
                    type="button"
                    className="ciba-btn approve"
                    disabled={submitting !== null}
                    onClick={() => void submitDecision('approve')}
                  >
                    <ShieldCheck size={16} />
                    <span>
                      {submitting === 'approve' ? t('ciba.approving') : t('ciba.approve')}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        <div className="ciba-powered">
          <span>{t('ciba.securedBy')}</span>
        </div>
      </div>
    </motion.div>
  );
}
