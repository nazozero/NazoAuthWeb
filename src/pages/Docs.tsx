import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  KeyRound,
  Network,
  Play,
  ShieldCheck,
  TerminalSquare,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useI18n, type MessageKey } from '../i18n';
import { API_BASE_URL, ApiError, apiFetch } from '../lib/api';
import { contentSwitchVariants, pageVariants } from '../lib/motion';
import './Docs.css';

const sectionGroups = [
  {
    labelKey: 'docs.group.start',
    items: [
      { id: 'overview', labelKey: 'docs.section.overview', icon: BookOpen },
      { id: 'integration', labelKey: 'docs.section.integration', icon: TerminalSquare },
    ],
  },
  {
    labelKey: 'docs.group.protocol',
    items: [
      { id: 'flow', labelKey: 'docs.section.flow', icon: KeyRound },
      { id: 'metadata', labelKey: 'docs.section.metadata', icon: Network },
      { id: 'security', labelKey: 'docs.section.security', icon: ShieldCheck },
    ],
  },
  {
    labelKey: 'docs.group.operations',
    items: [
      { id: 'workbench', labelKey: 'docs.section.workbench', icon: UsersRound },
      { id: 'interface-lab', labelKey: 'docs.section.interfaceLab', icon: ClipboardCheck },
      { id: 'deploy', labelKey: 'docs.section.deploy', icon: Wrench },
    ],
  },
] as const;

type SectionId =
  | 'overview'
  | 'integration'
  | 'flow'
  | 'metadata'
  | 'security'
  | 'workbench'
  | 'interface-lab'
  | 'deploy';
type CheckStatus = 'idle' | 'running' | 'ok' | 'error' | 'blocked';
type CheckResult = {
  status: CheckStatus;
  message: string;
};
type CheckKey =
  | 'health'
  | 'discovery'
  | 'oauthMetadata'
  | 'jwks'
  | 'captcha'
  | 'csrf'
  | 'me'
  | 'applications'
  | 'accessRequests'
  | 'adminUsers'
  | 'adminClients'
  | 'adminGrants'
  | 'adminAccessRequests'
  | 'scimConfig'
  | 'scimSchemas'
  | 'scimResourceTypes';

type BrowserCheck = {
  key: CheckKey;
  name: string;
  method: 'GET';
  path: string;
  group: 'Public API' | 'Authenticated API' | 'Admin API' | 'SCIM metadata';
  auth?: 'user' | 'admin';
  mode: 'fetch' | 'api';
};

type LocalizedPair = {
  en: [string, string];
  zh: [string, string];
};

type LocalizedStep = {
  number: string;
  en: [string, string];
  zh: [string, string];
};

const discoveryUrl = `${API_BASE_URL}/.well-known/openid-configuration`;
const authorizeExample =
  `${API_BASE_URL}/authorize?response_type=code&client_id=your_client_id` +
  '&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback&scope=openid%20profile' +
  '&state=random_state&nonce=random_nonce&code_challenge=base64url_sha256' +
  '&code_challenge_method=S256';
const tokenExample = `POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=returned_code&
redirect_uri=https://example.com/callback&
client_id=your_client_id&
code_verifier=original_pkce_verifier`;

const integrationClientChecklist: LocalizedPair[] = [
  {
    en: ['Client type', 'Use public for browser, mobile, and desktop apps. Use confidential only from a backend that can keep a secret.'],
    zh: ['客户端类型', '浏览器、移动端和桌面应用使用 public。只有能安全保存密钥的后端才使用 confidential。'],
  },
  {
    en: ['Redirect URI', 'Register the exact callback URL. Scheme, host, path, and port must match. Wildcards are not accepted.'],
    zh: ['Redirect URI', '注册精确回调地址。scheme、host、path 和 port 必须完全匹配，不接受通配符。'],
  },
  {
    en: ['Scopes', 'Start with openid profile email. Add offline_access only if refresh tokens are needed.'],
    zh: ['Scopes', '从 openid profile email 开始。只有需要 refresh token 时才添加 offline_access。'],
  },
  {
    en: ['PKCE', 'Send code_challenge_method=S256 and keep the original code_verifier until the callback returns.'],
    zh: ['PKCE', '发送 code_challenge_method=S256，并保存原始 code_verifier 直到回调返回。'],
  },
  {
    en: ['Logout', 'Register post_logout_redirect_uris before sending users through RP-Initiated Logout.'],
    zh: ['Logout', '使用 RP-Initiated Logout 前，先注册 post_logout_redirect_uris。'],
  },
];

const pkceExample = `// Generate these per authorization request.
const codeVerifier = randomBase64Url(32);
const codeChallenge = base64UrlSha256(codeVerifier);
const state = randomBase64Url(16);
const nonce = randomBase64Url(16);`;

