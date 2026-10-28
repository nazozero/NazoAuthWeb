import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { apiFetch } from '../../lib/api';
import ClientsPanel from './ClientsPanel';
import AccessRequestsPanel from './AccessRequestsPanel';

vi.mock('../../lib/api', async (original) => ({
  ...await original<typeof import('../../lib/api')>(), apiFetch: vi.fn(),
}));

function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => { vi.mocked(apiFetch).mockReset(); });

it('blocks other client writes while a toggle is pending', async () => {
  const pending = deferred();
  const item = { client_id: 'c1', client_name: 'Client', client_type: 'public', is_active: true };
  vi.mocked(apiFetch).mockImplementation((path) => path.startsWith('/admin/clients?')
    ? Promise.resolve({ total: 21, page: 1, items: [item] }) : pending.promise);
  const user = userEvent.setup();
  render(<I18nProvider><ClientsPanel /></I18nProvider>);
  await user.click(await screen.findByRole('button', { name: 'Disable' }));
  expect(screen.getByRole('button', { name: 'Disable' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Create client' })).toBeDisabled();
  expect(screen.getByRole('textbox', { name: 'Search clients' })).toBeDisabled();
  expect(screen.getByRole('combobox')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Disable' }));
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  await user.click(screen.getByRole('button', { name: 'Search' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(vi.mocked(apiFetch).mock.calls.filter(([path]) => path === '/admin/clients/c1')).toHaveLength(1);
  expect(vi.mocked(apiFetch).mock.calls.filter(([path]) => path.startsWith('/admin/clients?'))).toHaveLength(1);
  await act(async () => { pending.resolve({ ...item, is_active: false }); await pending.promise; });
  expect(await screen.findByRole('button', { name: 'Enable' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  expect(screen.getByRole('textbox', { name: 'Search clients' })).toBeEnabled();
});

it('keeps creation owned until the one-time secret is acknowledged', async () => {
  const pending = deferred();
  vi.mocked(apiFetch).mockImplementation((path) => {
    if (path.startsWith('/admin/clients?')) return Promise.resolve({ total: 0, page: 1, items: [] });
    if (path === '/admin/clients') return pending.promise;
    return Promise.resolve({ scopes_supported: ['openid'] });
  });
  const user = userEvent.setup();
  render(<I18nProvider><ClientsPanel /></I18nProvider>);
  await user.click(await screen.findByRole('button', { name: 'Create client' }));
  await user.clear(screen.getByLabelText('Client name'));
  await user.type(screen.getByLabelText('Client name'), 'Demo');
  await user.clear(screen.getByLabelText('Redirect URIs'));
  await user.type(screen.getByLabelText('Redirect URIs'), 'https://app.example/callback');
  await user.click(screen.getByRole('button', { name: 'Save new client' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await act(async () => { pending.resolve({ client_id: 'new', client_secret: 'one-time-secret' }); await pending.promise; });
  expect(await screen.findByText('one-time-secret')).toBeInTheDocument();
  expect(within(dialog).queryByRole('button', { name: 'Save new client' })).not.toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: 'Done' }));
  expect(screen.queryByText('one-time-secret')).not.toBeInTheDocument();
});

it('does not reload clients after a pending creation outlives the panel', async () => {
  const pending = deferred();
  vi.mocked(apiFetch).mockImplementation((path) => {
    if (path.startsWith('/admin/clients?')) return Promise.resolve({ total: 0, page: 1, items: [] });
    if (path === '/admin/clients') return pending.promise;
    return Promise.resolve({ scopes_supported: ['openid'] });
  });
  const user = userEvent.setup();
  const { unmount } = render(<I18nProvider><ClientsPanel /></I18nProvider>);
  await user.click(await screen.findByRole('button', { name: 'Create client' }));
  await user.click(screen.getByRole('button', { name: 'Save new client' }));
  expect(vi.mocked(apiFetch).mock.calls.filter(([path]) => path === '/admin/clients')).toHaveLength(1);
  unmount();
  await act(async () => { pending.resolve({ client_id: 'new', client_secret: 'one-time-secret' }); await pending.promise; });
  expect(vi.mocked(apiFetch).mock.calls.filter(([path]) => path.startsWith('/admin/clients?'))).toHaveLength(1);
});

it.each(['Reject', 'Approve'] as const)('keeps the %s dialog owned until its pending decision finishes', async (action) => {
  const pending = deferred();
  const item = { id: 'r1', user_email: 'person@example.test', site_name: 'Site', site_url: 'https://site.example', request_description: 'Need access', status: 0 };
  vi.mocked(apiFetch).mockImplementation((path) => path.startsWith('/admin/access-requests?')
    ? Promise.resolve({ total: 1, page: 1, items: [item] }) : pending.promise);
  const user = userEvent.setup();
  render(<I18nProvider><AccessRequestsPanel /></I18nProvider>);
  await user.click(await screen.findByRole('button', { name: action }));
  if (action === 'Reject') await user.type(screen.getByLabelText('Rejection reason'), 'Invalid redirect');
  await user.click(screen.getByRole('button', { name: `${action} request` }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await act(async () => { pending.resolve({ ...item, status: 2 }); await pending.promise; });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
