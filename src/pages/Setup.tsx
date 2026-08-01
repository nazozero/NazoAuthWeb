import { useState, type FormEvent } from 'react';
import { Fingerprint, Lock, Mail, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import {
  clearInitialAdminToken,
  peekInitialAdminToken,
  validInitialAdminPassword,
} from '../auth/bootstrap';
import { ApiError, apiFetch } from '../lib/api';
import { alertVariants, pageVariants } from '../lib/motion';
import './Setup.css';

type BootstrapClaim = {
  id: string;
  email: string;
  role: 'admin';
  next: string;
};

function isExpiredBootstrapClaim(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 410);
}

export default function Setup() {
  const { t } = useI18n();
  const [token, setToken] = useState<string | null>(peekInitialAdminToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError(t('setup.error.invalidLink'));
      return;
    }
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !validInitialAdminPassword(password)) {
      setError(t('setup.error.required'));
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch<BootstrapClaim>('/auth/bootstrap-admin', {
        method: 'POST',
        csrf: 'defer',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: normalizedEmail, password }),
      });
      clearInitialAdminToken();
      setToken(null);
      setPassword('');
      setCreated(true);
    } catch (claimError) {
      setError(
        isExpiredBootstrapClaim(claimError)
          ? t('setup.error.invalidLink')
          : t('setup.error.failed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="setup-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="setup-card glass">
        <div className="setup-mark" aria-hidden="true">
          <Fingerprint size={28} />
        </div>
        <p className="setup-kicker">NazoAuth</p>
        <h1>{t('setup.title')}</h1>
        <p className="setup-subtitle">{t('setup.subtitle')}</p>

        {error && (
          <motion.div
            className="setup-alert error"
            variants={alertVariants}
            initial="initial"
            animate="animate"
          >
            {error}
          </motion.div>
        )}

        {created ? (
          <div className="setup-complete">
            <ShieldCheck size={42} />
            <h2>{t('setup.success.title')}</h2>
            <p>{t('setup.success.body')}</p>
            <Link className="btn-primary setup-link" to="/auth">
              {t('setup.success.signIn')}
            </Link>
          </div>
        ) : (
          <form className="setup-form" onSubmit={submit}>
            <label>
              <span>{t('setup.email')}</span>
              <div className="setup-input">
                <Mail size={18} aria-hidden="true" />
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>
            <label>
              <span>{t('setup.password')}</span>
              <div className="setup-input">
                <Lock size={18} aria-hidden="true" />
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </label>
            <button className="btn-primary setup-submit" type="submit" disabled={submitting || !token}>
              {submitting ? t('setup.submitting') : t('setup.submit')}
            </button>
            {!token && <p className="setup-hint">{t('setup.error.invalidLink')}</p>}
          </form>
        )}
      </div>
    </motion.div>
  );
}
