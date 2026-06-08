import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  ChevronRight,
  Copy,
  KeyRound,
  Network,
  ShieldCheck,
  TerminalSquare,
  UsersRound,
  Wrench,
} from 'lucide-react';
import './Docs.css';

const sections = [
  { id: 'overview', label: '能力总览', icon: BookOpen },
  { id: 'flow', label: '登录与授权', icon: KeyRound },
  { id: 'metadata', label: '协议端点', icon: Network },
  { id: 'security', label: '安全能力', icon: ShieldCheck },
  { id: 'workbench', label: '用户与后台', icon: UsersRound },
  { id: 'deploy', label: '部署说明', icon: Wrench },
] as const;

type SectionId = (typeof sections)[number]['id'];

const discoveryUrl = 'https://oauth-test.nazo.run/.well-known/openid-configuration';
const authorizeExample =
  'https://oauth-test.nazo.run/authorize?response_type=code&client_id=your_client_id&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback&scope=openid%20profile&state=random_state&nonce=random_nonce&code_challenge=base64url_sha256&code_challenge_method=S256';
const tokenExample = `POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=returned_code&
redirect_uri=https://example.com/callback&
client_id=your_client_id&
code_verifier=original_pkce_verifier`;

const endpointGroups = [
  ['发现配置', '/.well-known/openid-configuration', '读取 issuer、端点、算法、scope 和扩展能力。'],
  ['授权端点', '/authorize', '外部应用把用户带到这里登录并确认授权。'],
  ['令牌端点', '/token', '使用授权码、refresh token 或客户端凭据换取令牌。'],
  ['用户信息', '/userinfo', '持有 access token 时读取 openid/profile/email 等用户信息。'],
  ['公钥集合', '/jwks.json', '资源服务器或客户端用来验证 JWT 签名。'],
  ['令牌检查', '/introspect', '资源服务器检查令牌状态、scope、audience 和过期时间。'],
  ['令牌撤销', '/revoke', '撤销 refresh token 或相关授权。'],
  ['PAR', '/par', '在高安全 profile 中提前提交授权请求参数。'],
];

const featureMatrix = [
  ['账号入口', '登录、注册、忘记密码占位、会话检查、安全退出'],
  ['授权确认', '展示应用名、redirect URI、scope 风险和同意/拒绝动作'],
  ['个人中心', '资料编辑、头像、授权应用历史、接入申请'],
  ['凭据投递', '审批通过后用一次性链接读取 Client ID / Secret'],
  ['管理后台', '用户、客户端、授权记录、接入申请审批'],
  ['协议能力', 'Discovery、JWKS、UserInfo、Token、Introspection、Revocation、PAR'],
  ['安全控制', 'PKCE S256、CSRF、Turnstile、sender-constrained metadata、精确 redirect URI'],
  ['部署形态', 'React 静态托管、同源 API 反代、HTTPS/HSTS、SPA fallback'],
];

const securityItems = [
  '公共客户端使用授权码 + PKCE S256，避免把 secret 暴露到浏览器。',
  '登录、注册、资料修改和管理动作通过 CSRF header/cookie 保护。',
  'Turnstile 可在登录和发送验证码前启用，用于拦截自动化请求。',
  '发现文档公开 DPoP、mTLS、PAR、私钥 JWT 等服务端能力，客户端按 profile 选择。',
  '管理员审批客户端时需要配置 redirect URI、scope、grant type 和 allowed audience。',
  '资源服务器应检查 audience，并使用 JWKS 或 introspection 验证 access token。',
];