const tokenExchangeExample = `POST ${API_BASE_URL}/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
client_id=your_client_id&
code=returned_code&
redirect_uri=https://app.example.com/oauth/callback&
code_verifier=original_pkce_verifier`;

const userInfoExample = `GET ${API_BASE_URL}/userinfo
Authorization: Bearer access_token`;

const logoutExample =
  `${API_BASE_URL}/logout?id_token_hint=last_id_token` +
  '&post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fsigned-out' +
  '&state=random_logout_state';

const integrationSteps: LocalizedStep[] = [
  {
    number: '1',
    en: ['Read discovery', 'Load OIDC metadata from discovery and use the advertised endpoints, JWKS URI, scopes, signing algorithms, and PKCE methods.'],
    zh: ['读取 discovery', '从 discovery 加载 OIDC 元数据，并使用其中声明的端点、JWKS URI、scope、签名算法和 PKCE 方法。'],
  },
  {
    number: '2',
    en: ['Register a client', 'Create or request a client with exact redirect URIs, allowed scopes, allowed audiences, and an auth method matching the application type.'],
    zh: ['注册客户端', '创建或申请客户端，配置精确 redirect URI、允许的 scope、允许的 audience，以及匹配应用类型的认证方式。'],
  },
  {
    number: '3',
    en: ['Start authorization', 'Generate state, nonce, and PKCE values, then redirect the browser to /authorize with response_type=code.'],
    zh: ['发起授权', '生成 state、nonce 和 PKCE 参数，然后携带 response_type=code 将浏览器跳转到 /authorize。'],
  },
  {
    number: '4',
    en: ['Exchange the code', 'On the callback, validate state, then exchange code plus code_verifier at /token. Keep client secrets on the backend only.'],
    zh: ['交换授权码', '回调时先校验 state，再在 /token 使用 code 和 code_verifier 交换 token。client secret 只能保存在后端。'],
  },
  {
    number: '5',
    en: ['Validate tokens before use', 'Validate the ID Token for sign-in, call /userinfo when claims are needed, and verify JWT access tokens before resource access.'],
    zh: ['使用前校验 token', '用 ID Token 完成登录校验；需要声明时调用 /userinfo；资源访问前校验 JWT access token。'],
  },
];

const integrationPitfalls: LocalizedPair[] = [
  {
    en: ['Do not call /auth/csrf for OAuth login', 'OAuth clients should use /authorize. The /auth/* endpoints are NazoAuth Web account APIs.'],
    zh: ['不要为 OAuth 登录调用 /auth/csrf', 'OAuth 客户端应该使用 /authorize。/auth/* 是 NazoAuth Web 的账号 API。'],
  },
  {
    en: ['Do not store client_secret in browser code', 'Single-page apps must be public clients with PKCE. Confidential clients exchange codes from a backend.'],
    zh: ['不要在浏览器代码中保存 client_secret', '单页应用必须是带 PKCE 的 public client。confidential client 应从后端交换授权码。'],
  },
  {
    en: ['Do not hardcode JWKS keys', 'Read jwks_uri from discovery and refresh keys when kid changes.'],
    zh: ['不要硬编码 JWKS 密钥', '从 discovery 读取 jwks_uri，并在 kid 变化时刷新密钥。'],
  },
  {
    en: ['Do not skip state or nonce', 'state protects the redirect response; nonce binds the ID Token to the browser request.'],
    zh: ['不要省略 state 或 nonce', 'state 保护重定向响应；nonce 将 ID Token 绑定到浏览器请求。'],
  },
];

