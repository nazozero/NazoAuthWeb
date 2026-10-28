import BrandLogo from '../components/BrandLogo';
import RequireAuth from '../components/RequireAuth';
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
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { buildAuthRedirectWithNext, buildCurrentPath } from '../auth/next';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n';
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

const SCOPE_META: Record<
  string,
  {
    title: [string, string];
    description: [string, string];
    level: ScopeMeta['level'];
  }
> = {
  openid: {
    title: ['Account identifier', '账户标识'],
    description: [
      'Identifies your account subject in NazoAuth.',
      '识别你在 NazoAuth 中的账户身份。',
    ],
    level: 'basic',
  },
  profile: {
    title: ['Profile details', '个人资料'],
    description: [
      'Allows access to basic profile fields such as name and avatar.',
      '允许读取名称、头像等基本资料。',
    ],
    level: 'basic',
  },
  email: {
    title: ['Email address', '邮箱地址'],
    description: [
      'Allows access to the email address on this account.',
      '允许读取此账户的邮箱地址。',
    ],
    level: 'sensitive',
  },
  offline_access: {
    title: ['Offline access', '离线访问'],
    description: [
      'Allows the client to refresh access while you are away.',
      '允许应用在你离线时刷新访问权限。',
    ],
    level: 'sensitive',
  },
  'nazo_admin:read': {
    title: ['Admin read access', '管理数据读取'],
    description: [
      'Allows read access to controlled platform administration APIs.',
      '允许读取受控的管理接口数据。',
    ],
    level: 'sensitive',
  },
  'nazo_admin:write': {
    title: ['Admin write access', '管理数据写入'],
    description: [
      'Allows write access to platform administration APIs.',
      '允许通过管理接口修改平台数据。',
    ],
    level: 'sensitive',
  },
};

function resolveScopeMeta(scope: string, zh: boolean): ScopeMeta {
  const meta = SCOPE_META[scope];
  if (meta)
    return {
      title: meta.title[zh ? 1 : 0],
      description: meta.description[zh ? 1 : 0],
      level: meta.level,
    };
  return {
    title: scope,
    description: zh
      ? '此权限由客户端定义，请确认其用途后再授权。'
      : 'This scope is defined by the client. Confirm the source before approving.',
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
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();

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
          setUser(null);
          navigate(
            buildAuthRedirectWithNext(buildCurrentPath(window.location)),
            {
              replace: true,
            }
          );
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
  }, [navigate, requestId, setUser]);

  const decisionEndpoint = `${API_BASE_URL}/authorize/decision`;
  const scopeItems = (consentView?.scopes ?? []).map((scope) => ({
    scope,
    meta: resolveScopeMeta(scope, locale === 'zh-CN'),
  }));
  const userTag = (user?.email || user?.display_name || 'nazo_user')
    .split('@')[0]
    .replace(/\s+/g, '_')
    .toLowerCase();
  const userName =
    user?.display_name || user?.email?.split('@')[0] || 'current account';
  const userAvatar = resolveAvatarUrl(user?.avatar_url);
  const content = (
    <motion.div
      className="page-transition-wrap consent-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="consent-bg-grid" aria-hidden="true" />

      <div className="consent-shell">
        <div className="authorization-brand">
          <BrandLogo />
        </div>
        {user && <motion.section className="consent-user-strip glass" layout>
          <div className="consent-user-avatar-wrap">
            <img
              src={userAvatar}
              alt="Current user avatar"
              className="consent-user-avatar"
            />
          </div>
          <div className="consent-user-main">
            <strong>{userName}</strong>
            <p>
              <AtSign size={14} />
              <span>
                {t('consent.as')} @{userTag}
              </span>
            </p>
          </div>
        </motion.section>}

        <motion.section className="consent-card glass" layout>
          <header className="consent-head">
            <span className="consent-icon">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h1>{t('consent.title')}</h1>
              <p>{t('consent.subtitle')}</p>
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
                {t('consent.loading')}
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

            {!loading && !errorMsg && user && consentView && (
              <motion.div
                key="consent-ready"
                variants={contentSwitchVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
              >
                <section className="consent-app-box">
                  <div className="consent-app-title">{t('consent.client')}</div>
                  <div className="consent-app-meta">
                    <div className="consent-app-meta-item">
                      <span className="consent-app-meta-icon">
                        <Building2 size={14} />
                      </span>
                      <div>
                        <strong>{consentView.client_name}</strong>
                        <p>{t('consent.name')}</p>
                      </div>
                    </div>
                    <div className="consent-app-meta-item">
                      <span className="consent-app-meta-icon">
                        <Link2 size={14} />
                      </span>
                      <div>
                        <strong>{consentView.redirect_uri}</strong>
                        <p>{t('consent.redirect')}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="consent-scope-box">
                  <div className="consent-block-title">
                    <LockKeyhole size={16} />
                    <span>{t('consent.permissions')}</span>
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
                          item.meta.level === 'sensitive'
                            ? 'sensitive'
                            : 'basic'
                        }`}
                        variants={revealItemVariants}
                        layout
                      >
                        <div className="scope-line-1">{item.meta.title}</div>
                        <div className="scope-line-2">
                          {item.meta.description}
                        </div>
                        <code>{item.scope}</code>
                      </motion.li>
                    ))}
                  </motion.ul>
                </section>

                <form
                  action={decisionEndpoint}
                  method="post"
                  className="consent-actions"
                >
                  <input
                    type="hidden"
                    name="request_id"
                    value={consentView.request_id}
                  />
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
                    <span>{t('consent.deny')}</span>
                  </button>
                  <button
                    id="nazo-consent-approve"
                    type="submit"
                    name="decision"
                    value="approve"
                    className="consent-btn approve"
                  >
                    <span>{t('consent.approve')}</span>
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
                  {t('consent.back')}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        <div className="consent-powered">
          <span>{t('consent.secured')}</span>
        </div>
      </div>
    </motion.div>
  );
  return requestId ? <RequireAuth>{content}</RequireAuth> : content;
}
