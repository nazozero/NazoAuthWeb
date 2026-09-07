import type { DocPage } from './content';

export const referencePages: DocPage[] = [
  {
    "id": "architecture",
    "group": "start",
    "title": [
      "架构与扩展",
      "Architecture and extension"
    ],
    "summary": [
      "协议、身份、存储和控制工具各有明确职责。按真实边界组合部署。",
      "Protocol, identity, storage, and lifecycle tools have distinct responsibilities. Compose a deployment around these boundaries."
    ],
    "source": "docs/project/architecture.md",
    "sections": [
      {
        "id": "core",
        "title": [
          "协议核心与适配器",
          "Protocol core and adapters"
        ],
        "body": [
          "NazoAuth 是 Rust 模块化服务。协议与身份逻辑面向语义接口，不依赖 PostgreSQL、Valkey、SQL 行或具体驱动。持久存储、短期状态、签名器和对象存储在组合入口接入；新增实现需要满足对应接口的事务、原子性、隔离和恢复语义。",
          "NazoAuth is a modular Rust server. Protocol and identity logic depend on semantic interfaces, independent of PostgreSQL, Valkey, SQL rows, and drivers. Persistence, transient state, signing, and object storage are wired at the composition root. New implementations must preserve their port's transaction, atomicity, isolation, and recovery semantics."
        ],
        "flow": [
          [
            "协议与身份",
            "Protocol & identity"
          ],
          [
            "语义接口",
            "Semantic ports"
          ],
          [
            "基础设施适配器",
            "Infrastructure adapters"
          ]
        ],
        "table": {
          "heads": [
            [
              "边界",
              "Boundary"
            ],
            [
              "承担的职责",
              "Responsibility"
            ]
          ],
          "rows": [
            [
              [
                "nazo-auth",
                "nazo-auth"
              ],
              [
                "OAuth、OIDC、FAPI、CIBA 的策略、授权、声明与元数据。",
                "OAuth, OIDC, FAPI, and CIBA policy, grants, claims, and metadata."
              ]
            ],
            [
              [
                "nazo-identity",
                "nazo-identity"
              ],
              [
                "租户、账户、登录、会话、MFA 与 Passkey。",
                "Tenants, accounts, sign-in, sessions, MFA, and passkeys."
              ]
            ],
            [
              [
                "nazo-persistence",
                "nazo-persistence"
              ],
              [
                "持久化业务契约；具体数据库通过适配器实现。",
                "Durable business contracts implemented by concrete database adapters."
              ]
            ],
            [
              [
                "nazo-oauth-server",
                "nazo-oauth-server"
              ],
              [
                "不绑定数据库实现的应用库，装配服务与 HTTP 路由。",
                "Database-neutral application library assembling services and HTTP routes."
              ]
            ],
            [
              [
                "nazoauth",
                "nazoauth"
              ],
              [
                "默认可执行发行版，组合 PostgreSQL、Valkey 与对象存储适配器。",
                "Default executable distribution composing PostgreSQL, Valkey, and object-storage adapters."
              ]
            ]
          ]
        }
      },
      {
        "id": "available-adapters",
        "title": [
          "默认发行版与可扩展性",
          "Default distribution and extensibility"
        ],
        "body": [
          "目前随默认发行版提供的持久存储是 PostgreSQL，短期状态是 Valkey；对象存储支持显式选择 local 或 S3。核心可扩展，不代表发行包已内置 MySQL、SQLite 或任意 KV 的运行时切换。接入其他实现需要实现并验证端口，再组合对应发行版。",
          "The default distribution currently ships PostgreSQL persistence and Valkey transient state. Object storage explicitly supports local or S3. An extensible core does not mean the binary includes runtime switches for MySQL, SQLite, or arbitrary KV stores. Another implementation requires an adapter, contract validation, and a corresponding composition."
        ],
        "links": [
          {
            "section": "storage",
            "label": [
              "存储配置与边界",
              "Storage configuration and boundaries"
            ]
          }
        ]
      },
      {
        "id": "deployment-components",
        "title": [
          "独立运行的组成部分",
          "Independently operated components"
        ],
        "table": {
          "heads": [
            [
              "组成部分",
              "Component"
            ],
            [
              "运行职责",
              "Runtime responsibility"
            ]
          ],
          "rows": [
            [
              [
                "NazoAuth",
                "NazoAuth"
              ],
              [
                "处理协议、租户身份和授权决策。",
                "Serves protocols, tenant identity, and authorization decisions."
              ]
            ],
            [
              [
                "NazoAuthWeb",
                "NazoAuthWeb"
              ],
              [
                "登录、授权确认、账户与管理界面。",
                "Sign-in, consent, account, and management UI."
              ]
            ],
            [
              [
                "NazoAuthCtl",
                "NazoAuthCtl"
              ],
              [
                "可选的安装、更新、证书、备份与恢复工具，不是在线认证请求的依赖。",
                "Optional installation, update, certificate, backup, and recovery tool; not a dependency of live authentication requests."
              ]
            ],
            [
              [
                "Direct TLS / 可信反向代理",
                "Direct TLS / trusted proxy"
              ],
              [
                "服务端可直接终止 TLS，也可使用配置过信任边界的入口代理。",
                "The server can terminate TLS itself or use ingress with an explicitly configured trust boundary."
              ]
            ],
            [
              [
                "nazo-resource-server",
                "nazo-resource-server"
              ],
              [
                "在资源服务器侧验证 JWT 与发送方约束的独立 Rust 库。",
                "Independent Rust library validating JWTs and sender constraints at resource servers."
              ]
            ]
          ]
        }
      },
      {
        "id": "multi-domain",
        "title": [
          "多个租户，多个域名",
          "Multiple tenants and domains"
        ],
        "body": [
          "一个部署可以通过不同域名承载多个租户。每个租户绑定一个规范主机名和 issuer，请求按主机名进入对应租户运行配置。租户内前端、Cookie、Passkey 和协议地址由该租户的 issuer 派生；这不等于整个部署只能有一个域名。",
          "One deployment can serve multiple tenants through distinct domains. Each tenant binds a canonical hostname and issuer; requests select the corresponding tenant runtime by hostname. The frontend, cookies, passkeys, and protocol addresses are derived within that tenant, rather than imposing one domain on the whole deployment."
        ],
        "links": [
          {
            "section": "tenants",
            "label": [
              "租户与域名配置",
              "Tenants and domains"
            ]
          },
          {
            "section": "transport",
            "label": [
              "TLS 与代理",
              "TLS and proxy"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "standards",
    "group": "start",
    "title": [
      "协议与规范",
      "Protocols and standards"
    ],
    "summary": [
      "按用途查看支持的标准、执行条件与明确边界。",
      "Find supported standards, execution conditions, and explicit boundaries by use case."
    ],
    "source": "docs/integration/openid-connect.md",
    "sections": [
      {
        "id": "meaning",
        "title": [
          "如何理解“支持”",
          "What support means"
        ],
        "body": [
          "以下列出当前实现的协议能力；能力是否在某个租户可用，还取决于活动模块、完整配置与客户端策略。Discovery 是该租户当前可执行能力的公开投影。协议实现、某次测试通过与基金会认证是不同事实，认证的版本和范围见独立章节。",
          "The capabilities below describe the implementation. Availability in a tenant depends on active modules, complete configuration, and client policy. Discovery projects that tenant's executable capabilities. Implementation, a test result, and Foundation certification are distinct facts; certification versions and scope have their own chapter."
        ],
        "links": [
          {
            "section": "certification",
            "label": [
              "已获得的认证",
              "Certification records"
            ]
          },
          {
            "section": "modules",
            "label": [
              "能力与客户端策略",
              "Capabilities and client policy"
            ]
          }
        ]
      },
      {
        "id": "oauth-oidc",
        "title": [
          "OAuth 与 OpenID Connect",
          "OAuth and OpenID Connect"
        ],
        "table": {
          "heads": [
            [
              "协议 / 规范",
              "Protocol / specification"
            ],
            [
              "支持范围与条件",
              "Scope and conditions"
            ]
          ],
          "rows": [
            [
              [
                "OAuth 2.0 · RFC 6749",
                "OAuth 2.0 · RFC 6749"
              ],
              [
                "授权码、刷新令牌和客户端凭据；授权类型必须进入客户端白名单。",
                "Authorization code, refresh token, and client credentials; grants must be allowed for the client."
              ]
            ],
            [
              [
                "OpenID Connect Core 1.0",
                "OpenID Connect Core 1.0"
              ],
              [
                "授权码登录、ID Token、UserInfo；交互流程不提供 Implicit 或 Hybrid。",
                "Code-flow sign-in, ID Tokens, and UserInfo; no implicit or hybrid interactive flow."
              ]
            ],
            [
              [
                "OpenID Connect Discovery 1.0 / RFC 8414",
                "OpenID Connect Discovery 1.0 / RFC 8414"
              ],
              [
                "按活动租户发布 OIDC / OAuth 授权服务器元数据。",
                "OIDC / OAuth authorization-server metadata for the active tenant."
              ]
            ],
            [
              [
                "RFC 9728",
                "RFC 9728"
              ],
              [
                "受保护资源元数据，声明资源标识与授权服务器。",
                "Protected-resource metadata identifying resources and authorization servers."
              ]
            ],
            [
              [
                "RFC 7636 · PKCE",
                "RFC 7636 · PKCE"
              ],
              [
                "支持 S256；public、FAPI、发送方约束和非 OIDC 授权码客户端强制使用。新接入统一推荐 S256。",
                "S256 is enforced for public, FAPI, sender-constrained, and non-OIDC code clients. Use S256 for new integrations."
              ]
            ],
            [
              [
                "RFC 7591 / RFC 7592",
                "RFC 7591 / RFC 7592"
              ],
              [
                "动态客户端注册及管理；需要活动模块与初始访问令牌。",
                "Dynamic client registration and management require an active module and initial-access token."
              ]
            ],
            [
              [
                "Form Post / Third-Party Initiated Login",
                "Form Post / Third-Party Initiated Login"
              ],
              [
                "支持相应响应模式及 RP 登录入口元数据，仍只返回授权码。",
                "Supports the response mode and RP initiation metadata while retaining code-only interactive responses."
              ]
            ],
            [
              [
                "OpenID Connect RP Metadata Choices 1.0",
                "OpenID Connect RP Metadata Choices 1.0"
              ],
              [
                "注册时协商受支持选项，保存并执行单值元数据。",
                "Negotiates supported registration choices, then persists and enforces selected single-valued metadata."
              ]
            ]
          ]
        },
        "links": [
          {
            "href": "https://openid.net/specs/openid-connect-core-1_0.html",
            "label": [
              "OpenID Connect Core 1.0",
              "OpenID Connect Core 1.0"
            ]
          },
          {
            "href": "https://www.rfc-editor.org/rfc/rfc8414.html",
            "label": [
              "RFC 8414",
              "RFC 8414"
            ]
          },
          {
            "href": "https://www.rfc-editor.org/rfc/rfc7636.html",
            "label": [
              "RFC 7636",
              "RFC 7636"
            ]
          }
        ]
      },
      {
        "id": "tokens-protection",
        "title": [
          "令牌与请求保护",
          "Token and request protection"
        ],
        "table": {
          "heads": [
            [
              "规范",
              "Specification"
            ],
            [
              "实现范围",
              "Implementation scope"
            ]
          ],
          "rows": [
            [
              [
                "RFC 7009 / RFC 7662",
                "RFC 7009 / RFC 7662"
              ],
              [
                "令牌撤销与内省，执行客户端与令牌归属校验。",
                "Revocation and introspection enforce client and token ownership."
              ]
            ],
            [
              [
                "RFC 9068 / RFC 8725",
                "RFC 9068 / RFC 8725"
              ],
              [
                "JWT 访问令牌及 JWT 安全实践；资源侧验证 issuer、audience、期限与权限。",
                "JWT access tokens and JWT security practices; resources validate issuer, audience, lifetime, and permissions."
              ]
            ],
            [
              [
                "RFC 9126 · PAR",
                "RFC 9126 · PAR"
              ],
              [
                "通过后端提交授权请求；FAPI2 要求使用。",
                "Pushes authorization requests over the back channel; required for FAPI2."
              ]
            ],
            [
              [
                "RFC 9101 · JAR / JARM",
                "RFC 9101 · JAR / JARM"
              ],
              [
                "签名授权请求与响应；加密需要客户端配置及匹配的密钥。",
                "Signed authorization requests and responses; encryption requires client configuration and matching keys."
              ]
            ],
            [
              [
                "RFC 9449 · DPoP",
                "RFC 9449 · DPoP"
              ],
              [
                "密钥绑定令牌，校验证明、请求目标、方法、nonce 与重放状态。",
                "Key-bound tokens with proof, request target, method, nonce, and replay validation."
              ]
            ],
            [
              [
                "RFC 8705 · mTLS",
                "RFC 8705 · mTLS"
              ],
              [
                "TLS 客户端认证和证书绑定令牌；需要可信证书来源。",
                "TLS client authentication and certificate-bound tokens require a trusted certificate source."
              ]
            ],
            [
              [
                "RFC 8707",
                "RFC 8707"
              ],
              [
                "资源指示符；用重复的 resource 参数传递 URI。",
                "Resource indicators use repeated URI-valued resource parameters."
              ]
            ],
            [
              [
                "RFC 7523",
                "RFC 7523"
              ],
              [
                "private_key_jwt；JWT bearer grant 限于已认证机密客户端的自身断言。",
                "private_key_jwt; JWT bearer grant is bounded to authenticated confidential-client self-assertion."
              ]
            ],
            [
              [
                "RFC 8693",
                "RFC 8693"
              ],
              [
                "有边界的 Token Exchange，按已实现令牌类型、目标与 scope 约束执行。",
                "Bounded Token Exchange enforcing implemented token types, target, and scope restrictions."
              ]
            ],
            [
              [
                "RFC 9700 / RFC 9701",
                "RFC 9700 / RFC 9701"
              ],
              [
                "OAuth 安全实践；受保护内省响应按客户端签名/加密元数据提供。",
                "OAuth security practices; protected introspection follows client signing/encryption metadata."
              ]
            ]
          ]
        },
        "links": [
          {
            "href": "https://www.rfc-editor.org/rfc/rfc9449.html",
            "label": [
              "RFC 9449 · DPoP",
              "RFC 9449 · DPoP"
            ]
          },
          {
            "href": "https://www.rfc-editor.org/rfc/rfc8705.html",
            "label": [
              "RFC 8705 · mTLS",
              "RFC 8705 · mTLS"
            ]
          },
          {
            "href": "https://www.rfc-editor.org/rfc/rfc9700.html",
            "label": [
              "RFC 9700",
              "RFC 9700"
            ]
          }
        ]
      },
      {
        "id": "high-assurance",
        "title": [
          "高安全级别与跨设备流程",
          "High assurance and cross-device flows"
        ],
        "table": {
          "heads": [
            [
              "规范",
              "Specification"
            ],
            [
              "执行条件",
              "Execution conditions"
            ]
          ],
          "rows": [
            [
              [
                "FAPI 2.0 Security Profile Final",
                "FAPI 2.0 Security Profile Final"
              ],
              [
                "客户端 assurance=fapi2；机密客户端、强认证、PAR、S256 PKCE 与发送方约束。",
                "Client assurance=fapi2; confidential clients, strong authentication, PAR, S256 PKCE, and sender constraints."
              ]
            ],
            [
              [
                "FAPI 2.0 Message Signing Final",
                "FAPI 2.0 Message Signing Final"
              ],
              [
                "JAR、JARM 与签名内省由独立客户端策略组合。",
                "JAR, JARM, and signed introspection are selected through composable client policies."
              ]
            ],
            [
              [
                "RFC 8628 · Device Authorization",
                "RFC 8628 · Device Authorization"
              ],
              [
                "活动模块、device-code 授权类型与 allow_cross_device_flows=true。",
                "Active module, device-code grant, and allow_cross_device_flows=true."
              ]
            ],
            [
              [
                "OpenID CIBA Core / FAPI-CIBA ID1",
                "OpenID CIBA Core / FAPI-CIBA ID1"
              ],
              [
                "poll 与 ping，支持 private_key_jwt / mTLS；不支持 push。客户端需跨设备权限。",
                "Poll and ping with private_key_jwt / mTLS; push is unsupported. Client cross-device authority is required."
              ]
            ],
            [
              [
                "OIDC Logout / Session Management",
                "OIDC Logout / Session Management"
              ],
              [
                "RP-Initiated、Front-Channel、Back-Channel Logout 与 Session Management；需对应注册元数据和策略。",
                "RP-Initiated, Front-Channel, and Back-Channel Logout plus Session Management; registration metadata and policy apply."
              ]
            ]
          ]
        },
        "links": [
          {
            "href": "https://openid.net/specs/fapi-2_0-security-profile.html",
            "label": [
              "FAPI 2.0 Security Profile",
              "FAPI 2.0 Security Profile"
            ]
          },
          {
            "href": "https://openid.net/specs/fapi-2_0-message-signing.html",
            "label": [
              "FAPI 2.0 Message Signing",
              "FAPI 2.0 Message Signing"
            ]
          },
          {
            "section": "flow",
            "label": [
              "授权流程",
              "Authorization flows"
            ]
          }
        ]
      },
      {
        "id": "identity-credentials",
        "title": [
          "身份与数字凭证",
          "Identity and digital credentials"
        ],
        "table": {
          "heads": [
            [
              "规范",
              "Specification"
            ],
            [
              "支持范围",
              "Scope"
            ]
          ],
          "rows": [
            [
              [
                "WebAuthn / FIDO2 · TOTP",
                "WebAuthn / FIDO2 · TOTP"
              ],
              [
                "Passkey、TOTP 与恢复码；绑定租户 RP 身份与验证策略。",
                "Passkeys, TOTP, and recovery codes with tenant RP identity and verification policy."
              ]
            ],
            [
              [
                "SCIM 2.0 · RFC 7643 / RFC 7644",
                "SCIM 2.0 · RFC 7643 / RFC 7644"
              ],
              [
                "账户供应与管理接口；需要 SCIM 授权和相应 scope。",
                "Identity provisioning and management require SCIM authority and scopes."
              ]
            ],
            [
              [
                "OpenID4VCI 1.0 Final",
                "OpenID4VCI 1.0 Final"
              ],
              [
                "Credential Issuer 角色，按凭证类型与信任配置启用。",
                "Credential Issuer role enabled with credential-type and trust configuration."
              ]
            ],
            [
              [
                "OpenID4VP 1.0 Final",
                "OpenID4VP 1.0 Final"
              ],
              [
                "Verifier 角色，按钱包交互、信任与格式配置启用。",
                "Verifier role enabled with wallet interaction, trust, and format configuration."
              ]
            ],
            [
              [
                "OpenID4VC HAIP 1.0",
                "OpenID4VC HAIP 1.0"
              ],
              [
                "面向高保证数字凭证的互操作配置，独立于普通 OIDC 登录。",
                "High-assurance digital-credential interoperability, separate from ordinary OIDC sign-in."
              ]
            ]
          ]
        },
        "links": [
          {
            "section": "credentials",
            "label": [
              "数字凭证配置",
              "Digital credential configuration"
            ]
          },
          {
            "href": "https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0-final.html",
            "label": [
              "OpenID4VC HAIP 1.0",
              "OpenID4VC HAIP 1.0"
            ]
          }
        ]
      },
      {
        "id": "drafts-boundaries",
        "title": [
          "草案与未实现范围",
          "Drafts and exclusions"
        ],
        "body": [
          "OAuth 2.1 当前实现按 draft-15 对齐；这里不宣称它是最终 RFC。Native SSO 按 draft-07 / ID2 支持，需要显式启用。RAR、SCIM 安全事件和实验性 HTTP Signatures 需要完整的角色配置。OpenID Federation 1.1 信任链属于规划能力。Implicit、Hybrid、密码授权、未签名 Request Object、query bearer token 与 CIBA push 不提供开关启用。",
          "The OAuth 2.1 implementation aligns with draft-15; this is not a final-RFC claim. Native SSO follows draft-07 / ID2 and requires explicit enablement. RAR, SCIM security events, and experimental HTTP Signatures need complete role configuration. OpenID Federation 1.1 trust chains are planned. Implicit, hybrid, password grants, unsigned Request Objects, query bearer tokens, and CIBA push have no enablement switch."
        ],
        "links": [
          {
            "href": "https://github.com/nazozero/NazoAuth/blob/main/docs/integration/openid-connect.md",
            "label": [
              "完整规范与草案状态表",
              "Full standards and draft status matrix"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "certification",
    "group": "start",
    "title": [
      "认证与验证记录",
      "Certification and validation"
    ],
    "summary": [
      "从 OpenID Foundation 的公开登记核对版本、日期与认证配置。",
      "Verify versions, dates, and certification profiles against the OpenID Foundation's public registry."
    ],
    "source": "docs/conformance/README.md",
    "sections": [
      {
        "id": "registry",
        "title": [
          "OpenID Certified",
          "OpenID Certified"
        ],
        "body": [
          "OpenID Foundation 公开目录登记的实现为 Nazo Auth Server 0.2.0。OIDC、登出、FAPI2 与 CIBA 记录为 2026-07-29；OpenID4VCI + HAIP 的 Issuer 记录为 2026-08-21；OpenID4VP + HAIP 的 Verifier 记录为 2026-08-23。本页于 2026-09-07 核对公开目录，认证对应所列版本、角色与配置。",
          "The OpenID Foundation registry lists Nazo Auth Server 0.2.0. OIDC, logout, FAPI2, and CIBA records are dated 2026-07-29; OpenID4VCI + HAIP Issuer records are dated 2026-08-21; OpenID4VP + HAIP Verifier records are dated 2026-08-23. Public records were checked on 2026-09-07. Certifications apply to their listed versions, roles, and profiles."
        ],
        "links": [
          {
            "href": "https://openid.net/certification/all-certified-implementations/",
            "label": [
              "OpenID Foundation 认证目录",
              "OpenID Foundation certification registry"
            ]
          }
        ]
      },
      {
        "id": "oidc-certified",
        "title": [
          "OpenID Connect 与登出",
          "OpenID Connect and logout"
        ],
        "table": {
          "heads": [
            [
              "认证配置",
              "Certified profile"
            ],
            [
              "登记版本 / 日期",
              "Registered version / date"
            ]
          ],
          "rows": [
            [
              [
                "Basic OP",
                "Basic OP"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ],
            [
              [
                "Config OP",
                "Config OP"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ],
            [
              [
                "Form Post OP",
                "Form Post OP"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ],
            [
              [
                "3rd Party-Init OP",
                "3rd Party-Init OP"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ],
            [
              [
                "RP-Initiated OP",
                "RP-Initiated OP"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ],
            [
              [
                "Session OP",
                "Session OP"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ],
            [
              [
                "Front-Channel OP",
                "Front-Channel OP"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ],
            [
              [
                "Back-Channel OP",
                "Back-Channel OP"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ]
          ]
        },
        "links": [
          {
            "href": "https://openid.net/certification/certified-openid-providers-profiles/",
            "label": [
              "核对 OIDC 认证",
              "Verify OIDC certifications"
            ]
          },
          {
            "href": "https://openid.net/certification/certified-openid-providers-for-logout-profiles/",
            "label": [
              "核对登出认证",
              "Verify logout certifications"
            ]
          }
        ]
      },
      {
        "id": "fapi-certified",
        "title": [
          "FAPI 2.0 Final",
          "FAPI 2.0 Final"
        ],
        "table": {
          "heads": [
            [
              "认证配置",
              "Certified profile"
            ],
            [
              "已登记组合",
              "Registered combinations"
            ]
          ],
          "rows": [
            [
              [
                "Security Profile OP",
                "Security Profile OP"
              ],
              [
                "mTLS + mTLS；mTLS + DPoP；private key + mTLS；private key + DPoP。",
                "mTLS + mTLS; mTLS + DPoP; private key + mTLS; private key + DPoP."
              ]
            ],
            [
              [
                "Security Profile OP OpenID Connect",
                "Security Profile OP OpenID Connect"
              ],
              [
                "OIDC 配置。",
                "OIDC profile."
              ]
            ],
            [
              [
                "Message Signing OP",
                "Message Signing OP"
              ],
              [
                "JAR 与 JARM。",
                "JAR and JARM."
              ]
            ],
            [
              [
                "Security Profile OP Client Credentials",
                "Security Profile OP Client Credentials"
              ],
              [
                "mTLS + mTLS；mTLS + DPoP；private key + mTLS；private key + DPoP。",
                "mTLS + mTLS; mTLS + DPoP; private key + mTLS; private key + DPoP."
              ]
            ]
          ]
        },
        "note": [
          "以上均为 Nazo Auth Server 0.2.0，2026-07-29。组合前项为客户端认证方式，后项为令牌发送方约束。",
          "All rows are for Nazo Auth Server 0.2.0, dated 2026-07-29. The first term is client authentication; the second is the token sender constraint."
        ],
        "links": [
          {
            "href": "https://openid.net/certification/certified-fapi-2-0-op-security-profile-final-message-signing-final/",
            "label": [
              "核对 FAPI 2.0 Final 认证",
              "Verify FAPI 2.0 Final certifications"
            ]
          }
        ]
      },
      {
        "id": "ciba-certified",
        "title": [
          "FAPI-CIBA",
          "FAPI-CIBA"
        ],
        "table": {
          "heads": [
            [
              "认证配置",
              "Certified profile"
            ],
            [
              "登记版本 / 日期",
              "Registered version / date"
            ]
          ],
          "rows": [
            [
              [
                "Poll with mTLS",
                "Poll with mTLS"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ],
            [
              [
                "Poll with Private Key",
                "Poll with Private Key"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ],
            [
              [
                "Ping with mTLS",
                "Ping with mTLS"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ],
            [
              [
                "Ping with Private Key",
                "Ping with Private Key"
              ],
              [
                "0.2.0 · 2026-07-29",
                "0.2.0 · 2026-07-29"
              ]
            ]
          ]
        },
        "links": [
          {
            "href": "https://openid.net/certification/certified-fapi-ciba-openid-providers-profiles/",
            "label": [
              "核对 FAPI-CIBA 认证",
              "Verify FAPI-CIBA certifications"
            ]
          }
        ]
      },
      {
        "id": "vci-certified",
        "title": [
          "OpenID4VCI 1.0 + HAIP 1.0",
          "OpenID4VCI 1.0 + HAIP 1.0"
        ],
        "table": {
          "heads": [
            [
              "认证角色与配置",
              "Certified role and profile"
            ],
            [
              "登记版本 / 日期",
              "Registered version / date"
            ]
          ],
          "rows": [
            [
              [
                "Issuer · sd_jwt_vc · issuer_initiated",
                "Issuer · sd_jwt_vc · issuer_initiated"
              ],
              [
                "v0.2.0 · 2026-08-21",
                "v0.2.0 · 2026-08-21"
              ]
            ],
            [
              [
                "Issuer · sd_jwt_vc · wallet_initiated",
                "Issuer · sd_jwt_vc · wallet_initiated"
              ],
              [
                "v0.2.0 · 2026-08-21",
                "v0.2.0 · 2026-08-21"
              ]
            ],
            [
              [
                "Issuer · mdoc · issuer_initiated",
                "Issuer · mdoc · issuer_initiated"
              ],
              [
                "v0.2.0 · 2026-08-21",
                "v0.2.0 · 2026-08-21"
              ]
            ],
            [
              [
                "Issuer · mdoc · wallet_initiated",
                "Issuer · mdoc · wallet_initiated"
              ],
              [
                "v0.2.0 · 2026-08-21",
                "v0.2.0 · 2026-08-21"
              ]
            ]
          ]
        },
        "links": [
          {
            "href": "https://openid.net/certification/certified-oid4vci-haip-final/",
            "label": [
              "核对 OpenID4VCI + HAIP 认证",
              "Verify OpenID4VCI + HAIP certifications"
            ]
          }
        ]
      },
      {
        "id": "vp-certified",
        "title": [
          "OpenID4VP 1.0 + HAIP 1.0",
          "OpenID4VP 1.0 + HAIP 1.0"
        ],
        "table": {
          "heads": [
            [
              "认证角色与配置",
              "Certified role and profile"
            ],
            [
              "登记版本 / 日期",
              "Registered version / date"
            ]
          ],
          "rows": [
            [
              [
                "Verifier · sd_jwt_vc · direct_post.jwt",
                "Verifier · sd_jwt_vc · direct_post.jwt"
              ],
              [
                "v0.2.0 · 2026-08-23",
                "v0.2.0 · 2026-08-23"
              ]
            ],
            [
              [
                "Verifier · iso_mdl · direct_post.jwt",
                "Verifier · iso_mdl · direct_post.jwt"
              ],
              [
                "v0.2.0 · 2026-08-23",
                "v0.2.0 · 2026-08-23"
              ]
            ]
          ]
        },
        "links": [
          {
            "href": "https://openid.net/certification/certified-oid4vp-haip-final/",
            "label": [
              "核对 OpenID4VP + HAIP 认证",
              "Verify OpenID4VP + HAIP certifications"
            ]
          }
        ]
      },
      {
        "id": "release-validation",
        "title": [
          "后续发行版的工程验证",
          "Engineering validation of later releases"
        ],
        "body": [
          "2026-09-06 的项目验收记录绑定 NazoAuth v0.2.15 与 NazoAuthCtl v0.2.27 的已发布制品。在 Direct TLS 与可信代理两种模式下，每种实例化 1198 个模块：1145 PASSED、42 REVIEW、11 SKIPPED，失败、警告与未完成均为 0。人工评审与跳过保持原始分类。这是指定发行制品的工程验收，不是新增基金会认证。",
          "The 2026-09-06 project acceptance record binds published NazoAuth v0.2.15 and NazoAuthCtl v0.2.27 artifacts. Direct TLS and trusted-proxy modes each instantiated 1198 modules: 1145 PASSED, 42 REVIEW, and 11 SKIPPED, with zero failed, warning, or incomplete. Review and skip classifications are retained. This is artifact-specific engineering acceptance, not an additional Foundation certification."
        ],
        "links": [
          {
            "href": "https://github.com/nazozero/NazoAuth/blob/main/docs/conformance/oidf-2026-09-06-official-release.md",
            "label": [
              "发行版验收与证据摘要",
              "Release acceptance and evidence summary"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tenants",
    "group": "operate",
    "title": [
      "租户与域名",
      "Tenants and domains"
    ],
    "summary": [
      "以明确的 issuer 和主机名建立租户边界，管理目录与生命周期。",
      "Establish tenant boundaries with explicit issuers and hostnames, then manage their directory and lifecycle."
    ],
    "source": "docs/project/multitenancy/runtime-directory-lifecycle.md",
    "sections": [
      {
        "id": "binding",
        "title": [
          "一个租户绑定一个规范主机名",
          "One canonical hostname per tenant"
        ],
        "body": [
          "每个目录绑定包含 tenant、realm、organization、external_host、issuer 与 runtime_revision。host 必须与 issuer 的主机名一致且在目录中唯一。一个部署可以有多个绑定，因此支持多个域名；多个任意域名别名自动共用同一 issuer 并不是这个模型。未知或禁用的主机名不会回退到默认租户。",
          "Each directory binding contains tenant, realm, organization, external_host, issuer, and runtime_revision. The host must match the issuer hostname and be unique in the directory. Multiple bindings support multiple domains in one deployment; arbitrary aliases do not automatically share an issuer. Unknown or disabled hosts never fall back to a default tenant."
        ],
        "table": {
          "heads": [
            [
              "请求域名",
              "Request hostname"
            ],
            [
              "租户",
              "Tenant"
            ],
            [
              "Issuer",
              "Issuer"
            ]
          ],
          "rows": [
            [
              [
                "auth.team-a.com",
                "auth.team-a.com"
              ],
              [
                "Team A",
                "Team A"
              ],
              [
                "https://auth.team-a.com",
                "https://auth.team-a.com"
              ]
            ],
            [
              [
                "identity.team-b.net",
                "identity.team-b.net"
              ],
              [
                "Team B",
                "Team B"
              ],
              [
                "https://identity.team-b.net",
                "https://identity.team-b.net"
              ]
            ]
          ]
        }
      },
      {
        "id": "boundaries",
        "title": [
          "租户隔离与同源默认值",
          "Tenant isolation and same-origin defaults"
        ],
        "body": [
          "当前目录管理路径按租户 issuer 派生 /ui/ 前端、CORS origin、Passkey RP 身份及协议 URL。租户客户端、令牌、密钥、nonce、重放状态与审计归属受到租户边界约束。更换域名会影响 issuer 校验与 Passkey RP 身份，不能把 DNS 改名当成无影响的界面变更。",
          "The current directory-managed path derives each tenant's /ui/ frontend, CORS origin, passkey RP identity, and protocol URLs from its issuer. Clients, tokens, keys, nonces, replay state, and audit ownership are tenant-bound. Changing domains affects issuer validation and passkey RP identity; it is not merely a cosmetic DNS change."
        ],
        "note": [
          "多域名租户与跨域托管前端是两个问题。NazoAuthWeb 当前使用同源 API；目录租户固定按 issuer 派生前端和 CORS。不能只设置 FRONTEND_BASE_URL 就宣称已支持任意跨域前端部署。",
          "Multi-domain tenancy and cross-origin frontend hosting are separate concerns. NazoAuthWeb uses same-origin APIs, and directory tenants derive frontend and CORS from the issuer. FRONTEND_BASE_URL alone does not establish arbitrary cross-origin frontend support."
        ]
      },
      {
        "id": "lifecycle",
        "title": [
          "管理与应用目录变更",
          "Managing and applying directory changes"
        ],
        "body": [
          "租户生命周期由签名的 controller task 管理。操作绑定部署、目标租户、请求摘要、JTI 和预期目录版本；重复相同操作可获得已记录结果，过期版本或冲突请求会失败。租户管理员只管理本租户；系统管理权限还要求属于 control tenant 并满足管理员级别。",
          "Signed controller tasks own tenant lifecycle. Operations bind the deployment, target tenant, request hash, JTI, and expected directory revision. Identical retries return recorded outcomes; stale revisions and conflicting requests fail. Tenant administrators manage their own tenant; system authority additionally requires control-tenant membership and the required administrator level."
        ],
        "table": {
          "heads": [
            [
              "操作",
              "Operation"
            ],
            [
              "作用",
              "Effect"
            ]
          ],
          "rows": [
            [
              [
                "tenant-directory-create / update",
                "tenant-directory-create / update"
              ],
              [
                "创建或修改目录绑定。",
                "Create or update a directory binding."
              ]
            ],
            [
              [
                "tenant-directory-disable",
                "tenant-directory-disable"
              ],
              [
                "停止新请求命中该租户。",
                "Prevent new requests from selecting the tenant."
              ]
            ],
            [
              [
                "tenant-directory-reload",
                "tenant-directory-reload"
              ],
              [
                "递增目标 runtime_revision，重建该租户运行配置。",
                "Increment the target runtime_revision and rebuild its runtime."
              ]
            ],
            [
              [
                "tenant-directory-describe",
                "tenant-directory-describe"
              ],
              [
                "读取全局版本与租户绑定状态。",
                "Read global revision and tenant bindings."
              ]
            ],
            [
              [
                "tenant-directory-finalize",
                "tenant-directory-finalize"
              ],
              [
                "依赖清理完成后移除目录绑定，不物理删除业务数据。",
                "Remove the binding after dependency cleanup; does not physically erase business data."
              ]
            ]
          ]
        },
        "links": [
          {
            "href": "https://github.com/nazozero/NazoAuth/blob/main/docs/project/multitenancy/control-plane-and-admin.md",
            "label": [
              "签名操作与权限契约",
              "Signed-operation and authority contract"
            ]
          }
        ]
      },
      {
        "id": "safe-rollout",
        "title": [
          "新增域名的实施顺序",
          "Adding a domain"
        ],
        "steps": [
          [
            "准备租户域名、DNS 与 TLS 证书，并明确 tenant / realm / organization 归属。",
            "Prepare the tenant domain, DNS, and TLS certificate, and establish tenant / realm / organization ownership."
          ],
          [
            "通过普通签名控制操作创建目录绑定；使用该操作要求的预期版本和有效授权。",
            "Create the binding through an ordinary signed control operation with its required expected revision and authority."
          ],
          [
            "让所有服务进程完成目录收敛，确认 issuer、JWKS、前端与证书均属于新租户。",
            "Allow all processes to converge; confirm issuer, JWKS, frontend, and certificate belong to the new tenant."
          ],
          [
            "注册该租户客户端并验证登录、回调、令牌与跨租户拒绝行为。",
            "Register tenant clients and verify sign-in, callbacks, tokens, and cross-tenant rejection."
          ]
        ],
        "note": [
          "目录变更只在完整候选运行配置构造成功后原子发布。构造失败保留最后可用配置；禁用后，已持有旧运行配置的在途请求允许完成。",
          "A directory update publishes atomically only after the complete candidate runtime is built. Construction failure preserves the last working runtime. Requests already holding an old runtime may finish after disablement."
        ]
      }
    ]
  }
];
