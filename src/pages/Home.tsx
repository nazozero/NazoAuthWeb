import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  Database,
  Fingerprint,
  Globe2,
  KeyRound,
  Layers3,
  LockKeyhole,
  Monitor,
  Server,
  ShieldCheck,
  Terminal,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { publicAsset } from '../lib/publicAsset';
import IdentityPath from '../components/IdentityPath';
import './Home.css';

export default function Home() {
  const { locale } = useI18n();
  const zh = locale === 'zh-CN';
  const [flow, setFlow] = useState(0);
  const protocols = [
    ['OAuth 2.0', '授权框架与标准授权流程', 'Authorization framework and grants', 'flow'],
    ['OpenID Connect', '身份认证、ID Token 与 UserInfo', 'Authentication, ID tokens and UserInfo', 'integration'],
    ['PKCE', 'S256 授权码交换保护', 'S256 authorization code protection', 'integration'],
    ['Discovery', 'OIDC 与 OAuth 服务端元数据', 'OIDC and OAuth server metadata', 'metadata'],
    ['PAR', '推送授权请求', 'Pushed authorization requests', 'standards'],
    ['JAR', '签名的 JWT 授权请求', 'JWT-secured authorization requests', 'standards'],
    ['JARM', 'JWT 保护的授权响应', 'JWT-secured authorization responses', 'standards'],
    ['DPoP', '将令牌绑定到发送方密钥', 'Sender-constrained tokens with proof of possession', 'standards'],
    ['mTLS', '客户端认证与证书绑定令牌', 'Client authentication and certificate-bound tokens', 'transport'],
    ['FAPI 2.0', '安全配置及消息签名配置', 'Security and Message Signing profiles', 'certification'],
    ['CIBA', '解耦认证 · Poll / Ping', 'Decoupled authentication · Poll / Ping', 'modules'],
    ['Device Authorization', '面向命令行与输入受限设备', 'Authorization for CLIs and limited-input devices', 'flow'],
    ['Client Credentials', '服务间调用的应用身份', 'Application identity for service-to-service calls', 'flow'],
    ['JWT Bearer', 'JWT 断言授权 · 按策略启用', 'JWT assertion grant · policy controlled', 'modules'],
    ['Token Exchange', '受策略约束的令牌交换', 'Policy-controlled token exchange', 'modules'],
    ['Resource Indicators', '显式声明目标资源', 'Explicit target-resource selection', 'standards'],
    ['Token Introspection', '查询令牌状态与授权信息', 'Token status and authorization metadata', 'metadata'],
    ['Token Revocation', '撤销访问令牌与刷新令牌', 'Revoke access and refresh tokens', 'metadata'],
    ['OpenID Logout', 'RP 发起、前后通道与会话管理', 'RP-initiated, front/back-channel and session management', 'certification'],
    ['SCIM 2.0', '用户与组预配 · 需启用模块', 'User and group provisioning · optional module', 'modules'],
    ['WebAuthn / Passkey', '公钥凭据与无密码认证', 'Public-key credentials and passwordless sign-in', 'sessions'],
    ['TOTP / MFA', '动态验证码与备用恢复码', 'Time-based codes and backup recovery codes', 'sessions'],
    ['OpenID4VCI + HAIP', '凭证签发 · SD-JWT VC / mdoc', 'Credential issuance · SD-JWT VC / mdoc', 'credentials'],
    ['OpenID4VP + HAIP', '凭证出示 · SD-JWT VC / mdoc', 'Credential presentation · SD-JWT VC / mdoc', 'credentials'],
  ];
  const flows = [
    {
      name: zh ? 'Web 与移动应用' : 'Web & mobile apps',
      icon: Monitor,
      title: zh
        ? '通过统一登录接入应用'
        : 'Connect apps through a shared sign-in',
      body: zh
        ? '应用将用户带到 NazoAuth 完成认证与授权，再通过授权码 + PKCE 获取令牌。适用于网站、移动应用和第三方客户端。'
        : 'Send users to NazoAuth to authenticate and approve access, then exchange an authorization code with PKCE. For websites, mobile apps, and third-party clients.',
      steps: zh
        ? ['发起登录', '认证与授权', '返回应用']
        : ['Start sign-in', 'Authenticate & approve', 'Return to app'],
      protocol: 'AUTHORIZATION CODE + PKCE',
      code: 'GET /authorize\n\n  response_type=code\n  client_id=your_app\n  scope=openid profile\n  redirect_uri=https://app.example/callback\n  code_challenge_method=S256\n  code_challenge=…\n  state=…\n  nonce=…',
    },
    {
      name: zh ? '后端服务' : 'Backend services',
      icon: Server,
      title: zh
        ? '为服务间调用签发访问令牌'
        : 'Issue access tokens for service calls',
      body: zh
        ? '后端任务使用客户端身份申请令牌，按配置的权限范围访问 API。无需用户登录，服务凭据由后端保管。'
        : 'Backend jobs authenticate as clients and request scoped tokens for API access. No user sign-in is required; credentials remain on the backend.',
      steps: zh
        ? ['验证客户端', '签发访问令牌', '调用 API']
        : ['Authenticate client', 'Issue access token', 'Call your API'],
      protocol: 'CLIENT CREDENTIALS',
      code: 'POST /token\nContent-Type: application/x-www-form-urlencoded\nAuthorization: Basic …\n\n  grant_type=client_credentials\n  scope=your_api_scope',
    },
    {
      name: zh ? '终端与设备' : 'Terminals & devices',
      icon: Terminal,
      title: zh ? '在另一台设备上完成授权' : 'Approve access on another device',
      body: zh
        ? '命令行工具或输入受限的设备展示用户代码。用户在浏览器中登录并确认，设备轮询获取授权结果。'
        : 'A CLI or input-constrained device displays a user code. The user signs in and approves in a browser while the device polls for the result.',
      steps: zh
        ? ['展示设备代码', '浏览器确认', '设备获得授权']
        : ['Display user code', 'Approve in browser', 'Authorize device'],
      protocol: 'DEVICE AUTHORIZATION GRANT',
      code: 'POST /device_authorization\nContent-Type: application/x-www-form-urlencoded\n\n  client_id=your_device\n  scope=openid profile\n\n→ device_code\n→ user_code\n→ verification_uri',
    },
  ];
  const faqs = [
    [
      zh ? 'NazoAuth 提供哪些部分？' : 'What does NazoAuth include?',
      zh
        ? 'OAuth / OpenID Connect 授权服务器、账户与登录界面、授权确认和管理后台。NazoAuthCtl 负责部署与运维；Rust 资源服务器验证库用于在 API 侧校验令牌。'
        : 'An OAuth / OpenID Connect server, account and sign-in pages, consent, and administration. NazoAuthCtl handles deployment and operations; the Rust resource-server libraries validate tokens at your APIs.',
    ],
    [
      zh
        ? '可以接入现有的 OAuth / OIDC 客户端吗？'
        : 'Can I use existing OAuth / OIDC clients?',
      zh
        ? '可以通过标准协议接入。先注册客户端，配置回调地址、授权类型和权限范围，再按 Discovery 元数据连接对应端点。授权码流程使用 S256 PKCE。'
        : 'Use standard protocol integration: register a client, configure redirect URIs, grant types, and scopes, then connect using discovery metadata. Authorization Code flows use S256 PKCE.',
    ],
    [
      zh ? '部署需要哪些依赖？' : 'What do I need to deploy?',
      zh
        ? '核心通过接口组合存储实现；当前默认发行版提供 PostgreSQL 与 Valkey 适配器。NazoAuthCtl 支持 Docker、Podman 或主机运行方式；一个部署可配置多个租户域名和 HTTPS 入口。'
        : 'The core composes storage through interfaces; the current default distribution supplies PostgreSQL and Valkey adapters. NazoAuthCtl supports Docker, Podman, or host runtimes, with multiple tenant domains and HTTPS ingress in one deployment.',
    ],
    [
      zh
        ? '在哪里配置应用访问权限？'
        : 'Where do I configure application access?',
      zh
        ? '管理员在客户端配置中管理授权类型、回调地址、权限范围和安全策略，并审核或撤销授权记录。用户可以在账户页面查看已授权应用。'
        : 'Administrators configure grant types, redirect URIs, scopes, and security policies per client, and review or revoke grants. Users can view authorized applications from their account page.',
    ],
  ];
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-content container">
          <p className="hero-badge">
            <span />
            SELF-HOSTED IDENTITY INFRASTRUCTURE
          </p>
          <h1>
            {zh ? (
              <>
                身份认证。
                <br />
                <em>应用授权。</em>
              </>
            ) : (
              <>
                Identity.
                <br />
                <em>In your control.</em>
              </>
            )}
          </h1>
          <p className="hero-description">
            {zh
              ? '以 Rust 构建的 OAuth / OpenID Connect 服务端。账户、Passkey、多因素认证与应用授权，运行在你自己的基础设施上。'
              : 'An OAuth / OpenID Connect server built with Rust. Accounts, passkeys, multi-factor authentication, and application access. On your infrastructure.'}
          </p>
          <div className="hero-actions">
            <Link to="/docs?section=integration" className="btn-primary">
              {zh ? '开始接入' : 'Start building'}
              <ArrowUpRight size={17} />
            </Link>
            <Link to="/docs?section=deploy" className="btn-secondary">
              {zh ? '部署 NazoAuth' : 'Deploy NazoAuth'}
              <ArrowRight size={17} />
            </Link>
          </div>
          <a
            className="hero-source"
            href="https://github.com/nazozero/NazoAuth"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Code2 size={16} />
            {zh ? '开源于 GitHub' : 'Open source on GitHub'}
            <ArrowUpRight size={13} />
          </a>
        </div>
        <div className="hero-caption container">
          <span>NAZOAUTH / {zh ? '向下探索' : 'SCROLL TO EXPLORE'} ↓</span>
          <span>RUST · OAUTH 2.x · OPENID CONNECT</span>
        </div>
      </section>
      <div className="standards-bar">
        <div className="container">
          <span className="standards-label">
            {zh ? '基于开放协议' : 'Built on open standards'}
          </span>
          <span>OAuth 2.x</span>
          <span>OpenID Connect</span>
          <span>WebAuthn</span>
          <span>SCIM</span>
          <span>DPoP / mTLS</span>
          <Link to="/docs?section=standards" className="standards-more"><ArrowUpRight size={16} />{zh ? '完整规范' : 'All standards'}</Link>
        </div>
      </div>

      <section className="home-certification container">
        <div className="certification-title">
          <ShieldCheck size={30} />
          <div><p className="section-label">OPENID CERTIFIED</p><h2>{zh ? '标准，有据可查。' : 'Standards. Independently listed.'}</h2></div>
        </div>
        <p>OpenID Connect · FAPI 2.0 · FAPI-CIBA<br />OpenID4VCI / OpenID4VP + HAIP</p>
        <Link to="/docs?section=certification">{zh ? '查看认证版本与记录' : 'See certified versions and records'}<ArrowUpRight size={16} /></Link>
      </section>

      <section className="home-protocols container">
        <header className="section-heading">
          <div>
            <p className="section-label">PROTOCOLS & CAPABILITIES</p>
            <h2>{zh ? '完整的协议与身份能力。' : 'Comprehensive protocol support.'}</h2>
          </div>
          <p>{zh ? '从应用授权到可验证凭证。选择一项，查看实现范围、配置条件与接入方式。' : 'From application access to verifiable credentials. Explore implementation scope, configuration requirements, and integration details.'}</p>
        </header>
        <div className="protocol-grid">
          {protocols.map(([name, chinese, english, section], index) => (
            <Link to={`/docs?section=${section}`} className="protocol-cell" key={name}>
              <span className="protocol-index">{String(index + 1).padStart(2, '0')}</span>
              <h3>{name}<ArrowUpRight size={15} /></h3>
              <p>{zh ? chinese : english}</p>
            </Link>
          ))}
        </div>
        <p className="protocol-scope">{zh ? '可用能力取决于部署模块与客户端策略；官方认证的版本、配置和范围单独列明。' : 'Availability depends on enabled modules and client policy. Official certification versions, configurations, and scope are listed separately.'} <Link to="/docs?section=certification">{zh ? '认证记录' : 'Certification records'}<ArrowUpRight size={13} /></Link></p>
      </section>

      <IdentityPath />
      <section className="home-features container">
        <header className="section-heading">
          <div>
            <p className="section-label">IDENTITY & ACCESS</p>
            <h2>
              {zh
                ? '从账户登录，到应用授权。'
                : 'From user sign-in to application access.'}
            </h2>
          </div>
          <p>
            {zh
              ? '提供用户需要的登录与账户页面，以及开发者和管理员需要的协议接口与管理工具。'
              : 'Sign-in and account pages for users. Protocol endpoints and management tools for developers and administrators.'}
          </p>
        </header>
        <div className="capability-grid">
          <article className="capability-card capability-auth">
            <div className="capability-copy">
              <span className="capability-number">01 / AUTHENTICATION</span>
              <h3>{zh ? '账户认证' : 'Authenticate users'}</h3>
              <p>
                {zh
                  ? '支持本地账户、WebAuthn / Passkey、TOTP 与备用恢复码。用户通过同一个身份服务登录接入的应用。'
                  : 'Local accounts, WebAuthn / passkeys, TOTP, and backup codes. A shared identity service for your connected applications.'}
              </p>
              <Link to="/security" className="text-arrow">
                {zh ? '查看认证能力' : 'Authentication features'}
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="authentication-art" aria-hidden="true">
              <div className="fingerprint-orbit">
                <Fingerprint size={76} strokeWidth={1.1} />
                <i />
                <i />
              </div>
              <div className="auth-methods">
                <span>
                  <Check size={13} />
                  Passkey
                </span>
                <span>
                  <Check size={13} />
                  TOTP
                </span>
                <span>
                  <Check size={13} />
                  {zh ? '恢复码' : 'Recovery codes'}
                </span>
              </div>
            </div>
          </article>
          <article className="capability-card capability-admin">
            <span className="capability-number">02 / ADMINISTRATION</span>
            <UsersRound size={30} strokeWidth={1.3} />
            <h3>{zh ? '账户与应用管理' : 'Manage accounts and apps'}</h3>
            <p>
              {zh
                ? '集中管理用户、客户端、授权记录与接入申请。管理员可以撤销授权，用户可以查看已授权应用。'
                : 'Manage users, clients, grants, and access requests. Administrators can revoke grants, and users can review authorized applications.'}
            </p>
            <div className="admin-capabilities">
              <span>{zh ? '用户' : 'Users'}</span>
              <span>{zh ? '客户端' : 'Clients'}</span>
              <span>{zh ? '授权记录' : 'Grants'}</span>
            </div>
            <Link to="/docs?section=workbench" className="text-arrow">
              {zh ? '了解管理功能' : 'Explore administration'}
              <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className="capability-card capability-protocol">
            <span className="capability-number">03 / AUTHORIZATION</span>
            <KeyRound size={28} strokeWidth={1.3} />
            <h3>{zh ? '标准协议接入' : 'Integrate with standard protocols'}</h3>
            <p>
              {zh
                ? '提供令牌签发、刷新、撤销、内省和 UserInfo，支持授权码 + PKCE、客户端凭据与设备授权等流程。'
                : 'Token issuance, refresh, revocation, introspection, and UserInfo. Authorization Code + PKCE, Client Credentials, and Device Authorization flows.'}
            </p>
            <Link to="/docs?section=metadata" className="text-arrow">
              {zh ? '查看协议端点' : 'Explore protocol endpoints'}
              <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className="capability-card capability-security">
            <span className="capability-number">04 / CLIENT SECURITY</span>
            <ShieldCheck size={28} strokeWidth={1.3} />
            <h3>
              {zh ? '按客户端配置安全策略' : 'Set security policies per client'}
            </h3>
            <p>
              {zh
                ? '通过 PAR、JAR、JARM 保护授权请求与响应，使用 DPoP 或 mTLS 约束令牌的使用方，并管理签名密钥轮换。'
                : 'Protect authorization requests and responses with PAR, JAR, and JARM. Bind tokens to senders using DPoP or mTLS, and manage signing-key rotation.'}
            </p>
            <Link to="/security" className="text-arrow">
              {zh ? '查看安全机制' : 'Explore security controls'}
              <ArrowUpRight size={16} />
            </Link>
          </article>
        </div>
      </section>

      <section className="integration-band">
        <div className="container">
          <header className="section-heading">
            <div>
              <p className="section-label">USE CASES</p>
              <h2>
                {zh
                  ? '为不同应用，提供合适的授权流程。'
                  : 'The right authorization flow for each application.'}
              </h2>
            </div>
          </header>
          <div
            className="flow-tabs"
            role="tablist"
            aria-label={zh ? '应用场景' : 'Application scenarios'}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (flow + 1) % flows.length
                  : event.key === 'ArrowLeft'
                    ? (flow + flows.length - 1) % flows.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? flows.length - 1
                        : null;
              if (next === null) return;
              event.preventDefault();
              setFlow(next);
              const tabs =
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]'
                );
              tabs[next]?.focus();
            }}
          >
            {flows.map(({ name, icon: Icon }, index) => (
              <button
                key={name}
                role="tab"
                id={`flow-tab-${index}`}
                aria-selected={index === flow}
                aria-controls="flow-example"
                tabIndex={index === flow ? 0 : -1}
                onClick={() => setFlow(index)}
              >
                <Icon size={17} />
                {name}
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
          <div
            className="flow-content"
            id="flow-example"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`flow-tab-${flow}`}
          >
            <div className="integration-copy">
              <span className="flow-protocol">{flows[flow].protocol}</span>
              <h3>{flows[flow].title}</h3>
              <p>{flows[flow].body}</p>
              <ol className="flow-steps">
                {flows[flow].steps.map((step, index) => (
                  <li key={step}>
                    <span>{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <Link
                className="text-arrow"
                to={
                  flow === 0
                    ? '/docs?section=integration'
                    : '/docs?section=flow'
                }
              >
                {zh ? '阅读接入指南' : 'Read the integration guide'}
                <ArrowRight size={17} />
              </Link>
            </div>
            <div className="integration-example">
              <div className="example-header">
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <span>{zh ? '请求示例' : 'REQUEST EXAMPLE'}</span>
                <Code2 size={15} />
              </div>
              <pre>
                <code>{flows[flow].code}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="home-deployment container">
        <div className="deployment-copy">
          <p className="section-label">YOUR INFRASTRUCTURE</p>
          <h2>
            {zh
              ? '部署、数据和密钥，\n由你管理。'
              : 'Your deployment.\nYour data and keys.'}
          </h2>
          <p>
            {zh
              ? '核心通过独立接口连接持久存储与短期状态实现。一个部署可承载多个租户与域名，各自拥有明确的 issuer、账户和安全边界。'
              : 'Independent interfaces connect the core to persistence and transient-state implementations. One deployment can serve multiple tenants and domains, each with its own issuer, accounts, and security boundary.'}
          </p>
          <div className="deployment-runtimes">
            <span>Docker</span>
            <span>Podman</span>
            <span>{zh ? '主机部署' : 'Host runtime'}</span>
          </div>
          <Link to="/docs?section=deploy" className="btn-primary">
            {zh ? '查看部署指南' : 'Deployment guide'}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="deployment-diagram">
          <div className="deployment-origin">
            <Globe2 size={16} />
            <span>auth.team-a.com · auth.team-b.com</span>
            <LockKeyhole size={13} />
          </div>
          <div className="deployment-server">
            <img
              src={publicAsset('icons/android-chrome-192x192.png')}
              width="48"
              height="48"
              alt=""
            />
            <div>
              <strong>NazoAuth</strong>
              <span>RUST · OAUTH · OPENID CONNECT</span>
            </div>
          </div>
          <div className="deployment-connector" aria-hidden="true" />
          <div className="deployment-stores">
            <div>
              <Database size={24} />
              <strong>{zh ? '持久存储' : 'Persistence'}</strong>
              <span>
                {zh
                  ? '账户、客户端与持久数据'
                  : 'Accounts, clients & durable data'}
              </span>
            </div>
            <div>
              <Layers3 size={24} />
              <strong>{zh ? '短期状态' : 'Transient state'}</strong>
              <span>{zh ? '短期协议状态' : 'Short-lived protocol state'}</span>
            </div>
          </div>
        </div>
        <a
          className="project-link"
          href="https://github.com/nazozero/NazoAuthCtl"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Terminal size={25} />
          <div>
            <h3>NazoAuthCtl</h3>
            <p>
              {zh
                ? '安装、更新、备份与恢复的运维工具。'
                : 'Install, update, back up, and recover deployments.'}
            </p>
          </div>
          <ArrowUpRight size={18} />
        </a>
        <a
          className="project-link"
          href="https://github.com/nazozero/NazoAuth/tree/main/crates"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Code2 size={25} />
          <div>
            <h3>
              {zh ? 'Rust 资源服务器验证库' : 'Rust resource-server libraries'}
            </h3>
            <p>
              {zh
                ? '在 API 侧验证令牌，并接入 Actix 服务。'
                : 'Validate tokens in your APIs and integrate with Actix.'}
            </p>
          </div>
          <ArrowUpRight size={18} />
        </a>
      </section>

      <section className="home-faq container">
        <div className="faq-heading">
          <p className="section-label">BEFORE YOU START</p>
          <h2>{zh ? '接入前，你可能想了解。' : 'Before you get started.'}</h2>
          <Link className="text-arrow" to="/docs">
            {zh ? '浏览完整文档' : 'Browse the documentation'}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <ChevronDown size={18} />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="home-final">
        <div>
          <p className="section-label">GET STARTED</p>
          <h2>
            {zh
              ? '把 NazoAuth 接入你的应用。'
              : 'Bring NazoAuth to your applications.'}
          </h2>
          <p>
            {zh
              ? '部署身份服务，注册客户端，开始第一条授权流程。'
              : 'Deploy your identity server, register a client, and start your first authorization flow.'}
          </p>
        </div>
        <div className="hero-actions">
          <Link to="/docs?section=deploy" className="btn-primary">
            {zh ? '开始部署' : 'Start self-hosting'}
            <ArrowUpRight size={17} />
          </Link>
          <Link to="/auth" className="btn-secondary">
            {zh ? '登录账户' : 'Sign in'}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}
