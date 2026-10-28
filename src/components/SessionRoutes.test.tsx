import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { clearSessionHint } from '../auth/sessionHint';
import { I18nProvider } from '../i18n';
import { ApiError, apiFetch } from '../lib/api';
import RequireAuth from './RequireAuth';
import RequireGuest from './RequireGuest';

vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  apiFetch: vi.fn(),
}));

const account = {
  id: 'u1', email: 'user@example.test', display_name: null,
  role: 'user', admin_level: 0, authorized_app_count: 0,
};

function renderRoute(path: string, strict = false) {
  const routes = <MemoryRouter initialEntries={[path]}><I18nProvider><AuthProvider><Routes>
    <Route path="/" element={<p>Public page</p>} />
    <Route path="/profile" element={<RequireAuth><p>Profile page</p></RequireAuth>} />
    <Route path="/auth" element={<RequireGuest><p>Login page</p></RequireGuest>} />
  </Routes></AuthProvider></I18nProvider></MemoryRouter>;
  return render(strict ? <StrictMode>{routes}</StrictMode> : routes);
}

describe('session route checks', () => {
  beforeEach(() => { clearSessionHint(); vi.mocked(apiFetch).mockReset(); });

  it('does not check an unhinted visitor on a public page', () => {
    renderRoute('/');
    expect(screen.getByText('Public page')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it.each(['/profile', '/auth'])('restores an unhinted cookie at %s', async (path) => {
    vi.mocked(apiFetch).mockResolvedValue(account);
    renderRoute(path);
    expect(await screen.findByText('Profile page')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/auth/me', expect.anything());
  });

  it('checks before redirecting an unauthenticated visitor', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError('Unauthorized', 401, null));
    renderRoute('/profile');
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it.each(['/profile', '/auth'])('keeps %s blocked on a network failure and retries explicitly', async (path) => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce(account);
    renderRoute(path);
    expect(await screen.findByText('Could not verify the current account.')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Profile page')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('does not treat a 503 as an unauthenticated session', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError('Unavailable', 503, null));
    renderRoute('/profile');
    expect(await screen.findByText('Could not verify the current account.')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('restores a session under StrictMode after effect cleanup', async () => {
    vi.mocked(apiFetch).mockResolvedValue(account);
    renderRoute('/profile', true);
    expect(await screen.findByText('Profile page')).toBeInTheDocument();
  });
});
