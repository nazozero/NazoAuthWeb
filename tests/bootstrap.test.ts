import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  consumeInitialAdminToken,
  createInitialAdminTokenMemory,
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

test('retains the consumed token across repeated React initialization and clears it explicitly', () => {
  const token = 'A'.repeat(64);
  const memory = createInitialAdminTokenMemory(token);

  assert.equal(memory.peek(), token);
  assert.equal(memory.peek(), token);
  memory.clear();
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
  assert.match(source, /JSON\.stringify\(\{ token, email: normalizedEmail, password \}\)/);
  assert.doesNotMatch(source, /application\/x-www-form-urlencoded/);
  assert.doesNotMatch(source, /console\.|localStorage|sessionStorage/);
});
