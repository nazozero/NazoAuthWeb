import { ArrowLeft, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

export default function NotFound() {
  const { locale } = useI18n();
  const zh = locale === 'zh-CN';
  return (
    <section className="not-found container">
      <p className="eyebrow">404 / NOT FOUND</p>
      <h1>
        {zh ? '页面不存在' : 'Page not found'}
      </h1>
      <p>
        {zh
          ? '请检查地址，或返回首页。'
          : 'Check the address or return to the home page.'}
      </p>
      <div>
        <Link className="btn-primary" to="/">
          <ArrowLeft size={16} />
          {zh ? '返回首页' : 'Back to home'}
        </Link>
        <Link className="btn-secondary" to="/docs">
          <BookOpen size={16} />
          {zh ? '查阅文档' : 'Explore the docs'}
        </Link>
      </div>
    </section>
  );
}
