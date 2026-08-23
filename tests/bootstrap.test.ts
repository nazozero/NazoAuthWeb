import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  consumeInitialAdminToken,
  createInitialAdminBootstrapMemory,
  createInitialAdminRequestId,
  normalizeInitialAdminEmail,
  validInitialAdminClaim,
  validInitialAdminPassword,
} from '../src/auth/bootstrap.ts';

test('consumes only a closed bootstrap token from the URL fragment', () => {
  const token = `${'Aa0_-Z9'.repeat(9)}A`;
  assert.equal(token.length, 64);
  const replacements: string[] = [];
  assert.equal(
    consumeInitialAdminToken(
      { hash: `#token=${token}`, pathname: '/ui/setup', search: '?locale=zh-CN' },
      (url) => replacements.push(url)
    ),
    token
  );
  assert.deepEqual(replacements, ['/ui/setup?locale=zh-CN']);
});

test('clears malformed or unrelated fragments without exposing a credential', () => {
  for (const hash of [
    '',
    '#token=short',
    `#other=${'a'.repeat(64)}`,
    `#token=${'a'.repeat(63)}=`,
    `#token=${'a'.repeat(65)}`,
  ]) {
    const replacements: string[] = [];
    assert.equal(
      consumeInitialAdminToken(
        { hash, pathname: '/ui/setup', search: '' },
        (url) => replacements.push(url)
      ),
      null
    );
    assert.deepEqual(replacements, hash ? ['/ui/setup'] : []);
  }
});

test('retains one token and request id across StrictMode initialization and retries', () => {
  const token = 'A'.repeat(64);
  let fills = 0;
  const memory = createInitialAdminBootstrapMemory(token, (values) => {
    fills += 1;
    values.forEach((_, index) => {
      values[index] = index;
    });
  });

  const first = memory.peek();
  const strictModeReplay = memory.peek();
  const retry = memory.peek();
  assert.deepEqual(strictModeReplay, first);
  assert.deepEqual(retry, first);
  assert.equal(first?.token, token);
  assert.equal(first?.requestId, 'bootstrap-admin-000102030405060708090a0b0c0d0e0f');
  assert.equal(fills, 1);
  memory.clear();
  assert.equal(memory.peek(), null);
});

test('generates the closed lowercase request id from 128 Web Crypto bits', () => {
  const lengths: number[] = [];
  const requestId = createInitialAdminRequestId((values) => {
    lengths.push(values.byteLength);
    values.fill(0xff);
  });
  assert.deepEqual(lengths, [16]);
  assert.equal(requestId, `bootstrap-admin-${'ff'.repeat(16)}`);
  assert.match(requestId, /^bootstrap-admin-[0-9a-f]{32}$/);
});

test('normalizes bootstrap email exactly like the backend ASCII policy', () => {
  assert.equal(normalizeInitialAdminEmail(' ADMIN@Example.COM '), 'admin@example.com');
});

test('accepts only the closed bootstrap receipt bound to the request and email', () => {
  const requestId = 'bootstrap-admin-0123456789abcdef0123456789abcdef';
  const claim = {
    request_id: requestId,
    id: '019ad2b4-4c9f-7d8e-8abc-1234567890ab',
    email: 'admin@example.com',
    role: 'admin',
    next: '/ui/auth',
  };
  assert.equal(validInitialAdminClaim(claim, requestId, claim.email), true);

  for (const mismatch of [
    { ...claim, request_id: `bootstrap-admin-${'f'.repeat(32)}` },
    { ...claim, id: '019ad2b4-4c9f-4d8e-8abc-1234567890ab' },
    { ...claim, email: 'other@example.com' },
    { ...claim, role: 'user' },
    { ...claim, next: '/ui/admin' },
    { ...claim, unexpected: true },
  ]) {
    assert.equal(validInitialAdminClaim(mismatch, requestId, claim.email), false);
  }
});

test('response mismatch preserves the token and request id for an idempotent retry', () => {
  const memory = createInitialAdminBootstrapMemory('A'.repeat(64), (values) => values.fill(1));
  const session = memory.peek();
  assert.ok(session);

  assert.equal(
    memory.accept(
      {
        request_id: session.requestId,
        id: '019ad2b4-4c9f-7d8e-8abc-1234567890ab',
        email: 'admin@example.com',
        role: 'admin',
        next: '/wrong',
      },
      'admin@example.com'
    ),
    null
  );
  assert.deepEqual(memory.peek(), session);

  const valid = {
    request_id: session.requestId,
    id: '019ad2b4-4c9f-7d8e-8abc-1234567890ab',
    email: 'admin@example.com',
    role: 'admin' as const,
    next: '/ui/auth' as const,
  };
  assert.deepEqual(memory.accept(valid, valid.email), valid);
  assert.equal(memory.peek(), null);
});

test('matches the backend password length boundary by Unicode scalar values', () => {
  assert.equal(validInitialAdminPassword('a'.repeat(11)), false);
  assert.equal(validInitialAdminPassword('a'.repeat(12)), true);
  assert.equal(validInitialAdminPassword('🔐'.repeat(12)), true);
  assert.equal(validInitialAdminPassword('a'.repeat(1024)), true);
  assert.equal(validInitialAdminPassword('a'.repeat(1025)), false);
});

test('submits the closed JSON bootstrap contract without logging the credential', () => {
  const source = readFileSync(new URL('../src/pages/Setup.tsx', import.meta.url), 'utf8');
  assert.match(source, /'Content-Type': 'application\/json'/);
  assert.match(source, /request_id: bootstrap\.requestId/);
  assert.match(source, /token: bootstrap\.token/);
  assert.match(source, /acceptInitialAdminClaim\(claim, normalizedEmail\)/);
  assert.doesNotMatch(source, /application\/x-www-form-urlencoded/);
  assert.doesNotMatch(source, /console\.|localStorage|sessionStorage/);
});
