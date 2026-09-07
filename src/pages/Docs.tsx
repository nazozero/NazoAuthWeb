import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Code2,
  Copy,
  Search,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { docPages, type DocText, type DocLink } from './docs/content';
import './Docs.css';

function CodeExample({
  language,
  value,
  zh,
}: {
  language: string;
  value: string;
  zh: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    timer.current = setTimeout(() => setStatus('idle'), 2200);
  }
  return (
    <div className="docs-code">
      <div className="docs-code-top">
        <span>
          <Code2 size={13} />
          {language}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={zh ? '复制代码' : 'Copy code'}
        >
          {status === 'copied' ? <Check size={13} /> : <Copy size={13} />}
          {zh ? '复制' : 'Copy'}
        </button>
      </div>
      <pre tabIndex={0} aria-label={zh ? '代码示例' : 'Code example'}>
        <code>
          {value.split('\n').map((line, index) => (
            <span
              className={
                line.startsWith('#') || line.startsWith('//')
                  ? 'code-comment'
                  : /^(GET|POST|nazoauthctl)/.test(line)
                    ? 'code-command'
                    : ''
              }
              key={index}
            >
              <span aria-hidden="true" className="code-line-number">
                {index + 1}
              </span>
              {line || ' '}
              <br />
            </span>
          ))}
        </code>
      </pre>
      <span className="copy-feedback" role="status">
        {status === 'copied'
          ? zh
            ? '已复制'
            : 'Copied'
          : status === 'error'
            ? zh
              ? '复制失败，请选中代码手动复制。'
              : 'Copy failed. Select the code and copy it manually.'
            : ''}
      </span>
    </div>
  );
}

