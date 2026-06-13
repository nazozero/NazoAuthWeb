import { motion } from 'framer-motion';
import { ArrowRight, Braces, KeyRound, LockKeyhole, Network, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import './Home.css';

const protocolItems = [
  ['Discovery', '/.well-known/openid-configuration'],
  ['JWKS', '/jwks.json'],
  ['Authorization', '/authorize'],
  ['Token', '/token'],
  ['UserInfo', '/userinfo'],
  ['PAR', '/par'],
];

export default function Security() {
  const { t } = useI18n();
  const boundaries = [
    [t('security.card.browser.title'), t('security.card.browser.text')],
    [t('security.card.server.title'), t('security.card.server.text')],
    [t('security.card.runs.title'), t('security.card.runs.text')],
  ];

  return (
    <motion.div
      className="page-transition-wrap security-page container"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
    >
      <section className="security-hero">
        <span className="nazo-kicker">
          <span className="status-dot" />
          {t('security.kicker')}
        </span>
        <h1>{t('security.title')}</h1>
        <p>
          {t('security.subtitle')}
        </p>
        <div className="security-actions">
          <Link to="/docs" className="btn-primary">
            <Braces size={17} />
            <span>{t('security.action.docs')}</span>
          </Link>
          <Link to="/auth" className="btn-secondary">
            <KeyRound size={17} />
            <span>{t('security.action.signIn')}</span>
          </Link>
        </div>
      </section>

      <section className="security-grid" aria-label="Security boundaries">
        {boundaries.map(([title, text]) => (
          <article className="security-card" key={title}>
            <ShieldCheck size={22} />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="security-split" aria-label="Protocol capabilities">
        <article className="security-panel">
          <LockKeyhole size={22} />
          <h2>{t('security.pkce.title')}</h2>
          <p>
            {t('security.pkce.text')}
          </p>
          <Link to="/docs" className="security-inline-link">
            <span>{t('security.pkce.link')}</span>
            <ArrowRight size={16} />
          </Link>
        </article>
        <article className="security-panel">
          <Network size={22} />
          <h2>{t('security.endpoints.title')}</h2>
          <div className="protocol-list">
            {protocolItems.map(([name, path]) => (
              <div key={name}>
                <span>{name}</span>
                <code>{path}</code>
              </div>
            ))}
          </div>
        </article>
      </section>
    </motion.div>
  );
}
