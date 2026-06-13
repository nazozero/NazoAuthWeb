import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Gauge,
  KeyRound,
  Library,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n';
import './Home.css';

export default function Home() {
  const { user } = useAuth();
  const { t } = useI18n();
  const canAccessAdmin = user?.role === 'admin' && user.admin_level >= 1;
  const pageRef = useRef<HTMLDivElement | null>(null);
  const entryLinks = [
    {
      icon: ShieldCheck,
      title: t('home.entry.security.title'),
      text: t('home.entry.security.text'),
      to: '/security',
    },
    {
      icon: Library,
      title: t('home.entry.docs.title'),
      text: t('home.entry.docs.text'),
      to: '/docs',
    },
  ];

  useGSAP(
    () => {
      gsap.from('.nazo-reveal', {
        y: 22,
        opacity: 0,
        duration: 0.64,
        ease: 'power3.out',
        stagger: 0.06,
      });
    },
    { scope: pageRef }
  );

  return (
    <motion.div
      ref={pageRef}
      className="page-transition-wrap home-page nazo-home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
    >
      <section className="nazo-hero">
        <div className="container nazo-hero-grid nazo-hero-grid-lean">
          <div className="nazo-hero-copy">
            <span className="nazo-kicker nazo-reveal">
              <span className="status-dot" />
              auth.nazo.run
            </span>
            <h1 className="nazo-reveal" aria-label="NazoAuth">
              NazoAuth
            </h1>
            <p className="nazo-reveal">
              {t('home.hero.copy')}
            </p>
            <div className="home-actions nazo-reveal">
              <Link to={user ? '/profile' : '/auth'} className="btn-primary">
                <KeyRound size={17} />
                <span>{user ? t('home.action.profile') : t('home.action.signIn')}</span>
              </Link>
              <Link to="/security" className="btn-secondary">
                <ShieldCheck size={17} />
                <span>{t('home.action.security')}</span>
              </Link>
              {canAccessAdmin && (
                <Link to="/admin" className="btn-secondary">
                  <Gauge size={17} />
                  <span>{t('home.action.admin')}</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="container nazo-entry-grid" aria-label="NazoAuth pages">
          {entryLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="nazo-entry-card" to={item.to} key={item.title}>
                <Icon size={20} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.text}</small>
                </span>
                <ArrowUpRight size={18} />
              </Link>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}
