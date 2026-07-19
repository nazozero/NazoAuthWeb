import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clientIdFromAuthorizationNext,
  normalizeClientPresentation,
} from '../src/auth/clientPresentation.ts';

test('extracts one client id only from the exact local authorization continuation', () => {
  assert.equal(
    clientIdFromAuthorizationNext('/authorize?client_id=client-1&response_type=code'),
    'client-1'
  );
  for (const value of [
    null,
    'https://evil.example/authorize?client_id=client-1',
    '/auth?client_id=client-1',
    '/authorize?client_id=first&client_id=second',
    '/authorize?client_id=%20client-1',
    '/authorize?client_id=client%0Aid',
    '/authorize?client_id=%E5%AE%A2%E6%88%B7%E7%AB%AF',
    '/authorize?client_id=client-1#fragment',
  ]) {
    assert.equal(clientIdFromAuthorizationNext(value), null, String(value));
  }
});

test('accepts only complete, HTTPS presentation metadata', () => {
  assert.deepEqual(
    normalizeClientPresentation({
      client_name: 'Example Client',
      logo_uri: 'https://client.example/logo.svg',
      policy_uri: null,
      tos_uri: 'https://client.example/terms',
    }),
    {
      client_name: 'Example Client',
      logo_uri: 'https://client.example/logo.svg',
      policy_uri: null,
      tos_uri: 'https://client.example/terms',
    }
  );
  for (const value of [
    { client_name: '', logo_uri: null, policy_uri: null, tos_uri: null },
    {
      client_name: 'Example Client',
      logo_uri: 'http://client.example/logo.svg',
      policy_uri: null,
      tos_uri: null,
    },
    {
      client_name: 'Example Client',
      logo_uri: 'https://user:password@client.example/logo.svg',
      policy_uri: null,
      tos_uri: null,
    },
  ]) {
    assert.equal(normalizeClientPresentation(value), null);
  }
});