const endpointGroups: LocalizedPair[] = [
  { en: ['/.well-known/openid-configuration', 'OIDC discovery metadata. Clients read issuer, endpoints, algorithms, and scopes here.'], zh: ['/.well-known/openid-configuration', 'OIDC discovery 元数据。客户端从这里读取 issuer、端点、算法和 scope。'] },
  { en: ['/.well-known/oauth-authorization-server', 'OAuth authorization server metadata for resource servers and test tools.'], zh: ['/.well-known/oauth-authorization-server', '面向资源服务器和测试工具的 OAuth 授权服务器元数据。'] },
  { en: ['/authorize', 'Browser authorization entry. External apps send users here to sign in and approve consent.'], zh: ['/authorize', '浏览器授权入口。外部应用将用户送到这里登录并批准授权。'] },
  { en: ['/authorize/consent', 'Consent view data endpoint used by the frontend consent page.'], zh: ['/authorize/consent', '前端授权同意页使用的数据端点。'] },
  { en: ['/authorize/decision', 'Approve or deny an authorization request. Only the signed-in user can submit it.'], zh: ['/authorize/decision', '批准或拒绝授权请求。只有已登录用户可以提交。'] },
  { en: ['/par', 'Pushed Authorization Request. High-security profiles submit this from the client backend.'], zh: ['/par', 'Pushed Authorization Request。高安全 profile 应从客户端后端提交。'] },
  { en: ['/token', 'Token endpoint for authorization code, refresh token, and client credentials exchange.'], zh: ['/token', '用于 authorization code、refresh token 和 client credentials 交换的 Token 端点。'] },
  { en: ['/userinfo', 'Reads user claims with an access token.'], zh: ['/userinfo', '使用 access token 读取用户声明。'] },
  { en: ['/jwks.json', 'Public key set for JWT verification by clients and resource servers.'], zh: ['/jwks.json', '客户端和资源服务器用于校验 JWT 的公开密钥集。'] },
  { en: ['/introspect', 'Token introspection endpoint for authenticated resource servers.'], zh: ['/introspect', '供已认证资源服务器使用的 token introspection 端点。'] },
  { en: ['/revoke', 'Token revocation endpoint for refresh tokens and related grants.'], zh: ['/revoke', '用于 refresh token 和相关授权的撤销端点。'] },
  { en: ['/fapi/resource', 'FAPI resource endpoint used to verify bearer, DPoP, and mTLS boundaries.'], zh: ['/fapi/resource', '用于验证 bearer、DPoP 和 mTLS 边界的 FAPI 资源端点。'] },
  { en: ['/logout', 'OIDC RP-Initiated Logout entry.'], zh: ['/logout', 'OIDC RP-Initiated Logout 入口。'] },
  { en: ['/auth/*', 'Sign-in, registration, verification codes, CSRF, passkeys, MFA, profile, and access requests.'], zh: ['/auth/*', '登录、注册、验证码、CSRF、passkey、MFA、个人资料和接入申请。'] },
  { en: ['/admin/*', 'Users, clients, grants, and access reviews. Admin only.'], zh: ['/admin/*', '用户、客户端、授权记录和访问审核。仅管理员可用。'] },
  { en: ['/scim/v2/*', 'SCIM configuration, schemas, resource types, and user sync endpoints.'], zh: ['/scim/v2/*', 'SCIM 配置、schema、resource type 和用户同步端点。'] },
];

const featureMatrix: LocalizedPair[] = [
  { en: ['Account pages', 'Sign-in, registration, verification codes, session checks, sign-out, avatar, and profile editing.'], zh: ['账号页面', '登录、注册、验证码、会话检查、退出、头像和个人资料编辑。'] },
  { en: ['Consent review', 'Shows client name, redirect URI, requested scopes, and approval or denial.'], zh: ['授权同意审核', '展示客户端名称、redirect URI、请求的 scope，并允许批准或拒绝。'] },
  { en: ['Profile', 'Review authorized apps, submit OAuth client requests, and read one-time credentials.'], zh: ['个人资料', '查看已授权应用、提交 OAuth 客户端申请，并读取一次性凭据。'] },
  { en: ['Admin console', 'Manage users, clients, grants, and access requests.'], zh: ['管理后台', '管理用户、客户端、授权记录和接入申请。'] },
  { en: ['Protocol endpoints', 'Discovery, Authorization, Token, UserInfo, JWKS, PAR, Introspection, and Revocation.'], zh: ['协议端点', 'Discovery、Authorization、Token、UserInfo、JWKS、PAR、Introspection 和 Revocation。'] },
  { en: ['Security controls', 'PKCE S256, CSRF, Turnstile, exact redirect URI matching, audience binding, and sender-constrained metadata.'], zh: ['安全控制', 'PKCE S256、CSRF、Turnstile、精确 redirect URI 匹配、audience 绑定和 sender-constrained 元数据。'] },
  { en: ['Directory sync', 'SCIM metadata and user sync APIs for enterprise directories.'], zh: ['目录同步', '面向企业目录的 SCIM 元数据和用户同步 API。'] },
  { en: ['Test model', 'The frontend can check browser-safe interfaces. OIDF submission should run through backend job APIs.'], zh: ['测试模型', '前端可以检查浏览器安全接口。OIDF 提交应通过后端任务 API 运行。'] },
];

