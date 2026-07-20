# NazoAuth Web

NazoAuth Web is the browser front end for NazoAuth. It provides the account login, OAuth consent, user profile, client access request, credential delivery, and administrator surfaces.

The application is built with React, TypeScript, and Vite. It talks to the NazoAuth backend through same-origin API routes and keeps credentialed requests enabled for session cookies and CSRF-protected writes.

## Local Development

```bash
npm install
npm run dev
```

By default, development requests use `http://127.0.0.1:8000`.

To point the web app at a deployed backend:

```bash
VITE_API_BASE_URL=https://issuer.example npm run dev
```

## Build

```bash
npm run test
```

`npm run test` runs linting and the production build.

## Browser Security Boundary

NazoAuthWeb is a same-origin first-party session application. It uses secure
server-managed cookies; unsafe authenticated `/auth/me/*` operations are
CSRF-protected. Login and other unauthenticated `/auth/*` entry points use their
own endpoint controls. NazoAuthWeb does not act as an OAuth public SPA and does
not store access tokens, refresh tokens, ID Tokens, client secrets, private
keys, OIDF credentials, or PKCE verifiers in browser storage.

The only approved durable browser values are the locale preference and a
non-authoritative boolean session hint. The backend always verifies the real
session. `npm test` enforces exact source-level persistence calls and scans the
production build for high-confidence credential artifacts including private
keys, JWTs, bearer values, OAuth/OIDF credential assignments, private JWKs, and
test-secret markers. Static scanning cannot classify an arbitrary minified
opaque string without a credential name or recognizable format; runtime
authorization and secret isolation remain server-side controls.

Third-party browser applications are separate OAuth public clients. They use
NazoAuth `/authorize` and `/token` with Authorization Code, exact redirect URIs,
and S256 PKCE. A string embedded in browser JavaScript cannot be treated as a
confidential client secret.

## Deployment

Build output is written to `dist/`.

For `issuer.example/ui/`, deploy the contents of `dist/` to the static site root and make sure the reverse proxy either:

- forwards backend API routes to the NazoAuth backend, or
- builds with `VITE_API_BASE_URL=https://issuer.example` and allows credentialed same-origin requests from `https://issuer.example/ui/`.

## Routes

- `/` account and authorization gateway
- `/auth` login, registration, and account recovery entry
- `/consent` OAuth consent screen
- `/profile` user profile, authorized apps, and client access requests
- `/delivery` one-time client credential delivery
- `/admin` administrator work surface
- `/docs` integration notes
- `/contact` support information

## License

NazoAuth Web is licensed under the
[GNU Affero General Public License, version 3 or later](LICENSE).
