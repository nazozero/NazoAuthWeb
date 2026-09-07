import {
  ArrowUpRight,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  RotateCw,
  FileKey2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import './Security.css';

export default function Security() {
  const { locale } = useI18n();
  const zh = locale === 'zh-CN';
  const items = [
    {
      icon: Fingerprint,
      title: 'Passkey / WebAuthn',
      text: zh
        ? '使用设备上的身份验证器登录，支持 WebAuthn 凭据注册与认证。'
        : 'Register WebAuthn credentials and authenticate with an authenticator on your device.',
    },
    {
      icon: ShieldCheck,
      title: zh ? '多因素认证' : 'Multi-factor authentication',
      text: zh
        ? '支持 TOTP、备用恢复码和已记住的 MFA 验证。'
        : 'Support for TOTP, backup codes, and remembered MFA verification.',
    },
    {
      icon: KeyRound,
      title: 'Authorization Code + PKCE',
      text: zh
        ? '使用 S256 绑定授权请求与授权码兑换，校验注册的回调地址。'
        : 'Bind authorization requests to code exchanges with S256 and validate registered redirect URIs.',
    },
    {
      icon: LockKeyhole,
      title: 'DPoP / mTLS',
      text: zh
        ? '将令牌绑定到客户端密钥或证书，由资源服务器校验对应的持有证明。'
        : 'Bind tokens to a client key or certificate. Resource servers validate the corresponding proof of possession.',
    },
    {
      icon: FileKey2,
      title: 'PAR / JAR / JARM',
      text: zh
        ? '支持推送授权请求、签名请求对象和 JWT 授权响应，并按客户端策略配置。'
        : 'Support for pushed authorization requests, signed request objects, and JWT authorization responses, configured through client policies.',
    },
    {
      icon: RotateCw,
      title: zh ? '签名密钥轮换' : 'Signing key rotation',
      text: zh
        ? '覆盖预发布、启用、宽限和退役阶段；可通过外部签名命令集成 KMS / HSM。'
        : 'Prepublish, activate, retain for a grace period, and retire keys. Integrate KMS / HSM through external signing commands.',
    },
  ];
  return (
    <div className="security-page container">
      <header className="security-hero">
        <div>
          <p className="eyebrow">SECURITY</p>
          <h1>
            {zh ? (
              <>
                账户认证与
                <br />
                令牌保护
              </>
            ) : (
              <>
                Authentication &<br />
                token protection
              </>
            )}
          </h1>
          <p className="security-lead">
            {zh
              ? '从 Passkey 到发送方约束令牌，NazoAuth 提供账户登录、授权请求和 API 访问所需的安全机制。'
              : 'From passkeys to sender-constrained tokens, NazoAuth provides controls for account sign-in, authorization requests, and API access.'}
          </p>
          <Link to="/docs" className="btn-primary">
            {zh ? '查看协议文档' : 'Protocol documentation'}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div
          className="security-diagram"
          aria-label={zh ? '支持的安全机制' : 'Supported security mechanisms'}
        >
          <span className="security-diagram-label">NAZOAUTH / SECURITY</span>
          <div>
            <Fingerprint size={24} />
            <span>
              AUTHENTICATION<strong>Passkey · MFA</strong>
            </span>
            <b>01</b>
          </div>
          <div>
            <KeyRound size={24} />
            <span>
              AUTHORIZATION<strong>PKCE · PAR · JAR</strong>
            </span>
            <b>02</b>
          </div>
          <div>
            <ShieldCheck size={24} />
            <span>
              API ACCESS<strong>DPoP · mTLS</strong>
            </span>
            <b>03</b>
          </div>
        </div>
      </header>
      <section
        className="security-grid"
        aria-label={zh ? '安全功能' : 'Security features'}
      >
        {items.map(({ icon: Icon, title, text }) => (
          <article className="security-card" key={title}>
            <Icon size={24} strokeWidth={1.5} />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <section className="key-lifecycle">
        <header><p className="eyebrow">KEY LIFECYCLE</p><h2>{zh ? '密钥轮换，是一段完整的生命周期。' : 'Key rotation is a complete lifecycle.'}</h2><p>{zh ? '展开各阶段，了解签名方与验证方如何完成交接。' : 'Explore how signing and verification move from one key to the next.'}</p></header>
        <div className="key-lifecycle-stages">
          {[
            [zh ? '预发布' : 'Prepublish', '01 / PUBLISH', zh ? '先公开新公钥，使验证方能够发现后续使用的密钥。' : 'Publish the new public key so verifiers can discover it before use.'],
            [zh ? '启用' : 'Activate', '02 / SIGN', zh ? '新令牌使用新密钥签名；验证方根据 kid 选择对应公钥。' : 'Sign new tokens with the new key. Verifiers select its public key by kid.'],
            [zh ? '宽限' : 'Grace period', '03 / VERIFY', zh ? '保留旧公钥供仍在有效期内的旧令牌校验，具体时长由部署策略决定。' : 'Keep the previous public key available for tokens still within their lifetime. Deployment policy determines the duration.'],
            [zh ? '退役' : 'Retire', '04 / RETIRE', zh ? '宽限结束后退役旧密钥。资源服务器仍需正确处理密钥缓存与刷新。' : 'Retire the old key after the grace period. Resource servers still need correct key-cache refresh behavior.'],
          ].map(([title, label, text]) => <details key={label}><summary><span>{label}</span><strong>{title}</strong><span className="key-expand">+</span></summary><p>{text}</p></details>)}
        </div>
        <Link className="text-arrow" to="/docs?section=keys">{zh ? '密钥管理与外部签名' : 'Key management & external signing'}<ArrowUpRight size={16} /></Link>
      </section>
      <section className="security-policy">
        <div>
          <p className="eyebrow">CLIENT POLICY</p>
          <h2>
            {zh ? '按客户端配置安全策略' : 'Configure security per client'}
          </h2>
          <p>
            {zh
              ? '授权类型、回调地址、权限范围和发送方约束由客户端配置决定。Discovery 元数据列出当前实例支持的协议能力。'
              : 'Client configuration controls grant types, redirect URIs, scopes, and sender constraints. Discovery metadata lists the capabilities supported by the current instance.'}
          </p>
        </div>
        <Link to="/docs" className="text-arrow">
          {zh ? '客户端接入' : 'Client integration'}
          <ArrowUpRight size={17} />
        </Link>
      </section>
    </div>
  );
}