const browserChecks: BrowserCheck[] = [
  { key: 'health', name: 'Health check', method: 'GET', path: '/health', group: 'Public API', mode: 'fetch' },
  { key: 'discovery', name: 'OIDC discovery', method: 'GET', path: '/.well-known/openid-configuration', group: 'Public API', mode: 'fetch' },
  { key: 'oauthMetadata', name: 'OAuth AS metadata', method: 'GET', path: '/.well-known/oauth-authorization-server', group: 'Public API', mode: 'fetch' },
  { key: 'jwks', name: 'JWKS keys', method: 'GET', path: '/jwks.json', group: 'Public API', mode: 'fetch' },
  { key: 'captcha', name: 'Captcha config', method: 'GET', path: '/auth/captcha-config', group: 'Public API', mode: 'api' },
  { key: 'csrf', name: 'CSRF token', method: 'GET', path: '/auth/csrf', group: 'Public API', mode: 'api' },
  { key: 'scimConfig', name: 'SCIM ServiceProviderConfig', method: 'GET', path: '/scim/v2/ServiceProviderConfig', group: 'SCIM metadata', mode: 'fetch' },
  { key: 'scimSchemas', name: 'SCIM Schemas', method: 'GET', path: '/scim/v2/Schemas', group: 'SCIM metadata', mode: 'fetch' },
  { key: 'scimResourceTypes', name: 'SCIM ResourceTypes', method: 'GET', path: '/scim/v2/ResourceTypes', group: 'SCIM metadata', mode: 'fetch' },
  { key: 'me', name: 'Current user', method: 'GET', path: '/auth/me', group: 'Authenticated API', auth: 'user', mode: 'api' },
  { key: 'applications', name: 'Authorized apps', method: 'GET', path: '/auth/me/applications', group: 'Authenticated API', auth: 'user', mode: 'api' },
  { key: 'accessRequests', name: 'My access requests', method: 'GET', path: '/auth/me/access-requests', group: 'Authenticated API', auth: 'user', mode: 'api' },
  { key: 'adminUsers', name: 'User list', method: 'GET', path: '/admin/users?page=1&page_size=1', group: 'Admin API', auth: 'admin', mode: 'api' },
  { key: 'adminClients', name: 'Client list', method: 'GET', path: '/admin/clients?page=1&page_size=1', group: 'Admin API', auth: 'admin', mode: 'api' },
  { key: 'adminGrants', name: 'Grant records', method: 'GET', path: '/admin/grants?page=1&page_size=1', group: 'Admin API', auth: 'admin', mode: 'api' },
  { key: 'adminAccessRequests', name: 'Access request list', method: 'GET', path: '/admin/access-requests?page=1&page_size=1', group: 'Admin API', auth: 'admin', mode: 'api' },
];

const serverSideOnly: LocalizedPair[] = [
  { en: ['/token', 'Requires client authentication, an authorization code, or a refresh token. Never put client secrets in the browser.'], zh: ['/token', '需要客户端认证、授权码或 refresh token。永远不要把 client secret 放进浏览器。'] },
  { en: ['/par', 'Requires client authentication. FAPI profiles should call this from a client backend or test job.'], zh: ['/par', '需要客户端认证。FAPI profile 应从客户端后端或测试任务调用。'] },
  { en: ['/introspect', 'Resource-server endpoint requiring client authentication and the token to inspect.'], zh: ['/introspect', '资源服务器端点，需要客户端认证和待检查 token。'] },
  { en: ['/revoke', 'Requires client authentication and the token to revoke.'], zh: ['/revoke', '需要客户端认证和待撤销 token。'] },
  { en: ['/userinfo', 'Requires an access token. Browser pages should not ask users to paste production tokens.'], zh: ['/userinfo', '需要 access token。浏览器页面不应要求用户粘贴生产 token。'] },
  { en: ['/fapi/resource', 'Used for resource-server boundary tests. DPoP and mTLS proofs should be generated by dedicated test jobs.'], zh: ['/fapi/resource', '用于资源服务器边界测试。DPoP 和 mTLS 证明应由专门测试任务生成。'] },
];

const oidfSteps = {
  en: [
    'The frontend calls backend test-job APIs, displays run status, and downloads logs.',
    'Backend job APIs store test parameters, call the OIDF suite, poll results, and write audit records.',
    'The browser does not store client secrets, private keys, OIDF accounts, or runner tokens.',
    'Recommended backend endpoints: /admin/oidf/runs, /admin/oidf/runs/{id}, and /admin/oidf/runs/{id}/logs.',
  ],
  zh: [
    '前端调用后端测试任务 API、展示运行状态并下载日志。',
    '后端任务 API 保存测试参数、调用 OIDF suite、轮询结果并写入审计记录。',
    '浏览器不保存 client secret、私钥、OIDF 账号或 runner token。',
    '建议的后端端点：/admin/oidf/runs、/admin/oidf/runs/{id} 和 /admin/oidf/runs/{id}/logs。',
  ],
};

const workbenchLists = {
  profile: {
    en: [
      'Edit display name and avatar.',
      'Review previously authorized apps.',
      'Submit OAuth client access requests.',
      'Read one-time client credential delivery links.',
    ],
    zh: [
      '编辑显示名称和头像。',
      '查看已授权应用。',
      '提交 OAuth 客户端接入申请。',
      '读取一次性客户端凭据交付链接。',
    ],
  },
  admin: {
    en: [
      'Search, disable, enable, and promote users.',
      'Create, edit, and disable clients.',
      'Review and revoke grants.',
      'Approve or reject client access requests.',
    ],
    zh: [
      '搜索、禁用、启用和提升用户。',
      '创建、编辑和禁用客户端。',
      '审核并撤销授权记录。',
      '批准或拒绝客户端接入申请。',
    ],
  },
};

