# NazoAuthWeb: particle identity and site design

## Current design
One Three.js scene belongs to the site frame, outside route content and authentication. It fills the whole viewport with a persistent starfield. Only at the homepage opening and closing does a subset of those particles assemble into “NazoAuth”. The other stars remain distributed across the background throughout. Scrolling releases the letter particles back into the entire sky; reversing the scroll restores the formation.

The scene uses one point geometry and one shader/material. Desktop begins with 8,000 letter-capable stars plus 1,800 permanent field stars; narrow viewports use 4,200 plus 850. Seeded targets cover the viewport, with varied star sizes, depth, gentle motion and twinkling. Absolute document scroll distance, smoothed once in the scene, drives depth-dependent vertical star travel on every route. Near stars move faster than far stars; reversal retraces their positions. Stars wrap outside the viewport so long documents retain continuous coverage. No wheel interception or generated texture is used. The pause button and its state/controller API have been removed. System reduced-motion preferences stop both ambient motion and scroll parallax; hidden tabs stop rendering. A single scene survives route changes and disposes its resources on teardown.

## Typography
Latin headings and compact brand labels use Space Grotesk; reading text and controls use DM Sans. Chinese text uses Noto Sans SC, with weight and size distinguishing headings from body copy. Code, identifiers and technical labels use JetBrains Mono. All four families are requested through the existing conditional font loader with display=swap; the isolated verification-result route still makes no external font request. Local font fallbacks remain available.

The former 6–13px miniature text scale has been replaced in its owning styles. Body and input text is 16px, article prose 17px, code 14px, controls generally 15–16px and supporting labels 12–14px at the default browser size. Reading sizes use rem. Large heading sizes retain their responsive range. Navigation collapses below 1000px; documentation columns allow more room for their larger labels. The four-stage interactive guide uses two columns below 480px to preserve complete labels.

Font references: https://github.com/floriankarsten/space-grotesk, https://github.com/googlefonts/dm-fonts, https://github.com/notofonts/noto-cjk, https://www.jetbrains.com/lp/mono/.

Documentation, security, support, login, account, administration and authorization/verification pages show only a quieter starfield (48% of homepage intensity), without the large opening or closing wordmarks and without their reserved space. The documentation hero's decorative image has also been removed; its title and summary sit on a calm translucent surface. Existing compact navigation and form logos remain. Word-forming particles switch directly to the sky when leaving the homepage, avoiding a transient word over another route.

The 24-item protocol grid remains four columns on desktop and two on phones. A new four-stage interactive authorization-code guide explains the app request, authentication/consent, token exchange, and resource-server validation; each stage exposes its input, output, responsibility, and documentation link. The security page adds an expandable four-stage signing-key lifecycle. Support adds guided integration, deployment, and troubleshooting entry points. Scroll-driven content entrances and restrained hover/selection transitions enrich the public pages. Existing functional page transitions and authentication behavior are retained.

The homepage ending shares the same scene as its footer, with a local wordmark reunion between the closing action and footer navigation. Other routes have a compact footer without this reunion stage.

Documentation contains 24 chapters, including architecture, protocol coverage, certification, tenant routing, and nine configuration chapters. Configuration tables contain 94 rows, some grouping related settings. Search covers the document body; deep links, in-page contents, code copying, and previous/next navigation remain available.

## Source boundaries
Current backend code is authoritative where older README statements differ. TenantRuntimeRegistry resolves tenant runtime by canonical host; Settings::from_directory_binding derives each tenant issuer and public UI origin. One deployment can serve multiple tenants/domains; arbitrary aliases for one issuer are not advertised. Semantic persistence/state ports are independent of adapters; the default executable ships PostgreSQL and Valkey rather than an automatic database selector.

Reviewed source areas: D:/self/NazoAuth/crates, D:/self/NazoAuth/docs/operations/configuration.md, D:/self/NazoAuth/docs/project/architecture.md, D:/self/NazoAuth/docs/integration/openid-connect.md, and D:/self/NazoAuthCtl/README.md. No backend files were edited for this frontend task.

## Official certification records
Checked live against the OpenID Foundation listings. Certified versions and profile combinations are stated separately from later engineering conformance runs.
- https://openid.net/certification/certified-openid-providers-profiles/
- https://openid.net/certification/certified-openid-providers-for-logout-profiles/
- https://openid.net/certification/certified-fapi-2-0-op-security-profile-final-message-signing-final/
- https://openid.net/certification/certified-fapi-ciba-openid-providers-profiles/
- https://openid.net/certification/certified-oid4vci-haip-final/
- https://openid.net/certification/certified-oid4vp-haip-final/

The documentation structure was informed by Authelia configuration documentation (https://www.authelia.com/configuration/), Auth0, Keycloak, ZITADEL, authentik, and Ory documentation. Product-specific settings and claims come from NazoAuth code, not those products.

## Motion reference
Reference: https://openai.com/index/gpt-6-astra/ . Direct browser inspection informed the assembled-particle transition. The requested design now keeps a full starfield throughout and limits the NazoAuth formation to the homepage.

## Verification
Full npm test passed: audit, lint, 33 Node tests, 32 component tests, 7 browser-security tests, source security checks, production build, artifact checks, dist security checks, and the isolated verification-page browser contract.

An isolated local Chrome check passed removal of the pause control, live reduced-motion updates, context-loss static wordmark fallback, one-canvas reuse across routes, homepage formed → starfield → footer reunion → reverse scrolling, and absence of opening/closing wordmark stages on all seven checked non-home routes. Eight routes rendered without uncaught JavaScript exceptions. Desktop and 390/320-pixel visual checks covered the homepage, docs, login, security, support and consent, with no horizontal overflow. These checks do not establish authenticated business end-to-end behavior.

The scrolling regression check freezes only ambient shader time in an isolated browser, then reads the actual WebGL framebuffer. After the word has fully dispersed, scrolling from 1200px to 1600px changes 26,015 pixels; returning to 1200px restores the baseline with zero changed pixels at the comparison threshold. Reduced-motion mode produces zero changed pixels across the same scroll. This proves visible star-position changes independently of frame counts or the word transition. Actual font loads succeeded for all four families. English and Chinese screenshots covered desktop, tablet, 390px and 320px layouts, including docs code, authentication, protocol cards and the revised guide.

Local ANGLE / NVIDIA RTX 5060 Ti frame submission medians were 16.7 ms for desktop, scrolling and the 390-pixel viewport. P95 values were 17.3, 18.6 and 18.4 ms respectively over roughly 2.2 seconds each. This is not a physical-phone or display presentation benchmark. Evidence: docs/motion-typography-validation.json. The standard Three.js large-chunk warning remains (515.25 kB, 128.77 kB gzip).

## Published release
Released to https://auth.nazo.run/ui/ as 20260907-135207-97a0668b. All 40 public artifact files match local SHA-256 hashes; 12 SPA routes, missing-file 404s, the /ui redirect, ready health and unchanged OIDC discovery passed after activation completed. Public validation evidence: docs/motion-typography-deployment-verification.json. Backend start time remains 2026-09-05 22:09:29.746691504 +0800 CST; ingress configuration SHA-256 remains 88233c57edf49418b3c7009af1e47f3da2f64cf6cee5d964fbf904368694437c. No backend restart, commit or push occurred.
Previous release 20260907-132725-046d989b is retained. Guarded rollback: ssh hostinger python3 /var/www/nazoauth-ui/backups/20260907-135207-97a0668b/deploy.py rollback.
