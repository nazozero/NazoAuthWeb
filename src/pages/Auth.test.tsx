import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { ApiError, apiFetch } from '../lib/api';
import Auth from './Auth';

const { refreshSession } = vi.hoisted(() => ({ refreshSession: vi.fn() }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ refreshSession }) }));
vi.mock('../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/api')>(),
  apiFetch: vi.fn(),
}));

function renderAuth() {
  render(<I18nProvider><MemoryRouter initialEntries={['/auth']}><Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/profile" element={<p>Signed in profile</p>} />
  </Routes></MemoryRouter></I18nProvider>);
}

describe('account actions', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    refreshSession.mockReset().mockResolvedValue({ id: 'user-1' });
  });

  it('lets a visitor sign in without waiting for an unrelated configuration request', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue({ session_id: 'session-1', expires_in: 3600 });
    renderAuth();
    const submit = screen.getByRole('button', { name: 'Sign in' });
    expect(submit).toBeEnabled();
    expect(apiFetch).not.toHaveBeenCalled();
    await user.type(screen.getByPlaceholderText('Email address'), 'user@example.test');
    await user.type(screen.getByPlaceholderText('Password'), 'password');
    await user.click(submit);
    expect(await screen.findByText('Signed in profile')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
      method: 'POST', csrf: 'defer',
      body: JSON.stringify({ email: 'user@example.test', password: 'password' }),
    }));
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('sends the email code directly and keeps the resend cooldown', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue({ success: true });
    renderAuth();
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByPlaceholderText('Email code');
    await user.type(screen.getByPlaceholderText('Email address'), 'user@example.test');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('Verification code sent. Check your email.')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/auth/send-code', expect.objectContaining({
      method: 'POST', csrf: 'defer', body: JSON.stringify({ email: 'user@example.test' }),
    }));
    expect(screen.getByRole('button', { name: /60s/ })).toBeDisabled();
  });

  it('locks the account and mode while a code request is pending', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(apiFetch).mockReturnValue(new Promise((done) => { resolve = done; }));
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByPlaceholderText('Email code');
    await user.type(screen.getByPlaceholderText('Email address'), 'a@example.test');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect(screen.getByPlaceholderText('Email address')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeDisabled();
    await act(async () => { resolve({ success: true }); });
    expect(screen.getByPlaceholderText('Email address')).toBeEnabled();
  });

  it('leaves the user in control of navigation after registration succeeds', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ id: 'user-1', email: 'a@example.test' });
    const user = userEvent.setup();
    renderAuth();
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByPlaceholderText('Email code');
    await user.type(screen.getByPlaceholderText('Email address'), 'a@example.test');
    await user.type(screen.getByPlaceholderText('Email code'), '123456');
    await user.type(screen.getByPlaceholderText('Password'), 'long-enough-password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('button', { name: 'Back to sign in' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('shows a server rejection without refreshing the session or navigating', async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockRejectedValue(new ApiError('Too many attempts', 429, null));
    renderAuth();
    await user.type(screen.getByPlaceholderText('Email address'), 'user@example.test');
    await user.type(screen.getByPlaceholderText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Too many attempts')).toBeInTheDocument();
    expect(refreshSession).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});
