import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { apiFetch } from '../../lib/api';
import UsersPanel from './UsersPanel';
import GrantsPanel from './GrantsPanel';

vi.mock('../../lib/api', async (original) => ({ ...await original<typeof import('../../lib/api')>(), apiFetch: vi.fn() }));

it.each(['users', 'grants'])('blocks another %s mutation until the first finishes', async (kind) => {
  let resolveMutation!: (value: unknown) => void;
  const users = ['u1', 'u2'].map((id) => ({ id, email: `${id}@example.test`, display_name: id, is_active: true, role: 'user', admin_level: 0, created_at: '2026-07-13T00:00:00Z' }));
  const grants = ['u1', 'u2'].map((id) => ({ user_id: id, email: `${id}@example.test`, client_id: 'c1', client_name: 'Client', last_authorized_at: '2026-07-13T00:00:00Z', authorization_count: 1, last_scopes: ['openid'] }));
  vi.mocked(apiFetch).mockReset().mockImplementation(async (_path, init) => {
    if (!init?.method) return { total: 2, page: 1, page_size: 20, items: kind === 'users' ? users : grants };
    return new Promise((resolve) => { resolveMutation = resolve; });
  });
  render(<I18nProvider>{kind === 'users' ? <UsersPanel /> : <GrantsPanel />}</I18nProvider>);
  const name = kind === 'users' ? 'Disable' : 'Revoke grant';
  const buttons = await screen.findAllByRole('button', { name });
  await userEvent.click(buttons[0]);
  expect(buttons[1]).toBeDisabled();
  await act(async () => { resolveMutation(kind === 'users' ? { ...users[0], is_active: false } : { revoked_refresh_tokens: 1, removed_grants: 1 }); });
  expect((await screen.findAllByRole('button', { name }))[0]).toBeEnabled();
});


it('locks user filters and pagination while an update is pending', async () => {
  let resolveMutation!: (value: unknown) => void;
  const item = { id: 'u1', email: 'u1@example.test', display_name: 'User', is_active: true, role: 'user', admin_level: 0, created_at: '2026-07-13T00:00:00Z' };
  vi.mocked(apiFetch).mockReset().mockImplementation(async (_path, init) => {
    if (!init?.method) return { total: 21, page: 1, page_size: 20, items: [item] };
    return new Promise((resolve) => { resolveMutation = resolve; });
  });
  const user = userEvent.setup();
  render(<I18nProvider><UsersPanel /></I18nProvider>);
  await user.click(await screen.findByRole('button', { name: 'Disable' }));
  const search = screen.getByLabelText('Search by email or user name');
  const filters = screen.getAllByRole('combobox');
  const next = screen.getByRole('button', { name: 'Next' });
  expect(search).toBeDisabled();
  expect(filters[0]).toBeDisabled();
  expect(filters[1]).toBeDisabled();
  expect(next).toBeDisabled();
  await user.click(next);
  await user.type(search, 'query{Enter}');
  expect(vi.mocked(apiFetch).mock.calls.filter(([, init]) => !init?.method)).toHaveLength(1);
  await act(async () => { resolveMutation({ ...item, is_active: false }); });
  expect(search).toBeEnabled();
  expect(filters[0]).toBeEnabled();
  expect(next).toBeEnabled();
  await user.click(next);
  expect(vi.mocked(apiFetch).mock.calls.filter(([, init]) => !init?.method)).toHaveLength(2);
});


it('locks grant search and pagination until revoke and its refresh finish', async () => {
  let resolveRevoke!: (value: unknown) => void;
  let resolveRefresh!: (value: unknown) => void;
  let reads = 0;
  const grant = { user_id: 'u1', email: 'u1@example.test', client_id: 'c1', client_name: 'Client', last_authorized_at: '2026-07-13T00:00:00Z', authorization_count: 1, last_scopes: ['openid'] };
  const list = { total: 21, page: 1, page_size: 20, items: [grant] };
  vi.mocked(apiFetch).mockReset().mockImplementation(async (_path, init) => {
    if (init?.method) return new Promise((resolve) => { resolveRevoke = resolve; });
    reads += 1;
    if (reads === 2) return new Promise((resolve) => { resolveRefresh = resolve; });
    return list;
  });
  const user = userEvent.setup();
  render(<I18nProvider><GrantsPanel /></I18nProvider>);
  await user.click(await screen.findByRole('button', { name: 'Revoke grant' }));
  const search = screen.getByLabelText('Search by email, client_id, or client name');
  const next = screen.getByRole('button', { name: 'Next' });
  expect(search).toBeDisabled();
  expect(next).toBeDisabled();
  await user.type(search, 'query{Enter}');
  await user.click(next);
  expect(reads).toBe(1);
  await act(async () => { resolveRevoke({ revoked_refresh_tokens: 1, removed_grants: 1 }); });
  expect(search).toBeDisabled();
  await act(async () => { resolveRefresh(list); });
  expect(search).toBeEnabled();
  expect(next).toBeEnabled();
});

it('does not refresh grants after the panel is unmounted during revoke', async () => {
  let resolveRevoke!: (value: unknown) => void;
  let reads = 0;
  const grant = { user_id: 'u1', email: 'u1@example.test', client_id: 'c1', client_name: 'Client', last_authorized_at: '2026-07-13T00:00:00Z', authorization_count: 1, last_scopes: ['openid'] };
  vi.mocked(apiFetch).mockReset().mockImplementation(async (_path, init) => {
    if (init?.method) return new Promise((resolve) => { resolveRevoke = resolve; });
    reads += 1;
    return { total: 1, page: 1, page_size: 20, items: [grant] };
  });
  const view = render(<I18nProvider><GrantsPanel /></I18nProvider>);
  await userEvent.click(await screen.findByRole('button', { name: 'Revoke grant' }));
  view.unmount();
  await act(async () => { resolveRevoke({ revoked_refresh_tokens: 1, removed_grants: 1 }); });
  expect(reads).toBe(1);
});

