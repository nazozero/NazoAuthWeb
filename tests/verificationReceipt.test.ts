import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalVerificationResultPath,
  consumeVerificationReceiptCapability,
  createVerificationReceiptCapabilityMemory,
  loadVerificationReceipt,
  parseVerificationReceipt,
  verificationResultPath,
} from '../src/lib/verificationReceipt.ts';

const capability = 'A'.repeat(43);
const digest = 'a'.repeat(64);
const otherDigest = 'b'.repeat(64);
const receiptPayload = {
  schema: 1,
  issuer: 'https://issuer.example',
  deployment_id: 'deployment-1',
  runtime_instance_id: 'runtime-1',
  instance_key_id: 'key-1',
  transaction_id: '019ad2b4-4c9f-7d8e-8abc-1234567890ab',
  receipt_id: '019ad2b4-4c9f-7d8e-8abc-1234567890ac',
  status: 'verified',
  evidence_context: {
    run_jti: 'run-1',
    artifact_sha256: digest,
    matrix_sha256: otherDigest,
    suite_plan_id: '019ad2b4-4c9f-7d8e-8abc-1234567890ad',
    suite_module_id: '019ad2b4-4c9f-7d8e-8abc-1234567890ae',
    test_name: 'openid4vp-test',
    variant_sha256: digest,
  },
  completed_at: '2026-08-22T02:00:00Z',
  expires_at: '2026-08-22T03:00:00Z',
  receipt_sha256: otherDigest,
};

test('derives the isolated route from the deployment base', () => {
  assert.equal(verificationResultPath('/ui/'), '/ui/verification-result');
  assert.equal(verificationResultPath('/'), '/verification-result');
  assert.equal(
    canonicalVerificationResultPath('/ui/verification-result', '/ui/'),
    '/ui/verification-result'
  );
  assert.equal(
    canonicalVerificationResultPath('/ui/verification-result/', '/ui/'),
    '/ui/verification-result'
  );
  for (const rejected of [
    '/ui/verification-result//',
    '/ui/verification-result/extra',
    '/ui//verification-result',
  ]) {
    assert.equal(canonicalVerificationResultPath(rejected, '/ui/'), null);
  }
});

test('consumes one exact fragment capability and scrubs fragment and query', () => {
  const replacements: string[] = [];
  assert.equal(
    consumeVerificationReceiptCapability(
      {
        pathname: '/ui/verification-result',
        search: '?ignored=value',
        hash: `#receipt=${capability}`,
      },
      '/ui/',
      (url) => replacements.push(url)
    ),
    capability
  );
  assert.deepEqual(replacements, ['/ui/verification-result']);

  const trailingSlashReplacements: string[] = [];
  assert.equal(
    consumeVerificationReceiptCapability(
      {
        pathname: '/ui/verification-result/',
        search: '?must=be-removed',
        hash: `#receipt=${capability}`,
      },
      '/ui/',
      (url) => trailingSlashReplacements.push(url)
    ),
    capability
  );
  assert.deepEqual(trailingSlashReplacements, ['/ui/verification-result']);
});

test('rejects alternate paths and malformed or ambiguous fragments', () => {
  const rejected = [
    '#receipt=short',
    `#receipt=${capability}&other=1`,
    `#other=${capability}`,
    `#receipt=${capability}=`,
  ];
  for (const hash of rejected) {
    const replacements: string[] = [];
    assert.equal(
      consumeVerificationReceiptCapability(
        { pathname: '/ui/verification-result', search: '', hash },
        '/ui/',
        (url) => replacements.push(url)
      ),
      null
    );
    assert.deepEqual(replacements, ['/ui/verification-result']);
  }

  for (const pathname of [
    '/ui/auth',
    '/ui/verification-result//',
    '/ui/verification-result/extra',
  ]) {
    const replacements: string[] = [];
    assert.equal(
      consumeVerificationReceiptCapability(
        {
          pathname,
          search: '?untrusted=value',
          hash: `#receipt=${capability}`,
        },
        '/ui/',
        (url) => replacements.push(url)
      ),
      null
    );
    assert.deepEqual(replacements, [pathname]);
  }
});

