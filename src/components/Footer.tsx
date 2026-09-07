import { ArrowUpRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import BrandLogo from './BrandLogo';
import './Footer.css';

export default function Footer() {
  const { locale, t } = useI18n();
  const { pathname } = useLocation();
  return (
    <footer className="footer">
      {pathname === '/' && <div className="brand-return" aria-hidden="true"><span>NazoAuth</span></div>}
      <div className="container">
        <div className="footer-main">
          <div className="footer-identity">
            <Link className="footer-brand" to="/">
              <BrandLogo />
            </Link>
            <p>
              {locale === 'zh-CN'
                ? '以 Rust 构建的开源身份认证与授权服务。'
                : 'Open-source identity and authorization, built with Rust.'}
            </p>
            <span>OAuth 2.x · OpenID Connect</span>
          </div>
          <nav className="footer-links">
            <div>
              <strong>{locale === 'zh-CN' ? '产品' : 'Product'}</strong>
              <Link to="/security">{t('nav.security')}</Link>
              <Link to="/auth">
                {locale === 'zh-CN' ? '登录账户' : 'Sign in'}
              </Link>
              <Link to="/contact">{t('nav.support')}</Link>
            </div>
            <div>
              <strong>{t('nav.docs')}</strong>
              <Link to="/docs?section=deploy">
                {locale === 'zh-CN' ? '部署指南' : 'Deployment'}
              </Link>
              <Link to="/docs?section=integration">
                {locale === 'zh-CN' ? '应用接入' : 'Integration'}
              </Link>
              <Link to="/docs?section=metadata">
                {locale === 'zh-CN' ? '协议端点' : 'Endpoints'}
              </Link>
            </div>
            <div>
              <strong>{locale === 'zh-CN' ? '开源项目' : 'Open source'}</strong>
              <a
                href="https://github.com/nazozero/NazoAuth"
                target="_blank"
                rel="noopener noreferrer"
              >
                NazoAuth
                <ArrowUpRight size={14} />
              </a>
              <a
                href="https://github.com/nazozero/NazoAuthCtl"
                target="_blank"
                rel="noopener noreferrer"
              >
                NazoAuthCtl
                <ArrowUpRight size={14} />
              </a>
              <a
                href="https://github.com/nazozero/NazoAuthWeb"
                target="_blank"
                rel="noopener noreferrer"
              >
                NazoAuthWeb
                <ArrowUpRight size={14} />
              </a>
            </div>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} NazoAuth</span>
          <span>OPEN SOURCE · AGPL-3.0</span>
          <span>
            {locale === 'zh-CN'
              ? 'OAuth · OpenID Connect'
              : 'OAuth · OpenID Connect'}
          </span>
        </div>
      </div>
    </footer>
  );
}
