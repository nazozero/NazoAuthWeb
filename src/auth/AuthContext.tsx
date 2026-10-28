import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, apiFetch } from '../lib/api';
import type { AuthUser } from '../types/auth';
import { AuthContext, type AuthContextValue } from './context';
import { clearSessionHint, hasSessionHint, markSessionHint } from './sessionHint';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const refreshInFlightRef = useRef<{
    controller: AbortController;
    promise: Promise<AuthUser | null>;
  } | null>(null);

  const cancelRefresh = useCallback(() => {
    refreshInFlightRef.current?.controller.abort();
    refreshInFlightRef.current = null;
  }, []);

  const setUser = useCallback((nextUser: AuthUser | null) => {
    cancelRefresh();
    setUserState(nextUser);
    setLoading(false);
    setSessionChecked(true);
    setSessionError(false);
    if (nextUser) markSessionHint();
    else clearSessionHint();
  }, [cancelRefresh]);

  const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current.promise;
    }

    const controller = new AbortController();
    const pending = (async (): Promise<AuthUser | null> => {
      setLoading(true);
      setSessionError(false);
      try {
        const me = await apiFetch<AuthUser>('/auth/me', { signal: controller.signal });
        if (controller.signal.aborted) return null;
        setUserState(me);
        setSessionChecked(true);
        markSessionHint();
        return me;
      } catch (error) {
        if (!controller.signal.aborted && error instanceof ApiError && error.status === 401) {
          setUserState(null);
          clearSessionHint();
          setSessionChecked(true);
        } else if (!controller.signal.aborted) {
          setSessionError(true);
        }
        return null;
      } finally {
        if (!controller.signal.aborted) {
          refreshInFlightRef.current = null;
          setLoading(false);
        }
      }
    })();

    refreshInFlightRef.current = { controller, promise: pending };
    return pending;
  }, []);

  useEffect(() => {
    if (hasSessionHint()) void refreshSession();
    return cancelRefresh;
  }, [cancelRefresh, refreshSession]);

  const logout = useCallback(async () => {
    cancelRefresh();
    try {
      await apiFetch<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      });
    } finally {
      setUser(null);
    }
  }, [cancelRefresh, setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      sessionChecked,
      sessionError,
      refreshSession,
      setUser,
      logout,
    }),
    [loading, logout, refreshSession, sessionChecked, sessionError, setUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
