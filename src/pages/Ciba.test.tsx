import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { useAuth } from '../auth/useAuth';
import { I18nProvider } from '../i18n';
import { ApiError, apiFetch } from '../lib/api';
import Ciba from './Ciba';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/api', async (original) => ({
  ...await original<typeof import('../lib/api')>(), apiFetch: vi.fn(),
}));

it.each([new ApiError('expired', 401, null), new Error('connection lost')])(
  'does not publish or reload a decision after leaving its request (%s)', async (failure) => {
    const setUser = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ user: null, setUser, loading: false,
      sessionChecked: true, sessionError: false, refreshSession: vi.fn(), logout: vi.fn() });
    let reject!: (error: Error) => void;
    vi.mocked(apiFetch).mockReset().mockResolvedValueOnce({ auth_req_id: 'request-1',
      request: { client_id: 'client', client_name: 'Client', scopes: [], audiences: [],
        interval_seconds: 5, issued_at: '2026-10-23T00:00:00Z', expires_at: '2026-10-23T00:10:00Z' },
    }).mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    const { unmount } = render(<MemoryRouter initialEntries={['/ciba/request-1']}><I18nProvider><Routes>
      <Route path="/ciba/:authReqId" element={<Ciba />} />
    </Routes></I18nProvider></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    unmount();
    await act(async () => { reject(failure); });
    expect(setUser).not.toHaveBeenCalled();
    expect(apiFetch).toHaveBeenCalledTimes(2);
  }
);

it.each([true, false])('reconciles a 503 decision and blocks retries when status is unknown (reload succeeds: %s)', async (reloadSucceeds) => {
  vi.mocked(useAuth).mockReturnValue({ user: null, setUser: vi.fn(), loading: false,
    sessionChecked: true, sessionError: false, refreshSession: vi.fn(), logout: vi.fn() });
  const initial = { auth_req_id: 'request-1', request: { client_id: 'client', client_name: 'Client', scopes: [], audiences: [],
    interval_seconds: 5, issued_at: '2026-10-23T00:00:00Z', expires_at: '2026-10-23T00:10:00Z' } };
  vi.mocked(apiFetch).mockReset().mockResolvedValueOnce(initial)
    .mockRejectedValueOnce(new ApiError('unavailable', 503, null));
  if (reloadSucceeds) vi.mocked(apiFetch).mockResolvedValueOnce({ auth_req_id: 'request-1', request: null });
  else vi.mocked(apiFetch).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(initial);
  render(<MemoryRouter initialEntries={['/ciba/request-1']}><I18nProvider><Routes>
    <Route path="/ciba/:authReqId" element={<Ciba />} />
  </Routes></I18nProvider></MemoryRouter>);
  await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
  if (reloadSucceeds) {
    expect(await screen.findByText(/may already have been processed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  } else {
    const retry = await screen.findByRole('button', { name: 'Check status again' });
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    await userEvent.click(retry);
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeEnabled();
  }
});
