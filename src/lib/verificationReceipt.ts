const RECEIPT_CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const RFC3339_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const RECEIPT_FIELDS = [
  'completed_at',
  'deployment_id',
  'evidence_context',
  'expires_at',
  'instance_key_id',
  'issuer',
  'receipt_id',
  'receipt_sha256',
  'runtime_instance_id',
  'schema',
  'status',
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

export type VerificationReceiptProjection = Readonly<{
  status: 'verified';
  receiptId: string;
  receiptSha256: string;
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
  | Readonly<{ kind: 'generic-error' }>;

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
          retainedCapability = null;
          generation += 1;
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
  };
}

export type VerificationReceiptCapabilityLease = Readonly<{
  capability: string;
  clear: () => void;
  release: () => void;
}>;

export function parseVerificationReceipt(
  value: unknown
): VerificationReceiptProjection | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const receipt = value as Record<string, unknown>;
  if (!hasExactFields(receipt, RECEIPT_FIELDS)) {
    return null;
  }
  const evidenceValue = receipt.evidence_context;
  if (
    typeof evidenceValue !== 'object' ||
    evidenceValue === null ||
    Array.isArray(evidenceValue)
  ) {
    return null;
  }
  const evidence = evidenceValue as Record<string, unknown>;
  if (!hasExactFields(evidence, EVIDENCE_FIELDS)) {
    return null;
  }

  if (
    receipt.schema !== 1 ||
    receipt.status !== 'verified' ||
    !isNonEmptyString(receipt.issuer, 2048) ||
    !isNonEmptyString(receipt.deployment_id) ||
    !isNonEmptyString(receipt.runtime_instance_id) ||
    !isNonEmptyString(receipt.instance_key_id) ||
    typeof receipt.transaction_id !== 'string' ||
    !UUID_PATTERN.test(receipt.transaction_id) ||
    typeof receipt.receipt_id !== 'string' ||
    !UUID_PATTERN.test(receipt.receipt_id) ||
    typeof receipt.receipt_sha256 !== 'string' ||
    !SHA256_PATTERN.test(receipt.receipt_sha256) ||
    !isRfc3339Utc(receipt.completed_at) ||
    !isRfc3339Utc(receipt.expires_at) ||
    Date.parse(receipt.expires_at) <= Date.parse(receipt.completed_at) ||
    !isNonEmptyString(evidence.run_jti) ||
    typeof evidence.artifact_sha256 !== 'string' ||
    !SHA256_PATTERN.test(evidence.artifact_sha256) ||
    typeof evidence.matrix_sha256 !== 'string' ||
    !SHA256_PATTERN.test(evidence.matrix_sha256) ||
    typeof evidence.suite_plan_id !== 'string' ||
    !UUID_PATTERN.test(evidence.suite_plan_id) ||
    typeof evidence.suite_module_id !== 'string' ||
    !UUID_PATTERN.test(evidence.suite_module_id) ||
    !isNonEmptyString(evidence.test_name) ||
    typeof evidence.variant_sha256 !== 'string' ||
    !SHA256_PATTERN.test(evidence.variant_sha256)
  ) {
    return null;
  }

  return {
    status: 'verified',
    receiptId: receipt.receipt_id,
    receiptSha256: receipt.receipt_sha256,
    suitePlanId: evidence.suite_plan_id,
    suiteModuleId: evidence.suite_module_id,
    testName: evidence.test_name,
    variantSha256: evidence.variant_sha256,
    completedAt: receipt.completed_at,
    expiresAt: receipt.expires_at,
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
      return { kind: 'generic-error' };
    }
    const contentType = response.headers.get('content-type') ?? '';
    const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase();
    if (mediaType !== 'application/json') {
      return { kind: 'generic-error' };
    }
    const receipt = parseVerificationReceipt(await response.json());
    return receipt
      ? { kind: 'verified', receipt }
      : { kind: 'generic-error' };
  } catch {
    return { kind: 'generic-error' };
  }
}

const verificationReceiptCapabilityMemory =
  createVerificationReceiptCapabilityMemory(
    typeof window === 'undefined'
      ? null
      : consumeVerificationReceiptCapability(
          window.location,
          import.meta.env?.BASE_URL ?? '/',
          (url) => window.history.replaceState(window.history.state, '', url)
        )
  );

export function acquireVerificationReceiptCapability(): VerificationReceiptCapabilityLease | null {
  return verificationReceiptCapabilityMemory.acquire();
}
