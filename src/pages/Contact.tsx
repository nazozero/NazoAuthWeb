import { motion } from 'framer-motion';
import { ArrowUpRight, Mail, MessageSquareText, ShieldQuestion } from 'lucide-react';
import { useI18n } from '../i18n';
import './Contact.css';

export default function Contact() {
  const { t } = useI18n();

  return (
    <motion.div
      className="page-transition-wrap contact-page container"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.22 }}
    >
      <section className="contact-wrapper">
        <div className="contact-brand">
          <span className="contact-eyebrow">{t('contact.eyebrow')}</span>
          <h1>{t('contact.title')}</h1>
          <p className="contact-subtitle">
            {t('contact.subtitle')}
          </p>
        </div>

        <div className="support-panel">
          <article className="support-card primary">
            <Mail size={20} />
            <div>
              <h2>{t('contact.email.title')}</h2>
              <p>support@nazo.run</p>
            </div>
            <a href="mailto:support@nazo.run" aria-label={t('contact.email.aria')}>
              <ArrowUpRight size={18} />
            </a>
          </article>

          <article className="support-card">
            <ShieldQuestion size={20} />
            <div>
              <h2>{t('contact.access.title')}</h2>
              <p>{t('contact.access.text')}</p>
            </div>
          </article>

          <article className="support-card">
            <MessageSquareText size={20} />
            <div>
              <h2>{t('contact.include.title')}</h2>
              <p>{t('contact.include.text')}</p>
            </div>
          </article>
        </div>
      </section>
    </motion.div>
  );
}
