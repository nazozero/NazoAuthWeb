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
import { ApiError, apiFetch } from '../lib/api';
import {
  contentSwitchVariants,
  pageVariants,
  revealContainerVariants,
  revealItemVariants,
} from '../lib/motion';
import type { CibaVerificationView } from '../types/auth';
import './Ciba.css';

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Could not load the backchannel authorization request.';
}

function formatDateTime(value?: string): string {
  if (!value) {
    return 'Unknown';
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
          setErrorMsg('The request is expired, invalid, or already handled.');
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
        setErrorMsg(resolveErrorMessage(error));
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
  }, [authReqId, navigate]);

  const request = view?.request ?? null;
  const scopes = request?.scopes ?? [];
  const audiences = request?.audiences ?? [];

  const submitDecision = async (decision: 'approve' | 'deny') => {
    if (!view?.auth_req_id) {
      setErrorMsg('The request is unavailable.');
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
          ? 'Backchannel authorization approved.'
          : 'Backchannel authorization denied.'
      );
      setView((current) => (current ? { ...current, request: null } : current));
    } catch (error) {
      setErrorMsg(resolveErrorMessage(error));
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
              <h1>Authorize sign-in</h1>
              <p>Review the backchannel request before granting access.</p>
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
                Loading authorization request...
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
                    <span>Requesting client</span>
                  </div>
                  <div className="ciba-client-grid">
                    <div>
                      <span>Application</span>
                      <strong>{request.client_name}</strong>
                    </div>
                    <div>
                      <span>Client ID</span>
                      <strong>{request.client_id}</strong>
                    </div>
                    <div>
                      <span>Issued</span>
                      <strong>{formatDateTime(request.issued_at)}</strong>
                    </div>
                    <div>
                      <span>Expires</span>
                      <strong>{formatDateTime(request.expires_at)}</strong>
                    </div>
                  </div>
                </section>

                {request.binding_message && (
                  <section className="ciba-message-box">
                    <div className="ciba-block-title">
                      <MessageSquareText size={16} />
                      <span>Binding message</span>
                    </div>
                    <p>{request.binding_message}</p>
                  </section>
                )}

                <section className="ciba-scope-box">
                  <div className="ciba-block-title">
                    <LockKeyhole size={16} />
                    <span>Requested permissions</span>
                  </div>
                  <motion.ul
                    className="ciba-chip-list"
                    variants={revealContainerVariants}
                    initial="initial"
                    animate="animate"
                    layout
                  >
                    {(scopes.length ? scopes : ['No scopes requested']).map((scope) => (
                      <motion.li key={scope} variants={revealItemVariants} layout>
                        {scope}
                      </motion.li>
                    ))}
                  </motion.ul>
                </section>

                <section className="ciba-scope-box">
                  <div className="ciba-block-title">
                    <Clock3 size={16} />
                    <span>Resources</span>
                  </div>
                  <motion.ul
                    className="ciba-chip-list resource"
                    variants={revealContainerVariants}
                    initial="initial"
                    animate="animate"
                    layout
                  >
                    {(audiences.length ? audiences : ['Default resource']).map((audience) => (
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
                    <span>{submitting === 'deny' ? 'Denying' : 'Deny'}</span>
                  </button>
                  <button
                    id="nazo-ciba-approve"
                    type="button"
                    className="ciba-btn approve"
                    disabled={submitting !== null}
                    onClick={() => void submitDecision('approve')}
                  >
                    <ShieldCheck size={16} />
                    <span>{submitting === 'approve' ? 'Approving' : 'Approve'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        <div className="ciba-powered">
          <span>Secured by NazoAuth</span>
        </div>
      </div>
    </motion.div>
  );
}
