const TOKEN_PATTERN = /^[A-Za-z0-9_-]{64}$/;
const REQUEST_ID_PATTERN = /^bootstrap-admin-[0-9a-f]{32}$/;
const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type InitialAdminBootstrapSession = Readonly<{
  token: string;
  requestId: string;
}>;

export type InitialAdminClaim = Readonly<{
  request_id: string;
  id: string;
  email: string;
  role: 'admin';
  next: '/ui/auth';
}>;

export type BootstrapLocation = {
  hash: string;
  pathname: string;
  search: string;
};

export function consumeInitialAdminToken(
  location: BootstrapLocation,
  replaceUrl: (url: string) => void
): string | null {
  const fragment = location.hash.startsWith('#')
    ? location.hash.slice(1)
    : location.hash;
  const token = new URLSearchParams(fragment).get('token')?.trim() ?? '';

  if (location.hash) {
    replaceUrl(`${location.pathname}${location.search}`);
  }

  return TOKEN_PATTERN.test(token) ? token : null;
}

export function createInitialAdminRequestId(
  fillRandom: (values: Uint8Array<ArrayBuffer>) => void
): string {
  const random = new Uint8Array(16);
  fillRandom(random);
  return `bootstrap-admin-${Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function normalizeInitialAdminEmail(email: string): string {
  return email.trim().replace(/[A-Z]/g, (character) => character.toLowerCase());
}

export function validInitialAdminClaim(
  value: unknown,
  expectedRequestId: string,
  expectedEmail: string
): value is InitialAdminClaim {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const claim = value as Record<string, unknown>;
  const fields = Object.keys(claim).sort();
  if (
    fields.length !== 5 ||
    fields.some((field, index) => field !== ['email', 'id', 'next', 'request_id', 'role'][index])
  ) {
    return false;
  }
  return (
    REQUEST_ID_PATTERN.test(expectedRequestId) &&
    claim.request_id === expectedRequestId &&
    typeof claim.id === 'string' &&
    USER_ID_PATTERN.test(claim.id) &&
    claim.email === expectedEmail &&
    claim.role === 'admin' &&
    claim.next === '/ui/auth'
  );
}

export function createInitialAdminBootstrapMemory(
  initialToken: string | null,
  fillRandom: ((values: Uint8Array<ArrayBuffer>) => void) | null
) {
  let retainedToken = initialToken;
  let retainedRequestId =
    initialToken && fillRandom ? createInitialAdminRequestId(fillRandom) : null;

  return {
    peek(): InitialAdminBootstrapSession | null {
      return retainedToken && retainedRequestId
        ? { token: retainedToken, requestId: retainedRequestId }
        : null;
    },
    accept(value: unknown, expectedEmail: string): InitialAdminClaim | null {
      if (
        !retainedToken ||
        !retainedRequestId ||
        !validInitialAdminClaim(value, retainedRequestId, expectedEmail)
      ) {
        return null;
      }
      retainedToken = null;
      retainedRequestId = null;
      return value;
    },
    clear(): void {
      retainedToken = null;
      retainedRequestId = null;
    },
  };
}

export function validInitialAdminPassword(password: string): boolean {
  const characters = Array.from(password).length;
  return characters >= 12 && characters <= 1024;
}

const initialAdminBootstrapMemory = createInitialAdminBootstrapMemory(
  typeof window === 'undefined'
    ? null
    : consumeInitialAdminToken(window.location, (url) => {
        window.history.replaceState(window.history.state, '', url);
      }),
  typeof globalThis.crypto?.getRandomValues === 'function'
    ? (values) => {
        globalThis.crypto.getRandomValues(values);
      }
    : null
);

export function peekInitialAdminBootstrap(): InitialAdminBootstrapSession | null {
  return initialAdminBootstrapMemory.peek();
}

export function acceptInitialAdminClaim(
  value: unknown,
  expectedEmail: string
): InitialAdminClaim | null {
  return initialAdminBootstrapMemory.accept(value, expectedEmail);
}
