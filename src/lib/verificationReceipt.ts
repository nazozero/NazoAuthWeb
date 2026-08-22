const RECEIPT_CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const FILE_IDENTIFIER_PATTERN = /^[A-Za-z0-9._:+-]{1,128}$/;
const RFC3339_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const RECEIPT_FIELDS = [
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
] as const;

const EVIDENCE_FIELDS = [
  'artifact_sha256',
  'matrix_sha256',
  'run_jti',
  'suite_module_id',
  'suite_plan_id',
  'test_name',
  'variant_sha256',
] as const;

const PRESENTATION_BINDING_FIELDS = [
  'presentation_request_sha256',
  'trust_policy',
] as const;

const TRUST_POLICY_FIELDS = [
  'binding_id',
  'resource_digest',
  'resource_id',
] as const;

export type VerificationReceiptProjection = Readonly<{
  status: 'verified';
  receiptId: string;
  receiptSha256: string;
  runJti: string;
  artifactSha256: string;
  matrixSha256: string;
  suitePlanId: string;
  suiteModuleId: string;
  testName: string;
  variantSha256: string;
  completedAt: string;
  expiresAt: string;
}>;

export type VerificationReceiptLoadResult =
  | Readonly<{ kind: 'verified'; receipt: VerificationReceiptProjection }>
  | Readonly<{ kind: 'not-found' }>
  | Readonly<{
      kind: 'generic-error';
      reason: VerificationReceiptFailureReason;
    }>;

export const VERIFICATION_RECEIPT_FAILURE_REASONS = [
  'http-status',
  'content-type',
  'invalid-json',
  'network',
  'receipt-shape',
  'receipt-fields',
  'evidence-shape',
  'evidence-fields',
  'binding-shape',
  'binding-fields',
  'trust-policy-shape',
  'trust-policy-fields',
  'schema',
  'status',
  'issuer',
  'deployment-id',
  'runtime-instance-id',
  'instance-key-id',
  'tenant-id',
  'transaction-id',
  'receipt-id',
  'issuance-request-jti',
  'intent-sha256',
  'receipt-sha256',
  'presentation-request-sha256',
  'trust-policy-values',
  'completed-at',
  'expires-at',
  'timestamp-order',
  'run-jti',
  'artifact-sha256',
  'matrix-sha256',
  'suite-plan-id',
  'suite-module-id',
  'test-name',
  'variant-sha256',
] as const;

export type VerificationReceiptFailureReason =
  (typeof VERIFICATION_RECEIPT_FAILURE_REASONS)[number];

export type VerificationReceiptParseResult =
  | Readonly<{ kind: 'verified'; receipt: VerificationReceiptProjection }>
  | Readonly<{
      kind: 'invalid';
      reason: VerificationReceiptFailureReason;
    }>;

export type ReceiptBootstrapLocation = Readonly<{
  hash: string;
  pathname: string;
  search: string;
}>;

function hasExactFields(
  value: Record<string, unknown>,
  expected: readonly string[]
): boolean {
  const actual = Object.keys(value).sort();
  const fields = [...expected].sort();
  return (
    actual.length === fields.length &&
    actual.every((field, index) => field === fields[index])
  );
}

function isNonEmptyString(value: unknown, maximumLength = 512): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximumLength
  );
}

function isRfc3339Utc(value: unknown): value is string {
  if (typeof value !== 'string' || !RFC3339_UTC_PATTERN.test(value)) {
    return false;
  }
  const [datePart, timePartWithZone] = value.split('T');
  const dateParts = datePart?.split('-').map(Number);
  const timeParts = timePartWithZone?.slice(0, -1).split(':').map(Number);
  if (dateParts?.length !== 3 || timeParts?.length !== 3) {
    return false;
  }
  const [year, month, day] = dateParts;
  const [hour, minute, second] = timeParts;
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined
  ) {
    return false;
  }
  const parsed = new Date(0);
  parsed.setUTCFullYear(year, month - 1, day);
  parsed.setUTCHours(hour, minute, second, 0);
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute &&
    parsed.getUTCSeconds() === second
  );
}

