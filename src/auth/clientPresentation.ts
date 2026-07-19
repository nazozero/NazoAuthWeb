export type ClientPresentation = {
  client_name: string;
  logo_uri: string | null;
  policy_uri: string | null;
  tos_uri: string | null;
};

const MAX_CLIENT_ID_BYTES = 255;
const MAX_PRESENTATION_URI_BYTES = 4096;

export function clientIdFromAuthorizationNext(next: string | null): string | null {
  if (!next) {
    return null;
  }
  try {
    const url = new URL(next, 'https://nazoauth.invalid');
    if (url.origin !== 'https://nazoauth.invalid' || url.pathname !== '/authorize' || url.hash) {
      return null;
    }
    const clientIds = url.searchParams.getAll('client_id');
    if (clientIds.length !== 1) {
      return null;
    }
    const clientId = clientIds[0];
    if (
      !clientId ||
      clientId.length > MAX_CLIENT_ID_BYTES ||
      !/^[\x21-\x7e]+$/.test(clientId)
    ) {
      return null;
    }
    return clientId;
  } catch {
    return null;
  }
}

function normalizeHttpsUri(value: unknown): string | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string' || !value || value.length > MAX_PRESENTATION_URI_BYTES) {
    return undefined;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) {
      return undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
}

export function normalizeClientPresentation(value: unknown): ClientPresentation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const clientName = candidate.client_name;
  if (typeof clientName !== 'string' || !clientName.trim()) {
    return null;
  }
  const logoUri = normalizeHttpsUri(candidate.logo_uri);
  const policyUri = normalizeHttpsUri(candidate.policy_uri);
  const tosUri = normalizeHttpsUri(candidate.tos_uri);
  if (logoUri === undefined || policyUri === undefined || tosUri === undefined) {
    return null;
  }
  return {
    client_name: clientName,
    logo_uri: logoUri,
    policy_uri: policyUri,
    tos_uri: tosUri,
  };
}
