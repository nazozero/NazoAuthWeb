import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import UsersPanel from './UsersPanel';
import GrantsPanel from './GrantsPanel';
import ClientsPanel from './ClientsPanel';
import AccessRequestsPanel from './AccessRequestsPanel';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, apiFetch: vi.fn() };
});

const mockedApiFetch = vi.mocked(apiFetch);

describe('legacy admin panels', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it('loads users and applies the existing active-state PATCH', async () => {
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path.startsWith('/admin/users?')) {
        return { total: 1, page: 1, page_size: 20, items: [{ id: 'u1', email: 'user@example.test', display_name: 'User', is_active: true, role: 'user', admin_level: 0, created_at: '2026-07-13T00:00:00Z' }] };
      }
      if (path === '/admin/users/u1' && init?.method === 'PATCH') {
        return { id: 'u1', email: 'user@example.test', display_name: 'User', is_active: false, role: 'user', admin_level: 0, created_at: '2026-07-13T00:00:00Z' };
      }
      throw new Error(`unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(<UsersPanel />);
    await user.click(await screen.findByRole('button', { name: 'Disable' }));
    expect(mockedApiFetch).toHaveBeenCalledWith('/admin/users/u1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ is_active: false }) }));
    expect(await screen.findByRole('button', { name: 'Enable' })).toBeInTheDocument();
  });

  it('revokes a grant and refreshes its current page', async () => {
    let listCalls = 0;
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path.startsWith('/admin/grants?')) {
        listCalls += 1;
        return { total: 1, page: 1, page_size: 20, items: [{ user_id: 'u1', email: 'user@example.test', client_id: 'c1', client_name: 'Client', last_authorized_at: '2026-07-13T00:00:00Z', authorization_count: 1, last_scopes: ['openid'] }] };
      }
      if (path === '/admin/grants/revoke' && init?.method === 'POST') {
        return { revoked_refresh_tokens: 2, removed_grants: 1 };
      }
      throw new Error(`unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(<GrantsPanel />);
    await user.click(await screen.findByRole('button', { name: 'Revoke grant' }));
    await screen.findByText(/Revoked: 2 refresh tokens, 1 grant records/i);
    await waitFor(() => expect(listCalls).toBe(2));
  });

  it('creates a client with the normalized existing API payload', async () => {
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path.startsWith('/admin/clients?')) return { total: 0, page: 1, page_size: 20, items: [] };
      if (path === '/.well-known/openid-configuration') return { scopes_supported: ['openid', 'profile'] };
      if (path === '/admin/clients' && init?.method === 'POST') return { client_id: 'new-client', client_name: 'Demo', client_type: 'public', redirect_uris: ['https://app.example/callback'], scopes: ['openid', 'profile'], allowed_audiences: ['resource://default'], grant_types: ['authorization_code', 'refresh_token'], token_endpoint_auth_method: 'none', is_active: true };
      throw new Error(`unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(<ClientsPanel />);
    await user.click(await screen.findByRole('button', { name: 'Create client' }));
    await user.clear(screen.getByLabelText('Client name'));
    await user.type(screen.getByLabelText('Client name'), 'Demo');
    await user.clear(screen.getByLabelText('Redirect URIs'));
    await user.type(screen.getByLabelText('Redirect URIs'), 'https://app.example/callback');
    await user.click(screen.getByRole('button', { name: 'Save new client' }));
    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledWith('/admin/clients', expect.objectContaining({ method: 'POST', body: expect.stringContaining('"client_name":"Demo"') })));
  });

  it('rejects an access request with the required admin note', async () => {
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path.startsWith('/admin/access-requests?')) return { total: 1, page: 1, page_size: 20, items: [{ id: 'r1', user_id: 'u1', user_email: 'user@example.test', site_name: 'Site', site_url: 'https://site.example', request_description: 'Need OAuth', status: 0, created_at: '2026-07-13T00:00:00Z' }] };
      if (path === '/admin/access-requests/r1/reject' && init?.method === 'POST') return { id: 'r1', user_id: 'u1', user_email: 'user@example.test', site_name: 'Site', site_url: 'https://site.example', request_description: 'Need OAuth', status: 2, admin_note: 'Redirect URI is invalid', created_at: '2026-07-13T00:00:00Z' };
      throw new Error(`unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(<AccessRequestsPanel />);
    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    await user.type(screen.getByLabelText('Rejection reason'), 'Redirect URI is invalid');
    await user.click(screen.getByRole('button', { name: 'Reject request' }));
    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledWith('/admin/access-requests/r1/reject', expect.objectContaining({ method: 'POST', body: JSON.stringify({ admin_note: 'Redirect URI is invalid' }) })));
  });
});
