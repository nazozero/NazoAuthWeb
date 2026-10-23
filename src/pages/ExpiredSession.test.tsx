import { useState, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/context';
import RequireGuest from '../components/RequireGuest';
import { I18nProvider } from '../i18n';
import { ApiError, apiFetch } from '../lib/api';
import type { AuthUser } from '../types/auth';
import Ciba from './Ciba';
import Consent from './Consent';
import Device from './Device';

vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  apiFetch: vi.fn(),
}));

function Session({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>({
    id: 'expired-user', email: 'expired@example.test', display_name: null,
    avatar_url: null, role: 'user', admin_level: 0, authorized_app_count: 0,
  });
  return <AuthContext.Provider value={{ user, setUser, loading: false,
    sessionChecked: true, refreshSession: async () => user, logout: async () => setUser(null) }}>
    {children}
  </AuthContext.Provider>;
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset().mockRejectedValue(new ApiError('Session expired', 401, null));
});

it.each([
  ['/device?user_code=ABCD', '/device', Device],
  ['/ciba/request-1', '/ciba/:authReqId', Ciba],
  ['/consent?request_id=request-1', '/consent', Consent],
] as const)('clears the expired session before the login guard at %s', async (entry, path, Page) => {
  render(<MemoryRouter initialEntries={[entry]}><I18nProvider><Session><Routes>
    <Route path={path} element={<Page />} />
    <Route path="/auth" element={<RequireGuest><p>Login form</p></RequireGuest>} />
    <Route path="/profile" element={<p>Stale profile</p>} />
  </Routes></Session></I18nProvider></MemoryRouter>);
  expect(await screen.findByText('Login form')).toBeInTheDocument();
});
