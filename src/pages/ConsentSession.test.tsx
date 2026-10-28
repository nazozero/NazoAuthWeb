import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { clearSessionHint } from '../auth/sessionHint';
import { I18nProvider } from '../i18n';
import { apiFetch } from '../lib/api';
import Consent from './Consent';

vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(), apiFetch: vi.fn(),
}));

beforeEach(() => { clearSessionHint(); vi.mocked(apiFetch).mockReset(); });

it('loads consent and the unhinted session in parallel, waiting for the account', async () => {
  let resolveUser!: (value: unknown) => void;
  const user = new Promise((resolve) => { resolveUser = resolve; });
  vi.mocked(apiFetch).mockImplementation((path) => path === '/auth/me' ? user : Promise.resolve({
    client_name: 'Example client', redirect_uri: 'https://client.example/callback', scopes: [],
  }));
  render(<MemoryRouter initialEntries={['/consent?request_id=one']}><I18nProvider><AuthProvider>
    <Consent />
  </AuthProvider></I18nProvider></MemoryRouter>);
  expect(apiFetch).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Example client')).not.toBeInTheDocument();
  await act(async () => { resolveUser({ id: 'u1', email: 'person@example.test', display_name: 'Person', role: 'user', admin_level: 0, authorized_app_count: 0 }); await user; });
  expect(await screen.findByText('Person')).toBeInTheDocument();
  expect(await screen.findByText('Example client')).toBeInTheDocument();
});

it('does not offer authorization when the account check fails', async () => {
  vi.mocked(apiFetch).mockImplementation((path) => path === '/auth/me'
    ? Promise.reject(new Error('offline'))
    : Promise.resolve({ client_name: 'Example client', scopes: [] }));
  render(<MemoryRouter initialEntries={['/consent?request_id=one']}><I18nProvider><AuthProvider>
    <Consent />
  </AuthProvider></I18nProvider></MemoryRouter>);
  expect(await screen.findByText('Could not verify the current account.')).toBeInTheDocument();
  expect(screen.queryByText('Example client')).not.toBeInTheDocument();
});

it('preserves the missing request error without a session request', async () => {
  render(<MemoryRouter initialEntries={['/consent']}><I18nProvider><AuthProvider>
    <Consent />
  </AuthProvider></I18nProvider></MemoryRouter>);
  expect(await screen.findByText('Missing request_id. Start the authorization flow again.')).toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalled();
});
