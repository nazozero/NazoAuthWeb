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
  issuer: 'https://auth.example',
  deployment_id: 'deployment-1',
  runtime_instance_id: 'runtime-1',
  instance_key_id: 'instance-key',
  tenant_id: '019c8ca2-30a6-7000-8000-000000000005',
  receipt_id: '019c8ca2-30a6-7000-8000-000000000001',
  transaction_id: '019c8ca2-30a6-7000-8000-000000000002',
  issuance_request_jti: '019c8ca2-30a6-7000-8000-000000000006',
  status: 'verified',
  evidence_context: {
    run_jti: 'run-jti-1',
    artifact_sha256: digest,
    matrix_sha256: otherDigest,
    suite_plan_id: '019c8ca2-30a6-7000-8000-000000000003',
    suite_module_id: '019c8ca2-30a6-7000-8000-000000000004',
    test_name: 'openid4vp-test',
    variant_sha256: 'c'.repeat(64),
  },
  presentation_binding: {
    presentation_request_sha256: 'e'.repeat(64),
    trust_policy: {
      binding_id: null,
      resource_id: null,
      resource_digest: null,
    },
  },
  intent_sha256: 'f'.repeat(64),
  completed_at: '2026-08-22T03:00:00Z',
  expires_at: '2026-08-22T03:05:00Z',
  receipt_sha256: 'd'.repeat(64),
};

const expectedProjection = {
  status: 'verified',
  receiptId: receiptPayload.receipt_id,
  receiptSha256: receiptPayload.receipt_sha256,
  runJti: receiptPayload.evidence_context.run_jti,
  artifactSha256: receiptPayload.evidence_context.artifact_sha256,
  matrixSha256: receiptPayload.evidence_context.matrix_sha256,
  suitePlanId: receiptPayload.evidence_context.suite_plan_id,
  suiteModuleId: receiptPayload.evidence_context.suite_module_id,
  testName: receiptPayload.evidence_context.test_name,
  variantSha256: receiptPayload.evidence_context.variant_sha256,
  completedAt: receiptPayload.completed_at,
  expiresAt: receiptPayload.expires_at,
} as const;

function withoutField(value: Record<string, unknown>, field: string) {
  const copy = { ...value };
  delete copy[field];
  return copy;
}

test('uses the complete backend PresentationVerificationProjection wire shape', () => {
  assert.deepEqual(Object.keys(receiptPayload).sort(), [
    'completed_at',
    'deployment_id',
    'evidence_context',
    'expires_at',
    'instance_key_id',
    'intent_sha256',
    'issuance_request_jti',
    'issuer',
    'presentation_binding',
    'receipt_id',
    'receipt_sha256',
    'runtime_instance_id',
    'schema',
    'status',
    'tenant_id',
    'transaction_id',
  ]);
  assert.deepEqual(Object.keys(receiptPayload.presentation_binding).sort(), [
    'presentation_request_sha256',
    'trust_policy',
  ]);
  assert.deepEqual(
    Object.keys(receiptPayload.presentation_binding.trust_policy).sort(),
    ['binding_id', 'resource_digest', 'resource_id']
  );
});

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

test('rotates capabilities without allowing an old lease to clear the replacement', () => {
  const replacement = `B${'A'.repeat(42)}`;
  const memory = createVerificationReceiptCapabilityMemory(capability);
  const oldLease = memory.acquire();
  assert.equal(oldLease?.capability, capability);

  assert.equal(memory.replace(replacement), true);
  oldLease?.clear();
  oldLease?.release();

  const replacementLease = memory.acquire();
  assert.equal(replacementLease?.capability, replacement);
  replacementLease?.clear();
  replacementLease?.release();
  assert.equal(memory.acquire(), null);
});

