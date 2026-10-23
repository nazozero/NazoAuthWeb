import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/useAuth';
import { ApiError, apiFetch } from '../lib/api';
import Profile from './Profile';
import { I18nProvider } from '../i18n';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiFetch: vi.fn() };
});

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const mockedApiFetch = vi.mocked(apiFetch);
const mockedUseAuth = vi.mocked(useAuth);
const user = {
  id: 'user-1',
  email: 'user@example.test',
  display_name: null,
  avatar_url: '/auth/me/avatar',
  role: 'user' as const,
  admin_level: 0,
  authorized_app_count: 0,
};

function renderProfile(path = '/profile') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <Profile />
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('Profile avatar uploads', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedUseAuth.mockReturnValue({
      user,
      loading: false,
      sessionChecked: true,
      refreshSession: vi.fn(),
      setUser: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('uploads direct avatars to the returned URL without application credentials', async () => {
    const put = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', put);
    mockedApiFetch
      .mockResolvedValueOnce({ upload_mode: 'direct' })
      .mockResolvedValueOnce({
        upload_id: 'upload-1',
        expires_at: '2026-09-04T12:00:00Z',
        upload: {
          url: 'https://storage.example.test/avatars/upload-1',
          method: 'PUT',
          headers: { 'content-length': '3' },
        },
      })
      .mockResolvedValueOnce({
        ...user,
        avatar_url: '/auth/me/avatar?revision=2',
      });

    renderProfile();
    const input = await screen.findByLabelText('Upload avatar');
    await waitFor(() => expect(input).not.toBeDisabled());
    const file = new File(['png'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await userEvent.click(
      screen.getByRole('button', { name: /Save and upload avatar/i })
    );

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put).toHaveBeenCalledWith(
      'https://storage.example.test/avatars/upload-1',
      {
        method: 'PUT',
        headers: { 'content-length': '3' },
        body: file,
        credentials: 'omit',
      }
    );
    expect(mockedApiFetch).toHaveBeenNthCalledWith(
      2,
      '/auth/me/avatar/uploads',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_length: 3 }),
      }
    );
    expect(mockedApiFetch).toHaveBeenNthCalledWith(
      3,
      '/auth/me/avatar/uploads/upload-1/complete',
      { method: 'POST' }
    );
  });

  it('disables avatar changes when storage is disabled for the tenant', async () => {
    mockedApiFetch.mockResolvedValueOnce({ upload_mode: 'disabled' });
    renderProfile();

    const input = await screen.findByLabelText('Upload avatar');
    await waitFor(() => expect(input).toBeDisabled());
    expect(
      screen.getByText(
        'Avatar storage is unavailable for this tenant. Contact the system administrator.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset avatar' })).toBeDisabled();
  });

  it.each([
    ['/profile', '/auth/me/avatar/uploads'],
    ['/profile?tab=apps', '/auth/me/applications'],
    ['/profile?tab=access-requests', '/auth/me/access-requests'],
  ])('ignores a late unauthorized read after leaving %s', async (path, endpoint) => {
    let reject!: (reason: Error) => void;
    mockedApiFetch.mockImplementation((request) => request === endpoint
      ? new Promise((_resolve, fail) => { reject = fail; })
      : Promise.resolve({ upload_mode: 'disabled' }));
    const { unmount } = renderProfile(path);
    const signal = mockedApiFetch.mock.calls.find(([request]) => request === endpoint)?.[1]?.signal;
    unmount();
    await act(async () => { reject(new ApiError('expired', 401, null)); });
    expect(mockedUseAuth().logout).not.toHaveBeenCalled();
    expect(signal?.aborted).toBe(true);
  });

  it('does not publish a profile save after leaving the page', async () => {
    let resolve!: (value: typeof user) => void;
    mockedApiFetch.mockResolvedValueOnce({ upload_mode: 'disabled' })
      .mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const { unmount } = renderProfile();
    await userEvent.type(screen.getByLabelText('Display name'), 'Changed');
    await userEvent.click(screen.getByRole('button', { name: /Save profile/i }));
    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledTimes(2));
    unmount();
    await act(async () => { resolve(user); });
    expect(mockedUseAuth().setUser).not.toHaveBeenCalled();
  });

  it('uses the created access request without querying the list again', async () => {
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path === '/auth/me/avatar/uploads') return { upload_mode: 'disabled' };
      if (init?.method === 'POST') return {
        id: 'request-1', site_name: 'Example', site_url: 'https://example.test',
        request_description: 'Test integration', status: 0, created_at: '2026-10-23T00:00:00Z',
      };
      return { items: [], total: 0, pending_count: 0 };
    });
    renderProfile('/profile?tab=access-requests');
    await userEvent.type(screen.getByLabelText('Site name'), 'Example');
    await userEvent.type(screen.getByLabelText('Site URL'), 'https://example.test');
    await userEvent.type(screen.getByLabelText('Request description'), 'Test integration');
    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    await screen.findByText('Request submitted. Waiting for admin review.');
    expect(mockedApiFetch.mock.calls.filter(([path, init]) => path === '/auth/me/access-requests' && !init?.method)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();
  });
});
