import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../lib/api';
import type { AuthUser } from '../types/auth';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import { clearSessionHint, hasSessionHint } from './sessionHint';

vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);
const account: AuthUser = {
  id: 'u1', email: 'user@example.test', display_name: 'Before',
  role: 'user', admin_level: 0, authorized_app_count: 0,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('session request ownership', () => {
  beforeEach(() => { clearSessionHint(); mockedApiFetch.mockReset(); });

  it('coalesces concurrent refreshes', async () => {
    const response = deferred<AuthUser>();
    mockedApiFetch.mockReturnValue(response.promise);
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    let first!: Promise<AuthUser | null>, second!: Promise<AuthUser | null>;
    act(() => { first = result.current.refreshSession(); second = result.current.refreshSession(); });
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
    await act(async () => { response.resolve(account); await Promise.all([first, second]); });
    expect(result.current.user).toEqual(account);
    expect(result.current.loading).toBe(false);
  });

  it('does not restore the user or session hint after logout', async () => {
    const response = deferred<AuthUser>();
    mockedApiFetch.mockImplementation((path) => path === '/auth/me'
      ? response.promise : Promise.resolve({ success: true }));
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    let refresh!: Promise<AuthUser | null>;
    act(() => { refresh = result.current.refreshSession(); });
    await act(async () => { await result.current.logout(); });
    await act(async () => { response.resolve(account); await refresh; });
    expect(result.current.user).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(await refresh).toBeNull();
  });

  it('keeps a newer mutation response over an older refresh', async () => {
    const response = deferred<AuthUser>();
    mockedApiFetch.mockResolvedValueOnce(account).mockReturnValue(response.promise);
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await act(async () => { await result.current.refreshSession(); });
    let refresh!: Promise<AuthUser | null>;
    act(() => { refresh = result.current.refreshSession(); });
    const updated = { ...account, display_name: 'After' };
    act(() => { result.current.setUser(updated); });
    await act(async () => { response.resolve(account); await refresh; });
    expect(result.current.user).toEqual(updated);
    expect(result.current.loading).toBe(false);
  });

  it('aborts its owned request when the provider unmounts', async () => {
    const response = deferred<AuthUser>();
    mockedApiFetch.mockReturnValue(response.promise);
    const { result, unmount } = renderHook(useAuth, { wrapper: AuthProvider });
    let refresh!: Promise<AuthUser | null>;
    act(() => { refresh = result.current.refreshSession(); });
    const signal = mockedApiFetch.mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => { response.resolve(account); await refresh; });
    expect(hasSessionHint()).toBe(false);
  });
});
