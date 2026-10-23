import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { apiFetch } from '../../lib/api';
import UsersPanel from './UsersPanel';
import ClientsPanel from './ClientsPanel';
import GrantsPanel from './GrantsPanel';
import AccessRequestsPanel from './AccessRequestsPanel';

vi.mock('../../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/api')>(), apiFetch: vi.fn(),
}));
const mockedApiFetch = vi.mocked(apiFetch);
const emptyPage = { items: [], total: 0, page: 1, page_size: 20 };
const panels = [
  ['users', UsersPanel], ['clients', ClientsPanel],
  ['grants', GrantsPanel], ['access requests', AccessRequestsPanel],
] as const;

describe.each(panels)('%s list request ownership', (_name, Panel) => {
  beforeEach(() => { mockedApiFetch.mockReset(); });

  it('queries once per submitted search, not once per character', async () => {
    mockedApiFetch.mockResolvedValue(emptyPage);
    const user = userEvent.setup();
    render(<I18nProvider><Panel /></I18nProvider>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled());
    await user.type(screen.getByRole('textbox'), 'abcdefghij');
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledTimes(2));
    expect(mockedApiFetch.mock.calls[1][0]).toContain('q=abcdefghij');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
  });

  it('ignores a superseded response even if the transport finishes after abort', async () => {
    let resolveOld!: (value: typeof emptyPage) => void;
    mockedApiFetch.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    mockedApiFetch.mockResolvedValue(emptyPage);
    render(<I18nProvider><Panel /></I18nProvider>);
    // Enter is available while the initial list is loading.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    await waitFor(() => expect(mockedApiFetch).toHaveBeenCalledTimes(2));
    await act(async () => { resolveOld({ ...emptyPage, total: 999 }); });
    expect(screen.queryByText(/999/)).not.toBeInTheDocument();
    expect(mockedApiFetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('aborts the pending read when leaving the panel', () => {
    mockedApiFetch.mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<I18nProvider><Panel /></I18nProvider>);
    const signal = mockedApiFetch.mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
