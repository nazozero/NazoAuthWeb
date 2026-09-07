import { ArrowUpRight, Mail, Code2, GitPullRequest } from 'lucide-react';
import { useI18n } from '../i18n';
import { Link } from 'react-router-dom';
import './Contact.css';

export default function Contact() {
  const { t, locale } = useI18n();
  const zh = locale === 'zh-CN';
  return (
    <div className="contact-page container">
      <header className="contact-heading">
        <p className="eyebrow">SUPPORT</p>
        <h1>{t('contact.title')}</h1>
        <p>{t('contact.subtitle')}</p>
      </header>
      <div className="contact-options">
        <a className="contact-option" href="mailto:support@nazo.run">
          <Mail size={27} strokeWidth={1.5} />
          <h2>{t('contact.email.title')}</h2>
          <p>support@nazo.run</p>
          <ArrowUpRight className="contact-option-arrow" size={22} />
        </a>
        <Link className="contact-option" to="/profile?tab=access-requests">
          <Code2 size={27} strokeWidth={1.5} />
          <h2>{t('contact.access.title')}</h2>
          <p>{t('contact.access.text')}</p>
          <ArrowUpRight className="contact-option-arrow" size={22} />
        </Link>
        <a
          className="contact-option"
          href="https://github.com/nazozero/NazoAuth/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GitPullRequest size={27} strokeWidth={1.5} />
          <h2>{zh ? 'Bug 与功能建议' : 'Bugs & feature requests'}</h2>
          <p>
            {zh
              ? '在 GitHub Issues 提交问题或功能建议。'
              : 'Report bugs and request features on GitHub Issues.'}
          </p>
          <ArrowUpRight className="contact-option-arrow" size={22} />
        </a>
      </div>
      <section className="support-guides">
        <p className="eyebrow">FIND YOUR NEXT STEP</p>
        <h2>{zh ? '从具体问题，找到下一步。' : 'A next step for your question.'}</h2>
        <div>{[
          ['01', zh ? '第一次接入应用' : 'Connect your first app', zh ? '注册客户端、配置回调与 PKCE，再完成授权码兑换。' : 'Register a client, configure redirects and PKCE, then exchange a code.', 'integration'],
          ['02', zh ? '部署与配置' : 'Deploy & configure', zh ? '检查运行方式、issuer、HTTPS 入口及存储适配器。' : 'Review runtimes, issuer, HTTPS ingress, and storage adapters.', 'deploy'],
          ['03', zh ? '排查授权失败' : 'Diagnose authorization', zh ? '从错误响应、客户端配置和 Discovery 元数据定位问题。' : 'Start with the error response, client configuration, and discovery metadata.', 'troubleshooting'],
        ].map(([number, title, text, section]) => <Link to={`/docs?section=${section}`} key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={18} /></Link>)}</div>
      </section>
      <section className="contact-report">
        <h2>{t('contact.include.title')}</h2>
        <p>{t('contact.include.text')}</p>
        <a
          href="https://github.com/nazozero/NazoAuth/security/policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          {zh ? '安全漏洞报告方式' : 'Report a security vulnerability'}
          <ArrowUpRight size={16} />
        </a>
      </section>
    </div>
  );
}
