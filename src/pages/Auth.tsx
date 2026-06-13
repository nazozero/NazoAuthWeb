import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Mail, Lock, Shield, ArrowRight, Fingerprint } from 'lucide-react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useLocation, useNavigate } from 'react-router-dom';
import { resolveSafeNextFromSearch } from '../auth/next';
import { useAuth } from '../auth/useAuth';
import CaptchaModal from '../components/CaptchaModal';
import { useI18n } from '../i18n';
import { apiFetch } from '../lib/api';
import { alertVariants, pageVariants } from '../lib/motion';
import { publicAsset } from '../lib/publicAsset';
import type { CaptchaConfig } from '../types/auth';
import './Auth.css';

type AuthState = 'login' | 'register' | 'forgot';
type ProtectedAction = 'login' | 'send-code';

const DEFAULT_CAPTCHA_CONFIG: CaptchaConfig = {
  turnstile_enabled: false,
  turnstile_site_key: null,
  registration_enabled: true,
};

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function normalizeCaptchaConfig(value: unknown): CaptchaConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_CAPTCHA_CONFIG;
  }
  const candidate = value as Partial<CaptchaConfig>;
  return {
    turnstile_enabled: candidate.turnstile_enabled === true,
    turnstile_site_key:
      typeof candidate.turnstile_site_key === 'string' ? candidate.turnstile_site_key : null,
    registration_enabled: candidate.registration_enabled !== false,
  };
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

  const [authState, setAuthState] = useState<AuthState>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [captchaConfig, setCaptchaConfig] =
    useState<CaptchaConfig>(DEFAULT_CAPTCHA_CONFIG);
  const [captchaConfigLoading, setCaptchaConfigLoading] = useState(true);
  const [captchaModalOpen, setCaptchaModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ProtectedAction | null>(null);
  const [autoCaptchaRunning, setAutoCaptchaRunning] = useState(false);
  const loginTurnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  const loginCaptchaPromiseRef = useRef<{
    resolve: (token: string) => void;
    reject: (reason: Error) => void;
  } | null>(null);

  const captchaEnabled =
    captchaConfig.turnstile_enabled && Boolean(captchaConfig.turnstile_site_key);

  const clearLoginCaptchaPromise = () => {
    loginCaptchaPromiseRef.current = null;
  };

  const requestLoginTurnstileToken = (): Promise<string> => {
    if (!captchaEnabled || !captchaConfig.turnstile_site_key) {
      return Promise.resolve('');
    }
    if (!loginTurnstileRef.current) {
      return Promise.reject(new Error(t('auth.error.securityLoading')));
    }
    if (loginCaptchaPromiseRef.current) {
      return Promise.reject(new Error(t('auth.error.securityRunning')));
    }
    return new Promise<string>((resolve, reject) => {
      loginCaptchaPromiseRef.current = { resolve, reject };
      try {
        loginTurnstileRef.current?.execute();
      } catch {
        clearLoginCaptchaPromise();
        reject(new Error(t('auth.error.securityStart')));
      }
    });
  };

  useEffect(() => {
    let active = true;
    const loadCaptchaConfig = async () => {
      try {
        const config = await apiFetch<unknown>('/auth/captcha-config');
        if (active) {
          setCaptchaConfig(normalizeCaptchaConfig(config));
        }
      } catch {
        if (active) {
          setCaptchaConfig(DEFAULT_CAPTCHA_CONFIG);
        }
      } finally {
        if (active) {
          setCaptchaConfigLoading(false);
        }
      }
    };

    void loadCaptchaConfig();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setEmail('');
    setPassword('');
    setCode('');
    setErrorMsg('');
    setSuccessMsg('');
    setCountdown(0);
    setPendingAction(null);
    setCaptchaModalOpen(false);
    setAutoCaptchaRunning(false);
    if (loginCaptchaPromiseRef.current) {
      loginCaptchaPromiseRef.current.reject(new Error(t('auth.error.securityCancelled')));
      clearLoginCaptchaPromise();
    }
  }, [authState, t]);

  useEffect(
    () => () => {
      if (loginCaptchaPromiseRef.current) {
        loginCaptchaPromiseRef.current.reject(new Error(t('auth.error.pageInactive')));
        clearLoginCaptchaPromise();
      }
    },
    [t]
  );

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

  const performProtectedAction = async (
    action: ProtectedAction,
    turnstileToken: string | null
  ) => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (action === 'send-code') {
        await apiFetch<{ success: boolean; message: string }>('/auth/send-code', {
          method: 'POST',
          csrf: 'defer',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            turnstile_token: turnstileToken,
          }),
        });
        setSuccessMsg(t('auth.success.codeSent'));
        setCountdown(60);
        return;
      }

      await apiFetch<{ session_id: string; expires_in: number }>('/auth/login', {
        method: 'POST',
        csrf: 'defer',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          turnstile_token: turnstileToken,
        }),
      });

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

  const triggerProtectedAction = (action: ProtectedAction) => {
    if (captchaConfigLoading) {
      setErrorMsg(t('auth.error.securityLoading'));
      return;
    }

    if (!captchaEnabled) {
      void performProtectedAction(action, null);
      return;
    }

    if (action === 'login') {
      setAutoCaptchaRunning(true);
      void requestLoginTurnstileToken()
        .then((token) => performProtectedAction(action, token))
        .catch((error: unknown) => {
          setErrorMsg(resolveErrorMessage(error, t('auth.error.securityFailed')));
        })
        .finally(() => {
          setAutoCaptchaRunning(false);
        });
      return;
    }

    setPendingAction(action);
    setCaptchaModalOpen(true);
  };

  const handleSendCode = () => {
    if (!email) {
      setErrorMsg(t('auth.error.emailFirst'));
      return;
    }
    if (countdown > 0) {
      return;
    }
    triggerProtectedAction('send-code');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (authState === 'register') {
      if (!captchaConfig.registration_enabled) {
        setErrorMsg(t('auth.error.registrationClosed'));
        return;
      }
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
        window.setTimeout(() => {
          setAuthState('login');
        }, 1200);
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
      triggerProtectedAction('login');
      return;
    }

    setErrorMsg(t('auth.error.recoveryUnavailable'));
  };

  const handleCaptchaVerified = (token: string) => {
    const action = pendingAction;
    setCaptchaModalOpen(false);
    setPendingAction(null);
    if (!action) {
      return;
    }
    void performProtectedAction(action, token);
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
        <div className="auth-container">
          <div className="auth-card glass">
            <div className="auth-header">
              <img src={publicAsset('icons/site-icon-64x64.png')} alt="NazoAuth" className="auth-brand-icon" />
              <div className="auth-kicker">
                <Fingerprint size={15} />
                NazoAuth
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
                    {authState === 'register' ? (
                      <>
                        <div className="input-group">
                          <div className="input-icon">
                            <Mail size={18} />
                          </div>
                          <input
                            type="email"
                            className="glass-input code-input-with-btn"
                            placeholder={t('auth.placeholder.email')}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                          />
                          <button
                            type="button"
                            className="send-code-btn"
                            onClick={handleSendCode}
                            disabled={countdown > 0 || submitting || autoCaptchaRunning}
                          >
                            {countdown > 0 ? t('auth.retryIn', { seconds: countdown }) : t('auth.sendCode')}
                          </button>
                        </div>
                        <div className="input-group">
                          <div className="input-icon">
                            <Shield size={18} />
                          </div>
                          <input
                            type="text"
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
                            className="glass-input"
                            placeholder={t('auth.placeholder.password')}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                          />
                        </div>
                      </>
                    ) : authState === 'login' ? (
                      <>
                        <div className="input-group">
                          <div className="input-icon">
                            <Mail size={18} />
                          </div>
                          <input
                            id="nazo-login-email"
                            name="email"
                            type="email"
                            className="glass-input"
                            placeholder={t('auth.placeholder.email')}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                          />
                        </div>
                        <div className="input-group">
                          <div className="input-icon">
                            <Lock size={18} />
                          </div>
                          <input
                            id="nazo-login-password"
                            name="password"
                            type="password"
                            className="glass-input"
                            placeholder={t('auth.placeholder.password')}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                          />
                        </div>
                        <div className="auth-options">
                          <span className="text-link" onClick={() => setAuthState('forgot')}>
                            {t('auth.forgot')}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="auth-help-text">
                        {t('auth.helpReset')}
                      </div>
                    )}

                    <button
                      id="nazo-login-submit"
                      type="submit"
                      className="btn-primary w-full mt-4"
                      disabled={
                        submitting ||
                        autoCaptchaRunning ||
                        (authState === 'login' && captchaConfigLoading)
                      }
                    >
                      <span>
                        {authState === 'login' &&
                          (captchaConfigLoading
                            ? t('auth.button.preparing')
                            : autoCaptchaRunning
                              ? t('auth.button.checking')
                              : t('auth.button.signIn'))}
                        {authState === 'register' && t('auth.button.create')}
                        {authState === 'forgot' && t('auth.button.contactAdmin')}
                      </span>
                      <ArrowRight size={18} />
                    </button>
                  </form>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="auth-footer">
              {authState === 'login' ? (
                <p>
                  {t('auth.needAccess')}
                  <span
                    className="text-link font-bold text-cta"
                    onClick={() => setAuthState('register')}
                  >
                    {t('auth.createAccount')}
                  </span>
                </p>
              ) : (
                <p>
                  {t('auth.alreadyRegistered')}
                  <span
                    className="text-link font-bold text-secondary"
                    onClick={() => setAuthState('login')}
                  >
                    {t('auth.backToSignIn')}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {captchaEnabled && captchaConfig.turnstile_site_key && (
        <div className="turnstile-auto-hidden" aria-hidden="true">
          <Turnstile
            ref={loginTurnstileRef}
            siteKey={captchaConfig.turnstile_site_key}
            options={{
              theme: 'dark',
              execution: 'execute',
              appearance: 'execute',
              refreshExpired: 'auto',
              refreshTimeout: 'auto',
            }}
            onSuccess={(token) => {
              const pending = loginCaptchaPromiseRef.current;
              if (!pending) {
                return;
              }
              clearLoginCaptchaPromise();
              pending.resolve(token);
            }}
            onExpire={() => {
              const pending = loginCaptchaPromiseRef.current;
              if (!pending) {
                return;
              }
              clearLoginCaptchaPromise();
              pending.reject(new Error(t('auth.error.securityExpired')));
            }}
            onError={() => {
              const pending = loginCaptchaPromiseRef.current;
              if (!pending) {
                return;
              }
              clearLoginCaptchaPromise();
              pending.reject(new Error(t('auth.error.securityFailed')));
            }}
          />
        </div>
      )}

      {captchaEnabled && captchaConfig.turnstile_site_key && captchaModalOpen && (
        <CaptchaModal
          siteKey={captchaConfig.turnstile_site_key}
          title={t('auth.captchaTitle')}
          actionLabel={t('auth.captchaAction')}
          disabled={submitting}
          onClose={() => {
            setCaptchaModalOpen(false);
            setPendingAction(null);
          }}
          onVerified={handleCaptchaVerified}
        />
      )}
    </motion.div>
  );
}