const deployItems = {
  en: [
    'Static file directory: /usr/local/angie/html/auth/ui',
    'Frontend routes: /ui/, /ui/auth, /ui/security, /ui/docs, /ui/profile, /ui/admin',
    'API routes: /auth/*, /admin/*, /authorize, /token, /.well-known/*',
    'Verification command: VITE_BASE_PATH=/ui/ VITE_API_BASE_URL=https://auth.nazo.run npm run build',
  ],
  zh: [
    '静态文件目录：/usr/local/angie/html/auth/ui',
    '前端路由：/ui/、/ui/auth、/ui/security、/ui/docs、/ui/profile、/ui/admin',
    'API 路由：/auth/*、/admin/*、/authorize、/token、/.well-known/*',
    '验证命令：VITE_BASE_PATH=/ui/ VITE_API_BASE_URL=https://auth.nazo.run npm run build',
  ],
};

const checkNames: Record<CheckKey, { en: string; zh: string }> = {
  health: { en: 'Health check', zh: '健康检查' },
  discovery: { en: 'OIDC discovery', zh: 'OIDC discovery' },
  oauthMetadata: { en: 'OAuth AS metadata', zh: 'OAuth AS 元数据' },
  jwks: { en: 'JWKS keys', zh: 'JWKS 密钥' },
  captcha: { en: 'Captcha config', zh: '验证码配置' },
  csrf: { en: 'CSRF token', zh: 'CSRF token' },
  me: { en: 'Current user', zh: '当前用户' },
  applications: { en: 'Authorized apps', zh: '已授权应用' },
  accessRequests: { en: 'My access requests', zh: '我的接入申请' },
  adminUsers: { en: 'User list', zh: '用户列表' },
  adminClients: { en: 'Client list', zh: '客户端列表' },
  adminGrants: { en: 'Grant records', zh: '授权记录' },
  adminAccessRequests: { en: 'Access request list', zh: '接入申请列表' },
  scimConfig: { en: 'SCIM ServiceProviderConfig', zh: 'SCIM ServiceProviderConfig' },
  scimSchemas: { en: 'SCIM Schemas', zh: 'SCIM Schemas' },
  scimResourceTypes: { en: 'SCIM ResourceTypes', zh: 'SCIM ResourceTypes' },
};

const checkGroupKeys: Record<BrowserCheck['group'], MessageKey> = {
  'Public API': 'docs.group.public',
  'Authenticated API': 'docs.group.authenticated',
  'Admin API': 'docs.group.admin',
  'SCIM metadata': 'docs.group.scim',
};

function pickLocalized(pair: LocalizedPair, zh: boolean): [string, string] {
  return zh ? pair.zh : pair.en;
}

function pickLocalizedStep(step: LocalizedStep, zh: boolean): [string, string] {
  return zh ? step.zh : step.en;
}

function summarizePayload(value: unknown, fallback: string): string {
  if (!value || typeof value !== 'object') {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.issuer === 'string') {
    return `issuer: ${record.issuer}`;
  }
  if (Array.isArray(record.keys)) {
    return `keys: ${record.keys.length}`;
  }
  if (typeof record.total === 'number') {
    return `total: ${record.total}`;
  }
  if (typeof record.email === 'string') {
    return `user: ${record.email}`;
  }
  if (typeof record.csrf_token === 'string') {
    return 'CSRF token refreshed.';
  }
  if (typeof record.turnstile_enabled === 'boolean') {
    return `turnstile: ${record.turnstile_enabled ? 'enabled' : 'disabled'}`;
  }
  if (Array.isArray(record.Resources)) {
    return `resources: ${record.Resources.length}`;
  }
  return fallback;
}

function resolveCheckError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }
  return 'Request failed.';
}

function statusText(result: CheckResult | undefined, t: (key: MessageKey) => string): string {
  if (!result || result.status === 'idle') {
    return t('common.notChecked');
  }
  if (result.status === 'running') {
    return t('common.checking');
  }
  if (result.status === 'ok') {
    return t('common.healthy');
  }
  if (result.status === 'blocked') {
    return t('common.permissionRequired');
  }
  return t('common.failed');
}

