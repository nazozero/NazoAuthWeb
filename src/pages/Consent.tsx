import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  AtSign,
  Building2,
  CircleSlash,
  Link2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { buildAuthRedirectWithNext, buildCurrentPath } from '../auth/next';
import { useAuth } from '../auth/useAuth';
import { API_BASE_URL, ApiError, apiFetch } from '../lib/api';
import { resolveAvatarUrl } from '../lib/avatar';
import {
  contentSwitchVariants,
  pageVariants,
  revealContainerVariants,
  revealItemVariants,
} from '../lib/motion';
import type { ConsentView } from '../types/auth';
import './Consent.css';

type ScopeMeta = {
  title: string;
  description: string;
  level: 'basic' | 'sensitive';
};

const SCOPE_META: Record<string, ScopeMeta> = {
  openid: {
    title: 'Account identifier',
    description: 'Identifies your account subject in NazoAuth.',
    level: 'basic',
  },
  profile: {
    title: 'Profile details',
    description: 'Allows access to basic profile fields such as name and avatar.',
    level: 'basic',
  },
  email: {
    title: 'Email address',
    description: 'Allows access to the email address on this account.',
    level: 'sensitive',
  },
  offline_access: {
    title: 'Offline access',
    description: 'Allows the client to refresh access while you are away.',
    level: 'sensitive',
  },
  'nazo_admin:read': {
    title: 'Admin read access',
    description: 'Allows read access to controlled platform administration APIs.',
    level: 'sensitive',
  },
  'nazo_admin:write': {
    title: 'Admin write access',
    description: 'Allows write access to platform administration APIs.',
    level: 'sensitive',
  },
};

function resolveScopeMeta(scope: string): ScopeMeta {
  if (scope in SCOPE_META) {
    return SCOPE_META[scope];
  }
  return {
    title: scope,
    description: 'This scope is defined by the client. Confirm the source before approving.',
    level: 'sensitive',
  };
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Could not load the authorization request. Start the flow again.';
}

export default function Consent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [consentView, setConsentView] = useState<ConsentView | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const requestId = useMemo(
    () => new URLSearchParams(location.search).get('request_id')?.trim() ?? '',
    [location.search]
  );

  useEffect(() => {
    if (!requestId) {
      setConsentView(null);
      setErrorMsg('Missing request_id. Start the authorization flow again.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMsg('');
    setConsentView(null);

    const loadConsentView = async () => {
      try {
        const payload = await apiFetch<ConsentView>(
          `/authorize/consent?request_id=${encodeURIComponent(requestId)}`
        );
        if (!active) {
          return;
        }
        setConsentView(payload);
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
        setErrorMsg(resolveErrorMessage(error));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadConsentView();
    return () => {
      active = false;
    };
  }, [navigate, requestId]);

  const decisionEndpoint = `${API_BASE_URL}/authorize/decision`;
  const scopeItems = (consentView?.scopes ?? []).map((scope) => ({
    scope,
    meta: resolveScopeMeta(scope),
  }));
  const userTag = (user?.email || user?.display_name || 'nazo_user')
    .split('@')[0]
    .replace(/\s+/g, '_')
    .toLowerCase();
  const userName = user?.display_name || user?.email?.split('@')[0] || 'current account';
  const userAvatar = resolveAvatarUrl(user?.avatar_url);

  return (
    <motion.div
      className="page-transition-wrap consent-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="consent-bg-grid" aria-hidden="true" />

      <div className="consent-shell">
        <motion.section className="consent-user-strip glass" layout>
          <div className="consent-user-avatar-wrap">
            {user ? (
              <img src={userAvatar} alt="Current user avatar" className="consent-user-avatar" />
            ) : (
              <UserRound size={18} />
            )}
          </div>
          <div className="consent-user-main">
            <strong>{userName}</strong>
            <p>
              <AtSign size={14} />
              <span>Approving as @{userTag}</span>
            </p>
          </div>
        </motion.section>

        <motion.section className="consent-card glass" layout>
          <header className="consent-head">
            <span className="consent-icon">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h1>Review authorization</h1>
              <p>Confirm whether this client can access data from your NazoAuth account.</p>
            </div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
          {loading && (
            <motion.div
              key="consent-loading"
              className="consent-status"
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
              key="consent-error"
              className="consent-error"
              variants={contentSwitchVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <AlertTriangle size={18} />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {!loading && consentView && (
            <motion.div
              key="consent-ready"
              variants={contentSwitchVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
            >
              <section className="consent-app-box">
                <div className="consent-app-title">Requesting client</div>
                <div className="consent-app-meta">
                  <div className="consent-app-meta-item">
                    <span className="consent-app-meta-icon">
                      <Building2 size={14} />
                    </span>
                    <div>
                      <strong>{consentView.client_name}</strong>
                      <p>Client name</p>
                    </div>
                  </div>
                  <div className="consent-app-meta-item">
                    <span className="consent-app-meta-icon">
                      <Link2 size={14} />
                    </span>
                    <div>
                      <strong>{consentView.redirect_uri}</strong>
                      <p>Redirect URI</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="consent-scope-box">
                <div className="consent-block-title">
                  <LockKeyhole size={16} />
                  <span>Requested permissions</span>
                </div>
                <motion.ul
                  className="consent-scope-list"
                  variants={revealContainerVariants}
                  initial="initial"
                  animate="animate"
                  layout
                >
                  {scopeItems.map((item) => (
                    <motion.li
                      key={item.scope}
                      className={`consent-scope-item ${
                        item.meta.level === 'sensitive' ? 'sensitive' : 'basic'
                      }`}
                      variants={revealItemVariants}
                      layout
                    >
                      <div className="scope-line-1">{item.meta.title}</div>
                      <div className="scope-line-2">{item.meta.description}</div>
                      <code>{item.scope}</code>
                    </motion.li>
                  ))}
                </motion.ul>
              </section>

              <form action={decisionEndpoint} method="post" className="consent-actions">
                <input type="hidden" name="request_id" value={consentView.request_id} />
                <input
                  type="hidden"
                  name="csrf_token"
                  value={consentView.csrf_token || ''}
                />
                <button
                  id="nazo-consent-deny"
                  type="submit"
                  name="decision"
                  value="deny"
                  className="consent-btn deny"
                >
                  <CircleSlash size={16} />
                  <span>Deny</span>
                </button>
                <button
                  id="nazo-consent-approve"
                  type="submit"
                  name="decision"
                  value="approve"
                  className="consent-btn approve"
                >
                  <span>Approve and continue</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </motion.div>
          )}

          {!loading && !consentView && (
            <motion.div
              key="consent-fallback"
              className="consent-fallback"
              variants={contentSwitchVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Link to="/auth" className="btn-primary">
                Back to sign in
              </Link>
            </motion.div>
          )}
          </AnimatePresence>
        </motion.section>

        <div className="consent-powered">
          <span>Secured by NazoAuth</span>
        </div>
      </div>
    </motion.div>
  );
}
