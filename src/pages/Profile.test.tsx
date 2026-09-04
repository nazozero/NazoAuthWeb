import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/useAuth';
import { apiFetch } from '../lib/api';
import Profile from './Profile';

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

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
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
      .mockResolvedValueOnce({ ...user, avatar_url: '/auth/me/avatar?revision=2' });

    renderProfile();
    const input = await screen.findByLabelText('Upload avatar');
    await waitFor(() => expect(input).not.toBeDisabled());
    const file = new File(['png'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    await userEvent.click(screen.getByRole('button', { name: /Save and upload avatar/i }));

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put).toHaveBeenCalledWith('https://storage.example.test/avatars/upload-1', {
      method: 'PUT',
      headers: { 'content-length': '3' },
      body: file,
      credentials: 'omit',
    });
    expect(mockedApiFetch).toHaveBeenNthCalledWith(2, '/auth/me/avatar/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_length: 3 }),
    });
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
      screen.getByText('Avatar storage is unavailable for this tenant. Contact the system administrator.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset avatar' })).toBeDisabled();
  });
});