test('retains one in-memory capability across StrictMode replay until terminal clear', () => {
  const scheduled: Array<() => void> = [];
  const memory = createVerificationReceiptCapabilityMemory(
    capability,
    (callback) => scheduled.push(callback)
  );
  const firstMount = memory.acquire();
  assert.equal(firstMount?.capability, capability);
  firstMount?.release();

  const strictModeReplay = memory.acquire();
  assert.equal(strictModeReplay?.capability, capability);
  scheduled.shift()?.();
  const retained = memory.acquire();
  assert.equal(retained?.capability, capability);
  retained?.release();

  strictModeReplay?.clear();
  strictModeReplay?.release();
  assert.equal(memory.acquire(), null);
});

test('clears an abandoned capability after a real unmount without replay', () => {
  const scheduled: Array<() => void> = [];
  const memory = createVerificationReceiptCapabilityMemory(
    capability,
    (callback) => scheduled.push(callback)
  );
  const page = memory.acquire();
  assert.ok(page);
  page.release();
  scheduled.splice(0).forEach((callback) => callback());
  assert.equal(memory.acquire(), null);
});

test('accepts only the closed verified projection and strips non-display fields', () => {
  assert.deepEqual(parseVerificationReceipt(receiptPayload), {
    status: 'verified',
    receiptId: receiptPayload.receipt_id,
    receiptSha256: otherDigest,
    suitePlanId: receiptPayload.evidence_context.suite_plan_id,
    suiteModuleId: receiptPayload.evidence_context.suite_module_id,
    testName: 'openid4vp-test',
    variantSha256: digest,
    completedAt: receiptPayload.completed_at,
    expiresAt: receiptPayload.expires_at,
  });

  for (const invalid of [
    { ...receiptPayload, status: 'failed' },
    { ...receiptPayload, receipt_sha256: otherDigest.toUpperCase() },
    { ...receiptPayload, credential: 'must-not-enter-the-browser-projection' },
    {
      ...receiptPayload,
      evidence_context: { ...receiptPayload.evidence_context, nonce: 'forbidden' },
    },
    { ...receiptPayload, expires_at: receiptPayload.completed_at },
    { ...receiptPayload, completed_at: '2026-08-22T02:00:00.000Z' },
    { ...receiptPayload, completed_at: '2026-08-22T02:00:00+00:00' },
    { ...receiptPayload, completed_at: '2026-02-30T02:00:00Z' },
    { ...receiptPayload, completed_at: '2026-08-22T24:00:00Z' },
  ]) {
    assert.equal(parseVerificationReceipt(invalid), null);
  }
});

test('uses the fixed same-origin endpoint and keeps the capability only in the header', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const result = await loadVerificationReceipt(
    capability,
    undefined,
    async (input, init) => {
      calls.push({ input, init });
      return new Response(JSON.stringify(receiptPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  );

  assert.equal(result.kind, 'verified');
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, '/openid4vp/verification-receipts');
  assert.equal(calls[0]?.init?.method, 'GET');
  assert.equal(calls[0]?.init?.credentials, 'omit');
  assert.equal(calls[0]?.init?.cache, 'no-store');
  assert.equal(calls[0]?.init?.redirect, 'error');
  assert.equal(calls[0]?.init?.referrerPolicy, 'no-referrer');
  assert.deepEqual(calls[0]?.init?.headers, {
    Accept: 'application/json',
    Authorization: `Receipt ${capability}`,
  });
  assert.doesNotMatch(String(calls[0]?.input), new RegExp(capability));
});

test('maps unified absence and every other failure without exposing response details', async () => {
  const notFound = await loadVerificationReceipt(
    capability,
    undefined,
    async () => new Response(JSON.stringify({ error: 'secret detail' }), { status: 404 })
  );
  assert.deepEqual(notFound, { kind: 'not-found' });

  const unavailable = await loadVerificationReceipt(
    capability,
    undefined,
    async () => new Response(JSON.stringify({ error: 'storage detail' }), { status: 503 })
  );
  assert.deepEqual(unavailable, { kind: 'generic-error' });

  const networkFailure = await loadVerificationReceipt(
    capability,
    undefined,
    async () => {
      throw new Error('network detail');
    }
  );
  assert.deepEqual(networkFailure, { kind: 'generic-error' });

  const wrongMediaType = await loadVerificationReceipt(
    capability,
    undefined,
    async () =>
      new Response(JSON.stringify(receiptPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json-patch+json' },
      })
  );
  assert.deepEqual(wrongMediaType, { kind: 'generic-error' });
});