export function verificationResultPath(baseUrl: string): string {
  const normalizedBase = `/${baseUrl.replace(/^\/+|\/+$/g, '')}`.replace(
    /^\/$/,
    ''
  );
  return `${normalizedBase}/verification-result`;
}

export function canonicalVerificationResultPath(
  pathname: string,
  baseUrl: string
): string | null {
  const canonicalPath = verificationResultPath(baseUrl);
  return pathname === canonicalPath || pathname === `${canonicalPath}/`
    ? canonicalPath
    : null;
}

export function consumeVerificationReceiptCapability(
  location: ReceiptBootstrapLocation,
  baseUrl: string,
  replaceUrl: (url: string) => void
): string | null {
  const canonicalPath = canonicalVerificationResultPath(
    location.pathname,
    baseUrl
  );
  if (!canonicalPath) {
    if (location.hash.startsWith('#receipt=')) {
      replaceUrl(location.pathname);
    }
    return null;
  }

  const match = /^#receipt=([A-Za-z0-9_-]{43})$/.exec(location.hash);
  if (
    location.pathname !== canonicalPath ||
    location.hash ||
    location.search
  ) {
    replaceUrl(canonicalPath);
  }

  const capability = match?.[1] ?? '';
  return RECEIPT_CAPABILITY_PATTERN.test(capability) ? capability : null;
}

export function createVerificationReceiptCapabilityMemory(
  initialCapability: string | null,
  scheduleRelease: (callback: () => void) => void = queueMicrotask
) {
  let retainedCapability = initialCapability;
  let activeLeases = 0;
  let generation = 0;
  return {
    acquire(): VerificationReceiptCapabilityLease | null {
      if (!retainedCapability) {
        return null;
      }
      const capability = retainedCapability;
      activeLeases += 1;
      generation += 1;
      let released = false;
      return {
        capability,
        clear(): void {
          if (retainedCapability === capability) {
            retainedCapability = null;
            generation += 1;
          }
        },
        release(): void {
          if (released) {
            return;
          }
          released = true;
          activeLeases -= 1;
          generation += 1;
          const releaseGeneration = generation;
          scheduleRelease(() => {
            if (
              activeLeases === 0 &&
              generation === releaseGeneration
            ) {
              retainedCapability = null;
            }
          });
        },
      };
    },
    replace(capability: string | null): boolean {
      if (retainedCapability === capability) {
        return false;
      }
      retainedCapability = capability;
      generation += 1;
      return true;
    },
  };
}

export type VerificationReceiptCapabilityLease = Readonly<{
  capability: string;
  clear: () => void;
  release: () => void;
}>;