export default function Docs() {
  const { user } = useAuth();
  const { locale, t } = useI18n();
  const [activeTab, setActiveTab] = useState<SectionId>('overview');
  const [copied, setCopied] = useState('');
  const [checkResults, setCheckResults] = useState<Partial<Record<CheckKey, CheckResult>>>({});
  const [runningAll, setRunningAll] = useState(false);
  const canAccessAdmin = user?.role === 'admin' && user.admin_level >= 1;
  const zh = locale === 'zh-CN';

  const groupedChecks = useMemo(() => {
    return browserChecks.reduce<Record<BrowserCheck['group'], BrowserCheck[]>>(
      (groups, item) => {
        groups[item.group].push(item);
        return groups;
      },
      {
        'Public API': [],
        'Authenticated API': [],
        'Admin API': [],
        'SCIM metadata': [],
      }
    );
  }, []);

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1200);
    } catch {
      setCopied('');
    }
  };

  const runCheck = async (check: BrowserCheck) => {
    if (check.auth === 'user' && !user) {
      setCheckResults((prev) => ({
        ...prev,
        [check.key]: { status: 'blocked', message: t('docs.check.blockUser') },
      }));
      return;
    }
    if (check.auth === 'admin' && !canAccessAdmin) {
      setCheckResults((prev) => ({
        ...prev,
        [check.key]: { status: 'blocked', message: t('docs.check.blockAdmin') },
      }));
      return;
    }

    setCheckResults((prev) => ({
      ...prev,
      [check.key]: { status: 'running', message: t('common.requesting') },
    }));

    try {
      const payload =
        check.mode === 'api'
          ? await apiFetch<unknown>(check.path)
          : await fetch(`${API_BASE_URL}${check.path}`, {
              method: check.method,
              credentials: 'omit',
            }).then(async (response) => {
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              const contentType = response.headers.get('content-type') ?? '';
              if (contentType.includes('application/json')) {
                return response.json() as Promise<unknown>;
              }
              return response.text();
            });
      setCheckResults((prev) => ({
        ...prev,
        [check.key]: {
          status: 'ok',
          message: summarizePayload(payload, t('common.interfaceResponded')),
        },
      }));
    } catch (error) {
      setCheckResults((prev) => ({
        ...prev,
        [check.key]: { status: 'error', message: resolveCheckError(error) },
      }));
    }
  };

  const runVisibleChecks = async () => {
    setRunningAll(true);
    try {
      for (const check of browserChecks) {
        await runCheck(check);
      }
    } finally {
      setRunningAll(false);
    }
  };

  const openAuthorizeExample = () => {
    window.open(authorizeExample, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      className="page-transition-wrap docs-page container future-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="docs-layout docs-layout-tiered">
        <aside className="docs-sidebar" aria-label={t('docs.title')}>
          <div className="sidebar-sticky">
            <h2 className="sidebar-title">{t('docs.title')}</h2>
            <nav className="sidebar-nav">
              {sectionGroups.map((group) => (
                <div className="sidebar-group" key={group.labelKey}>
                  <p className="sidebar-group-title">{t(group.labelKey)}</p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        layout
                        key={item.id}
                        type="button"
                        className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(item.id)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={16} />
                        <span>{t(item.labelKey)}</span>
                        <ChevronRight size={14} className="chevron" />
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <main className="docs-content docs-content-spacious">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              className="docs-content-switch"
              variants={contentSwitchVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
            >
          {activeTab === 'overview' && (
            <section className="docs-section docs-chapter">
              <div className="docs-header docs-chapter-hero">
                <span className="docs-eyebrow">{t('docs.overview.eyebrow')}</span>
                <h1>{t('docs.overview.title')}</h1>
                <p>{t('docs.overview.body')}</p>
              </div>
              <div className="matrix-table docs-matrix relaxed">
                {featureMatrix.map((item) => {
                  const [name, value] = pickLocalized(item, zh);
                  return (
                    <div className="matrix-row" key={name}>
                      <strong>{name}</strong>
                      <span>{value}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === 'integration' && (
            <section className="docs-section docs-chapter">
              <div className="docs-header docs-chapter-hero">
                <span className="docs-eyebrow">{t('docs.integration.eyebrow')}</span>
                <h1>{t('docs.integration.title')}</h1>
                <p>{t('docs.integration.body')}</p>
              </div>

              <div className="integration-steps integration-steps-spacious">
                {integrationSteps.map((step) => {
                  const [title, body] = pickLocalizedStep(step, zh);
                  return (
                    <article className="integration-step" key={step.number}>
                      <span>{step.number}</span>
                      <div>
                        <h2>{title}</h2>
                        <p>{body}</p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <section className="docs-subsection">
                <h2>{t('docs.integration.checklist')}</h2>
                <div className="matrix-table compact docs-matrix">
                  {integrationClientChecklist.map((item) => {
                    const [name, value] = pickLocalized(item, zh);
                    return (
                      <div className="matrix-row" key={name}>
                        <strong>{name}</strong>
                        <span>{value}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="docs-subsection docs-code-sequence">
                <div className="docs-two-col docs-code-grid">
                  <div className="code-block-wrapper">
                    <div className="code-header">
                      <span>1. {t('docs.integration.discovery')}</span>
                      <button
                        className="copy-btn"
                        title={t('common.copy')}
                        type="button"
                        onClick={() => void copyText('integration-discovery', discoveryUrl)}
                      >
                        {copied === 'integration-discovery' ? t('common.copied') : <Copy size={14} />}
                      </button>
                    </div>
                    <pre><code>GET {discoveryUrl}</code></pre>
                  </div>

                  <div className="code-block-wrapper">
                    <div className="code-header">
                      <span>2. {t('docs.integration.pkce')}</span>
                      <button
                        className="copy-btn"
                        title={t('common.copy')}
                        type="button"
                        onClick={() => void copyText('pkce', pkceExample)}
                      >
                        {copied === 'pkce' ? t('common.copied') : <Copy size={14} />}
                      </button>
                    </div>
                    <pre><code>{pkceExample}</code></pre>
                  </div>
                </div>

                <div className="code-block-wrapper">
                  <div className="code-header">
                    <span>3. {t('docs.integration.authorize')}</span>
                    <button
                      className="copy-btn"
                      title={t('common.copy')}
                      type="button"
                      onClick={() => void copyText('integration-authorize', authorizeExample)}
                    >
                      {copied === 'integration-authorize' ? t('common.copied') : <Copy size={14} />}
                    </button>
                  </div>
                  <pre><code>{authorizeExample}</code></pre>
                </div>

                <div className="code-block-wrapper">
                  <div className="code-header">
                    <span>4. {t('docs.integration.token')}</span>
                    <button
                      className="copy-btn"
                      title={t('common.copy')}
                      type="button"
                      onClick={() => void copyText('integration-token', tokenExchangeExample)}
                    >
                      {copied === 'integration-token' ? t('common.copied') : <Copy size={14} />}
                    </button>
                  </div>
                  <pre><code>{tokenExchangeExample}</code></pre>
                </div>

                <div className="docs-two-col docs-code-grid">
                  <div className="code-block-wrapper">
                    <div className="code-header">
                      <span>5. {t('docs.integration.userinfo')}</span>
                      <button
                        className="copy-btn"
                        title={t('common.copy')}
                        type="button"
                        onClick={() => void copyText('userinfo', userInfoExample)}
                      >
                        {copied === 'userinfo' ? t('common.copied') : <Copy size={14} />}
                      </button>
                    </div>
                    <pre><code>{userInfoExample}</code></pre>
                  </div>

                  <div className="code-block-wrapper">
                    <div className="code-header">
                      <span>6. {t('docs.integration.logout')}</span>
                      <button
                        className="copy-btn"
                        title={t('common.copy')}
                        type="button"
                        onClick={() => void copyText('logout', logoutExample)}
                      >
                        {copied === 'logout' ? t('common.copied') : <Copy size={14} />}
                      </button>
                    </div>
                    <pre><code>{logoutExample}</code></pre>
                  </div>
                </div>
              </section>

              <section className="docs-callout">
                <h2>{t('docs.integration.resource')}</h2>
                <p>{t('docs.integration.resourceBody')}</p>
              </section>

              <div className="integration-pitfalls docs-pitfalls">
                {integrationPitfalls.map((item) => {
                  const [title, body] = pickLocalized(item, zh);
                  return (
                    <article className="endpoint-doc-card" key={title}>
                      <h2>{title}</h2>
                      <p>{body}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === 'flow' && (
            <section className="docs-section docs-chapter">
              <div className="docs-header docs-chapter-hero">
                <span className="docs-eyebrow">{t('docs.flow.eyebrow')}</span>
                <h1>{t('docs.flow.title')}</h1>
                <p>{t('docs.flow.body')}</p>
              </div>
              <div className="code-block-wrapper">
                <div className="code-header">
                  <span>{t('docs.flow.request')}</span>
                  <button
                    className="copy-btn"
                    title={t('common.copy')}
                    type="button"
                    onClick={() => void copyText('authorize', authorizeExample)}
                  >
                    {copied === 'authorize' ? t('common.copied') : <Copy size={14} />}
                  </button>
                </div>
                <pre><code>{authorizeExample}</code></pre>
              </div>
              <div className="code-block-wrapper">
                <div className="code-header">
                  <span>{t('docs.flow.exchange')}</span>
                  <button
                    className="copy-btn"
                    title={t('common.copy')}
                    type="button"
                    onClick={() => void copyText('token', tokenExample)}
                  >
                    {copied === 'token' ? t('common.copied') : <Copy size={14} />}
                  </button>
                </div>
                <pre><code>{tokenExample}</code></pre>
              </div>
              <section className="docs-callout">
                <h2>{t('docs.flow.browserNarrow')}</h2>
                <p>{t('docs.flow.browserNarrowBody')}</p>
              </section>
            </section>
          )}

          {activeTab === 'metadata' && (
            <section className="docs-section docs-chapter">
              <div className="docs-header docs-chapter-hero">
                <span className="docs-eyebrow">{t('docs.metadata.eyebrow')}</span>
                <h1>{t('docs.metadata.title')}</h1>
                <p>{t('docs.metadata.body')}</p>
              </div>
              <div className="code-block-wrapper">
                <div className="code-header">
                  <span>{t('docs.integration.discovery')}</span>
                  <button
                    className="copy-btn"
                    title={t('common.copy')}
                    type="button"
                    onClick={() => void copyText('discovery', discoveryUrl)}
                  >
                    {copied === 'discovery' ? t('common.copied') : <TerminalSquare size={14} />}
                  </button>
                </div>
                <pre><code>GET {discoveryUrl}</code></pre>
              </div>
              <div className="endpoint-doc-grid endpoint-doc-grid-spacious">
                {endpointGroups.map((item) => {
                  const [path, desc] = pickLocalized(item, zh);
                  return (
                    <article key={path} className="endpoint-doc-card">
                      <code>{path}</code>
                      <p>{desc}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === 'security' && (
            <section className="docs-section docs-chapter">
              <div className="docs-header docs-chapter-hero">
                <span className="docs-eyebrow">{t('docs.security.eyebrow')}</span>
                <h1>{t('docs.security.title')}</h1>
                <p>{t('docs.security.body')}</p>
              </div>
              <section className="docs-subsection">
                <h2>{t('docs.security.serverOnly')}</h2>
                <div className="server-only-list">
                  {serverSideOnly.map((item) => {
                    const [path, reason] = pickLocalized(item, zh);
                    return (
                      <div key={path} className="server-only-row">
                        <code>{path}</code>
                        <span>{reason}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="docs-callout">
                <h2>{t('docs.security.oidf')}</h2>
                <ul className="docs-list">
                  {(zh ? oidfSteps.zh : oidfSteps.en).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </section>
          )}

          {activeTab === 'workbench' && (
            <section className="docs-section docs-chapter">
              <div className="docs-header docs-chapter-hero">
                <span className="docs-eyebrow">{t('docs.workbench.eyebrow')}</span>
                <h1>{t('docs.workbench.title')}</h1>
                <p>{t('docs.workbench.body')}</p>
              </div>
              <div className="docs-two-col docs-operation-grid">
                <section className="docs-subsection">
                  <h2>{t('docs.workbench.profile')}</h2>
                  <ul className="docs-list">
                    {(zh ? workbenchLists.profile.zh : workbenchLists.profile.en).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className="docs-subsection">
                  <h2>{t('docs.workbench.admin')}</h2>
                  <ul className="docs-list">
                    {(zh ? workbenchLists.admin.zh : workbenchLists.admin.en).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </section>
          )}

          {activeTab === 'interface-lab' && (
            <section className="docs-section docs-chapter">
              <div className="docs-header docs-chapter-hero">
                <span className="docs-eyebrow">{t('docs.interface.eyebrow')}</span>
                <h1>{t('docs.interface.title')}</h1>
                <p>{t('docs.interface.body')}</p>
              </div>
              <div className="interface-toolbar">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={runningAll}
                  onClick={() => void runVisibleChecks()}
                >
                  <Play size={16} />
                  <span>{runningAll ? t('common.checking') : t('docs.interface.runAll')}</span>
                </button>
                <button type="button" className="btn-secondary" onClick={openAuthorizeExample}>
                  <KeyRound size={16} />
                  <span>{t('docs.interface.openAuthorize')}</span>
                </button>
              </div>
              {Object.entries(groupedChecks).map(([group, checks]) => (
                <div className="interface-group" key={group}>
                  <h2>{t(checkGroupKeys[group as BrowserCheck['group']])}</h2>
                  <div className="interface-grid">
                    {checks.map((check) => {
                      const result = checkResults[check.key];
                      return (
                        <article className="interface-card" key={check.key}>
                          <div>
                            <strong>{zh ? checkNames[check.key].zh : checkNames[check.key].en}</strong>
                            <code>{check.method} {check.path}</code>
                          </div>
                          <span className={`interface-status ${result?.status ?? 'idle'}`}>
                            {statusText(result, t)}
                          </span>
                          <p>{result?.message ?? t('common.noRequest')}</p>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={result?.status === 'running'}
                            onClick={() => void runCheck(check)}
                          >
                            <CheckCircle2 size={15} />
                            <span>{t('docs.interface.check')}</span>
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
              <section className="docs-callout">
                <h2>{t('docs.interface.oidfTitle')}</h2>
                <p>{t('docs.interface.oidfBody')}</p>
              </section>
            </section>
          )}

          {activeTab === 'deploy' && (
            <section className="docs-section docs-chapter">
              <div className="docs-header docs-chapter-hero">
                <span className="docs-eyebrow">{t('docs.deploy.eyebrow')}</span>
                <h1>{t('docs.deploy.title')}</h1>
                <p>{t('docs.deploy.body')}</p>
              </div>
              <section className="docs-subsection">
                <h2>{t('docs.deploy.paths')}</h2>
                <ul className="docs-list deploy-list">
                  {(zh ? deployItems.zh : deployItems.en).map((item) => (
                    <li key={item}><code>{item}</code></li>
                  ))}
                </ul>
              </section>
            </section>
          )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </motion.div>
  );
}