test('accepts only the closed verified projection and strips non-display fields', () => {
  assert.deepEqual(parseVerificationReceipt(receiptPayload), expectedProjection);

  assert.deepEqual(
    parseVerificationReceipt({
      ...receiptPayload,
      presentation_binding: {
        ...receiptPayload.presentation_binding,
        trust_policy: {
          binding_id: '019c8ca2-30a6-7000-8000-000000000007',
          resource_id: 'openid4vc-policy.v1',
          resource_digest: digest,
        },
      },
    }),
    expectedProjection
  );

  for (const invalid of [
    { ...receiptPayload, status: 'failed' },
    { ...receiptPayload, receipt_sha256: receiptPayload.receipt_sha256.toUpperCase() },
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
    {
      ...receiptPayload,
      evidence_context: {
        ...receiptPayload.evidence_context,
        suite_plan_id: 'plan/with/slash',
      },
    },
    {
      ...receiptPayload,
      evidence_context: {
        ...receiptPayload.evidence_context,
        suite_module_id: 'm'.repeat(129),
      },
    },
  ]) {
    assert.equal(parseVerificationReceipt(invalid), null);
  }
});

test('fails closed on missing, extra, or malformed verification binding fields', () => {
  for (const field of [
    'tenant_id',
    'issuance_request_jti',
    'presentation_binding',
    'intent_sha256',
  ]) {
    assert.equal(parseVerificationReceipt(withoutField(receiptPayload, field)), null);
  }

  for (const invalid of [
    { ...receiptPayload, tenant_id: '019C8CA2-30A6-7000-8000-000000000005' },
    {
      ...receiptPayload,
      issuance_request_jti: '019c8ca2-30a6-7000-7000-000000000006',
    },
    { ...receiptPayload, intent_sha256: receiptPayload.intent_sha256.toUpperCase() },
    {
      ...receiptPayload,
      presentation_binding: {
        trust_policy: receiptPayload.presentation_binding.trust_policy,
      },
    },
    {
      ...receiptPayload,
      presentation_binding: {
        presentation_request_sha256:
          receiptPayload.presentation_binding.presentation_request_sha256,
      },
    },
    {
      ...receiptPayload,
      presentation_binding: {
        ...receiptPayload.presentation_binding,
        presentation_request_sha256: 'short',
      },
    },
    {
      ...receiptPayload,
      presentation_binding: {
        ...receiptPayload.presentation_binding,
        unexpected: 'forbidden',
      },
    },
    {
      ...receiptPayload,
      presentation_binding: {
        ...receiptPayload.presentation_binding,
        trust_policy: {
          ...receiptPayload.presentation_binding.trust_policy,
          unexpected: 'forbidden',
        },
      },
    },
    {
      ...receiptPayload,
      presentation_binding: {
        ...receiptPayload.presentation_binding,
        trust_policy: {
          binding_id: '019c8ca2-30a6-7000-8000-000000000007',
          resource_id: 'openid4vc-policy.v1',
        },
      },
    },
    {
      ...receiptPayload,
      presentation_binding: {
        ...receiptPayload.presentation_binding,
        trust_policy: {
          binding_id: 'not-a-uuid',
          resource_id: 'openid4vc-policy.v1',
          resource_digest: digest,
        },
      },
    },
    {
      ...receiptPayload,
      presentation_binding: {
        ...receiptPayload.presentation_binding,
        trust_policy: {
          binding_id: '019c8ca2-30a6-7000-8000-000000000007',
          resource_id: 'policy/with/slash',
          resource_digest: digest,
        },
      },
    },
    {
      ...receiptPayload,
      presentation_binding: {
        ...receiptPayload.presentation_binding,
        trust_policy: {
          binding_id: '019c8ca2-30a6-7000-8000-000000000007',
          resource_id: 'openid4vc-policy.v1',
          resource_digest: digest.toUpperCase(),
        },
      },
    },
  ]) {
    assert.equal(parseVerificationReceipt(invalid), null);
  }

  for (const trustPolicy of [
    {
      binding_id: '019c8ca2-30a6-7000-8000-000000000007',
      resource_id: null,
      resource_digest: null,
    },
    {
      binding_id: null,
      resource_id: 'openid4vc-policy.v1',
      resource_digest: null,
    },
    {
      binding_id: null,
      resource_id: null,
      resource_digest: digest,
    },
  ]) {
    assert.equal(
      parseVerificationReceipt({
        ...receiptPayload,
        presentation_binding: {
          ...receiptPayload.presentation_binding,
          trust_policy: trustPolicy,
        },
      }),
      null
    );
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
