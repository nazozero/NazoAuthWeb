# NazoAuth Web

NazoAuth Web is the browser front end for NazoAuth. It provides the account login, OAuth consent, user profile, client access request, credential delivery, and administrator surfaces.

The application is built with React, TypeScript, and Vite. It talks to the NazoAuth backend through same-origin API routes and keeps credentialed requests enabled for session cookies and CSRF-protected writes.

## Local Development

Use Node.js 24.16.0 and npm 11.13.x. The repository records both constraints in
`.nvmrc` and `package.json`.

```bash
npm ci
npm run dev
```

By default, development requests use `http://127.0.0.1:8000`.

To point the web app at a deployed backend:

```bash
VITE_API_BASE_URL=https://auth.nazo.run npm run dev
```

## Build

```bash
npm run test
```

`npm run test` runs the delivery contract, ESLint, Vitest component tests, and
the production TypeScript/Vite build. `npm run audit` fails on any published
advisory at low severity or higher. GitHub Actions runs both commands for every
frontend-affecting pull request, while Dependabot checks npm and Actions weekly.

## Deployment

Build output is written to `dist/`.

For `auth.nazo.run/ui/`, deploy the contents of `dist/` to the static site root and make sure the reverse proxy either:

- forwards backend API routes to the NazoAuth backend, or
- builds with `VITE_API_BASE_URL=https://auth.nazo.run` and allows credentialed same-origin requests from `https://auth.nazo.run/ui/`.

## Routes

- `/` account and authorization gateway
- `/auth` login, registration, and account recovery entry
- `/consent` OAuth consent screen
- `/profile` user profile, authorized apps, and client access requests
- `/delivery` one-time client credential delivery
- `/admin` administrator work surface
- `/docs` integration notes
- `/contact` support information