export default function Docs() {
  const { locale } = useI18n();
  const zh = locale === 'zh-CN';
  const text = (value: DocText) => value[zh ? 0 : 1];
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const navigation = useRef<HTMLElement>(null);
  const active =
    docPages.find((page) => page.id === params.get('section')) ?? docPages[0];
  const activeIndex = docPages.indexOf(active);
  const search = query.trim().toLocaleLowerCase();
  const filtered = useMemo(
    () =>
      docPages.filter(
        (page) =>
          !search || JSON.stringify(page).toLocaleLowerCase().includes(search)
      ),
    [search]
  );
  const groups = [
    ['start', zh ? '开始使用' : 'GET STARTED'],
    ['integrate', zh ? '应用接入' : 'INTEGRATE'],
    ['operate', zh ? '部署与管理' : 'OPERATE'],
    ['configure', zh ? '配置参考' : 'CONFIGURATION'],
    ['reference', zh ? '参考' : 'REFERENCE'],
  ];
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const nav = navigation.current;
    const selected = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && selected && nav.scrollWidth > nav.clientWidth) {
      nav.scrollLeft +=
        selected.getBoundingClientRect().left -
        nav.getBoundingClientRect().left -
        10;
    }
    const sidebar = nav?.parentElement;
    if (selected && sidebar && sidebar.scrollHeight > sidebar.clientHeight) {
      const selectedBounds = selected.getBoundingClientRect();
      const sidebarBounds = sidebar.getBoundingClientRect();
      if (selectedBounds.bottom > sidebarBounds.bottom)
        sidebar.scrollTop += selectedBounds.bottom - sidebarBounds.bottom + 12;
      else if (selectedBounds.top < sidebarBounds.top)
        sidebar.scrollTop += selectedBounds.top - sidebarBounds.top - 12;
    }
  }, [active.id]);
  function navigate(section: string) {
    setQuery('');
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (section === 'overview') next.delete('section');
      else next.set('section', section);
      return next;
    });
  }
  function renderLink(link: DocLink) {
    const inside = (
      <>
        <span>{text(link.label)}</span>
        {link.href ? <ArrowUpRight size={15} /> : <ArrowRight size={15} />}
      </>
    );
    if (link.section)
      return (
        <Link
          key={link.section}
          to={`/docs?section=${link.section}`}
          onClick={() => setQuery('')}
        >
          {inside}
        </Link>
      );
    if (link.path)
      return (
        <Link key={link.path} to={link.path}>
          {inside}
        </Link>
      );
    return (
      <a
        key={link.href}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {inside}
      </a>
    );
  }
  return (
    <div className="docs-page">
      <div className="docs-layout">
        <aside
          className="docs-sidebar"
          aria-label={zh ? '文档导航' : 'Documentation navigation'}
        >
          <Link to="/docs" className="docs-brand">
            <BookOpen size={17} />
            <span>
              NAZOAUTH <b>DOCS</b>
            </span>
          </Link>
          <form
            className="docs-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              if (search && filtered[0]) navigate(filtered[0].id);
            }}
          >
            <Search size={14} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={zh ? '搜索文档…' : 'Search documentation…'}
              aria-label={zh ? '搜索文档' : 'Search documentation'}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={zh ? '清空搜索' : 'Clear search'}
              >
                <X size={13} />
              </button>
            )}
          </form>
          <nav className="docs-nav" ref={navigation}>
            {groups.map(([id, label]) => {
              const items = filtered.filter((page) => page.group === id);
              if (!items.length) return null;
              return (
                <div className="docs-nav-group" key={id}>
                  <h2>{label}</h2>
                  {items.map((page) => (
                    <Link
                      key={page.id}
                      to={
                        page.id === 'overview'
                          ? '/docs'
                          : `/docs?section=${page.id}`
                      }
                      aria-current={active.id === page.id ? 'page' : undefined}
                      onClick={() => setQuery('')}
                    >
                      <span>{text(page.title)}</span>
                      {active.id === page.id && (
                        <span className="docs-active-dot" />
                      )}
                    </Link>
                  ))}
                </div>
              );
            })}
          </nav>
          {search && (
            <p className="docs-search-count" role="status">
              {filtered.length
                ? zh
                  ? `找到 ${filtered.length} 个章节，按回车打开首项。`
                  : `${filtered.length} ${filtered.length === 1 ? 'chapter' : 'chapters'} found. Enter opens the first.`
                : zh
                  ? '没有匹配章节。试试 PKCE、部署或令牌。'
                  : 'No matching chapters. Try PKCE, deployment, or tokens.'}
            </p>
          )}
          <a
            className="docs-source-link"
            href="https://github.com/nazozero/NazoAuth/tree/main/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Code2 size={14} />
            {zh ? '服务端文档源文件' : 'Server documentation'}
            <ArrowUpRight size={12} />
          </a>
        </aside>

        <article className="docs-article" id="docs-content">
          <div className="docs-breadcrumb">
            <Link to="/docs">{zh ? '文档' : 'Documentation'}</Link>
            <span>/</span>
            <span>{groups.find(([id]) => id === active.group)?.[1]}</span>
          </div>
          <header className="docs-article-hero">
            <div className="docs-hero-content">
              <p className="section-label">
                {active.id === 'overview'
                  ? 'BUILD WITH NAZOAUTH'
                  : `GUIDE ${String(activeIndex + 1).padStart(2, '0')} / ${docPages.length}`}
              </p>
              <h1>{text(active.title)}</h1>
              <p>{text(active.summary)}</p>
            </div>
            <div className="docs-hero-meta">
              <span>OAUTH 2.x / OPENID CONNECT</span>
              <a href={`#${active.sections[0].id}`}>
                {zh ? '开始阅读' : 'Read the guide'}
                <ArrowDown size={12} />
              </a>
            </div>
          </header>
          <div className="docs-body" key={active.id}>
            {active.sections.map((section, index) => (
              <section
                className="docs-section"
                id={section.id}
                key={section.id}
              >
                <h2>
                  <a href={`#${section.id}`}>
                    <span className="docs-section-number" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {text(section.title)}
                  </a>
                </h2>
                {section.body && <p>{text(section.body)}</p>}
                {section.flow && (
                  <ol className="docs-flow">
                    {section.flow.map((label, step) => (
                      <li key={step}>
                        <span>{String(step + 1).padStart(2, '0')}</span>
                        <strong>{text(label)}</strong>
                        {step < section.flow!.length - 1 && (
                          <ArrowRight size={13} aria-hidden="true" />
                        )}
                      </li>
                    ))}
                  </ol>
                )}
                {section.steps && (
                  <ol className="docs-steps">
                    {section.steps.map((step, index) => (
                      <li key={index}>
                        <span aria-hidden="true">{index + 1}</span>
                        <p>{text(step)}</p>
                      </li>
                    ))}
                  </ol>
                )}
                {section.table && (
                  <div
                    className="docs-table-scroll"
                    role="region"
                    aria-label={text(section.title)}
                    tabIndex={0}
                  >
                    <table>
                      <thead>
                        <tr>
                          {section.table.heads.map((head, index) => (
                            <th key={index} scope="col">
                              {text(head)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row, index) => (
                          <tr key={index}>
                            {row.map((cell, index) => (
                              <td key={index}>{text(cell)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {section.code && (
                  <CodeExample key={section.id} {...section.code} zh={zh} />
                )}
                {section.note && (
                  <aside className="docs-note">
                    <span>i</span>
                    <p>{text(section.note)}</p>
                  </aside>
                )}
                {section.links && (
                  <div
                    className={
                      active.id === 'overview' && index === 0
                        ? 'docs-start-links'
                        : 'docs-related-links'
                    }
                  >
                    {section.links.map(renderLink)}
                  </div>
                )}
              </section>
            ))}
          </div>
          <div className="docs-article-source">
            <a
              href={`https://github.com/nazozero/NazoAuth/blob/main/${active.source}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {zh ? '阅读完整服务端参考' : 'Read the full server reference'}
              <ArrowUpRight size={14} />
            </a>
            <span>
              {zh
                ? '配置以实例与客户端策略为准'
                : 'Instance and client policy apply'}
            </span>
          </div>
          <nav
            className="docs-pagination"
            aria-label={zh ? '相邻章节' : 'Adjacent chapters'}
          >
            {activeIndex > 0 ? (
              <Link to={`/docs?section=${docPages[activeIndex - 1].id}`}>
                <ArrowLeft size={17} />
                <span>
                  <small>{zh ? '上一节' : 'PREVIOUS'}</small>
                  {text(docPages[activeIndex - 1].title)}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {activeIndex < docPages.length - 1 && (
              <Link to={`/docs?section=${docPages[activeIndex + 1].id}`}>
                <span>
                  <small>{zh ? '下一节' : 'NEXT'}</small>
                  {text(docPages[activeIndex + 1].title)}
                </span>
                <ArrowRight size={17} />
              </Link>
            )}
          </nav>
        </article>

        <aside
          className="docs-toc"
          aria-label={zh ? '本页目录' : 'On this page'}
        >
          <p>{zh ? '本页目录' : 'ON THIS PAGE'}</p>
          <nav>
            {active.sections.map((section) => (
              <a href={`#${section.id}`} key={section.id}>
                {text(section.title)}
              </a>
            ))}
          </nav>
          <div className="docs-toc-help">
            <span>{zh ? '需要帮助？' : 'Need a hand?'}</span>
            <Link to="/contact">
              {zh ? '联系支持' : 'Get support'}
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
