import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Fingerprint, KeyRound, ShieldCheck, AppWindow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

/** A navigable explanation of the existing authorization-code contract. */
export default function IdentityPath() {
  const { locale } = useI18n();
  const zh = locale === 'zh-CN';
  const [selected, setSelected] = useState(0);
  const steps = [
    { icon: AppWindow, name: zh ? '应用发起' : 'Request', title: zh ? '从一次登录请求开始。' : 'Start with a sign-in request.',
      text: zh ? '客户端生成 state、nonce 和 PKCE 参数，将浏览器带到授权端点。回调地址必须与注册信息匹配。' : 'The client creates state, nonce, and PKCE parameters and sends the browser to the authorization endpoint. The redirect URI must match its registration.',
      input: 'client_id · redirect_uri · scope', output: 'state · nonce · code_challenge', boundary: zh ? '应用保管 code_verifier，浏览器只携带 challenge。' : 'The app keeps the code verifier; the browser carries the challenge.', section: 'integration' },
    { icon: Fingerprint, name: zh ? '确认身份' : 'Authenticate', title: zh ? '身份与授权，分别确认。' : 'Confirm identity and access.',
      text: zh ? '用户通过账户、Passkey 或多因素认证确认身份。授权页面展示应用申请的权限，用户据此决定是否继续。' : 'Users authenticate with an account, passkey, or multi-factor authentication. The consent page presents the permissions requested by the application.',
      input: 'account · session · requested scopes', output: 'authenticated subject · consent', boundary: zh ? '认证用户不等于允许应用访问全部资源。' : 'Authenticating a user does not grant an app access to every resource.', section: 'sessions' },
    { icon: KeyRound, name: zh ? '兑换令牌' : 'Exchange', title: zh ? '用授权码兑换所需令牌。' : 'Exchange the authorization code.',
      text: zh ? '应用接收授权码并检查 state，再提交 code_verifier 兑换令牌。OIDC 客户端还需验证 ID Token 的签名、issuer、audience 和 nonce。' : 'The app receives a code, checks state, and submits the code verifier to exchange it for tokens. OIDC clients also validate the ID token signature, issuer, audience, and nonce.',
      input: 'authorization code · code_verifier', output: 'access_token · id_token', boundary: zh ? 'ID Token 描述认证结果；访问 API 使用 Access Token。' : 'ID tokens describe authentication; access tokens authorize API calls.', section: 'flow' },
    { icon: ShieldCheck, name: zh ? '资源校验' : 'Validate', title: zh ? '让每个 API 守住自己的边界。' : 'Validate at the resource boundary.',
      text: zh ? '资源服务器按配置验证令牌与权限。使用 DPoP 或 mTLS 时，还需要校验发送方证明。授权可以被查看和撤销。' : 'Resource servers validate tokens and permissions according to policy. DPoP or mTLS deployments additionally verify the sender proof. Grants can be reviewed and revoked.',
      input: 'access_token · resource · proof', output: 'authorized API request', boundary: zh ? '令牌签名有效，仍需检查目标资源和所需权限。' : 'A valid signature still requires resource and permission checks.', section: 'tokens' },
  ];
  const step = steps[selected];
  return <section className="identity-path container">
    <header className="section-heading"><div><p className="section-label">ONE IDENTITY. EVERY CONNECTION.</p><h2>{zh ? '一次授权，四个明确的边界。' : 'One flow. Four clear boundaries.'}</h2></div><p>{zh ? '沿着一条授权码流程，查看应用、身份服务与 API 分别负责什么。' : 'Follow an authorization-code flow through the app, identity service, and API.'}</p></header>
    <div className="identity-path-steps" aria-label={zh ? '选择流程阶段' : 'Select a flow stage'}>
      {steps.map(({ icon: Icon, name }, index) => <button key={index} aria-pressed={selected === index} aria-controls="identity-path-detail" onClick={() => setSelected(index)}>
        <span className="path-node"><Icon size={23} strokeWidth={1.4} /></span><small>0{index + 1}</small><strong>{name}</strong><ArrowRight className="path-arrow" size={15} />
      </button>)}
    </div>
    <div className="identity-path-detail" id="identity-path-detail" aria-live="polite">
      <div key={selected} className="path-explanation"><p className="section-label">0{selected + 1} / AUTHORIZATION CODE + PKCE</p><h3>{step.title}</h3><p>{step.text}</p><Link className="text-arrow" to={`/docs?section=${step.section}`}>{zh ? '查看对应文档' : 'Read this chapter'}<ArrowUpRight size={15} /></Link></div>
      <div className="path-contract"><span>INPUT</span><code>{step.input}</code><ArrowRight size={19} /><span>OUTPUT</span><code>{step.output}</code><p><Check size={15} />{step.boundary}</p></div>
    </div>
  </section>;
}