export default function Docs() {
  const [activeTab, setActiveTab] = useState<SectionId>('overview');
  const [copied, setCopied] = useState('');

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1200);
    } catch {
      setCopied('');
    }
  };

  return (
    <motion.div
      className="page-transition-wrap docs-page container cyber-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
    >
      <div className="docs-layout">
        <aside className="docs-sidebar" aria-label="文档目录">
          <div className="sidebar-sticky">
            <h2 className="sidebar-title">NazoAuth manual</h2>
            <nav className="sidebar-nav">
              {sections.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                    <ChevronRight size={14} className="chevron" />
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="docs-content">
          {activeTab === 'overview' && (
            <section className="docs-section">
              <div className="docs-header">
                <span className="docs-eyebrow">full capability map</span>
                <h1>所有能力都围绕外部应用登录展开</h1>
                <p>
                  NazoAuth Web 是账户中心、OAuth 同意页、客户端接入入口和管理员后台的组合。
                  它不是营销站，也不是单独的控制台；它承担 OAuth/OIDC 浏览器交互面的全部职责。
                </p>
              </div>
              <div className="matrix-table">
                {featureMatrix.map(([name, value]) => (
                  <div className="matrix-row" key={name}>
                    <strong>{name}</strong>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'flow' && (
            <section className="docs-section">
              <div className="docs-header">
                <span className="docs-eyebrow">authorization code + pkce</span>
                <h1>浏览器登录和授权确认流程</h1>
                <p>
                  外部应用生成 state、nonce、code challenge，并把用户重定向到授权端点。
                  用户在 NazoAuth 登录后确认 scope，授权服务器再把 code 返回给客户端。
                </p>
              </div>
              <div className="code-block-wrapper">
                <div className="code-header">
                  <span>Authorization request</span>
                  <button
                    className="copy-btn"
                    title="复制示例"
                    type="button"
                    onClick={() => void copyText('authorize', authorizeExample)}
                  >
                    {copied === 'authorize' ? '已复制' : <Copy size={14} />}
                  </button>
                </div>
                <pre><code>{authorizeExample}</code></pre>
              </div>
              <div className="code-block-wrapper">
                <div className="code-header">
                  <span>Token exchange</span>
                  <button
                    className="copy-btn"
                    title="复制示例"
                    type="button"
                    onClick={() => void copyText('token', tokenExample)}
                  >
                    {copied === 'token' ? '已复制' : <Copy size={14} />}
                  </button>
                </div>
                <pre><code>{tokenExample}</code></pre>
              </div>
              <div className="docs-card">
                <h2>同意页展示内容</h2>
                <p>
                  同意页会展示当前账号、接入应用名称、redirect URI、请求的 scope 和敏感权限提示。
                  用户可以同意继续，也可以拒绝授权。
                </p>
              </div>
            </section>
          )}

          {activeTab === 'metadata' && (
            <section className="docs-section">
              <div className="docs-header">
                <span className="docs-eyebrow">protocol endpoints</span>
                <h1>协议端点和发现配置</h1>
                <p>
                  客户端和资源服务器应从发现端点读取当前能力，不要把 issuer、JWKs、
                  支持算法或 endpoint URL 写死在业务代码里。
                </p>
              </div>
              <div className="code-block-wrapper">
                <div className="code-header">
                  <span>Discovery</span>
                  <button
                    className="copy-btn"
                    title="复制发现端点"
                    type="button"
                    onClick={() => void copyText('discovery', discoveryUrl)}
                  >
                    {copied === 'discovery' ? '已复制' : <TerminalSquare size={14} />}
                  </button>
                </div>
                <pre><code>GET {discoveryUrl}</code></pre>
              </div>
              <div className="endpoint-doc-grid">
                {endpointGroups.map(([name, path, desc]) => (
                  <article key={path} className="endpoint-doc-card">
                    <code>{path}</code>
                    <h2>{name}</h2>
                    <p>{desc}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'security' && (
            <section className="docs-section">
              <div className="docs-header">
                <span className="docs-eyebrow">security boundary</span>
                <h1>安全能力和接入边界</h1>
                <p>
                  前端只负责交互和同源 API 调用；授权判断、令牌签发、客户端认证、
                  redirect URI 校验和用户授权决策都由后端执行。
                </p>
              </div>
              <div className="docs-card">
                <h2>需要客户端配合的事项</h2>
                <ul className="docs-list">
                  {securityItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {activeTab === 'workbench' && (
            <section className="docs-section">
              <div className="docs-header">
                <span className="docs-eyebrow">user and admin workbench</span>
                <h1>用户中心与管理员后台</h1>
                <p>
                  普通用户管理自己的资料、授权应用和接入申请；管理员处理用户、客户端、
                  授权记录和审批流。
                </p>
              </div>
              <div className="docs-two-col">
                <div className="docs-card">
                  <h2>用户中心</h2>
                  <ul className="docs-list">
                    <li>编辑显示昵称和头像。</li>
                    <li>查看已经授权过的应用和最近授权 scope。</li>
                    <li>提交 OAuth 客户端接入申请。</li>
                    <li>读取一次性客户端凭据投递链接。</li>
                  </ul>
                </div>
                <div className="docs-card">
                  <h2>管理后台</h2>
                  <ul className="docs-list">
                    <li>搜索、禁用、启用和提升用户。</li>
                    <li>创建、编辑、禁用客户端。</li>
                    <li>查看授权记录并撤销授权。</li>
                    <li>审批或拒绝客户端接入申请。</li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'deploy' && (
            <section className="docs-section">
              <div className="docs-header">
                <span className="docs-eyebrow">static deployment</span>
                <h1>前后端分离部署方式</h1>
                <p>
                  NazoAuth Web 可以作为纯静态 React 应用部署。测试环境使用 Angie 托管静态资源，
                  并把协议/API 路径同源反代到 NazoAuth 后端。
                </p>
              </div>
              <div className="docs-card">
                <h2>accounts-test.nazo.run 当前路径</h2>
                <ul className="docs-list">
                  <li>静态文件目录：<code>/usr/local/angie/html/accounts-test</code></li>
                  <li>前端路由：<code>/</code>、<code>/auth</code>、<code>/consent</code>、<code>/profile</code>、<code>/admin</code></li>
                  <li>API 路由：<code>/auth/*</code>、<code>/admin/*</code>、<code>/authorize</code>、<code>/token</code>、<code>/.well-known/*</code></li>
                  <li>构建命令：<code>npm run test</code></li>
                </ul>
              </div>
            </section>
          )}
        </main>
      </div>
    </motion.div>
  );
}
