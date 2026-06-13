import './Footer.css';
import { useI18n } from '../i18n';
import { publicAsset } from '../lib/publicAsset';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="footer">
      <div className="container footer-content">
        <div className="footer-brand">
          <img src={publicAsset('icons/site-icon-64x64.png')} alt="NazoAuth icon" className="footer-logo" />
          <span>NazoAuth</span>
        </div>
        <div className="footer-links">
          <p className="footer-copyright">
            © {new Date().getFullYear()} NazoAuth. {t('footer.copy')}
          </p>
        </div>
      </div>
    </footer>
  );
}
