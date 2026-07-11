import assert from 'node:assert/strict'
import test from 'node:test'

import { artifactFindings, sourceFindings } from './check-browser-security.mjs'

test('source gate accepts only the reviewed session hint calls', () => {
  const source = `
    const SESSION_HINT_KEY = 'nazo_oauth_session_hint';
    window.localStorage.getItem(SESSION_HINT_KEY);
    window.localStorage.setItem(SESSION_HINT_KEY, '1');
    window.localStorage.removeItem(SESSION_HINT_KEY);
  `
  assert.deepEqual(sourceFindings('auth/sessionHint.ts', source), [])
})

test('source gate rejects an additional key in an allowlisted file', () => {
  const source = `
    const SESSION_HINT_KEY = 'nazo_oauth_session_hint';
    window.localStorage.getItem(SESSION_HINT_KEY);
    window.localStorage.setItem('analytics', 'enabled');
  `
  assert.match(sourceFindings('auth/sessionHint.ts', source).join('\n'), /unapproved storage call/)
})

test('source gate rejects sensitive material stored under an approved key', () => {
  const source = `
    const SESSION_HINT_KEY = 'nazo_oauth_session_hint';
    window.localStorage.setItem(SESSION_HINT_KEY, accessToken);
  `
  assert.match(sourceFindings('auth/sessionHint.ts', source).join('\n'), /unapproved storage call/)
})

test('source gate rejects durable storage outside the exact allowlist', () => {
  assert.match(
    sourceFindings('lib/api.ts', "window.sessionStorage.setItem('value', 'x')").join('\n'),
    /unapproved durable browser storage/,
  )
})

test('artifact gate rejects credential-shaped build content', () => {
  const jwt = `eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.c2lnbmF0dXJlLXZhbHVl`
  const samples = [
    `Authorization: Bearer ${'a'.repeat(32)}`,
    `{"access_token":"${'b'.repeat(32)}"}`,
    `{"kty":"RSA","n":"${'c'.repeat(32)}","d":"${'d'.repeat(32)}"}`,
    '-----BEGIN PRIVATE KEY----- secret -----END PRIVATE KEY-----',
    '-----BEGIN ENCRYPTED PRIVATE KEY----- secret -----END ENCRYPTED PRIVATE KEY-----',
    `oidfRunnerToken="opaque-runner-token-${'e'.repeat(24)}"`,
    `nazo_test_secret_${'f'.repeat(24)}`,
    jwt,
  ]
  for (const sample of samples) {
    assert.notDeepEqual(artifactFindings(sample), [], sample)
  }
})

test('artifact gate permits documentation placeholders', () => {
  assert.deepEqual(
    artifactFindings('Authorization: Bearer access_token; code_verifier=original_pkce_verifier'),
    [],
  )
})
