import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { buildAuthRedirectWithNext } from '../auth/next';
import { useAuth } from '../auth/useAuth';
import { ApiError, apiFetch } from '../lib/api';
import {
  alertVariants,
  contentSwitchVariants,
  pageVariants,
  revealContainerVariants,
  revealItemVariants,
} from '../lib/motion';
import type { ClientCredentialDeliveryResponse } from '../types/auth';
import './Delivery.css';

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-US', { hour12: false });
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }
  return fallback;
}

type DeliveryValueItem = {
  label: string;
  value: string;
  sensitive?: boolean;
};

export default function Delivery() {
  const location = useLocation();
  const { user, loading, sessionChecked } = useAuth();

  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [deliveryPayload, setDeliveryPayload] =
    useState<ClientCredentialDeliveryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const consumedTokenRef = useRef<string>('');

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const deliveryToken = (query.get('token') || '').trim();

  useEffect(() => {
    if (!user || !deliveryToken) {
      return;
    }
    if (consumedTokenRef.current === deliveryToken) {
      return;
    }
    consumedTokenRef.current = deliveryToken;
    setErrorMsg('');
    setDismissed(false);
    setLoadingDelivery(true);

    void (async () => {
      try {
        const payload = await apiFetch<ClientCredentialDeliveryResponse>(
          `/auth/me/access-delivery?token=${encodeURIComponent(deliveryToken)}`
        );
        setDeliveryPayload(payload);
      } catch (error) {
        setDeliveryPayload(null);
        setErrorMsg(resolveErrorMessage(error, 'One-time credential read failed.'));
      } finally {
        setLoadingDelivery(false);
      }
    })();
  }, [deliveryToken, user]);

  useEffect(() => {
    if (!copiedKey) {
      return;
    }
    const timer = window.setTimeout(() => setCopiedKey(''), 1400);
    return () => window.clearTimeout(timer);
  }, [copiedKey]);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
    } catch {
      setErrorMsg('Copy failed. Copy it manually.');
    }
  };

  const nextUrl = useMemo(
    () => `/delivery?token=${encodeURIComponent(deliveryToken)}`,
    [deliveryToken]
  );

  if (loading || (!user && !sessionChecked)) {
    return (
      <div className="container delivery-loading">Checking your session and preparing one-time credentials...</div>
    );
  }

  if (!user) {
    return <Navigate to={buildAuthRedirectWithNext(nextUrl)} replace />;
  }

  if (!deliveryToken) {
    return (
      <div className="container delivery-loading">
        <div className="glass delivery-state-card">
          <AlertTriangle size={20} />
          <h1>Missing credential link parameter</h1>
          <p>The current URL does not include a one-time token. Use the full link from the email.</p>
          <Link to="/profile?tab=access-requests" className="btn-secondary">
            Back to access requests
          </Link>
        </div>
      </div>
    );
  }

  const kvItems: DeliveryValueItem[] = deliveryPayload
    ? [
        { label: 'Client ID', value: deliveryPayload.client_id },
        { label: 'Client Name', value: deliveryPayload.client_name },
        { label: 'Client Type', value: deliveryPayload.client_type },
        {
          label: 'Client Secret',
          value: deliveryPayload.client_secret || 'No secret for public clients',
          sensitive: Boolean(deliveryPayload.client_secret),
        },
        {
          label: 'Auth Method',
          value: deliveryPayload.token_endpoint_auth_method,
        },
        {
          label: 'Redirect URIs',
          value: deliveryPayload.redirect_uris.join('\n') || '-',
        },
        {
          label: 'Scopes',
          value: deliveryPayload.scopes.join(' ') || '-',
        },
        {
          label: 'Grant Types',
          value: deliveryPayload.grant_types.join(' ') || '-',
        },
      ]
    : [];

  return (
    <motion.div
      className="page-transition-wrap delivery-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="delivery-bg-grid" />
      <div className="container delivery-container">
        <motion.header className="glass delivery-header" layout>
          <h1>One-time credentials</h1>
          <p>Account: {user.email}</p>
        </motion.header>

        <motion.section className="glass delivery-warning-card" layout>
          <div className="delivery-warning-head">
            <ShieldAlert size={18} />
            <strong>Highly sensitive. Read once.</strong>
          </div>
          <ul>
            <li>This link can be read only once; the server destroys it after use.</li>
            <li>Copy and store the values securely before leaving this page.</li>
            <li>Do not screenshot, forward, or display this in public environments.</li>
          </ul>
        </motion.section>

        <AnimatePresence mode="wait" initial={false}>
          {errorMsg && (
            <motion.div
              key="delivery-error"
              className="delivery-alert error"
              variants={alertVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {errorMsg}
            </motion.div>
          )}

          {loadingDelivery && (
            <motion.div
              key="delivery-loading"
              className="delivery-placeholder"
              variants={contentSwitchVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              Reading one-time credentials...
            </motion.div>
          )}

          {!loadingDelivery && !errorMsg && deliveryPayload && !dismissed && (
          <motion.div
            key="delivery-content"
            variants={contentSwitchVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            layout
          >
            <motion.section className="glass delivery-main-card" layout>
              <div className="delivery-main-head">
                <strong>Credential details</strong>
                <span>Expires: {formatDateTime(deliveryPayload.expires_at)}</span>
              </div>
              <p className="delivery-read-once-note">{deliveryPayload.read_once_notice}</p>
              <motion.div
                className="delivery-list"
                variants={revealContainerVariants}
                initial="initial"
                animate="animate"
                layout
              >
                {kvItems.map((item) => {
                  const key = `${item.label}:${item.value}`;
                  const canCopy = item.value !== '-' && !item.value.includes('No secret');
                  const copied = copiedKey === key;
                  return (
                    <motion.article
                      key={key}
                      className={`delivery-item ${item.sensitive ? 'sensitive' : ''}`}
                      variants={revealItemVariants}
                      layout
                    >
                      <div className="delivery-item-head">
                        <span>{item.label}</span>
                        {canCopy && (
                          <button
                            type="button"
                            className="btn-secondary delivery-copy-btn"
                            onClick={() => void handleCopy(key, item.value)}
                          >
                            {copied ? <ClipboardCheck size={14} /> : <Clipboard size={14} />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>
                      <pre>{item.value}</pre>
                    </motion.article>
                  );
                })}
              </motion.div>
            </motion.section>

            <section className="delivery-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setDismissed(true);
                  setDeliveryPayload(null);
                }}
              >
                <EyeOff size={16} />
                <span>I saved it. Hide sensitive values now.</span>
              </button>
              <Link to="/profile?tab=access-requests" className="btn-secondary">
                Back to access requests
              </Link>
            </section>
          </motion.div>
          )}

          {!loadingDelivery && !errorMsg && !deliveryPayload && dismissed && (
          <motion.div
            key="delivery-hidden"
            className="glass delivery-state-card"
            variants={contentSwitchVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            layout
          >
            <CheckCircle2 size={20} />
            <h2>Sensitive values are hidden</h2>
            <p>To view credentials again, use a new approval email link. Old links cannot be reused.</p>
            <Link to="/profile?tab=access-requests" className="btn-secondary">
              Back to access requests
            </Link>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
