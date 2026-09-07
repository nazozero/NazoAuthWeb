import type { DocPage } from './content';

export const configurationPages: DocPage[] = [
  {
    "id": "configuration",
    "group": "configure",
    "title": [
      "配置总览",
      "Configuration overview"
    ],
    "summary": [
      "从最小启动配置逐步配置传输、存储、身份与协议能力。",
      "Start with the minimum process configuration, then configure transport, storage, identity, and protocol capabilities."
    ],
    "source": "docs/operations/configuration.md",
    "sections": [
      {
        "id": "loading",
        "title": [
          "配置来源与优先级",
          "Sources and precedence"
        ],
        "body": [
          "配置在进程启动时加载。默认读取工作目录的 .env.yaml，也可通过 NAZOAUTH_SERVER_CONFIG_FILE 指定文件。白名单环境变量覆盖文件值，文件值覆盖默认值。不要把 .env 文本文件当成等价配置入口。",
          "Configuration is loaded at process startup. The default file is .env.yaml in the working directory; NAZOAUTH_SERVER_CONFIG_FILE selects another file. Allowlisted environment variables override file values, which override defaults. A dotenv .env file is not an equivalent input."
        ],
        "flow": [
          [
            "内置默认值",
            "Built-in defaults"
          ],
          [
            "YAML 配置",
            "YAML configuration"
          ],
          [
            "白名单环境变量覆盖",
            "Allowlisted environment overrides"
          ]
        ]
      },
      {
        "id": "ownership",
        "title": [
          "配置归属",
          "Configuration ownership"
        ],
        "body": [
          "监听、适配器连接与进程材料属于启动配置；租户域名属于运行时目录；协议模块的 desired state 与客户端 security_policy 是持久化的独立事实。修改启动配置通常需要一致地更新并重启实例，不能用旧的 ENABLE_* 开关替代模块管理。",
          "Listeners, adapter connections, and process material are startup configuration. Tenant domains belong to the runtime directory. Module desired state and client security_policy are independent persisted facts. Startup changes normally require consistent instance updates and restarts; obsolete ENABLE_* flags do not replace module administration."
        ],
        "links": [
          {
            "section": "tenants",
            "label": [
              "租户目录",
              "Tenant directory"
            ]
          },
          {
            "section": "modules",
            "label": [
              "能力与策略",
              "Capabilities and policy"
            ]
          }
        ]
      },
      {
        "id": "process",
        "title": [
          "基础启动配置",
          "Process settings"
        ],
        "body": [
          "先确定真实公开地址、数据目录与传输模式，再接入所选适配器。以下为常用配置，不包含连接凭据或密钥材料。",
          "Establish the real public address, data directory, and transport mode, then wire the selected adapters. These common settings do not include connection credentials or key material."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "BIND",
                "BIND"
              ],
              [
                "0.0.0.0:8000",
                "0.0.0.0:8000"
              ],
              [
                "主监听地址。Direct TLS 下为 HTTPS，其余模式为 HTTP。",
                "Main listener; HTTPS in Direct TLS, otherwise HTTP."
              ]
            ],
            [
              [
                "PUBLIC_BASE_URL",
                "PUBLIC_BASE_URL"
              ],
              [
                "http://127.0.0.1:8000",
                "http://127.0.0.1:8000"
              ],
              [
                "引导租户的公开地址；生产使用真实 HTTPS 地址。",
                "Bootstrap tenant public URL; use a real HTTPS URL in production."
              ]
            ],
            [
              [
                "ISSUER",
                "ISSUER"
              ],
              [
                "派生自 PUBLIC_BASE_URL",
                "Derived from PUBLIC_BASE_URL"
              ],
              [
                "引导 issuer。目录管理租户由其 binding 决定。",
                "Bootstrap issuer; directory-managed tenant issuers come from their bindings."
              ]
            ],
            [
              [
                "DATA_DIR",
                "DATA_DIR"
              ],
              [
                "runtime",
                "runtime"
              ],
              [
                "本地持久材料与运行目录，应使用稳定挂载。",
                "Local persistent material and runtime directory; use stable storage."
              ]
            ],
            [
              [
                "RUST_LOG",
                "RUST_LOG"
              ],
              [
                "info",
                "info"
              ],
              [
                "Tracing 过滤器；不要将凭据写入日志。",
                "Tracing filter; do not log credentials."
              ]
            ],
            [
              [
                "NAZOAUTH_SERVER_CONFIG_FILE",
                "NAZOAUTH_SERVER_CONFIG_FILE"
              ],
              [
                "可选环境变量",
                "Optional environment variable"
              ],
              [
                "选择配置文件位置。",
                "Selects the configuration file location."
              ]
            ]
          ]
        },
        "code": {
          "language": "YAML",
          "value": "BIND: \"0.0.0.0:8000\"\nPUBLIC_BASE_URL: \"https://auth.example.com\"\nTRANSPORT_MODE: \"trusted-proxy\"\nTRUSTED_PROXY_CIDRS: \"127.0.0.1/32\"\nMTLS_CERTIFICATE_SOURCE: \"disabled\"\nDATA_DIR: \"/var/lib/nazoauth\"\nRUST_LOG: \"info\""
        },
        "note": [
          "这是进程与入口片段，不是完整可启动配置。默认发行版还需数据库、短期状态、部署 state epoch 和签名包装密钥等材料；由安装器提供或按相应章节配置。",
          "This is a process/ingress fragment, not a complete runnable configuration. The default distribution also requires database, transient-state, deployment state epoch, signing wrapping keys, and other material from the installer or the relevant chapters."
        ]
      },
      {
        "id": "reference-map",
        "title": [
          "按职责查找配置",
          "Find settings by responsibility"
        ],
        "body": [
          "每章都说明配置条件、示例和运维影响。复制示例后替换域名、路径和凭据，不要将占位符作为实际密钥。",
          "Each chapter covers conditions, examples, and operational effects. Replace sample domains, paths, and credentials; placeholders are not usable keys."
        ],
        "links": [
          {
            "section": "transport",
            "label": [
              "TLS、代理与 Origin",
              "TLS, proxy, and origin"
            ]
          },
          {
            "section": "storage",
            "label": [
              "存储适配器与头像",
              "Storage adapters and avatars"
            ]
          },
          {
            "section": "keys",
            "label": [
              "密钥与秘密",
              "Keys and secrets"
            ]
          },
          {
            "section": "sessions",
            "label": [
              "会话与令牌时效",
              "Sessions and token lifetimes"
            ]
          },
          {
            "section": "email",
            "label": [
              "邮件与验证码",
              "Email and verification"
            ]
          },
          {
            "section": "modules",
            "label": [
              "协议能力与客户端策略",
              "Protocol capabilities and client policy"
            ]
          },
          {
            "section": "credentials",
            "label": [
              "数字凭证",
              "Digital credentials"
            ]
          },
          {
            "section": "observability",
            "label": [
              "限流、审计与可观测性",
              "Rate limits, audit, and observability"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "transport",
    "group": "configure",
    "title": [
      "TLS、代理与 Origin",
      "TLS, proxy, and origin"
    ],
    "summary": [
      "选择 TLS 终止位置，正确传递主机名、客户端地址和证书身份。",
      "Choose where TLS terminates and correctly carry hostnames, client addresses, and certificate identity."
    ],
    "source": "docs/operations/configuration.md",
    "sections": [
      {
        "id": "modes",
        "title": [
          "三种传输模式",
          "Three transport modes"
        ],
        "body": [
          "非 loopback 的公开 issuer 必须明确传输模式。NazoAuth 可以自己终止 TLS，反向代理是可选组件。不要信任来自任意请求的转发头或证书头。",
          "A non-loopback public issuer requires an explicit transport mode. NazoAuth can terminate TLS itself; a reverse proxy is optional. Forwarded and certificate headers must not be trusted from arbitrary requests."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "TRANSPORT_MODE",
                "TRANSPORT_MODE"
              ],
              [
                "loopback-http / direct-tls / trusted-proxy",
                "loopback-http / direct-tls / trusted-proxy"
              ],
              [
                "loopback-http 只用于本地 HTTP；其余模式明确 TLS 信任边界。",
                "loopback-http is local HTTP only; the other modes establish the TLS trust boundary."
              ]
            ],
            [
              [
                "TRUSTED_PROXY_CIDRS",
                "TRUSTED_PROXY_CIDRS"
              ],
              [
                "可信代理模式必填",
                "Required for trusted proxy"
              ],
              [
                "只列出实际入口代理网段，不是最终用户地址范围。",
                "List actual ingress proxy networks, not end-user address ranges."
              ]
            ],
            [
              [
                "MTLS_CERTIFICATE_SOURCE",
                "MTLS_CERTIFICATE_SOURCE"
              ],
              [
                "可信代理模式显式配置",
                "Explicit in trusted-proxy mode"
              ],
              [
                "没有客户端证书验证时使用 disabled；证书来源必须匹配传输模式。",
                "Use disabled without client-certificate verification; the source must match the transport mode."
              ]
            ],
            [
              [
                "CLIENT_IP_HEADER_MODE",
                "CLIENT_IP_HEADER_MODE"
              ],
              [
                "none",
                "none"
              ],
              [
                "客户端 IP 解析策略需匹配可信代理；未配置时不推断代理身份。",
                "Client-IP parsing must match trusted ingress; proxy identity is not guessed."
              ]
            ],
            [
              [
                "MTLS_ENDPOINT_BASE_URL",
                "MTLS_ENDPOINT_BASE_URL"
              ],
              [
                "按 issuer / 专用监听派生",
                "Derived from issuer / dedicated listener"
              ],
              [
                "Discovery 中的 mTLS 端点必须指向真实要求客户端证书的监听。",
                "Discovered mTLS endpoints must reach the listener that requests client certificates."
              ]
            ]
          ]
        }
      },
      {
        "id": "direct",
        "title": [
          "Direct TLS",
          "Direct TLS"
        ],
        "body": [
          "直接 TLS 模式使用服务器证书和私钥，并配置独立 mTLS 监听与客户端 CA。BIND 与 TLS_BIND 必须不同。客户端 CA 与服务器证书的用途不同，不能互相替代。",
          "Direct TLS uses a server certificate/key and a dedicated mTLS listener with client CA trust. BIND and TLS_BIND must differ. The client CA and server certificate serve different purposes."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "TLS_BIND",
                "TLS_BIND"
              ],
              [
                "direct-tls 必填",
                "Required for direct-tls"
              ],
              [
                "独立 mTLS 监听地址。",
                "Dedicated mTLS listener address."
              ]
            ],
            [
              [
                "TLS_CERTIFICATE_FILE / TLS_PRIVATE_KEY_FILE",
                "TLS_CERTIFICATE_FILE / TLS_PRIVATE_KEY_FILE"
              ],
              [
                "外部提供",
                "Externally supplied"
              ],
              [
                "匹配的 PEM 证书与私钥；私钥仅服务进程可读。",
                "Matching PEM certificate and key; restrict private-key access."
              ]
            ],
            [
              [
                "TLS_CLIENT_CA_FILE",
                "TLS_CLIENT_CA_FILE"
              ],
              [
                "direct-tls 必填",
                "Required for direct-tls"
              ],
              [
                "验证 TLS 客户端证书的 CA 信任材料。",
                "CA trust material for TLS client certificates."
              ]
            ],
            [
              [
                "TLS_RELOAD_INTERVAL_SECONDS",
                "TLS_RELOAD_INTERVAL_SECONDS"
              ],
              [
                "5",
                "5"
              ],
              [
                "服务器证书与密钥重载间隔，1–3600 秒；客户端 CA 变更仍需受控重启。",
                "Server certificate/key reload interval, 1–3600 seconds; client-CA changes still need a controlled restart."
              ]
            ]
          ]
        },
        "code": {
          "language": "YAML",
          "value": "TRANSPORT_MODE: \"direct-tls\"\nBIND: \"0.0.0.0:8443\"\nTLS_BIND: \"0.0.0.0:9443\"\nPUBLIC_BASE_URL: \"https://auth.example.com:8443\"\nMTLS_ENDPOINT_BASE_URL: \"https://auth.example.com:9443\"\nTLS_CERTIFICATE_FILE: \"/etc/nazoauth/tls/fullchain.pem\"\nTLS_PRIVATE_KEY_FILE: \"/etc/nazoauth/tls/privkey.pem\"\nTLS_CLIENT_CA_FILE: \"/etc/nazoauth/tls/client-ca.pem\"\nTLS_RELOAD_INTERVAL_SECONDS: 5"
        }
      },
      {
        "id": "origins",
        "title": [
          "域名、前端与 Cookie",
          "Domains, frontend, and cookies"
        ],
        "body": [
          "目录管理租户以其 issuer 派生 /ui/、CORS 与 Passkey 默认身份。一个部署可以有多个租户域名。当前网站使用同源 API；跨域拆分前端涉及 Cookie、CSRF、CORS 与回调约束，不能只改一个 URL。",
          "Directory-managed tenants derive /ui/, CORS, and default passkey identity from their issuer. A deployment can have multiple tenant domains. This website uses same-origin APIs; separating origins also involves cookies, CSRF, CORS, and callbacks."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "FRONTEND_BASE_URL",
                "FRONTEND_BASE_URL"
              ],
              [
                "租户 issuer + /ui/",
                "Tenant issuer + /ui/"
              ],
              [
                "目录路径按租户派生，避免把控制租户地址投影给其他租户。",
                "Derived per directory tenant so the control-tenant address is not projected into other tenants."
              ]
            ],
            [
              [
                "CORS_ALLOWED_ORIGINS",
                "CORS_ALLOWED_ORIGINS"
              ],
              [
                "目录租户的公开 origin",
                "Directory tenant public origin"
              ],
              [
                "CORS 不能授予客户端协议权限，也不能替代 CSRF 验证。",
                "CORS does not grant protocol authority or replace CSRF validation."
              ]
            ],
            [
              [
                "COOKIE_SECURE",
                "COOKIE_SECURE"
              ],
              [
                "HTTPS 时 true",
                "true for HTTPS"
              ],
              [
                "false 只允许 loopback HTTP 开发环境。",
                "false is limited to loopback HTTP development."
              ]
            ]
          ]
        },
        "links": [
          {
            "section": "tenants",
            "label": [
              "租户域名与生命周期",
              "Tenant domains and lifecycle"
            ]
          }
        ]
      },
      {
        "id": "check",
        "title": [
          "部署后验证",
          "After deployment"
        ],
        "body": [
          "分别核对浏览器地址、证书、Discovery issuer、各协议端点与代理的 Host 传递。/ui/ 是前端基路径，/token、/authorize 等协议接口仍使用 Discovery 给出的根路径。",
          "Check browser URL, certificate, Discovery issuer, protocol endpoints, and proxy Host forwarding separately. /ui/ is the frontend base path; /token and /authorize remain at the protocol paths provided by Discovery."
        ],
        "steps": [
          [
            "对每个租户检查 HTTPS 证书与 issuer 精确匹配。",
            "Verify the HTTPS certificate and exact issuer for each tenant."
          ],
          [
            "分别访问普通和 mTLS 端点，确认客户端证书要求与元数据一致。",
            "Check ordinary and mTLS endpoints separately, including certificate requirements."
          ],
          [
            "验证未知 Host 被拒绝，跨租户客户端或令牌不能互换。",
            "Verify rejection of unknown hosts and cross-tenant client/token substitution."
          ]
        ]
      }
    ]
  },
  {
    "id": "storage",
    "group": "configure",
    "title": [
      "存储与对象存储",
      "Persistence and object storage"
    ],
    "summary": [
      "分清可扩展接口、已提供适配器和各自的数据恢复责任。",
      "Distinguish extensible ports, shipped adapters, and the recovery responsibility of each store."
    ],
    "source": "docs/operations/avatar-direct-upload.md",
    "sections": [
      {
        "id": "ports",
        "title": [
          "核心不绑定具体存储",
          "Storage-independent core"
        ],
        "body": [
          "持久存储与短期状态通过不同语义接口接入，NazoAuth 核心不直接操作数据库驱动。默认 nazoauth 发行版组合 PostgreSQL 与 Valkey；下面的连接参数属于这两个适配器，而不是协议本身的要求。",
          "Persistence and transient state use distinct semantic ports; the NazoAuth core does not operate database drivers. The default nazoauth distribution composes PostgreSQL and Valkey. The connection settings below belong to these adapters, not to the protocols themselves."
        ],
        "links": [
          {
            "section": "architecture",
            "label": [
              "架构与适配器扩展",
              "Architecture and adapter extension"
            ]
          }
        ]
      },
      {
        "id": "default-adapters",
        "title": [
          "默认发行版连接",
          "Default distribution connections"
        ],
        "body": [
          "PostgreSQL 持有耐久业务事实；Valkey 承载需要原子操作和 TTL 的短期状态。不得将这些有安全语义的操作替换成不具备等价能力的缓存调用。",
          "PostgreSQL holds durable business facts; Valkey serves transient state requiring atomic operations and TTL. A replacement must preserve these security semantics rather than substitute ordinary cache operations."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "DATABASE_URL",
                "DATABASE_URL"
              ],
              [
                "外部连接字符串",
                "External connection string"
              ],
              [
                "默认发行版的 PostgreSQL 连接；远程连接按边界选择验证证书的 TLS。",
                "PostgreSQL connection for the default distribution; use certificate-validating TLS across remote trust boundaries."
              ]
            ],
            [
              [
                "DATABASE_MAX_CONNECTIONS",
                "DATABASE_MAX_CONNECTIONS"
              ],
              [
                "32",
                "32"
              ],
              [
                "每个进程的池上限；所有实例总量需纳入数据库容量。",
                "Per-process pool bound; include every instance in database capacity planning."
              ]
            ],
            [
              [
                "VALKEY_URL",
                "VALKEY_URL"
              ],
              [
                "外部连接字符串",
                "External connection string"
              ],
              [
                "默认发行版的 Valkey 连接，不在日志或公开文档暴露凭据。",
                "Valkey connection for the default distribution; keep credentials out of logs and public documents."
              ]
            ],
            [
              [
                "VALKEY_STATE_EPOCH",
                "VALKEY_STATE_EPOCH"
              ],
              [
                "必需 UUIDv7",
                "Required UUIDv7"
              ],
              [
                "恢复候选使用新 epoch，隔离旧短期状态；不能重复使用旧 epoch。",
                "A restored candidate uses a fresh epoch to isolate old transient state; never reuse the previous epoch."
              ]
            ]
          ]
        },
        "note": [
          "runtime 数据库角色服务请求；lifecycle 角色执行迁移、备份和恢复。服务进程不应获得 lifecycle 凭据。",
          "The runtime database role serves requests; the lifecycle role owns migration, backup, and recovery. The server process must not receive lifecycle credentials."
        ]
      },
      {
        "id": "avatars",
        "title": [
          "头像存储选择",
          "Avatar storage selection"
        ],
        "body": [
          "头像存储是独立能力。未配置全局存储且没有租户覆盖时，该租户头像存储关闭，认证与授权仍可用。配置 local 才会启用本地存储；仅给目录路径不会启用。S3 故障不会自动改用本地磁盘。",
          "Avatar storage is independent. Without a global store or tenant override, avatars are disabled for that tenant while authentication and authorization remain available. Local storage requires explicit local selection, not just a path. S3 failures do not switch to local disk."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "AVATAR_OBJECT_STORE",
                "AVATAR_OBJECT_STORE"
              ],
              [
                "未设置；local / s3",
                "Unset; local / s3"
              ],
              [
                "可选全局默认后端。",
                "Optional global default backend."
              ]
            ],
            [
              [
                "AVATAR_STORAGE_DIR",
                "AVATAR_STORAGE_DIR"
              ],
              [
                "按 DATA_DIR / tenant 派生",
                "Derived from DATA_DIR / tenant"
              ],
              [
                "本地基目录；多实例必须实际共享文件。",
                "Local base directory; instances must actually share the files."
              ]
            ],
            [
              [
                "AVATAR_MAX_BYTES",
                "AVATAR_MAX_BYTES"
              ],
              [
                "2097152",
                "2097152"
              ],
              [
                "单头像大小上限，单位字节。",
                "Maximum avatar size in bytes."
              ]
            ],
            [
              [
                "AVATAR_TENANT_STORAGE_JSON",
                "AVATAR_TENANT_STORAGE_JSON"
              ],
              [
                "可选完整租户覆盖",
                "Optional complete tenant overrides"
              ],
              [
                "按租户 UUID 提供完整 local 或 s3 配置，不进行字段级合并。",
                "Complete local or s3 configurations keyed by tenant UUID; no field-by-field merge."
              ]
            ],
            [
              [
                "AVATAR_S3_ENDPOINT / AVATAR_S3_REGION / AVATAR_S3_BUCKET",
                "AVATAR_S3_ENDPOINT / AVATAR_S3_REGION / AVATAR_S3_BUCKET"
              ],
              [
                "s3 时必填",
                "Required for s3"
              ],
              [
                "S3 兼容端点、区域与桶。",
                "S3-compatible endpoint, region, and bucket."
              ]
            ],
            [
              [
                "AVATAR_S3_ACCESS_KEY / AVATAR_S3_SECRET_KEY",
                "AVATAR_S3_ACCESS_KEY / AVATAR_S3_SECRET_KEY"
              ],
              [
                "s3 时必填",
                "Required for s3"
              ],
              [
                "对象存储凭据，只交给具体适配器。",
                "Object-store credentials supplied only to the concrete adapter."
              ]
            ],
            [
              [
                "AVATAR_S3_PATH_STYLE",
                "AVATAR_S3_PATH_STYLE"
              ],
              [
                "可选",
                "Optional"
              ],
              [
                "S3 路径寻址策略，按提供商配置。",
                "S3 addressing style, matched to the provider."
              ]
            ]
          ]
        },
        "code": {
          "language": "YAML",
          "value": "AVATAR_OBJECT_STORE: \"local\"\nAVATAR_STORAGE_DIR: \"/srv/nazoauth/avatars\"\nAVATAR_MAX_BYTES: 2097152"
        }
      },
      {
        "id": "migration",
        "title": [
          "迁移与恢复",
          "Migration and recovery"
        ],
        "body": [
          "更改对象存储配置不会移动已有数据，也不会同时读取旧后端。先暂停受影响租户头像写入，保留旧配置和对象；按后端布局复制或转换数据；一致地重启所有实例并验证历史头像、新上传和删除，再退休旧存储。S3 staging 前缀应保持非公开并设置过期清理。",
          "Changing object-store configuration does not move existing data or read both backends. Pause affected avatar writes and retain old configuration/objects; copy or translate the backend layout; restart instances consistently and verify historical reads, new uploads, and deletion before retiring the old store. Keep S3 staging private and configure expiry cleanup."
        ],
        "links": [
          {
            "section": "operations",
            "label": [
              "备份与恢复",
              "Backup and recovery"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "keys",
    "group": "configure",
    "title": [
      "密钥与秘密",
      "Keys and secrets"
    ],
    "summary": [
      "管理签名材料、包装密钥和应用秘密，保留可恢复的轮换路径。",
      "Manage signing material, wrapping keys, and application secrets with a recoverable rotation process."
    ],
    "source": "docs/operations/configuration.md",
    "sections": [
      {
        "id": "signing",
        "title": [
          "签名密钥的权威来源",
          "Signing-key authority"
        ],
        "body": [
          "当前默认持久化实现将签名密钥、请求对象解密密钥与公开投影保存为数据库中的同一加密代次。JWK_KEYS_DIR 仅用于显式的一次性旧目录导入，不是日常运行时密钥来源。",
          "The current default persistence implementation stores signing keys, request-object decryption keys, and their public projection as one encrypted database generation. JWK_KEYS_DIR is for an explicit one-shot legacy import, not the normal runtime key authority."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "SIGNING_KEY_ENCRYPTION_KEY",
                "SIGNING_KEY_ENCRYPTION_KEY"
              ],
              [
                "部署提供，32 字节",
                "Deployment supplied, 32 bytes"
              ],
              [
                "无填充 base64url 包装根密钥；同一部署所有实例一致。",
                "Unpadded base64url wrapping root; identical across deployment instances."
              ]
            ],
            [
              [
                "SIGNING_KEY_ENCRYPTION_KEY_ID",
                "SIGNING_KEY_ENCRYPTION_KEY_ID"
              ],
              [
                "必需非空标识",
                "Required nonempty identifier"
              ],
              [
                "与包装根密钥成对配置。",
                "Configured as a pair with the wrapping key."
              ]
            ],
            [
              [
                "SIGNING_KEY_PREVIOUS_ENCRYPTION_KEY / SIGNING_KEY_PREVIOUS_ENCRYPTION_KEY_ID",
                "SIGNING_KEY_PREVIOUS_ENCRYPTION_KEY / SIGNING_KEY_PREVIOUS_ENCRYPTION_KEY_ID"
              ],
              [
                "轮换期间可选配对",
                "Optional rotation pair"
              ],
              [
                "用于过渡读取；完成重包装并验证所有实例后才能退休。",
                "Transitional read material; retire only after rewrapping and verifying all instances."
              ]
            ],
            [
              [
                "SIGNING_EXTERNAL_COMMAND / SIGNING_EXTERNAL_TIMEOUT_MS",
                "SIGNING_EXTERNAL_COMMAND / SIGNING_EXTERNAL_TIMEOUT_MS"
              ],
              [
                "外部签名器时配置",
                "For external signing"
              ],
              [
                "KMS / HSM 集成边界；遵守签名器契约。",
                "KMS / HSM integration boundary; follow the signer contract."
              ]
            ],
            [
              [
                "SIGNING_KEY_ROTATION_INTERVAL_SECONDS / SIGNING_KEY_PREPUBLISH_SECONDS",
                "SIGNING_KEY_ROTATION_INTERVAL_SECONDS / SIGNING_KEY_PREPUBLISH_SECONDS"
              ],
              [
                "按部署策略配置",
                "Deployment policy"
              ],
              [
                "签名代次轮换与公开预发布窗口。",
                "Signing-generation rotation and public prepublication window."
              ]
            ]
          ]
        }
      },
      {
        "id": "secrets",
        "title": [
          "应用秘密按用途分离",
          "Purpose-specific application secrets"
        ],
        "body": [
          "不同用途的秘密不得互相代用。服务可以生成并持久保存部分应用材料；外部信任根、数据库凭据与签名包装根仍需按各自契约提供。把运行所需秘密与加密数据纳入同一恢复计划。",
          "Secrets for different purposes are not interchangeable. The server can generate and persist some application material; external trust roots, database credentials, and signing wrapping roots follow their own provisioning contracts. Recoverable backups must include the secrets needed to decrypt the data."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "CLIENT_SECRET_PEPPER / CLIENT_SECRET_PEPPER_FILE",
                "CLIENT_SECRET_PEPPER / CLIENT_SECRET_PEPPER_FILE"
              ],
              [
                "生成或显式导入",
                "Generated or explicitly imported"
              ],
              [
                "客户端秘密保护；保持稳定并备份。",
                "Protects client secrets; keep stable and backed up."
              ]
            ],
            [
              [
                "PAIRWISE_SUBJECT_SECRET / PAIRWISE_SUBJECT_SECRET_FILE",
                "PAIRWISE_SUBJECT_SECRET / PAIRWISE_SUBJECT_SECRET_FILE"
              ],
              [
                "pairwise subject 时需要",
                "Required for pairwise subjects"
              ],
              [
                "决定 pairwise subject 稳定性，不随意替换。",
                "Controls pairwise-subject stability; do not replace casually."
              ]
            ],
            [
              [
                "MFA_TOTP_ENCRYPTION_KEY / MFA_TOTP_ENCRYPTION_KEY_ID",
                "MFA_TOTP_ENCRYPTION_KEY / MFA_TOTP_ENCRYPTION_KEY_ID"
              ],
              [
                "生成或导入配对材料",
                "Generated or imported pair"
              ],
              [
                "TOTP 种子的加密密钥；保留轮换所需 previous 配对。",
                "Encrypts TOTP seeds; retain previous paired material during rotation."
              ]
            ],
            [
              [
                "TOKEN_ISSUANCE_RESPONSE_ENCRYPTION_KEY / TOKEN_ISSUANCE_RESPONSE_ENCRYPTION_KEY_ID",
                "TOKEN_ISSUANCE_RESPONSE_ENCRYPTION_KEY / TOKEN_ISSUANCE_RESPONSE_ENCRYPTION_KEY_ID"
              ],
              [
                "独立生成或导入",
                "Independently generated or imported"
              ],
              [
                "耐久令牌响应信封使用独立 32 字节密钥，不从 pepper 派生。",
                "Durable token-response envelopes use an independent 32-byte key, not one derived from the pepper."
              ]
            ],
            [
              [
                "DYNAMIC_CLIENT_REGISTRATION_INITIAL_ACCESS_TOKEN",
                "DYNAMIC_CLIENT_REGISTRATION_INITIAL_ACCESS_TOKEN"
              ],
              [
                "生成或显式提供",
                "Generated or explicitly supplied"
              ],
              [
                "动态注册入口凭据；存在凭据不替代模块与客户端权限检查。",
                "Initial dynamic-registration credential; does not replace module or client authority checks."
              ]
            ]
          ]
        }
      },
      {
        "id": "rotation",
        "title": [
          "轮换顺序",
          "Rotation order"
        ],
        "body": [
          "签名代次轮换与包装根轮换是两件事。签名公钥经过预发布、活动、宽限和退役；包装根更换还需对数据库中的私钥材料重包装。",
          "Signing-generation rotation and wrapping-root rotation are separate operations. Public signing keys pass through prepublished, active, grace, and retired states; replacing the wrapping root also requires rewrapping stored private material."
        ],
        "steps": [
          [
            "备份加密代次与当前包装根，验证恢复材料完整。",
            "Back up the encrypted generation and wrapping root; verify recovery material."
          ],
          [
            "向所有实例一致部署新旧包装密钥对。",
            "Deploy the current and previous wrapping-key pairs consistently to all instances."
          ],
          [
            "通过普通运维操作发布代次，验证所有实例可读取并签发，验证端可发现公钥。",
            "Publish through ordinary operations; verify all instances can load and sign, and verifiers can discover keys."
          ],
          [
            "过渡与恢复窗口结束后，再移除旧根与旧代次。",
            "Retire previous roots and generations only after transition and recovery windows close."
          ]
        ],
        "links": [
          {
            "section": "operations",
            "label": [
              "备份与恢复边界",
              "Backup and recovery boundaries"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "sessions",
    "group": "configure",
    "title": [
      "会话、Passkey 与时效",
      "Sessions, passkeys, and lifetimes"
    ],
    "summary": [
      "分别配置登录会话、协议交易和令牌寿命，保持租户身份稳定。",
      "Configure login sessions, protocol transactions, and token lifetimes separately while keeping tenant identity stable."
    ],
    "source": "docs/operations/configuration.md",
    "sections": [
      {
        "id": "lifetimes",
        "title": [
          "令牌与协议交易寿命",
          "Token and transaction lifetimes"
        ],
        "body": [
          "所有时效以秒计。缩短令牌寿命不能替代撤销、发送方约束和权限校验；增加协议交易寿命会延长其重放和恢复窗口。",
          "Lifetimes are in seconds. Shorter tokens do not replace revocation, sender constraints, or authorization; longer transactions extend their replay and recovery windows."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "ACCESS_TOKEN_TTL_SECONDS",
                "ACCESS_TOKEN_TTL_SECONDS"
              ],
              [
                "300",
                "300"
              ],
              [
                "正数，最大 3600。",
                "Positive; maximum 3600."
              ]
            ],
            [
              [
                "ID_TOKEN_TTL_SECONDS",
                "ID_TOKEN_TTL_SECONDS"
              ],
              [
                "600",
                "600"
              ],
              [
                "正数，最大 3600。",
                "Positive; maximum 3600."
              ]
            ],
            [
              [
                "AUTH_CODE_TTL_SECONDS",
                "AUTH_CODE_TTL_SECONDS"
              ],
              [
                "60",
                "60"
              ],
              [
                "授权码一次性；FAPI2 不超过 60。",
                "One-time authorization codes; at most 60 for FAPI2."
              ]
            ],
            [
              [
                "REFRESH_TOKEN_TTL_SECONDS",
                "REFRESH_TOKEN_TTL_SECONDS"
              ],
              [
                "2592000",
                "2592000"
              ],
              [
                "刷新令牌期限；并发刷新应由客户端串行化。",
                "Refresh-token lifetime; clients should serialize concurrent refreshes."
              ]
            ],
            [
              [
                "PAR_TTL_SECONDS",
                "PAR_TTL_SECONDS"
              ],
              [
                "90",
                "90"
              ],
              [
                "request_uri 有效窗口；FAPI2 小于 600。",
                "request_uri window; below 600 for FAPI2."
              ]
            ],
            [
              [
                "SESSION_TTL_SECONDS",
                "SESSION_TTL_SECONDS"
              ],
              [
                "28800",
                "28800"
              ],
              [
                "登录会话寿命，与访问令牌不同。",
                "Login-session lifetime, separate from access tokens."
              ]
            ],
            [
              [
                "PENDING_MFA_SESSION_TTL_SECONDS",
                "PENDING_MFA_SESSION_TTL_SECONDS"
              ],
              [
                "必须小于会话寿命",
                "Must be below session lifetime"
              ],
              [
                "待完成 MFA 的临时会话。",
                "Temporary session awaiting MFA completion."
              ]
            ]
          ]
        },
        "code": {
          "language": "YAML",
          "value": "ACCESS_TOKEN_TTL_SECONDS: 300\nID_TOKEN_TTL_SECONDS: 600\nAUTH_CODE_TTL_SECONDS: 60\nREFRESH_TOKEN_TTL_SECONDS: 2592000\nPAR_TTL_SECONDS: 90\nSESSION_TTL_SECONDS: 28800"
        }
      },
      {
        "id": "cookies",
        "title": [
          "会话与 CSRF Cookie",
          "Session and CSRF cookies"
        ],
        "body": [
          "浏览器会话由服务端管理，访问令牌不是网页登录 Cookie。HTTPS 默认使用 __Host- 前缀；前端提交状态变更时必须遵守现有 CSRF 机制。",
          "Browser sessions are server managed; an access token is not the login cookie. HTTPS defaults use the __Host- prefix, and frontend mutations must follow the existing CSRF mechanism."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "SESSION_COOKIE_NAME",
                "SESSION_COOKIE_NAME"
              ],
              [
                "__Host-nazo_oauth_session",
                "__Host-nazo_oauth_session"
              ],
              [
                "HTTPS 默认名；loopback HTTP 默认去掉 __Host-。",
                "HTTPS default; loopback HTTP omits __Host-."
              ]
            ],
            [
              [
                "CSRF_COOKIE_NAME",
                "CSRF_COOKIE_NAME"
              ],
              [
                "__Host-nazo_oauth_csrf",
                "__Host-nazo_oauth_csrf"
              ],
              [
                "HTTPS 默认名，与会话 Cookie 职责不同。",
                "HTTPS default; distinct from the session cookie."
              ]
            ],
            [
              [
                "COOKIE_SECURE",
                "COOKIE_SECURE"
              ],
              [
                "HTTPS 默认 true",
                "true for HTTPS"
              ],
              [
                "非 loopback 不能关闭 Secure。",
                "Cannot disable Secure outside loopback."
              ]
            ]
          ]
        }
      },
      {
        "id": "passkeys",
        "title": [
          "Passkey 配置",
          "Passkey configuration"
        ],
        "body": [
          "Passkey 凭据绑定 RP 身份。目录租户从自己的 issuer 派生 RP 与 origin，不能把另一个租户的配置复用为身份。既有凭据不会因 DNS 改名自动迁移。",
          "Passkey credentials bind to RP identity. Directory tenants derive RP and origin from their own issuer, rather than reusing another tenant's identity. Existing credentials do not automatically migrate after a DNS rename."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "PASSKEY_RP_ID",
                "PASSKEY_RP_ID"
              ],
              [
                "从 origin 派生主机名",
                "Hostname derived from origin"
              ],
              [
                "裸主机名，不含协议、端口或路径。",
                "Bare hostname without scheme, port, or path."
              ]
            ],
            [
              [
                "PASSKEY_ORIGIN",
                "PASSKEY_ORIGIN"
              ],
              [
                "从 issuer 派生",
                "Derived from issuer"
              ],
              [
                "WebAuthn 验证所期望的浏览器 origin。",
                "Expected browser origin for WebAuthn verification."
              ]
            ],
            [
              [
                "PASSKEY_RP_NAME",
                "PASSKEY_RP_NAME"
              ],
              [
                "Nazo OAuth",
                "Nazo OAuth"
              ],
              [
                "验证器展示的 RP 名称。",
                "RP display name shown by authenticators."
              ]
            ],
            [
              [
                "PASSKEY_REQUIRE_USER_VERIFICATION",
                "PASSKEY_REQUIRE_USER_VERIFICATION"
              ],
              [
                "true",
                "true"
              ],
              [
                "要求验证器完成用户验证。",
                "Requires authenticator user verification."
              ]
            ],
            [
              [
                "PASSKEY_REQUIRE_USER_HANDLE / PASSKEY_STRICT_BASE64",
                "PASSKEY_REQUIRE_USER_HANDLE / PASSKEY_STRICT_BASE64"
              ],
              [
                "true",
                "true"
              ],
              [
                "严格用户句柄与编码验证。",
                "Strict user-handle and encoding checks."
              ]
            ]
          ]
        },
        "links": [
          {
            "section": "accounts",
            "label": [
              "账户、MFA 与恢复",
              "Accounts, MFA, and recovery"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "email",
    "group": "configure",
    "title": [
      "邮件与验证码",
      "Email and verification"
    ],
    "summary": [
      "接入 SMTP，配置验证码寿命和发送限流。",
      "Connect SMTP and configure verification-code lifetimes and send limits."
    ],
    "source": "docs/operations/configuration.md",
    "sections": [
      {
        "id": "smtp",
        "title": [
          "SMTP 连接",
          "SMTP connection"
        ],
        "body": [
          "默认关闭邮件发送。使用 smtp 时必须提供有效 EMAIL_FROM、SMTP 主机，并成对配置用户名和密码。TLS 模式应与邮件提供商一致。",
          "Email delivery is disabled by default. SMTP requires a valid EMAIL_FROM and host; username and password must be provided together. Match the TLS mode to the mail provider."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "EMAIL_DELIVERY",
                "EMAIL_DELIVERY"
              ],
              [
                "disabled",
                "disabled"
              ],
              [
                "disabled 或 smtp。",
                "disabled or smtp."
              ]
            ],
            [
              [
                "EMAIL_FROM",
                "EMAIL_FROM"
              ],
              [
                "smtp 时必填",
                "Required for smtp"
              ],
              [
                "有效发件邮箱，可包含显示名。",
                "Valid sender mailbox, optionally with display name."
              ]
            ],
            [
              [
                "EMAIL_SMTP_HOST / EMAIL_SMTP_PORT",
                "EMAIL_SMTP_HOST / EMAIL_SMTP_PORT"
              ],
              [
                "主机必填；端口 587",
                "Host required; port 587"
              ],
              [
                "邮件提供商的 SMTP 地址。",
                "Mail provider SMTP address."
              ]
            ],
            [
              [
                "EMAIL_SMTP_TLS",
                "EMAIL_SMTP_TLS"
              ],
              [
                "starttls",
                "starttls"
              ],
              [
                "starttls、implicit 或 none；none 仅限无凭据 loopback 开发。",
                "starttls, implicit, or none; none is limited to credential-free loopback development."
              ]
            ],
            [
              [
                "EMAIL_SMTP_USERNAME / EMAIL_SMTP_PASSWORD",
                "EMAIL_SMTP_USERNAME / EMAIL_SMTP_PASSWORD"
              ],
              [
                "可选配对",
                "Optional pair"
              ],
              [
                "认证信息必须同时存在或同时缺省。",
                "Authentication values must both be present or both absent."
              ]
            ]
          ]
        },
        "code": {
          "language": "YAML",
          "value": "EMAIL_DELIVERY: \"smtp\"\nEMAIL_FROM: \"NazoAuth <accounts@example.com>\"\nEMAIL_SMTP_HOST: \"smtp.example.com\"\nEMAIL_SMTP_PORT: 587\nEMAIL_SMTP_TLS: \"starttls\"\n# Supply EMAIL_SMTP_USERNAME and EMAIL_SMTP_PASSWORD\n# through protected deployment configuration."
        }
      },
      {
        "id": "verification",
        "title": [
          "验证码时效与发送限制",
          "Verification lifetimes and send limits"
        ],
        "body": [
          "验证码发送存在独立的邮箱、来源与全局准入边界。验证码能发出不代表后续注册已经完成；应用应按照返回状态推进验证流程。",
          "Verification delivery has separate email, source, and broad admission boundaries. Sending a code does not complete registration; applications should follow the returned verification state."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "EMAIL_CODE_TTL_SECONDS",
                "EMAIL_CODE_TTL_SECONDS"
              ],
              [
                "900",
                "900"
              ],
              [
                "验证码寿命。",
                "Verification-code lifetime."
              ]
            ],
            [
              [
                "EMAIL_CODE_SEND_COOLDOWN_SECONDS",
                "EMAIL_CODE_SEND_COOLDOWN_SECONDS"
              ],
              [
                "60",
                "60"
              ],
              [
                "按租户与规范化邮箱的发送冷却。",
                "Send cooldown per tenant and normalized email."
              ]
            ],
            [
              [
                "EMAIL_CODE_PEER_COOLDOWN_SECONDS",
                "EMAIL_CODE_PEER_COOLDOWN_SECONDS"
              ],
              [
                "5",
                "5"
              ],
              [
                "按租户与请求来源的发送冷却。",
                "Send cooldown per tenant and requesting peer."
              ]
            ],
            [
              [
                "EMAIL_CODE_DEV_RESPONSE_ENABLED",
                "EMAIL_CODE_DEV_RESPONSE_ENABLED"
              ],
              [
                "只允许 debug + loopback",
                "Debug + loopback only"
              ],
              [
                "开发响应能力不能用于公开生产服务。",
                "Development responses are unavailable to public production services."
              ]
            ]
          ]
        }
      },
      {
        "id": "delivery-debug",
        "title": [
          "排查邮件未到达",
          "Troubleshooting delivery"
        ],
        "body": [
          "先检查 SMTP TLS 模式、端口和认证配对，再检查发件域授权、提供商投递日志、收件垃圾箱与冷却返回。排查时不要复制 SMTP 密码或有效验证码到工单。",
          "Check SMTP TLS mode, port, and credential pairing, then sender-domain authorization, provider delivery logs, spam folders, and cooldown responses. Do not copy SMTP passwords or valid codes into support tickets."
        ]
      }
    ]
  },
  {
    "id": "modules",
    "group": "configure",
    "title": [
      "协议能力与客户端策略",
      "Capabilities and client policy"
    ],
    "summary": [
      "区分服务可执行能力、客户端权限和具体请求的验证。",
      "Separate executable server capabilities, client authority, and request validation."
    ],
    "source": "docs/protocol/composable-capability-policy.md",
    "sections": [
      {
        "id": "three-levels",
        "title": [
          "三个独立检查层次",
          "Three independent checks"
        ],
        "body": [
          "模块决定服务是否提供能力；客户端注册信息与 security_policy 决定应用能否使用；具体请求仍需满足身份、参数、scope、资源与发送方约束。Discovery 中出现一项能力，并不自动授权所有客户端使用。",
          "Modules determine whether the server provides a capability; registration and security_policy determine client authority; each request must still satisfy identity, parameters, scopes, resources, and sender constraints. A capability in Discovery does not authorize every client."
        ],
        "flow": [
          [
            "活动服务模块",
            "Active server module"
          ],
          [
            "客户端注册与策略",
            "Client registration & policy"
          ],
          [
            "具体请求校验",
            "Request validation"
          ]
        ]
      },
      {
        "id": "client-policy",
        "title": [
          "版本化客户端策略",
          "Versioned client policy"
        ],
        "body": [
          "新客户端有明确 baseline 策略。下面是默认策略；修改高安全级别或跨设备能力需要管理员授权以及配套密钥、授权类型和元数据。管理 UI 未展示的字段通过正式管理接口配置。",
          "New clients have an explicit baseline policy. The default is shown below. High-assurance and cross-device changes require administrator authority plus the matching keys, grants, and metadata. Fields absent from the management UI use the ordinary management API."
        ],
        "code": {
          "language": "JSON",
          "value": "{\n  \"version\": 1,\n  \"assurance\": \"baseline\",\n  \"require_signed_authorization_request\": false,\n  \"require_signed_authorization_response\": false,\n  \"require_signed_introspection_response\": false,\n  \"session_management\": false,\n  \"allow_cross_device_flows\": false\n}"
        },
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "assurance",
                "assurance"
              ],
              [
                "baseline",
                "baseline"
              ],
              [
                "fapi2 要求机密客户端、强认证、PAR、S256 PKCE、DPoP 或 mTLS。",
                "fapi2 requires a confidential client, strong authentication, PAR, S256 PKCE, and DPoP or mTLS."
              ]
            ],
            [
              [
                "require_signed_authorization_request",
                "require_signed_authorization_request"
              ],
              [
                "false",
                "false"
              ],
              [
                "要求 JAR 与受支持的已注册签名密钥。",
                "Requires JAR and supported registered signing keys."
              ]
            ],
            [
              [
                "require_signed_authorization_response",
                "require_signed_authorization_response"
              ],
              [
                "false",
                "false"
              ],
              [
                "要求 JARM；需要相应响应元数据。",
                "Requires JARM and matching response metadata."
              ]
            ],
            [
              [
                "require_signed_introspection_response",
                "require_signed_introspection_response"
              ],
              [
                "false",
                "false"
              ],
              [
                "要求签名内省响应。",
                "Requires signed introspection responses."
              ]
            ],
            [
              [
                "session_management",
                "session_management"
              ],
              [
                "false",
                "false"
              ],
              [
                "允许相应会话管理行为。",
                "Authorizes the corresponding session-management behavior."
              ]
            ],
            [
              [
                "allow_cross_device_flows",
                "allow_cross_device_flows"
              ],
              [
                "false",
                "false"
              ],
              [
                "Device / CIBA 还需要各自 grant 与元数据。",
                "Device / CIBA also require their own grants and metadata."
              ]
            ]
          ]
        }
      },
      {
        "id": "lifecycle",
        "title": [
          "运行时模块生命周期",
          "Runtime module lifecycle"
        ],
        "body": [
          "模块已编译在发行版内，运行时管理选择启用状态，不加载动态插件。desired state 的变更会经过依赖检查与启动或排空；HTTP 202 仅表示请求已接受，不能当成模块已经可用。",
          "Modules are compiled into the distribution; runtime administration selects state rather than loading plugins. Desired-state changes pass dependency checks and startup or draining. HTTP 202 means accepted, not necessarily active."
        ],
        "flow": [
          [
            "Disabled",
            "Disabled"
          ],
          [
            "Starting",
            "Starting"
          ],
          [
            "Enabled",
            "Enabled"
          ],
          [
            "Draining",
            "Draining"
          ]
        ],
        "note": [
          "失败状态需按原因修复；不能用旧进程级 profile 为缺失客户端策略补默认值。模块缺失显式状态或未知策略版本均应作为配置错误处理。",
          "Repair failed states according to their cause. Do not infer a missing client policy from a process profile. Missing explicit module state or an unknown policy version is a configuration error."
        ]
      },
      {
        "id": "conditional",
        "title": [
          "条件能力",
          "Conditional capabilities"
        ],
        "body": [
          "数字凭证、外部信任、草案与实验功能需要完整前置条件。稳定的普通能力可以共存，但客户端权限保持独立。",
          "Digital credentials, external trust, drafts, and experimental functions require complete prerequisites. Stable ordinary capabilities can coexist while client authority remains independent."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "Dynamic Client Registration",
                "Dynamic Client Registration"
              ],
              [
                "活动模块 + 初始访问令牌",
                "Active module + initial-access token"
              ],
              [
                "动态注册客户端不能自行获得更高策略权限。",
                "Dynamically registered clients cannot self-grant elevated policy."
              ]
            ],
            [
              [
                "OpenID4VCI / OpenID4VP",
                "OpenID4VCI / OpenID4VP"
              ],
              [
                "角色、格式、密钥、信任",
                "Role, format, keys, trust"
              ],
              [
                "配置完整后才投影对应元数据。",
                "Metadata is projected only after complete configuration."
              ]
            ],
            [
              [
                "Native SSO",
                "Native SSO"
              ],
              [
                "显式草案能力",
                "Explicit draft capability"
              ],
              [
                "依赖 Token Exchange 与设备 secret 约束。",
                "Depends on Token Exchange and device-secret constraints."
              ]
            ],
            [
              [
                "RAR / SCIM Security Events / HTTP Signatures",
                "RAR / SCIM Security Events / HTTP Signatures"
              ],
              [
                "显式条件配置",
                "Explicit conditional configuration"
              ],
              [
                "各自要求业务类型、接收方或实验性策略。",
                "Each requires the corresponding types, receivers, or experimental policy."
              ]
            ]
          ]
        }
      }
    ]
  },
  {
    "id": "credentials",
    "group": "configure",
    "title": [
      "数字凭证",
      "Digital credentials"
    ],
    "summary": [
      "配置 OpenID4VCI、OpenID4VP 与 HAIP 的角色、格式和信任。",
      "Configure roles, formats, and trust for OpenID4VCI, OpenID4VP, and HAIP."
    ],
    "source": "docs/operations/configuration.md",
    "sections": [
      {
        "id": "roles",
        "title": [
          "Issuer 与 Verifier",
          "Issuer and Verifier"
        ],
        "body": [
          "OpenID4VCI 签发凭证，OpenID4VP 验证钱包出示的凭证。这两个角色独立于普通 OAuth / OIDC 登录，不能只开启一个开关就认为凭证业务可用。先确定凭证格式、签发/验证角色、信任根和撤销策略。",
          "OpenID4VCI issues credentials; OpenID4VP verifies presentations from wallets. These roles are distinct from ordinary OAuth / OIDC sign-in. A switch alone does not establish a working credential service; select the format, role, trust roots, and revocation policy first."
        ],
        "links": [
          {
            "section": "standards",
            "label": [
              "协议支持范围",
              "Protocol support"
            ]
          },
          {
            "section": "certification",
            "label": [
              "认证角色与范围",
              "Certified roles and scope"
            ]
          }
        ]
      },
      {
        "id": "options",
        "title": [
          "角色与信任配置",
          "Role and trust configuration"
        ],
        "body": [
          "角色材料在启动和租户配置构造时校验。管理令牌不是钱包授权令牌；加密材料与外部 attestation 信任分别配置。",
          "Role material is validated during startup and tenant construction. Management tokens are not wallet access tokens; encryption material and external attestation trust are configured separately."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "ENABLE_OPENID4VCI_ISSUER / ENABLE_OPENID4VP_VERIFIER",
                "ENABLE_OPENID4VCI_ISSUER / ENABLE_OPENID4VP_VERIFIER"
              ],
              [
                "按角色显式配置",
                "Explicit role selection"
              ],
              [
                "仍需相应活动模块与完整配置。",
                "Also requires an active module and complete configuration."
              ]
            ],
            [
              [
                "OPENID4VCI_CREDENTIAL_CONFIGURATIONS_JSON",
                "OPENID4VCI_CREDENTIAL_CONFIGURATIONS_JSON"
              ],
              [
                "Issuer 配置",
                "Issuer configuration"
              ],
              [
                "受支持凭证类型、格式与声明配置。",
                "Supported credential types, formats, and claims."
              ]
            ],
            [
              [
                "OPENID4VCI_DEFERRED_CREDENTIAL_CONFIGURATIONS",
                "OPENID4VCI_DEFERRED_CREDENTIAL_CONFIGURATIONS"
              ],
              [
                "使用延迟签发时",
                "For deferred issuance"
              ],
              [
                "选择采用延迟签发的已配置凭证。",
                "Selects configured credentials using deferred issuance."
              ]
            ],
            [
              [
                "OPENID4VP_WALLET_AUTHORIZATION_ORIGINS",
                "OPENID4VP_WALLET_AUTHORIZATION_ORIGINS"
              ],
              [
                "Verifier 配置",
                "Verifier configuration"
              ],
              [
                "钱包授权 origin 边界。",
                "Wallet authorization-origin boundary."
              ]
            ],
            [
              [
                "OPENID4VC_DATA_ENCRYPTION_KEY",
                "OPENID4VC_DATA_ENCRYPTION_KEY"
              ],
              [
                "角色专用材料",
                "Role-specific material"
              ],
              [
                "保护数字凭证持久材料；支持受控文件导入形式。",
                "Protects persisted credential material; controlled file import is available."
              ]
            ],
            [
              [
                "OPENID4VCI_ISSUER_MANAGEMENT_TOKEN / OPENID4VP_VERIFIER_MANAGEMENT_TOKEN",
                "OPENID4VCI_ISSUER_MANAGEMENT_TOKEN / OPENID4VP_VERIFIER_MANAGEMENT_TOKEN"
              ],
              [
                "角色管理凭据",
                "Role-management credentials"
              ],
              [
                "与客户端业务令牌分离并妥善保管。",
                "Separate from client business tokens; store securely."
              ]
            ],
            [
              [
                "OPENID4VC_CLIENT_ATTESTATION_JWKS_JSON / OPENID4VC_CLIENT_ATTESTATION_ISSUER",
                "OPENID4VC_CLIENT_ATTESTATION_JWKS_JSON / OPENID4VC_CLIENT_ATTESTATION_ISSUER"
              ],
              [
                "外部信任输入",
                "External trust inputs"
              ],
              [
                "必须来自所接入生态的真实受信方。",
                "Must identify an actual trusted party in the target ecosystem."
              ]
            ],
            [
              [
                "OPENID4VC_KEY_ATTESTATION_JWKS_JSON",
                "OPENID4VC_KEY_ATTESTATION_JWKS_JSON"
              ],
              [
                "使用 key attestation 时",
                "For key attestation"
              ],
              [
                "显式密钥证明信任。",
                "Explicit key-attestation trust."
              ]
            ],
            [
              [
                "OPENID4VC_REVOCATION_POLICY / OPENID4VC_TRANSACTION_TTL_SECONDS",
                "OPENID4VC_REVOCATION_POLICY / OPENID4VC_TRANSACTION_TTL_SECONDS"
              ],
              [
                "按角色策略配置",
                "Role policy"
              ],
              [
                "撤销决策和交易寿命。",
                "Revocation decisions and transaction lifetime."
              ]
            ]
          ]
        }
      },
      {
        "id": "mdoc",
        "title": [
          "mdoc 材料",
          "mdoc material"
        ],
        "body": [
          "启用 mso_mdoc 凭证配置时，OPENID4VC_MDOC_ISSUING_COUNTRY 必须为两个大写 ASCII 字母。使用对应租户的签名代次、DS/IACA 证书与撤销快照；信任根和撤销材料过期或不匹配时应修复材料，不放宽验证。",
          "An mso_mdoc credential configuration requires OPENID4VC_MDOC_ISSUING_COUNTRY as two uppercase ASCII letters. Use the tenant's signing generation, DS/IACA certificates, and revocation snapshot. Repair expired or mismatched trust/revocation material instead of weakening validation."
        ],
        "code": {
          "language": "YAML",
          "value": "# Example only: choose the actual issuing country.\nOPENID4VC_MDOC_ISSUING_COUNTRY: \"CN\""
        },
        "note": [
          "此片段只说明国家字段，不构成完整 HAIP 或 mdoc 配置。完整角色配置和认证记录分别核对。",
          "This fragment illustrates only the country field; it is not a complete HAIP or mdoc configuration. Verify complete role configuration and certification separately."
        ]
      }
    ]
  },
  {
    "id": "observability",
    "group": "configure",
    "title": [
      "限流、审计与观测",
      "Rate limits, audit, and observability"
    ],
    "summary": [
      "区分共享来源准入、失败登录防护、耐久审计与运行观测。",
      "Separate shared-source admission, failed-login protection, durable audit, and runtime observation."
    ],
    "source": "docs/operations/configuration.md",
    "sections": [
      {
        "id": "limits",
        "title": [
          "不同层次的限流",
          "Different rate-limit boundaries"
        ],
        "body": [
          "宽泛 IP 桶服务于共享出口的容量准入，失败登录限制服务于猜测凭据防护，两者不可互相替代。容量参数应按真实实例资源与流量调整。",
          "Broad IP buckets provide admission for shared egress; failed-login limits defend against credential guessing. They are not interchangeable. Tune capacity from actual instance resources and traffic."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "RATE_LIMIT_WINDOW_SECONDS",
                "RATE_LIMIT_WINDOW_SECONDS"
              ],
              [
                "60",
                "60"
              ],
              [
                "广义来源 IP 桶窗口。",
                "Broad source-IP bucket window."
              ]
            ],
            [
              [
                "AUTH_RATE_LIMIT_MAX_REQUESTS / TOKEN_RATE_LIMIT_MAX_REQUESTS / TOKEN_MANAGEMENT_RATE_LIMIT_MAX_REQUESTS",
                "AUTH_RATE_LIMIT_MAX_REQUESTS / TOKEN_RATE_LIMIT_MAX_REQUESTS / TOKEN_MANAGEMENT_RATE_LIMIT_MAX_REQUESTS"
              ],
              [
                "100000",
                "100000"
              ],
              [
                "各类端点共享出口准入上限，不是密码失败尝试额度。",
                "Shared-egress admission ceilings by endpoint class, not password-failure allowances."
              ]
            ],
            [
              [
                "LOGIN_FAILURE_WINDOW_SECONDS",
                "LOGIN_FAILURE_WINDOW_SECONDS"
              ],
              [
                "900",
                "900"
              ],
              [
                "失败登录统计窗口。",
                "Failed-login window."
              ]
            ],
            [
              [
                "LOGIN_FAILURE_IP_EMAIL_MAX_ATTEMPTS",
                "LOGIN_FAILURE_IP_EMAIL_MAX_ATTEMPTS"
              ],
              [
                "5",
                "5"
              ],
              [
                "按来源 IP 与规范化邮箱限制失败尝试。",
                "Bounds failed attempts per source IP and normalized email."
              ]
            ],
            [
              [
                "PASSWORD_HASH_MAX_CONCURRENCY",
                "PASSWORD_HASH_MAX_CONCURRENCY"
              ],
              [
                "8",
                "8"
              ],
              [
                "每进程 Argon2 验证并发，按 CPU 与内存容量配置。",
                "Per-process Argon2 verification concurrency, sized from CPU and memory."
              ]
            ],
            [
              [
                "PASSWORD_HASH_QUEUE_TIMEOUT_MS",
                "PASSWORD_HASH_QUEUE_TIMEOUT_MS"
              ],
              [
                "100",
                "100"
              ],
              [
                "有界排队时长，超时返回暂不可用。",
                "Bounded queue wait; timeout returns temporary unavailability."
              ]
            ]
          ]
        }
      },
      {
        "id": "telemetry",
        "title": [
          "日志、追踪与指标",
          "Logs, traces, and metrics"
        ],
        "body": [
          "先用 health 与 readiness 判断实例状态，再结合日志和追踪定位依赖问题。指标不应包含完整令牌、Cookie、秘密或验证码。",
          "Use health and readiness for instance state, then logs and traces to locate dependency failures. Metrics must not contain full tokens, cookies, secrets, or verification codes."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "RUST_LOG",
                "RUST_LOG"
              ],
              [
                "info",
                "info"
              ],
              [
                "结构化日志过滤器。",
                "Structured logging filter."
              ]
            ],
            [
              [
                "OTEL_ENABLED",
                "OTEL_ENABLED"
              ],
              [
                "按部署启用",
                "Deployment selected"
              ],
              [
                "开启 OpenTelemetry 导出。",
                "Enables OpenTelemetry export."
              ]
            ],
            [
              [
                "OTEL_EXPORTER_OTLP_ENDPOINT / OTEL_EXPORTER_OTLP_PROTOCOL / OTEL_EXPORTER_OTLP_TIMEOUT",
                "OTEL_EXPORTER_OTLP_ENDPOINT / OTEL_EXPORTER_OTLP_PROTOCOL / OTEL_EXPORTER_OTLP_TIMEOUT"
              ],
              [
                "外部采集端配置",
                "External collector settings"
              ],
              [
                "采集地址、协议与超时。",
                "Collector endpoint, protocol, and timeout."
              ]
            ],
            [
              [
                "PERF_METRICS_ENABLED",
                "PERF_METRICS_ENABLED"
              ],
              [
                "按部署启用",
                "Deployment selected"
              ],
              [
                "性能指标暴露策略。",
                "Performance-metric exposure policy."
              ]
            ]
          ]
        }
      },
      {
        "id": "audit",
        "title": [
          "耐久审计与外部锚点",
          "Durable audit and external anchors"
        ],
        "body": [
          "安全审计记录权限与状态变化。可选 audit anchor 的模式、时效与滞后上限属于服务端策略；外部 URL、认证令牌与数据库连接属于独立 worker。不能将 worker 配置混入普通认证请求路径。",
          "Security audit records authority and state changes. Optional audit-anchor mode, freshness, and lag bounds are server policy; external URLs, credentials, and database connections belong to the isolated worker. Worker configuration does not belong in the authentication request path."
        ],
        "table": {
          "heads": [
            [
              "配置项",
              "Setting"
            ],
            [
              "默认值 / 条件",
              "Default / condition"
            ],
            [
              "含义与约束",
              "Meaning and constraints"
            ]
          ],
          "rows": [
            [
              [
                "AUDIT_ANCHOR_MODE / AUDIT_ANCHOR_FRESHNESS_SECONDS / AUDIT_ANCHOR_MAX_LAG_SECONDS",
                "AUDIT_ANCHOR_MODE / AUDIT_ANCHOR_FRESHNESS_SECONDS / AUDIT_ANCHOR_MAX_LAG_SECONDS"
              ],
              [
                "条件能力",
                "Conditional capability"
              ],
              [
                "耐久审计锚点检查策略。",
                "Durable audit-anchor preflight policy."
              ]
            ],
            [
              [
                "SECURITY_AUDIT_REQUIRE_LEAST_PRIVILEGE",
                "SECURITY_AUDIT_REQUIRE_LEAST_PRIVILEGE"
              ],
              [
                "部署权限策略",
                "Deployment privilege policy"
              ],
              [
                "数据库最小权限要求。",
                "Database least-privilege requirement."
              ]
            ]
          ]
        },
        "links": [
          {
            "section": "operations",
            "label": [
              "实例诊断与恢复",
              "Instance diagnostics and recovery"
            ]
          }
        ]
      }
    ]
  }
];
