import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Braces,
  CircuitBoard,
  DatabaseZap,
  Fingerprint,
  Gauge,
  KeyRound,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  Network,
  Radar,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
  UserRound,
  Workflow,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import './Home.css';

const endpointRows = [
  ['Discovery', '/.well-known/openid-configuration'],
  ['Authorization', '/authorize'],
  ['Token', '/token'],
  ['UserInfo', '/userinfo'],
  ['JWKS', '/jwks.json'],
  ['Introspection', '/introspect'],
  ['Revocation', '/revoke'],
  ['PAR', '/par'],
];

const capabilityGroups = [
  {
    icon: Fingerprint,
    title: '账号与登录',
    items: ['邮箱密码登录', '邮箱验证码注册', 'Turnstile 风控', '会话检查', 'CSRF 保护', '安全退出'],
  },
  {
    icon: LockKeyhole,
    title: 'OAuth/OIDC 授权',
    items: ['Authorization Code', 'PKCE S256', 'Consent 页面', 'Scope 展示', 'UserInfo', 'OIDC Discovery'],
  },
  {
    icon: ShieldCheck,
    title: '令牌与安全边界',
    items: ['JWKS 公钥', 'Token revocation', 'Introspection', 'DPoP/mTLS 元数据', 'Audience 绑定', '错误状态可见'],
  },
  {
    icon: ServerCog,
    title: '客户端接入',
    items: ['接入申请', '管理员审批', 'Client ID 发放', '一次性密钥投递', 'Redirect URI 管理', 'Scope 审核'],
  },
  {
    icon: LayoutDashboard,
    title: '后台管理',
    items: ['用户管理', '客户端管理', '授权记录', '授权撤销', '接入审批', '分页与过滤'],
  },
  {
    icon: Network,
    title: '部署与集成',
    items: ['前后端分离', '同源 API 代理', 'HTTPS/HSTS', '静态托管', 'SPA fallback', 'OIDF 测试入口'],
  },
];

const telemetry = [
  ['issuer', 'oauth-test.nazo.run'],
  ['accounts', 'accounts-test.nazo.run'],
  ['flow', 'code + pkce'],
  ['surface', 'web / consent / admin'],
];

export default function Home() {
  const { user } = useAuth();
  const canAccessAdmin = user?.role === 'admin' && user.admin_level >= 1;

  return (
    <motion.div
      className="page-transition-wrap home-page cyber-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
    >
      <section className="home-shell container">
        <div className="cyber-hero">
          <div className="cyber-hero-copy">
            <div className="home-kicker">
              <span className="status-dot" />
              authorization gateway online
            </div>
            <h1>NazoAuth identity grid</h1>
            <p>
              面向外部系统登录的 OAuth/OIDC 账户中心。这里不是单纯的后台，
              而是用户登录、授权同意、客户端接入、管理员审批和协议发现的统一入口。
            </p>
            <div className="home-actions">
              <Link to={user ? '/profile' : '/auth'} className="btn-primary">
                {user ? <UserRound size={18} /> : <KeyRound size={18} />}
                <span>{user ? '打开个人中心' : '进入登录链路'}</span>
              </Link>
              <Link to="/docs" className="btn-secondary">
                <BookOpen size={18} />
                <span>查看全部能力</span>
              </Link>
              {canAccessAdmin && (
                <Link to="/admin" className="btn-secondary">
                  <LayoutDashboard size={18} />
                  <span>管理后台</span>
                </Link>
              )}
            </div>
          </div>

          <aside className="command-panel" aria-label="NazoAuth runtime panel">
            <div className="terminal-bar">
              <span />
              <span />
              <span />
              <strong>nazoauth://runtime</strong>
            </div>
            <div className="radar-box">
              <Radar size={38} />
              <div>
                <span>current surface</span>
                <strong>{user ? 'authenticated' : 'public gateway'}</strong>
              </div>
            </div>
            <div className="telemetry-grid">
              {telemetry.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <code>{value}</code>
                </div>
              ))}
            </div>
            <div className="terminal-lines" aria-label="协议端点">
              {endpointRows.map(([label, path]) => (
                <div className="terminal-line" key={path}>
                  <span>{label}</span>
                  <code>{path}</code>
                </div>
              ))}
            </div>
            <Link className="gateway-panel-link" to="/profile?tab=access-requests">
              <span>申请 OAuth 客户端</span>
              <ArrowRight size={16} />
            </Link>
          </aside>
        </div>

        <section className="capability-section" aria-labelledby="capability-title">
          <div className="section-head">
            <div>
              <span className="docs-eyebrow">capability matrix</span>
              <h2 id="capability-title">覆盖从登录到接入审批的完整链路</h2>
            </div>
            <p>
              页面、API 和后台围绕同一套协议边界设计：外部应用负责发起授权请求，
              NazoAuth 负责账号登录、用户同意、令牌发放和客户端治理。
            </p>
          </div>

          <div className="capability-grid">
            {capabilityGroups.map((group) => {
              const Icon = group.icon;
              return (
                <article className="capability-card" key={group.title}>
                  <div className="capability-icon">
                    <Icon size={22} />
                  </div>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section className="flow-section">
          <div className="flow-card wide">
            <Workflow size={22} />
            <h2>外部应用登录流程</h2>
            <div className="flow-steps">
              <span>client redirects</span>
              <span>user signs in</span>
              <span>consent decision</span>
              <span>authorization code</span>
              <span>token exchange</span>
            </div>
          </div>
          <div className="flow-card">
            <CircuitBoard size={22} />
            <h3>前后端分离</h3>
            <p>React 前端可静态托管；API 通过同源反代保持 cookie、CSRF 和浏览器安全边界稳定。</p>
          </div>
          <div className="flow-card">
            <DatabaseZap size={22} />
            <h3>治理数据</h3>
            <p>用户、授权应用、接入申请、客户端配置和授权记录都可在 Web 工作台中查看或处理。</p>
          </div>
        </section>

        <section className="home-proof-strip">
          <div>
            <BadgeCheck size={18} />
            <span>OIDC / OAuth protocol surface</span>
          </div>
          <div>
            <Gauge size={16} />
            <span>PKCE S256</span>
          </div>
          <div>
            <Layers3 size={16} />
            <span>PAR / DPoP / mTLS metadata</span>
          </div>
          <div>
            <Braces size={16} />
            <span>JSON discovery</span>
          </div>
          <div>
            <TerminalSquare size={16} />
            <span>static web deploy</span>
          </div>
        </section>
      </section>
    </motion.div>
  );
}