export function parseVerificationReceipt(
  value: unknown
): VerificationReceiptParseResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { kind: 'invalid', reason: 'receipt-shape' };
  }
  const receipt = value as Record<string, unknown>;
  if (!hasExactFields(receipt, RECEIPT_FIELDS)) {
    return { kind: 'invalid', reason: 'receipt-fields' };
  }
  const evidenceValue = receipt.evidence_context;
  if (
    typeof evidenceValue !== 'object' ||
    evidenceValue === null ||
    Array.isArray(evidenceValue)
  ) {
    return { kind: 'invalid', reason: 'evidence-shape' };
  }
  const evidence = evidenceValue as Record<string, unknown>;
  if (!hasExactFields(evidence, EVIDENCE_FIELDS)) {
    return { kind: 'invalid', reason: 'evidence-fields' };
  }
  const presentationBindingValue = receipt.presentation_binding;
  if (
    typeof presentationBindingValue !== 'object' ||
    presentationBindingValue === null ||
    Array.isArray(presentationBindingValue)
  ) {
    return { kind: 'invalid', reason: 'binding-shape' };
  }
  const presentationBinding = presentationBindingValue as Record<string, unknown>;
  if (!hasExactFields(presentationBinding, PRESENTATION_BINDING_FIELDS)) {
    return { kind: 'invalid', reason: 'binding-fields' };
  }
  const trustPolicyValue = presentationBinding.trust_policy;
  if (
    typeof trustPolicyValue !== 'object' ||
    trustPolicyValue === null ||
    Array.isArray(trustPolicyValue)
  ) {
    return { kind: 'invalid', reason: 'trust-policy-shape' };
  }
  const trustPolicy = trustPolicyValue as Record<string, unknown>;
  if (!hasExactFields(trustPolicy, TRUST_POLICY_FIELDS)) {
    return { kind: 'invalid', reason: 'trust-policy-fields' };
  }
  const trustPolicyIsAbsent =
    trustPolicy.binding_id === null &&
    trustPolicy.resource_id === null &&
    trustPolicy.resource_digest === null;
  const trustPolicyIsPresent =
    typeof trustPolicy.binding_id === 'string' &&
    UUID_PATTERN.test(trustPolicy.binding_id) &&
    typeof trustPolicy.resource_id === 'string' &&
    FILE_IDENTIFIER_PATTERN.test(trustPolicy.resource_id) &&
    typeof trustPolicy.resource_digest === 'string' &&
    SHA256_PATTERN.test(trustPolicy.resource_digest);

  const fieldChecks: ReadonlyArray<
    readonly [VerificationReceiptFailureReason, boolean]
  > = [
    ['schema', receipt.schema === 1],
    ['status', receipt.status === 'verified'],
    ['issuer', isNonEmptyString(receipt.issuer, 2048)],
    ['deployment-id', isNonEmptyString(receipt.deployment_id)],
    ['runtime-instance-id', isNonEmptyString(receipt.runtime_instance_id)],
    ['instance-key-id', isNonEmptyString(receipt.instance_key_id)],
    [
      'tenant-id',
      typeof receipt.tenant_id === 'string' && UUID_PATTERN.test(receipt.tenant_id),
    ],
    [
      'transaction-id',
      typeof receipt.transaction_id === 'string' &&
        UUID_PATTERN.test(receipt.transaction_id),
    ],
    [
      'receipt-id',
      typeof receipt.receipt_id === 'string' && UUID_PATTERN.test(receipt.receipt_id),
    ],
    [
      'issuance-request-jti',
      typeof receipt.issuance_request_jti === 'string' &&
        UUID_PATTERN.test(receipt.issuance_request_jti),
    ],
    [
      'intent-sha256',
      typeof receipt.intent_sha256 === 'string' &&
        SHA256_PATTERN.test(receipt.intent_sha256),
    ],
    [
      'receipt-sha256',
      typeof receipt.receipt_sha256 === 'string' &&
        SHA256_PATTERN.test(receipt.receipt_sha256),
    ],
    [
      'presentation-request-sha256',
      typeof presentationBinding.presentation_request_sha256 === 'string' &&
        SHA256_PATTERN.test(presentationBinding.presentation_request_sha256),
    ],
    ['trust-policy-values', trustPolicyIsAbsent || trustPolicyIsPresent],
    ['completed-at', isRfc3339Utc(receipt.completed_at)],
    ['expires-at', isRfc3339Utc(receipt.expires_at)],
    [
      'timestamp-order',
      typeof receipt.completed_at === 'string' &&
        typeof receipt.expires_at === 'string' &&
        Date.parse(receipt.expires_at) > Date.parse(receipt.completed_at),
    ],
    ['run-jti', isNonEmptyString(evidence.run_jti)],
    [
      'artifact-sha256',
      typeof evidence.artifact_sha256 === 'string' &&
        SHA256_PATTERN.test(evidence.artifact_sha256),
    ],
    [
      'matrix-sha256',
      typeof evidence.matrix_sha256 === 'string' &&
        SHA256_PATTERN.test(evidence.matrix_sha256),
    ],
    [
      'suite-plan-id',
      typeof evidence.suite_plan_id === 'string' &&
        FILE_IDENTIFIER_PATTERN.test(evidence.suite_plan_id),
    ],
    [
      'suite-module-id',
      typeof evidence.suite_module_id === 'string' &&
        FILE_IDENTIFIER_PATTERN.test(evidence.suite_module_id),
    ],
    ['test-name', isNonEmptyString(evidence.test_name)],
    [
      'variant-sha256',
      typeof evidence.variant_sha256 === 'string' &&
        SHA256_PATTERN.test(evidence.variant_sha256),
    ],
  ];
  for (const [reason, valid] of fieldChecks) {
    if (!valid) {
      return { kind: 'invalid', reason };
    }
  }

  return {
    kind: 'verified',
    receipt: {
      status: 'verified',
      receiptId: receipt.receipt_id as string,
      receiptSha256: receipt.receipt_sha256 as string,
      runJti: evidence.run_jti as string,
      artifactSha256: evidence.artifact_sha256 as string,
      matrixSha256: evidence.matrix_sha256 as string,
      suitePlanId: evidence.suite_plan_id as string,
      suiteModuleId: evidence.suite_module_id as string,
      testName: evidence.test_name as string,
      variantSha256: evidence.variant_sha256 as string,
      completedAt: receipt.completed_at as string,
      expiresAt: receipt.expires_at as string,
    },
  };
}

