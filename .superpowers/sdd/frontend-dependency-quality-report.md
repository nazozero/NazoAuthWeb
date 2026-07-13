# Frontend dependency and quality convergence

## Vulnerability root cause and remediation

`npm audit` reported GHSA-4x5r-pxfx-6jf8 through the development-only chain
`eslint-plugin-react-hooks@7.1.1 -> @babel/core@7.29.0`. The hooks package
declares `@babel/core ^7.24.4`, so refreshing the lockfile selected the fixed
compatible `@babel/core@7.29.7` without adding a direct Babel dependency,
ignoring the advisory, or using `npm audit fix --force`. `npm audit` now reports
zero vulnerabilities.

Compatible direct/transitive updates include Vite 8.1.4, plugin-react 6.0.3,
ESLint 10.7.0, typescript-eslint 8.63.0, React Router 7.18.1, and paired
`three`/`@types/three` 0.185.1. TypeScript remains 6.0.3 because
typescript-eslint 8.63.0 declares `<6.1.0`; `@types/node` remains on the latest
24.x line to match the verified Node 24 runtime rather than following unrelated
Node 26 declarations.

## Toolchain and automation

- `.nvmrc` pins the locally verified Node 24.16.0; `package.json` records Node
  24/npm 11 engines and `npm@11.13.0` as the package manager.
- The new frontend workflow covers every build, lint, test, dependency, source,
  public asset, and workflow input path. It runs clean install, low-severity
  audit, and the aggregate test gate with read-only repository permissions.
- Dependabot checks npm and GitHub Actions weekly and groups compatible npm
  minor/patch updates. The repository previously had no frontend CI,
  Dependabot, Renovate, Node policy, or path filters.
- README development and verification commands now match the real lockfile and
  scripts.

## Verification

- `npm ci` succeeded.
- `npm audit --audit-level=low` reported zero vulnerabilities.
- ESLint succeeded; Vitest passed 9/9 tests; TypeScript/Vite build succeeded.
- Aggregate `npm test` passed, including the pre-existing delivery contract.
