import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Mail, Lock, Shield, ArrowRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  clientIdFromAuthorizationNext,
  normalizeClientPresentation,
  type ClientPresentation,
} from '../auth/clientPresentation';
import { resolveSafeNextFromSearch } from '../auth/next';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { alertVariants, pageVariants } from '../lib/motion';
import BrandLogo from '../components/BrandLogo';
import './Auth.css';

type AuthState = 'login' | 'register' | 'forgot';
type AuthAction = 'login' | 'send-code';

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession } = useAuth();
  const { t } = useI18n();
  const nextAfterLogin = useMemo(
    () => resolveSafeNextFromSearch(location.search),
    [location.search]
  );
  const authorizationClientId = useMemo(
    () => clientIdFromAuthorizationNext(nextAfterLogin),
    [nextAfterLogin]
  );

  const [authState, setAuthState] = useState<AuthState>('login');
  const [clientPresentation, setClientPresentation] =
    useState<ClientPresentation | null>(null);
  const [clientLogoFailed, setClientLogoFailed] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setClientPresentation(null);
    setClientLogoFailed(false);
    if (!authorizationClientId) {
      return () => controller.abort();
    }
    const loadClientPresentation = async () => {
      try {
        const value = await apiFetch<unknown>(
          `/authorize/client-presentation?client_id=${encodeURIComponent(authorizationClientId)}`,
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          setClientPresentation(normalizeClientPresentation(value));
        }
      } catch {
        if (!controller.signal.aborted) {
          setClientPresentation(null);
        }
      }
    };
    void loadClientPresentation();
    return () => controller.abort();
  }, [authorizationClientId]);

  useEffect(() => {
    setEmail('');
    setPassword('');
    setCode('');
    setErrorMsg('');
    setSuccessMsg('');
    setCountdown(0);
  }, [authState]);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCountdown((value) => value - 1);
    }, 1000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [countdown]);

  const variants: Variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.95,
    }),
  };

  const currentDirection = authState === 'login' ? -1 : 1;

  const performAction = async (action: AuthAction) => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (action === 'send-code') {
        await apiFetch<{ success: boolean; message: string }>(
          '/auth/send-code',
          {
            method: 'POST',
            csrf: 'defer',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
            }),
          }
        );
        setSuccessMsg(t('auth.success.codeSent'));
        setCountdown(60);
        return;
      }

      await apiFetch<{ session_id: string; expires_in: number }>(
        '/auth/login',
        {
          method: 'POST',
          csrf: 'defer',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      await refreshSession();
      if (nextAfterLogin) {
        window.location.href = nextAfterLogin;
        return;
      }
      setSuccessMsg(t('auth.success.signedIn'));
      navigate('/profile', { replace: true });
    } catch (error) {
      setErrorMsg(
        resolveErrorMessage(
          error,
          action === 'send-code'
            ? t('auth.error.sendCode')
            : t('auth.error.login')
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendCode = () => {
    if (!email) {
      setErrorMsg(t('auth.error.emailFirst'));
      return;
    }
    if (countdown > 0) {
      return;
    }
    void performAction('send-code');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (authState === 'register') {
      if (!email || !code || !password) {
        setErrorMsg(t('auth.error.registerRequired'));
        return;
      }

      setSubmitting(true);
      try {
        await apiFetch<{ id: string; email: string }>('/auth/register', {
          method: 'POST',
          csrf: 'defer',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            verification_code: code,
            password,
          }),
        });
        setSuccessMsg(t('auth.success.created'));
      } catch (error) {
        setErrorMsg(resolveErrorMessage(error, t('auth.error.registerFailed')));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (authState === 'login') {
      if (!email || !password) {
        setErrorMsg(t('auth.error.loginRequired'));
        return;
      }
      void performAction('login');
      return;
    }

    setErrorMsg(t('auth.error.recoveryUnavailable'));
  };

  return (
    <motion.div
      className="page-transition-wrap auth-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="auth-background" aria-hidden="true">
        <div className="auth-grid"></div>
      </div>

      <div className="auth-shell">
        <aside className="auth-story" aria-hidden="true">
          <div className="auth-spectrum">
            <i />
            <i />
            <i />
          </div>
        </aside>
        <div className="auth-container">
          <div className="auth-card glass">
            <div className="auth-header">
              <div className="auth-kicker">
                <BrandLogo />
              </div>
              <h2>
                {authState === 'login' && t('auth.title.login')}
                {authState === 'register' && t('auth.title.register')}
                {authState === 'forgot' && t('auth.title.forgot')}
              </h2>
              <p className="auth-subtitle">
                {authState === 'login' && t('auth.subtitle.login')}
                {authState === 'register' && t('auth.subtitle.register')}
                {authState === 'forgot' && t('auth.subtitle.forgot')}
              </p>
              {authState === 'login' && clientPresentation && (
                <section
                  className="auth-client-presentation"
                  aria-label={t('auth.client.label')}
                >
                  {clientPresentation.logo_uri && !clientLogoFailed && (
                    <img
                      src={clientPresentation.logo_uri}
                      alt=""
                      className="auth-client-logo"
                      referrerPolicy="no-referrer"
                      decoding="async"
                      onError={() => setClientLogoFailed(true)}
                    />
                  )}
                  <div className="auth-client-copy">
                    <span>{t('auth.client.continueTo')}</span>
                    <strong>{clientPresentation.client_name}</strong>
                    {(clientPresentation.policy_uri ||
                      clientPresentation.tos_uri) && (
                      <div className="auth-client-links">
                        {clientPresentation.policy_uri && (
                          <a
                            href={clientPresentation.policy_uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                          >
                            {t('auth.client.policy')}
                          </a>
                        )}
                        {clientPresentation.tos_uri && (
                          <a
                            href={clientPresentation.tos_uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                          >
                            {t('auth.client.terms')}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  variants={alertVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="auth-alert error"
                >
                  {errorMsg}
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  variants={alertVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="auth-alert success"
                >
                  {successMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="auth-form-wrapper">
              <AnimatePresence mode="wait" custom={currentDirection}>
                <motion.div
                  key={authState}
                  custom={currentDirection}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="form-animator"
                >
                  <form className="auth-form" onSubmit={handleSubmit}>
                    <fieldset disabled={submitting} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 13 }}>
                    {authState === 'register' ? (
                      <>
                        <div className="input-group">
                          <div className="input-icon">
                            <Mail size={18} />
                          </div>
                          <input
                            type="email"
                            aria-label={t('auth.placeholder.email')}
                            autoComplete="email"
                            className="glass-input code-input-with-btn"
                            placeholder={t('auth.placeholder.email')}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                          />
                          <button
                            type="button"
                            className="send-code-btn"
                            onClick={handleSendCode}
                            disabled={
                              countdown > 0 || submitting
                            }
                          >
                            {countdown > 0
                              ? t('auth.retryIn', { seconds: countdown })
                              : t('auth.sendCode')}
                          </button>
                        </div>
                        <div className="input-group">
                          <div className="input-icon">
                            <Shield size={18} />
                          </div>
                          <input
                            type="text"
                            aria-label={t('auth.placeholder.code')}
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            className="glass-input"
                            placeholder={t('auth.placeholder.code')}
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                          />
                        </div>
                        <div className="input-group">
                          <div className="input-icon">
                            <Lock size={18} />
                          </div>
                          <input
                            type="password"
                            aria-label={t('auth.placeholder.password')}
                            autoComplete="new-password"
                            className="glass-input"
                            placeholder={t('auth.placeholder.password')}
                            value={password}
                            onChange={(event) =>
                              setPassword(event.target.value)
                            }
                          />
                        </div>
                      </>
                    ) : authState === 'login' ? (
                      <>
                        <label
                          className="auth-input-label"
                          htmlFor="nazo-login-email"
                        >
                          {t('auth.placeholder.email')}
                        </label>
                        <div className="input-group">
                          <div className="input-icon">
                            <Mail size={18} />
                          </div>
                          <input
                            id="nazo-login-email"
                            name="email"
                            autoComplete="username"
                            type="email"
                            className="glass-input"
                            placeholder={t('auth.placeholder.email')}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                          />
                        </div>
                        <label
                          className="auth-input-label"
                          htmlFor="nazo-login-password"
                        >
                          {t('auth.placeholder.password')}
                        </label>
                        <div className="input-group">
                          <div className="input-icon">
                            <Lock size={18} />
                          </div>
                          <input
                            id="nazo-login-password"
                            name="password"
                            autoComplete="current-password"
                            type="password"
                            className="glass-input"
                            placeholder={t('auth.placeholder.password')}
                            value={password}
                            onChange={(event) =>
                              setPassword(event.target.value)
                            }
                          />
                        </div>
                        <div className="auth-options">
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => setAuthState('forgot')}
                          >
                            {t('auth.forgot')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="auth-help-text">
                        {t('auth.helpReset')}
                      </div>
                    )}

                    <button
                      id="nazo-login-submit"
                      type={authState === 'forgot' ? 'button' : 'submit'}
                      onClick={
                        authState === 'forgot'
                          ? () => navigate('/contact')
                          : undefined
                      }
                      className="btn-primary w-full mt-4"
                      disabled={submitting}
                    >
                      <span>
                        {authState === 'login' && t('auth.button.signIn')}
                        {authState === 'register' && t('auth.button.create')}
                        {authState === 'forgot' &&
                          t('auth.button.contactAdmin')}
                      </span>
                      <ArrowRight size={18} />
                    </button>
                    </fieldset>
                  </form>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="auth-footer">
              {authState === 'login' ? (
                <p>
                  {t('auth.needAccess')}
                  <button
                    type="button"
                    className="text-link font-bold text-cta"
                    disabled={submitting}
                    onClick={() => setAuthState('register')}
                  >
                    {t('auth.createAccount')}
                  </button>
                </p>
              ) : (
                <p>
                  {t('auth.alreadyRegistered')}
                  <button
                    type="button"
                    className="text-link font-bold text-secondary"
                    disabled={submitting}
                    onClick={() => setAuthState('login')}
                  >
                    {t('auth.backToSignIn')}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