export async function loadVerificationReceipt(
  capability: string,
  signal?: AbortSignal,
  fetchImplementation: typeof fetch = fetch
): Promise<VerificationReceiptLoadResult> {
  if (!RECEIPT_CAPABILITY_PATTERN.test(capability)) {
    return { kind: 'not-found' };
  }

  try {
    const response = await fetchImplementation('/openid4vp/verification-receipts', {
      method: 'GET',
      mode: 'same-origin',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      headers: {
        Accept: 'application/json',
        Authorization: `Receipt ${capability}`,
      },
      signal,
    });

    if (response.status === 404) {
      return { kind: 'not-found' };
    }
    if (!response.ok) {
      return { kind: 'generic-error', reason: 'http-status' };
    }
    const contentType = response.headers.get('content-type') ?? '';
    const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase();
    if (mediaType !== 'application/json') {
      return { kind: 'generic-error', reason: 'content-type' };
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { kind: 'generic-error', reason: 'invalid-json' };
    }
    const parsed = parseVerificationReceipt(body);
    return parsed.kind === 'verified'
      ? parsed
      : { kind: 'generic-error', reason: parsed.reason };
  } catch {
    return { kind: 'generic-error', reason: 'network' };
  }
}

const verificationReceiptCapabilityMemory = createVerificationReceiptCapabilityMemory(
  typeof window === 'undefined'
    ? null
    : consumeVerificationReceiptCapability(
        window.location,
        import.meta.env?.BASE_URL ?? '/',
        (url) => window.history.replaceState(window.history.state, '', url)
      )
);
const verificationReceiptCapabilityListeners = new Set<() => void>();

function consumeVerificationReceiptCapabilityFromWindow(): void {
  if (
    typeof window === 'undefined' ||
    (!window.location.hash && !window.location.search)
  ) {
    return;
  }
  const capability = consumeVerificationReceiptCapability(
    window.location,
    import.meta.env?.BASE_URL ?? '/',
    (url) => window.history.replaceState(window.history.state, '', url)
  );
  const changed = verificationReceiptCapabilityMemory.replace(capability);
  if (capability === null || changed) {
    verificationReceiptCapabilityListeners.forEach((listener) => listener());
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', consumeVerificationReceiptCapabilityFromWindow);
  window.addEventListener('popstate', consumeVerificationReceiptCapabilityFromWindow);
}

export function acquireVerificationReceiptCapability(): VerificationReceiptCapabilityLease | null {
  return verificationReceiptCapabilityMemory.acquire();
}

export function subscribeVerificationReceiptCapability(
  listener: () => void
): () => void {
  verificationReceiptCapabilityListeners.add(listener);
  return () => verificationReceiptCapabilityListeners.delete(listener);
}
