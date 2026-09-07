import { referencePages } from './reference';
import { configurationPages } from './configuration';

export type DocText = [string, string];
export type DocLink = {
  label: DocText;
  section?: string;
  href?: string;
  path?: string;
};
export type DocSection = {
  id: string;
  title: DocText;
  body?: DocText;
  steps?: DocText[];
  flow?: DocText[];
  note?: DocText;
  code?: { language: string; value: string };
  table?: { heads: DocText[]; rows: DocText[][] };
  links?: DocLink[];
};
export type DocPage = {
  id: string;
  group: 'start' | 'integrate' | 'operate' | 'configure' | 'reference';
  title: DocText;
  summary: DocText;
  source: string;
  sections: DocSection[];
};
export const docPages: DocPage[] = [
  {
    id: 'overview',
    group: 'start',
    title: ['开发者文档', 'Developer documentation'],
    summary: [
      '部署身份服务，为应用接入登录与授权。',
      'Deploy your identity service. Connect applications and secure API access.',
    ],
    source: 'docs/README.md',
    sections: [
      {
        id: 'start-here',
        title: ['从你要完成的事情开始', 'Start with what you want to build'],
        body: [
          '已有运行中的 NazoAuth 实例，从应用接入开始；准备首次部署，从部署指南开始。所有示例中的 auth.example.com 都需要替换为你的公开 issuer。',
          'Start with application integration if your NazoAuth instance is running, or deployment if you are setting up a new one. Replace auth.example.com in every example with your public issuer.',
        ],
        links: [
          {
            section: 'integration',
            label: ['接入第一个应用', 'Connect your first app'],
          },
          {
            section: 'deploy',
            label: ['部署 NazoAuth', 'Deploy NazoAuth'],
          },
          {
            section: 'flow',
            label: ['选择授权流程', 'Choose an authorization flow'],
          },
          {
            section: 'tokens',
            label: ['保护 API', 'Protect an API'],
          },
        ],
      },
      {
        id: 'how-it-works',
        title: ['一次登录，经过哪些部分', 'How sign-in works'],
        body: [
          '应用将用户引导至 NazoAuth。用户完成认证并确认授权后，应用收到授权码，将其交换为令牌，再使用访问令牌调用资源服务器。',
          'The application sends the user to NazoAuth. After authentication and consent, the application receives a code, exchanges it for tokens, and uses its access token to call the resource server.',
        ],
        flow: [
          ['应用', 'Application'],
          ['NazoAuth', 'NazoAuth'],
          ['令牌', 'Tokens'],
          ['你的 API', 'Your API'],
        ],
      },
      {
        id: 'concepts',
        title: ['核心概念', 'Core concepts'],
        table: {
          heads: [
            ['概念', 'Concept'],
            ['用途', 'Purpose'],
          ],
          rows: [
            [
              ['Issuer', 'Issuer'],
              [
                '签发令牌的身份服务地址。客户端和 API 验证器必须信任同一个精确值。',
                'The identity service issuing tokens. Clients and API verifiers trust the same exact issuer value.',
              ],
            ],
            [
              ['Client', 'Client'],
              [
                '接入的应用或服务，拥有 client_id、回调地址、授权类型、权限范围和安全策略。',
                'A registered application or service with its client ID, redirect URIs, grants, scopes, and security policy.',
              ],
            ],
            [
              ['Scope', 'Scope'],
              [
                '应用申请的访问范围。申请不等于获准，实际权限由客户端策略与授权结果决定。',
                'Requested access permissions. Actual access is limited by client policy and the resulting grant.',
              ],
            ],
            [
              ['Resource server', 'Resource server'],
              [
                '接受访问令牌的 API，负责验证令牌并执行业务权限判断。',
                'The API accepting access tokens. It validates tokens and enforces application permissions.',
              ],
            ],
          ],
        },
      },
      {
        id: 'included',
        title: ['NazoAuth 的组成', 'What ships with NazoAuth'],
        body: [
          '服务端提供 OAuth / OIDC、租户身份、令牌与密钥管理；NazoAuthWeb 提供登录、授权、账户与管理界面；可选 NazoAuthCtl 管理生命周期。协议核心通过语义接口连接存储实现；一个部署可承载多个租户域名。',
          'The server provides OAuth / OIDC, tenant identity, tokens, and key management. NazoAuthWeb provides sign-in, consent, account, and management UI; optional NazoAuthCtl manages lifecycle. Semantic interfaces connect the protocol core to storage implementations, and one deployment can serve multiple tenant domains.',
        ],
        note: [
          '协议功能是否可用，以对应租户 Discovery、客户端注册信息和安全策略为准。支持能力、基金会认证与特定发行版验收均在下列独立章节列明。',
          'Protocol availability depends on tenant discovery, registered client metadata, and security policy. Supported capabilities, Foundation certification, and release acceptance are documented separately below.',
        ],
        links: [
          { section: 'architecture', label: ['架构与扩展', 'Architecture and extension'] },
          { section: 'standards', label: ['协议与规范', 'Protocols and standards'] },
          { section: 'certification', label: ['认证与验证记录', 'Certification and validation'] },
          { section: 'configuration', label: ['配置参考', 'Configuration reference'] },
          { section: 'tenants', label: ['租户与域名', 'Tenants and domains'] },
        ],
      },
    ],
  },
  ...referencePages.filter((page) => page.group === 'start'),
  {
    id: 'integration',
    group: 'start',
    title: ['接入第一个应用', 'Connect your first app'],
    summary: [
      '使用授权码 + PKCE 完成一次 OpenID Connect 登录。',
      'Complete an OpenID Connect sign-in using Authorization Code + PKCE.',
    ],
    source: 'docs/integration/openid-connect.md',
    sections: [
      {
        id: 'register-client',
        title: ['注册客户端', 'Register a client'],
        body: [
          '在管理后台创建客户端；普通用户可以在账户页面提交接入申请，等待管理员审核。设置精确回调地址、所需 scopes 与 authorization_code 授权类型。高级安全策略与元数据按服务端注册接口配置。',
          'Create a client in administration, or submit an access request from your account for administrator approval. Configure an exact redirect URI, required scopes, and the authorization_code grant. Configure advanced security policy and metadata through the server registration interface.',
        ],
        table: {
          heads: [
            ['应用类型', 'Application type'],
            ['客户端类型', 'Client type'],
            ['凭据处理', 'Credentials'],
          ],
          rows: [
            [
              ['SPA、移动端、桌面端', 'SPA, mobile, desktop'],
              ['public', 'public'],
              [
                '不保存 client secret，使用 S256 PKCE。',
                'Do not embed a client secret. Use S256 PKCE.',
              ],
            ],
            [
              ['有服务端的 Web 应用', 'Server-rendered web app'],
              ['confidential', 'confidential'],
              [
                '在后端保管凭据并交换授权码，同时使用 PKCE。',
                'Keep credentials and code exchange on the backend. Also use PKCE.',
              ],
            ],
          ],
        },
        note: [
          '回调地址必须与注册值精确匹配。不要使用通配符；生产回调使用 HTTPS，原生应用按服务端允许的原生回调规则注册。',
          "Redirect URIs must match their registered value exactly. Do not use wildcards. Use HTTPS in production; native applications must follow the server's native redirect rules.",
        ],
      },
      {
        id: 'discover',
        title: ['读取 Discovery', 'Read discovery'],
        body: [
          '将 issuer 交给所选框架的 OIDC 客户端库，使用 Discovery 返回的 authorization_endpoint、token_endpoint、jwks_uri 和允许的算法。不要把 /ui 当成 issuer。',
          "Configure your framework's OIDC client library with the issuer. Use the authorization_endpoint, token_endpoint, jwks_uri, and algorithms from discovery. The /ui path is not your issuer.",
        ],
        code: {
          language: 'HTTP',
          value:
            'GET https://auth.example.com/.well-known/openid-configuration\n\n# issuer: https://auth.example.com\n# authorization_endpoint: https://auth.example.com/authorize\n# token_endpoint: https://auth.example.com/token\n# jwks_uri: https://auth.example.com/jwks.json',
        },
      },
      {
        id: 'authorize',
        title: ['发起授权请求', 'Start authorization'],
        body: [
          '每次请求生成新的随机 state、nonce 和 code_verifier。发送 S256 challenge，并把原始值保存在与这次登录绑定的一次性会话中。回调时先验证 state，再交换授权码。',
          'Generate a fresh random state, nonce, and code_verifier for each request. Send the S256 challenge and retain the originals in a single-use session bound to that sign-in. Validate state before exchanging the code.',
        ],
        code: {
          language: 'HTTP',
          value:
            'GET https://auth.example.com/authorize?\n  response_type=code&\n  client_id=YOUR_CLIENT_ID&\n  redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&\n  scope=openid%20profile%20email&\n  state=RANDOM_STATE&\n  nonce=RANDOM_NONCE&\n  code_challenge=BASE64URL_SHA256_VERIFIER&\n  code_challenge_method=S256',
        },
        flow: [
          ['生成 PKCE', 'Generate PKCE'],
          ['用户登录', 'User signs in'],
          ['确认授权', 'Consent'],
          ['回调应用', 'Callback'],
        ],
      },
      {
        id: 'exchange',
        title: ['交换授权码', 'Exchange the code'],
        body: [
          '授权码只能使用一次。提交原始 code_verifier 和相同的 redirect_uri；confidential 客户端还要按注册方式完成客户端认证。推荐使用成熟的 OIDC 库处理协议状态与验证。',
          'An authorization code can be used only once. Submit the original code_verifier and the same redirect_uri. Confidential clients also authenticate using their registered method. Use an established OIDC library to manage protocol state and validation.',
        ],
        code: {
          language: 'HTTP',
          value:
            'POST https://auth.example.com/token\nContent-Type: application/x-www-form-urlencoded\n\nclient_id=YOUR_CLIENT_ID&\ngrant_type=authorization_code&\ncode=RETURNED_CODE&\nredirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback&\ncode_verifier=ORIGINAL_VERIFIER',
        },
      },
      {
        id: 'validate',
        title: ['验证结果并调用 API', 'Validate the result and call your API'],
        body: [
          '客户端验证 ID Token 的签名、issuer、audience、有效期与 nonce。API 独立验证 Access Token 的签名、issuer、audience、有效期与 scope。登录成功本身不代表拥有任何业务资源权限。',
          'The client validates the ID Token signature, issuer, audience, expiry, and nonce. The API independently validates the Access Token signature, issuer, audience, expiry, and scopes. Successful sign-in alone does not authorize access to business resources.',
        ],
        links: [
          {
            section: 'tokens',
            label: ['令牌与 API 验证', 'Tokens and API validation'],
          },
          {
            section: 'troubleshooting',
            label: ['排查接入问题', 'Troubleshoot integration'],
          },
        ],
      },
    ],
  },
  {
    id: 'flow',
    group: 'integrate',
    title: ['授权流程', 'Authorization flows'],
    summary: [
      '根据应用的运行环境和是否有用户参与，选择合适的授权方式。',
      'Choose a flow based on where your application runs and whether a user is involved.',
    ],
    source: 'docs/integration/openid-connect.md',
    sections: [
      {
        id: 'choose',
        title: ['选择流程', 'Choose a flow'],
        table: {
          heads: [
            ['场景', 'Scenario'],
            ['流程', 'Flow'],
            ['用户参与', 'User involvement'],
          ],
          rows: [
            [
              ['Web、SPA、移动与桌面应用', 'Web, SPA, mobile, desktop'],
              ['Authorization Code + PKCE', 'Authorization Code + PKCE'],
              ['浏览器登录与授权', 'Browser sign-in and consent'],
            ],
            [
              ['定时任务、服务之间的调用', 'Scheduled jobs, service calls'],
              ['Client Credentials', 'Client Credentials'],
              ['无，以客户端身份访问', 'None; acts as the client'],
            ],
            [
              ['命令行、输入受限设备', 'CLI, input-constrained devices'],
              ['Device Authorization', 'Device Authorization'],
              ['在另一台设备上确认', 'Approves on another device'],
            ],
            [
              ['分离认证设备的交互', 'Decoupled authentication'],
              ['CIBA（poll / ping）', 'CIBA (poll / ping)'],
              [
                '通过独立认证交互确认',
                'Approves through a separate authentication interaction',
              ],
            ],
          ],
        },
        note: [
          'NazoAuth 不支持 implicit 与 password grant。高级授权类型需要客户端显式注册与相应策略，不能仅凭请求参数开启。',
          'NazoAuth does not support implicit or password grants. Advanced grants require explicit registration and policy; request parameters alone cannot enable them.',
        ],
      },
      {
        id: 'machine',
        title: ['服务间访问', 'Machine-to-machine access'],
        body: [
          '将服务注册为 confidential 客户端，允许 client_credentials 与所需 scope。示例采用 client_secret_basic；认证方式必须与客户端注册值一致。得到的令牌代表客户端，不代表终端用户。',
          'Register the service as a confidential client with client_credentials and its required scopes. This example uses client_secret_basic; the authentication method must match registration. The token represents the client, not an end user.',
        ],
        code: {
          language: 'HTTP',
          value:
            'POST https://auth.example.com/token\nAuthorization: Basic BASE64_ENCODED_CLIENT_CREDENTIALS\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=client_credentials&scope=orders%3Aread',
        },
      },
      {
        id: 'device',
        title: ['设备授权', 'Device authorization'],
        body: [
          '设备请求 device_code 与 user_code，展示返回的 verification_uri。用户在浏览器中登录并确认后，设备按照 interval 轮询 /token。authorization_pending 表示继续等待，slow_down 表示增加间隔；拒绝或过期后停止。',
          'Request a device_code and user_code, then display the returned verification_uri. The user signs in and approves in a browser. Poll /token at the returned interval: continue on authorization_pending, increase the interval on slow_down, and stop after denial or expiry.',
        ],
        code: {
          language: 'HTTP',
          value:
            'POST https://auth.example.com/device_authorization\nContent-Type: application/x-www-form-urlencoded\n\nclient_id=YOUR_DEVICE_CLIENT&scope=openid%20profile\n\n# Poll the token endpoint after the returned interval:\nPOST https://auth.example.com/token\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=urn:ietf:params:oauth:grant-type:device_code&\ndevice_code=RETURNED_DEVICE_CODE&client_id=YOUR_DEVICE_CLIENT',
        },
        flow: [
          ['显示用户代码', 'Display code'],
          ['浏览器确认', 'Browser approval'],
          ['按间隔轮询', 'Poll at interval'],
          ['取得令牌', 'Receive tokens'],
        ],
      },
      {
        id: 'ciba',
        title: ['CIBA 与扩展授权', 'CIBA and extended grants'],
        body: [
          'CIBA 从 /bc-authorize 发起，使用 poll 或 ping 模式，并遵守客户端通知与请求绑定要求。JWT Bearer Grant、Token Exchange 采用项目定义的受限实现范围，不用于任意外部令牌或第三方身份映射。',
          'CIBA starts at /bc-authorize with poll or ping delivery and registered notification and request-binding requirements. JWT Bearer Grant and Token Exchange have project-defined bounded profiles; they do not accept arbitrary external tokens or map arbitrary third-party identities.',
        ],
        links: [
          {
            href: 'https://github.com/nazozero/NazoAuth/blob/main/docs/integration/openid-connect.md',
            label: [
              '查看支持范围与启用条件',
              'Supported profiles and enablement',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tokens',
    group: 'integrate',
    title: ['令牌、Scope 与 API', 'Tokens, scopes, and APIs'],
    summary: [
      '区分登录结果与资源访问，验证令牌并处理刷新、撤销和退出。',
      'Separate identity from resource access. Validate tokens and handle refresh, revocation, and logout.',
    ],
    source: 'docs/features/resource-server-verifier.md',
    sections: [
      {
        id: 'token-types',
        title: ['令牌类型', 'Three token types'],
        table: {
          heads: [
            ['类型', 'Type'],
            ['接收方', 'Consumer'],
            ['用途', 'Purpose'],
          ],
          rows: [
            [
              ['ID Token', 'ID Token'],
              ['OIDC 客户端', 'OIDC client'],
              [
                '证明认证结果。不能作为调用 API 的访问令牌。',
                'Describes the authentication result. It is not an API access token.',
              ],
            ],
            [
              ['Access Token', 'Access Token'],
              ['资源服务器 / API', 'Resource server / API'],
              [
                '在指定 audience 和 scope 内访问资源。',
                'Accesses resources within its audience and scopes.',
              ],
            ],
            [
              ['Refresh Token', 'Refresh Token'],
              ['签发它的授权服务器', 'Issuing authorization server'],
              [
                '按授权与策略取得后续令牌，不发送给业务 API。',
                'Obtains subsequent tokens according to the grant and policy. Never send it to business APIs.',
              ],
            ],
          ],
        },
      },
      {
        id: 'scopes',
        title: ['权限范围与用户信息', 'Scopes and user information'],
        body: [
          'openid 请求 OIDC 登录；profile 与 email 请求对应用户声明；offline_access 用于需要离线访问的场景，refresh token 是否签发仍取决于授权与客户端策略。自定义 API scope 需要先在客户端策略中获准，API 再执行相应权限检查。',
          'openid requests OIDC sign-in. profile and email request corresponding user claims. offline_access is for offline access; refresh-token issuance still depends on the grant and client policy. Custom API scopes must be allowed for the client and enforced by the API.',
        ],
        code: {
          language: 'HTTP',
          value:
            'GET https://auth.example.com/userinfo\nAuthorization: Bearer ACCESS_TOKEN',
        },
        note: [
          'DPoP 绑定令牌使用 DPoP 授权方案并携带 proof；不能直接改用 Bearer 绕过绑定验证。',
          'DPoP-bound tokens use the DPoP authorization scheme and a proof. Switching to Bearer does not bypass binding validation.',
        ],
      },
      {
        id: 'verify-api',
        title: ['在 API 侧验证令牌', 'Validate tokens at the API'],
        body: [
          '从可信 issuer 的 JWKS 取得公钥，限制签名算法，验证 typ、签名、issuer、audience、有效期与所需 scope；绑定令牌还需验证 DPoP 或 mTLS 证明。仅解码 JWT 不构成验证。',
          "Obtain public keys from the trusted issuer's JWKS. Restrict algorithms and validate token type, signature, issuer, audience, lifetime, and required scopes. Bound tokens also require DPoP or mTLS proof validation. Decoding a JWT is not verification.",
        ],
        steps: [
          [
            '为每个 API 配置自己的预期 audience。',
            'Configure the expected audience for each API.',
          ],
          [
            '按 kid 选择公钥并处理签名密钥轮换；未知密钥不能直接放行。',
            'Select the public key by kid and handle signing-key rotation. Unknown keys must not be accepted.',
          ],
          [
            '检查 scope 后，再检查当前用户或客户端对具体业务资源的权限。',
            'After checking scopes, enforce user or client permissions on the specific business resource.',
          ],
        ],
        links: [
          {
            href: 'https://github.com/nazozero/NazoAuth/blob/main/docs/features/resource-server-verifier.md',
            label: [
              'Rust 验证库与 Actix 接入',
              'Rust verifier and Actix integration',
            ],
          },
        ],
      },
      {
        id: 'refresh',
        title: ['刷新与撤销', 'Refresh and revoke'],
        body: [
          '刷新时使用客户端原有的认证方式，并提交当前 refresh token。妥善替换服务端返回的新令牌，同一会话的刷新请求应串行化，避免轮换令牌被并发重复使用。撤销请求发往 /revoke。',
          "Refresh using the client's original authentication method and current refresh token. Store newly returned tokens correctly. Serialize refresh requests within a session to avoid concurrent reuse of rotating tokens. Send revocation requests to /revoke.",
        ],
        code: {
          language: 'HTTP',
          value:
            'POST https://auth.example.com/token\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=refresh_token&refresh_token=CURRENT_REFRESH_TOKEN&\nclient_id=YOUR_CLIENT_ID\n\nPOST https://auth.example.com/revoke\nContent-Type: application/x-www-form-urlencoded\n\ntoken=REFRESH_TOKEN&token_type_hint=refresh_token&\nclient_id=YOUR_CLIENT_ID',
        },
      },
      {
        id: 'logout',
        title: ['退出登录', 'Sign out'],
        body: [
          '应用清除自己的登录会话，并按需要发起 RP-Initiated Logout。post_logout_redirect_uri 必须事先注册；OIDC 会话退出、应用本地退出和令牌撤销是不同操作，需要按应用需求组合。',
          "Clear the application's local session and use RP-Initiated Logout when needed. Register post_logout_redirect_uri first. OIDC session logout, local application logout, and token revocation are distinct operations; combine them according to your application's needs.",
        ],
        code: {
          language: 'HTTP',
          value:
            'GET https://auth.example.com/logout?\n  id_token_hint=LAST_ID_TOKEN&\n  post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fsigned-out&\n  state=RANDOM_LOGOUT_STATE',
        },
      },
    ],
  },
  {
    id: 'security',
    group: 'integrate',
    title: ['客户端安全', 'Client security'],
    summary: [
      '按客户端配置授权请求保护、令牌绑定与签名策略。',
      'Configure request protection, token binding, and signing policies per client.',
    ],
    source: 'docs/protocol/composable-capability-policy.md',
    sections: [
      {
        id: 'baseline',
        title: ['客户端策略是授权边界', 'Client policy defines access'],
        body: [
          '每个 OAuth 客户端都有明确的 security_policy。服务端支持某项能力，不意味着每个客户端都可使用；授权类型、认证方式、算法、回调地址与发送方约束仍按注册策略验证。',
          'Every OAuth client has an explicit security_policy. Server support does not grant every client access: grant types, authentication methods, algorithms, redirect URIs, and sender constraints remain subject to registered policy.',
        ],
        steps: [
          [
            '交互式登录使用授权码 + S256 PKCE。',
            'Use Authorization Code + S256 PKCE for interactive sign-in.',
          ],
          [
            '最小化授权类型与 scope，精确注册回调地址。',
            'Limit grant types and scopes; register exact redirect URIs.',
          ],
          [
            '为 confidential 客户端选择并配置受支持的认证方式。',
            'Select and configure a supported authentication method for confidential clients.',
          ],
        ],
      },
      {
        id: 'request-protection',
        title: [
          '保护授权请求与响应',
          'Protect authorization requests and responses',
        ],
        table: {
          heads: [
            ['机制', 'Mechanism'],
            ['作用', 'Purpose'],
          ],
          rows: [
            [
              ['PAR', 'PAR'],
              [
                '先经后通道提交授权参数，浏览器仅携带 request_uri。',
                'Push authorization parameters over a backchannel; the browser carries a request_uri.',
              ],
            ],
            [
              ['JAR', 'JAR'],
              [
                '使用签名 Request Object 保护请求完整性，校验签名、受众与时效。',
                'Protect request integrity with a signed Request Object and validate signature, audience, and lifetime.',
              ],
            ],
            [
              ['JARM', 'JARM'],
              [
                '使用 JWT 保护授权响应；客户端必须验证响应，不能将其当普通查询参数处理。',
                'Protect authorization responses with JWTs. Clients must validate the response, not treat it as ordinary query parameters.',
              ],
            ],
          ],
        },
      },
      {
        id: 'sender-constraints',
        title: ['将令牌绑定到使用方', 'Bind tokens to their sender'],
        body: [
          'DPoP 将令牌与客户端持有的密钥绑定；mTLS 将令牌与客户端证书绑定。资源服务器必须验证对应证明和令牌 cnf 声明。mTLS 还需要完整、可信的 TLS 或代理证书传递边界。',
          "DPoP binds tokens to a client-held key; mTLS binds them to a client certificate. Resource servers must validate the proof and the token's cnf claim. mTLS additionally requires a complete, trusted TLS or proxy certificate boundary.",
        ],
      },
      {
        id: 'profiles-keys',
        title: ['高级配置与签名密钥', 'Advanced profiles and signing keys'],
        body: [
          'FAPI 2.0 与消息签名配置使用对应的请求保护、客户端认证与发送方约束。签名密钥具有预发布、活动、宽限与退役阶段。使用 KMS / HSM 时，按外部签名命令的集成约定配置。',
          'FAPI 2.0 and message-signing profiles apply their required request protection, client authentication, and sender constraints. Signing keys move through prepublish, active, grace, and retired stages. KMS / HSM integrations follow the external signing-command contract.',
        ],
        links: [
          {
            href: 'https://github.com/nazozero/NazoAuth/blob/main/docs/protocol/profile-matrix.md',
            label: ['协议配置矩阵', 'Profile matrix'],
          },
          {
            href: 'https://github.com/nazozero/NazoAuth/blob/main/docs/operations/configuration.md',
            label: ['完整配置参考', 'Full configuration reference'],
          },
        ],
      },
    ],
  },
  {
    id: 'accounts',
    group: 'operate',
    title: ['账户与认证', 'Accounts and authentication'],
    summary: [
      '了解本地账户、Passkey、多因素认证和账户管理的职责。',
      'Understand local accounts, passkeys, MFA, and account management.',
    ],
    source: 'docs/features/passkeys.md',
    sections: [
      {
        id: 'authentication',
        title: ['认证方式', 'Authentication methods'],
        body: [
          'NazoAuth 服务端支持本地账户、WebAuthn / Passkey、TOTP、备用恢复码与记住 MFA。应用通过 OIDC 授权流程使用身份服务，不需要接收或代理用户的密码。',
          'The NazoAuth server supports local accounts, WebAuthn / passkeys, TOTP, backup codes, and remembered MFA. Applications use the identity service through OIDC and do not need to receive or proxy user passwords.',
        ],
      },
      {
        id: 'passkeys',
        title: ['Passkey 与公开域名', 'Passkeys and the public origin'],
        body: [
          'WebAuthn 凭据绑定 RP ID 与 origin。默认值由公开 issuer 派生，因此在正式注册凭据前确定 HTTPS 域名。部署后的域名变更需要评估已有凭据的可用性。',
          'WebAuthn credentials are bound to an RP ID and origin. Defaults derive from the public issuer, so establish the HTTPS domain before registering production credentials. Assess existing credential usability before changing that domain.',
        ],
        links: [
          {
            href: 'https://github.com/nazozero/NazoAuth/blob/main/docs/features/passkeys.md',
            label: [
              'Passkey 配置与协议流程',
              'Passkey configuration and flows',
            ],
          },
        ],
      },
      {
        id: 'mfa',
        title: ['多因素认证与恢复', 'MFA and recovery'],
        body: [
          'TOTP 与备用恢复码用于提高账户认证强度和恢复访问。管理员敏感操作还可能要求独立的 MFA 确认。具体注册、挑战和恢复行为以服务端 MFA 接口为准。',
          "TOTP and backup codes provide stronger account authentication and recovery. Sensitive administrator actions may require a separate MFA confirmation. Enrollment, challenge, and recovery follow the server's MFA interface.",
        ],
        links: [
          {
            href: 'https://github.com/nazozero/NazoAuth/blob/main/docs/features/mfa.md',
            label: ['MFA 使用与集成', 'MFA usage and integration'],
          },
        ],
      },
      {
        id: 'account-page',
        title: ['账户页面', 'Account page'],
        body: [
          '账户页面用于维护个人资料、查看已授权应用、提交客户端接入申请，以及读取获批申请的一次性凭据。授权撤销由管理员在授权记录中执行。',
          'The account page manages profile details, lists authorized applications, submits client access requests, and delivers one-time credentials for approved requests. Administrators revoke grants from grant records.',
        ],
        links: [
          {
            path: '/profile',
            label: ['打开账户页面', 'Open your account'],
          },
        ],
      },
    ],
  },
  {
    id: 'workbench',
    group: 'operate',
    title: ['管理与客户端注册', 'Administration and clients'],
    summary: [
      '管理用户、应用、安全策略、授权记录和接入申请。',
      'Manage users, applications, security policy, grants, and access requests.',
    ],
    source: 'docs/features/ecosystem-onboarding.md',
    sections: [
      {
        id: 'clients',
        title: ['注册与管理客户端', 'Register and manage clients'],
        body: [
          '管理界面维护客户端名称、回调地址、客户端类型、授权类型与权限范围。高级安全策略与元数据按服务端注册接口配置。public 客户端不持有密钥；confidential 客户端的凭据只交付给可信后端。',
          'The administration UI manages client names, redirect URIs, client types, grant types, and scopes. Advanced security policy and metadata use the server registration interface. Public clients do not hold secrets; confidential credentials are delivered only to a trusted backend.',
        ],
        flow: [
          ['注册 / 申请', 'Register / request'],
          ['配置策略', 'Set policy'],
          ['交付凭据', 'Deliver credentials'],
          ['应用接入', 'Integrate'],
        ],
      },
      {
        id: 'requests',
        title: ['接入申请与凭据交付', 'Access requests and credentials'],
        body: [
          '用户提交接入申请，管理员审核应用信息与所需权限。获批后，用户在账户页面读取一次性凭据；应在交付时安全保存，不能假定随后仍可读取相同秘密。',
          'Users submit access requests for administrator review of the application and permissions. Approved credentials are delivered once in the account page. Store them securely at delivery; do not assume the same secret remains readable afterward.',
        ],
      },
      {
        id: 'grants',
        title: ['用户与授权记录', 'Users and grant records'],
        body: [
          '管理界面按管理员权限显示用户、客户端、授权记录和运行时模块。对不再需要的授权执行撤销；应用仍应按令牌策略处理会话结束与访问被拒绝。',
          'Administration exposes users, clients, grant records, and runtime modules according to administrator privileges. Revoke grants that are no longer needed. Applications must still handle session termination and denied access according to token policy.',
        ],
      },
      {
        id: 'provisioning',
        title: ['SCIM 与动态注册', 'SCIM and dynamic registration'],
        body: [
          'SCIM 提供目录预配接口。动态客户端注册使用 /register，只有配置初始访问令牌后才开放；注册的客户端仍受服务端安全策略约束。',
          'SCIM provides directory provisioning APIs. Dynamic Client Registration uses /register and is enabled only after an initial access token is configured. Registered clients remain subject to server security policy.',
        ],
        links: [
          {
            href: 'https://github.com/nazozero/NazoAuth/blob/main/docs/features/scim.md',
            label: ['SCIM 预配指南', 'SCIM provisioning guide'],
          },
          {
            path: '/admin',
            label: ['打开管理界面', 'Open administration'],
          },
        ],
      },
    ],
  },
  ...referencePages.filter((page) => page.group === 'operate'),
  {
    id: 'deploy',
    group: 'operate',
    title: ['部署 NazoAuth', 'Deploy NazoAuth'],
    summary: [
      '准备依赖与公开域名，通过 NazoAuthCtl 安装并创建管理员。',
      'Prepare dependencies and a public origin. Install with NazoAuthCtl and create an administrator.',
    ],
    source: 'docs/operations/deployment.md',
    sections: [
      {
        id: 'prerequisites',
        title: ['部署前准备', 'Prerequisites'],
        body: [
          '默认发行版需要 PostgreSQL、Valkey 和一个公开 HTTPS 域名。NazoAuthCtl 支持 Docker、Podman 或主机运行方式；数据库与 Valkey 使用已有凭据。',
          'The default distribution needs PostgreSQL, Valkey, and a public HTTPS origin. NazoAuthCtl supports Docker, Podman, or a host runtime and uses existing database and Valkey credentials.',
        ],
        steps: [
          [
            '准备独立的 PostgreSQL runtime 与 lifecycle 角色。runtime 用于服务请求，lifecycle 用于迁移、备份和恢复。',
            'Prepare distinct PostgreSQL runtime and lifecycle roles. Runtime serves requests; lifecycle handles migrations, backups, and recovery.',
          ],
          [
            '安装 NazoAuthCtl 的签名发行版，配置目标主机访问。',
            'Install a signed NazoAuthCtl release and configure access to the target host.',
          ],
          [
            '确定公开域名、TLS 终止位置和可信代理范围。',
            'Choose the public origin, TLS termination point, and trusted proxy ranges.',
          ],
        ],
        links: [
          {
            href: 'https://github.com/nazozero/NazoAuthCtl/releases',
            label: ['获取 NazoAuthCtl', 'Get NazoAuthCtl'],
          },
        ],
      },
      {
        id: 'install',
        title: ['安装实例', 'Install an instance'],
        body: [
          '下面使用 SSH 主机和 Podman。替换主机别名、数据库地址和凭据文件路径；其他运行方式显式选择 docker 或 host。',
          'This example uses an SSH host and Podman. Replace the host alias, database addresses, and credential-file paths. Select docker or host explicitly for other runtimes.',
        ],
        code: {
          language: 'SHELL',
          value:
            'nazoauthctl host add production-host --ssh production --privilege sudo\n\nnazoauthctl install --host production-host --name production \\\n  --public-url https://auth.example.com --runtime podman \\\n  --database-host db.internal --database-port 5432 \\\n  --database-name oauth \\\n  --database-runtime-user nazo_runtime \\\n  --database-runtime-password-file ./database-runtime-password \\\n  --database-lifecycle-user nazo_lifecycle \\\n  --database-lifecycle-password-file ./database-lifecycle-password \\\n  --valkey-host valkey.internal --valkey-port 6379 \\\n  --valkey-password-file ./valkey-password',
        },
      },
      {
        id: 'origin',
        title: ['租户公开地址', 'Tenant public address'],
        body: [
          '以下展示单个引导租户的入口配置。一个部署可通过目录绑定多个租户域名；每个目录租户的前端、CORS 与 Passkey 按自身 issuer 派生。前端位于 /ui/，协议端点使用 Discovery 给出的路径，不添加 /ui 前缀。',
          'This fragment configures one bootstrap tenant. A deployment can bind multiple tenant domains through its directory. Frontend, CORS, and passkey settings derive from each directory tenant issuer. The frontend uses /ui/; protocol endpoints follow Discovery without an added /ui prefix.',
        ],
        code: {
          language: 'YAML',
          value:
            'PUBLIC_BASE_URL: "https://auth.example.com"\nTRANSPORT_MODE: "trusted-proxy"\nTRUSTED_PROXY_CIDRS: "127.0.0.1/32"\nMTLS_CERTIFICATE_SOURCE: "disabled"\nDATA_DIR: "/var/lib/nazo_oauth"',
        },
        note: [
          'trusted-proxy 示例要求 TLS 在可信入口终止。直接 TLS 部署使用 direct-tls，并按配置参考设置证书与密钥。',
          'The trusted-proxy example assumes TLS terminates at trusted ingress. Direct TLS deployments use direct-tls with certificates and keys from the configuration reference.',
        ],
      },
      {
        id: 'administrator',
        title: [
          '创建管理员并验证部署',
          'Create an administrator and verify deployment',
        ],
        body: [
          '通过部署根权限创建管理员，然后绑定控制台。妥善离线保存 recovery secret；它用于控制台密钥恢复，不是数据库备份。',
          'Create an administrator through deployment-root authority, then bind the console. Store the recovery secret safely offline. It recovers controller access; it is not a database backup.',
        ],
        code: {
          language: 'SHELL',
          value:
            'nazoauthctl admin create --instance production\nnazoauthctl bind --instance production --label operations \\\n  --output-secret-file ./production-recovery-secret\nnazoauthctl status --instance production\nnazoauthctl verify --instance production',
        },
        links: [
          {
            section: 'integration',
            label: ['下一步：接入应用', 'Next: connect an application'],
          },
          {
            section: 'operations',
            label: ['备份、更新与恢复', 'Backups, updates, and recovery'],
          },
        ],
      },
    ],
  },
  {
    id: 'operations',
    group: 'operate',
    title: ['运维与恢复', 'Operations and recovery'],
    summary: [
      '保持实例可维护，并为升级与故障恢复准备可验证的备份。',
      'Maintain your instance and prepare verified backups for upgrades and recovery.',
    ],
    source: 'docs/operations/one-click-update.md',
    sections: [
      {
        id: 'status',
        title: ['运行状态', 'Runtime status'],
        body: [
          '使用 status 查看实例状态，doctor 排查部署问题，verify 验证公开 TLS 与 issuer。/health 反映就绪状态，/live 反映进程存活；两者含义不同。',
          'Use status for instance state, doctor for deployment diagnostics, and verify for public TLS and issuer verification. /health reports readiness while /live reports process liveness; they mean different things.',
        ],
        code: {
          language: 'SHELL',
          value:
            'nazoauthctl status --instance production\nnazoauthctl doctor --instance production\nnazoauthctl verify --instance production',
        },
      },
      {
        id: 'backup',
        title: ['备份并验证恢复', 'Back up and verify restoration'],
        body: [
          '备份数据库及该实例持久数据，包括签名密钥和应用秘密。创建快照之后执行隔离恢复测试，并将备份复制到独立故障域。备份存在不等于能够恢复。',
          'Back up the database and instance-persistent data, including signing keys and application secrets. After taking a snapshot, run an isolated restore test and copy it to an independent failure domain. An existing backup is not proof of recoverability.',
        ],
        code: {
          language: 'SHELL',
          value:
            'nazoauthctl backup snapshot --instance production\nnazoauthctl backup restore-test --instance production\nnazoauthctl backup show --instance production',
        },
      },
      {
        id: 'update',
        title: ['更新与回滚', 'Update and rollback'],
        body: [
          '由 NazoAuthCtl 执行经过验证的版本更新及 schema 生命周期。迁移使用 lifecycle 数据库角色；运行中的服务不持有该角色凭据。失败恢复与回滚遵循目标实例的操作记录。',
          "NazoAuthCtl manages verified release updates and the schema lifecycle. Migrations use the lifecycle database role, whose credentials are not held by the running server. Failure recovery and rollback follow the target instance's operation journal.",
        ],
        code: {
          language: 'SHELL',
          value:
            'nazoauthctl update --instance production\nnazoauthctl rollback --instance production',
        },
        note: [
          '正式升级前阅读目标版本说明，确认备份策略与恢复测试记录。',
          'Read target release notes and confirm backup policy and restore-test evidence before a production update.',
        ],
      },
      {
        id: 'recover',
        title: ['恢复与密钥连续性', 'Recovery and key continuity'],
        body: [
          '恢复按验证过的快照、实例标识和密钥材料执行。不要删除持久秘密来尝试修复启动错误；缺失或格式错误的秘密会导致启动失败，需要找回正确的持久状态。',
          'Recovery uses verified snapshots, instance identity, and key material. Do not delete persisted secrets to work around startup errors. Missing or malformed secrets fail startup and require restoration of the correct persistent state.',
        ],
        links: [
          {
            href: 'https://github.com/nazozero/NazoAuth/blob/main/docs/operations/one-click-update.md',
            label: ['完整恢复与备份策略', 'Recovery and backup policy'],
          },
          {
            href: 'https://github.com/nazozero/NazoAuthCtl/blob/main/README.md',
            label: ['控制台命令说明', 'Controller command reference'],
          },
        ],
      },
    ],
  },
  ...configurationPages,
  {
    id: 'metadata',
    group: 'reference',
    title: ['协议端点', 'Protocol endpoints'],
    summary: [
      '按用途查找 OAuth / OIDC 端点。客户端应优先使用 Discovery 中的实际地址。',
      'Find OAuth / OIDC endpoints by purpose. Clients should prefer the actual URLs advertised by discovery.',
    ],
    source: 'docs/integration/openid-connect.md',
    sections: [
      {
        id: 'discovery-endpoints',
        title: ['发现与签名公钥', 'Discovery and public signing keys'],
        table: {
          heads: [
            ['方法', 'Method'],
            ['路径', 'Path'],
            ['用途', 'Purpose'],
          ],
          rows: [
            [
              ['GET', 'GET'],
              [
                '/.well-known/openid-configuration',
                '/.well-known/openid-configuration',
              ],
              [
                'OIDC issuer、端点、算法与能力',
                'OIDC issuer, endpoints, algorithms, and capabilities',
              ],
            ],
            [
              ['GET', 'GET'],
              [
                '/.well-known/oauth-authorization-server',
                '/.well-known/oauth-authorization-server',
              ],
              ['OAuth 授权服务器元数据', 'OAuth authorization-server metadata'],
            ],
            [
              ['GET', 'GET'],
              ['/jwks.json', '/jwks.json'],
              [
                '用于验证签名的公开密钥',
                'Public keys used to verify signatures',
              ],
            ],
          ],
        },
      },
      {
        id: 'authorization-endpoints',
        title: ['授权与令牌', 'Authorization and tokens'],
        table: {
          heads: [
            ['方法', 'Method'],
            ['路径', 'Path'],
            ['用途', 'Purpose'],
          ],
          rows: [
            [
              ['GET / POST', 'GET / POST'],
              ['/authorize', '/authorize'],
              ['授权请求入口', 'Authorization request'],
            ],
            [
              ['POST', 'POST'],
              ['/token', '/token'],
              [
                '授权码、刷新、客户端凭据和其他获准 grant',
                'Code, refresh, client credentials, and other permitted grants',
              ],
            ],
            [
              ['GET / POST', 'GET / POST'],
              ['/userinfo', '/userinfo'],
              ['返回获准的用户声明', 'Returns authorized user claims'],
            ],
            [
              ['POST', 'POST'],
              ['/revoke', '/revoke'],
              ['撤销令牌', 'Token revocation'],
            ],
            [
              ['POST', 'POST'],
              ['/introspect', '/introspect'],
              ['受保护的令牌内省', 'Protected token introspection'],
            ],
            [
              ['GET / POST', 'GET / POST'],
              ['/logout', '/logout'],
              ['RP-Initiated Logout', 'RP-Initiated Logout'],
            ],
          ],
        },
      },
      {
        id: 'extended-endpoints',
        title: ['扩展流程', 'Extended flows'],
        table: {
          heads: [
            ['方法', 'Method'],
            ['路径', 'Path'],
            ['用途', 'Purpose'],
          ],
          rows: [
            [
              ['POST', 'POST'],
              ['/par', '/par'],
              ['推送授权请求', 'Pushed authorization request'],
            ],
            [
              ['POST', 'POST'],
              ['/device_authorization', '/device_authorization'],
              ['设备授权请求', 'Device authorization request'],
            ],
            [
              ['POST', 'POST'],
              ['/bc-authorize', '/bc-authorize'],
              ['CIBA 后通道认证', 'CIBA backchannel authentication'],
            ],
            [
              ['POST', 'POST'],
              ['/register', '/register'],
              [
                '需初始访问令牌的动态客户端注册',
                'Dynamic client registration requiring an initial access token',
              ],
            ],
            [
              ['GET / …', 'GET / …'],
              ['/scim/v2/*', '/scim/v2/*'],
              ['SCIM 元数据与预配接口', 'SCIM metadata and provisioning'],
            ],
          ],
        },
        note: [
          '该表是端点参考，不代表免认证访问。请求需要相应的客户端认证、访问令牌、策略与模块条件；令牌端点使用表单编码，而非 JSON。',
          'This reference does not imply unauthenticated access. Requests require their client authentication, access tokens, policies, and module prerequisites. Token requests use form encoding, not JSON.',
        ],
      },
      {
        id: 'browser-boundary',
        title: ['业务应用与账户界面的边界', 'Applications and account UI'],
        body: [
          '第三方应用通过标准 OAuth / OIDC 端点接入。/auth/* 与 /admin/* 属于账户和管理界面的会话接口，不应被当作第三方 OAuth 客户端的密码登录入口。',
          'Third-party applications integrate through standard OAuth / OIDC endpoints. /auth/* and /admin/* are session interfaces for the account and administration UI, not password sign-in endpoints for third-party OAuth clients.',
        ],
      },
    ],
  },
  {
    id: 'troubleshooting',
    group: 'reference',
    title: ['接入排错', 'Troubleshooting'],
    summary: [
      '按错误发生的阶段定位问题，保留错误码并核对配置。',
      'Locate issues by the stage where they occur. Preserve error codes and check configuration.',
    ],
    source: 'docs/integration/openid-connect.md',
    sections: [
      {
        id: 'authorization-errors',
        title: ['授权请求失败', 'Authorization request failures'],
        table: {
          heads: [
            ['现象', 'Symptom'],
            ['优先检查', 'Check first'],
          ],
          rows: [
            [
              ['回调地址被拒绝', 'Redirect URI rejected'],
              [
                'scheme、host、port、path 与注册值是否完全一致，参数是否正确编码。',
                'Exact scheme, host, port, and path matching, plus correct parameter encoding.',
              ],
            ],
            [
              ['invalid_scope', 'invalid_scope'],
              [
                'scope 是否在客户端允许范围内，是否正确以空格分隔。',
                'Whether scopes are allowed for the client and correctly space-separated.',
              ],
            ],
            [
              ['unauthorized_client', 'unauthorized_client'],
              [
                'grant 是否注册，以及客户端 security_policy 是否允许当前流程。',
                "Registered grants and whether the client's security_policy permits this flow.",
              ],
            ],
            [
              ['登录后返回错误应用', 'Wrong application after login'],
              [
                '本次登录的 state、redirect_uri 与一次性会话是否正确绑定。',
                'Binding between the sign-in state, redirect_uri, and single-use session.',
              ],
            ],
          ],
        },
      },
      {
        id: 'token-errors',
        title: ['令牌请求与 API 失败', 'Token and API failures'],
        table: {
          heads: [
            ['错误', 'Error'],
            ['优先检查', 'Check first'],
          ],
          rows: [
            [
              ['invalid_client', 'invalid_client'],
              [
                '客户端认证方式、client_id、凭据与注册值；不要混用多种认证方式。',
                'Registered authentication method, client_id, and credentials. Do not mix authentication methods.',
              ],
            ],
            [
              ['invalid_grant', 'invalid_grant'],
              [
                '授权码是否过期或重复使用，redirect_uri 与 code_verifier 是否匹配；刷新令牌是否已轮换。',
                'Expired or reused codes, matching redirect_uri and code_verifier, or a refresh token that has already rotated.',
              ],
            ],
            [
              ['API 401', 'API 401'],
              [
                '令牌类型、签名、issuer、audience、时钟、有效期与发送方证明。',
                'Token type, signature, issuer, audience, clock, lifetime, and sender proof.',
              ],
            ],
            [
              ['API 403', 'API 403'],
              [
                'scope 与用户 / 客户端对具体资源的业务权限。',
                "Scopes and the user or client's permission for the business resource.",
              ],
            ],
          ],
        },
      },
      {
        id: 'deployment-errors',
        title: ['域名、代理与 Passkey', 'Origin, proxy, and passkey issues'],
        body: [
          '先核对 PUBLIC_BASE_URL、实际访问域名、TLS 终止和可信代理配置，再检查 Discovery 中的 issuer 与端点。Passkey origin / RP ID 和 Cookie 条件均受公开域名影响。',
          'First check PUBLIC_BASE_URL, the accessed hostname, TLS termination, and trusted proxies. Then compare the discovery issuer and endpoints. The public origin affects passkey origin / RP ID and cookie requirements.',
        ],
      },
      {
        id: 'support',
        title: ['提交有效的问题报告', 'Report an actionable issue'],
        body: [
          '提供服务端与前端版本、发生阶段、错误码、时间和脱敏配置。删除密码、令牌、授权码、客户端秘密和个人信息，再附上最小复现步骤。',
          'Include server and frontend versions, the failing stage, error code, timestamp, and sanitized configuration. Remove passwords, tokens, authorization codes, client secrets, and personal information before attaching minimal reproduction steps.',
        ],
        links: [
          {
            path: '/contact',
            label: ['获取支持', 'Get support'],
          },
          {
            href: 'https://github.com/nazozero/NazoAuth/issues',
            label: ['查看项目问题', 'Project issues'],
          },
        ],
      },
    ],
  },
];
