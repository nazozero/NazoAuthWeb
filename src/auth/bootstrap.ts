const TOKEN_PATTERN = /^[A-Za-z0-9_-]{64}$/;

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

export function createInitialAdminTokenMemory(initialToken: string | null) {
  let retainedToken = initialToken;

  return {
    peek(): string | null {
      return retainedToken;
    },
    clear(): void {
      retainedToken = null;
    },
  };
}

export function validInitialAdminPassword(password: string): boolean {
  const characters = Array.from(password).length;
  return characters >= 12 && characters <= 1024;
}

const initialAdminTokenMemory = createInitialAdminTokenMemory(
  typeof window === 'undefined'
    ? null
    : consumeInitialAdminToken(window.location, (url) => {
        window.history.replaceState(window.history.state, '', url);
      })
);

export function peekInitialAdminToken(): string | null {
  return initialAdminTokenMemory.peek();
}

export function clearInitialAdminToken(): void {
  initialAdminTokenMemory.clear();
}
