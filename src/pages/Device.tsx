import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Clock3,
  KeyRound,
  LockKeyhole,
  RadioTower,
  ShieldCheck,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildAuthRedirectWithNext, buildCurrentPath } from '../auth/next';
import { ApiError, apiFetch } from '../lib/api';
import {
  contentSwitchVariants,
  pageVariants,
  revealContainerVariants,
  revealItemVariants,
} from '../lib/motion';
import type { DeviceVerificationView } from '../types/auth';
import './Device.css';

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Could not load the device authorization request.';
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

function normalizeUserCode(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export default function Device() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialUserCode = useMemo(
    () => new URLSearchParams(location.search).get('user_code')?.trim() ?? '',
    [location.search]
  );

  const [userCode, setUserCode] = useState(initialUserCode);
  const [lookupCode, setLookupCode] = useState(initialUserCode);
  const [view, setView] = useState<DeviceVerificationView | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<'approve' | 'deny' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultMsg, setResultMsg] = useState('');

  useEffect(() => {
    setUserCode(initialUserCode);
    setLookupCode(initialUserCode);
  }, [initialUserCode]);

  useEffect(() => {
    const code = normalizeUserCode(lookupCode);
    if (!code) {
      setView(null);
      setErrorMsg('');
      setResultMsg('');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMsg('');
    setResultMsg('');

    const loadDeviceView = async () => {
      try {
        const payload = await apiFetch<DeviceVerificationView>(
          `/device/verification?user_code=${encodeURIComponent(code)}`
        );
        if (!active) {
          return;
        }
        setView(payload);
        if (!payload.request) {
          setErrorMsg('The user code is invalid, expired, or already handled.');
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

    void loadDeviceView();
    return () => {
      active = false;
    };
  }, [lookupCode, navigate]);

  const request = view?.request ?? null;
  const scopes = request?.scopes ?? [];
  const resources = request?.resource_indicators ?? [];

  const handleLookupSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextCode = normalizeUserCode(userCode);
    setLookupCode(nextCode);
    const search = nextCode ? `?user_code=${encodeURIComponent(nextCode)}` : '';
    navigate(`/device${search}`, { replace: true });
  };

  const submitDecision = async (decision: 'approve' | 'deny') => {
    const code = normalizeUserCode(view?.user_code || lookupCode || userCode);
    if (!code) {
      setErrorMsg('Enter the user code shown on the device.');
      return;
    }

    setSubmitting(decision);
    setErrorMsg('');
    setResultMsg('');
    try {
      const body = new URLSearchParams({
        user_code: code,
        decision,
      });
      if (view?.csrf_token) {
        body.set('csrf_token', view.csrf_token);
      }
      await apiFetch<null>('/device/decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      setResultMsg(
        decision === 'approve'
          ? 'Device authorization approved. You can return to the device.'
          : 'Device authorization denied.'
      );
      setView(null);
    } catch (error) {
      setErrorMsg(resolveErrorMessage(error));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <motion.div
      className="page-transition-wrap device-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="device-shell">
        <motion.section className="device-card glass" layout>
          <header className="device-head">
            <span className="device-icon">
              <RadioTower size={20} />
            </span>
            <div>
              <h1>Authorize device</h1>
              <p>Confirm the code shown on your device before granting access.</p>
            </div>
          </header>

          <form className="device-code-form" onSubmit={handleLookupSubmit}>
            <label htmlFor="nazo-device-user-code">User code</label>
            <div className="device-code-row">
              <input
                id="nazo-device-user-code"
                className="clean-input"
                name="user_code"
                value={userCode}
                onChange={(event) => setUserCode(event.target.value)}
                autoComplete="one-time-code"
                spellCheck={false}
                placeholder="ABCD-1234"
              />
              <button className="btn-secondary" type="submit" disabled={loading}>
                <KeyRound size={16} />
                <span>{loading ? 'Checking' : 'Check'}</span>
              </button>
            </div>
          </form>

          <AnimatePresence mode="wait" initial={false}>
            {loading && (
              <motion.div
                key="device-loading"
                className="device-status"
                variants={contentSwitchVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                Loading device request...
              </motion.div>
            )}

            {!loading && errorMsg && (
              <motion.div
                key="device-error"
                className="device-alert error"
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
                key="device-result"
                className="device-alert success"
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
                key="device-ready"
                className="device-request"
                variants={contentSwitchVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
              >
                <section className="device-client-box">
                  <div className="device-block-title">
                    <ShieldCheck size={16} />
                    <span>Requesting client</span>
                  </div>
                  <div className="device-client-grid">
                    <div>
                      <span>Application</span>
                      <strong>{request.client_name}</strong>
                    </div>
                    <div>
                      <span>Client ID</span>
                      <strong>{request.client_id}</strong>
                    </div>
                    <div>
                      <span>Expires</span>
                      <strong>{formatDateTime(request.expires_at)}</strong>
                    </div>
                    <div>
                      <span>Polling interval</span>
                      <strong>{request.interval_seconds}s</strong>
                    </div>
                  </div>
                </section>

                <section className="device-scope-box">
                  <div className="device-block-title">
                    <LockKeyhole size={16} />
                    <span>Requested permissions</span>
                  </div>
                  <motion.ul
                    className="device-chip-list"
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

                <section className="device-scope-box">
                  <div className="device-block-title">
                    <Clock3 size={16} />
                    <span>Resources</span>
                  </div>
                  <motion.ul
                    className="device-chip-list resource"
                    variants={revealContainerVariants}
                    initial="initial"
                    animate="animate"
                    layout
                  >
                    {(resources.length ? resources : ['Default resource']).map((resource) => (
                      <motion.li key={resource} variants={revealItemVariants} layout>
                        {resource}
                      </motion.li>
                    ))}
                  </motion.ul>
                </section>

                <div className="device-actions">
                  <button
                    id="nazo-device-deny"
                    type="button"
                    className="device-btn deny"
                    disabled={submitting !== null}
                    onClick={() => void submitDecision('deny')}
                  >
                    <CircleSlash size={16} />
                    <span>{submitting === 'deny' ? 'Denying' : 'Deny'}</span>
                  </button>
                  <button
                    id="nazo-device-approve"
                    type="button"
                    className="device-btn approve"
                    disabled={submitting !== null}
                    onClick={() => void submitDecision('approve')}
                  >
                    <ShieldCheck size={16} />
                    <span>{submitting === 'approve' ? 'Approving' : 'Approve device'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        <div className="device-powered">
          <span>Secured by NazoAuth</span>
        </div>
      </div>
    </motion.div>
  );
}
