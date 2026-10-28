import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { useAuth } from '../auth/useAuth';
import { I18nProvider } from '../i18n';
import { apiFetch } from '../lib/api';
import Device from './Device';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/api', async (original) => ({ ...await original<typeof import('../lib/api')>(), apiFetch: vi.fn() }));

it('locks the device code lookup while a decision is being submitted', async () => {
  let resolveDecision!: (value: unknown) => void;
  vi.mocked(useAuth).mockReturnValue({ user: null, setUser: vi.fn(), loading: false, sessionChecked: true, sessionError: false, refreshSession: vi.fn(), logout: vi.fn() });
  vi.mocked(apiFetch).mockReset().mockResolvedValueOnce({ user_code: 'ABCD-1234', request: { client_id: 'client', client_name: 'Client', scopes: [], resource_indicators: [], interval_seconds: 5, expires_at: '2026-10-29T00:00:00Z' } }).mockImplementationOnce(() => new Promise((resolve) => { resolveDecision = resolve; }));
  render(<MemoryRouter initialEntries={['/device?user_code=ABCD-1234']}><I18nProvider><Device /></I18nProvider></MemoryRouter>);
  await userEvent.click(await screen.findByRole('button', { name: 'Approve device' }));
  expect(screen.getByLabelText(/user code/i)).toBeDisabled();
  expect(screen.getByRole('button', { name: /find request/i })).toBeDisabled();
  await act(async () => { resolveDecision(null); });
  expect(screen.getByLabelText(/user code/i)).toBeEnabled();
});

function NavigateToOtherDevice() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/device?user_code=EFGH-5678')}>Open other device</button>;
}

it.each(['success', 'failure'])('ignores an old decision %s after navigating to another code', async (outcome) => {
  let resolveDecision!: (value: unknown) => void;
  let rejectDecision!: (reason: Error) => void;
  vi.mocked(useAuth).mockReturnValue({ user: null, setUser: vi.fn(), loading: false, sessionChecked: true, sessionError: false, refreshSession: vi.fn(), logout: vi.fn() });
  vi.mocked(apiFetch).mockReset().mockImplementation(async (path, init) => {
    if (init?.method === 'POST') return new Promise((resolve, reject) => { resolveDecision = resolve; rejectDecision = reject; });
    const second = path.includes('EFGH-5678');
    return { user_code: second ? 'EFGH-5678' : 'ABCD-1234', request: { client_id: second ? 'client-b' : 'client-a', client_name: second ? 'Second client' : 'First client', scopes: [], resource_indicators: [], interval_seconds: 5, expires_at: '2026-10-29T00:00:00Z' } };
  });
  render(<MemoryRouter initialEntries={['/device?user_code=ABCD-1234']}><I18nProvider><Device /><NavigateToOtherDevice /></I18nProvider></MemoryRouter>);
  await userEvent.click(await screen.findByRole('button', { name: 'Approve device' }));
  await userEvent.click(screen.getByRole('button', { name: 'Open other device' }));
  await screen.findByText('Second client');
  const reads = vi.mocked(apiFetch).mock.calls.filter(([, init]) => !init?.method);
  expect(reads.map(([path]) => path)).toEqual([
    '/device/verification?user_code=ABCD-1234',
    '/device/verification?user_code=EFGH-5678',
  ]);
  await act(async () => {
    if (outcome === 'success') resolveDecision(null);
    else rejectDecision(new Error('old decision failed'));
  });
  expect(screen.getByText('Second client')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Approve device' })).toBeEnabled();
  expect(screen.queryByText('old decision failed')).not.toBeInTheDocument();
  expect(screen.queryByText(/device authorization approved/i)).not.toBeInTheDocument();
});
