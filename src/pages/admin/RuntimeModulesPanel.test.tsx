import { I18nProvider } from '../../i18n';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { ApiError } from '../../lib/api';
import RuntimeModulesPanel from './RuntimeModulesPanel';
import { mfaStepUpFailureMessage } from './runtimeModuleView';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, apiFetch: vi.fn() };
});

const mockedApiFetch = vi.mocked(apiFetch);

const moduleList = {
  items: [
    {
      module_id: 'ciba',
      description: 'Client Initiated Backchannel Authentication',
      desired_state: 'enabled',
      resolved_enabled: true,
      actual_state: 'enabled',
      revision: 7,
      applied_revision: 7,
      transition_revision: 7,
      dependencies: ['request_objects'],
      dependents: ['native_sso'],
      allowed_actions: ['disable'],
      disable_policy: 'drain_stored_transactions:300s',
      drain_deadline: null,
      failure_code: null,
      updated_at: '2026-07-13T08:00:00Z',
    },
  ],
};

describe('RuntimeModulesPanel', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path === '/admin/runtime-modules' && !init?.method) {
        return moduleList;
      }
      if (path.startsWith('/admin/runtime-modules/events')) {
        return { total: 0, page: 1, page_size: 20, items: [] };
      }
      if (path === '/admin/runtime-modules/ciba' && init?.method === 'PATCH') {
        return {
          module_id: 'ciba',
          desired_state: 'disabled',
          revision: 8,
          actual_state: 'enabled',
          status_url: '/admin/runtime-modules/ciba',
        };
      }
      throw new Error(`unexpected request: ${path}`);
    });
  });

  it('sends the revision-safe request and renders 202 as pending', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <RuntimeModulesPanel />
      </I18nProvider>
    );

    await screen.findByRole('heading', {
      name: /Client Initiated Backchannel Authentication/i,
    });
    expect(screen.queryByRole('option', { name: 'inherit' })).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText('Desired mode for ciba'),
      'disabled'
    );
    await user.type(
      screen.getByLabelText('Reason for ciba'),
      'Disable CIBA'
    );
    await user.click(
      screen.getByRole('button', { name: 'Review ciba change' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirm ciba change' })
    );

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith(
        '/admin/runtime-modules/ciba',
        expect.objectContaining({
          method: 'PATCH',
          expectedStatus: 202,
          body: JSON.stringify({
            desired_state: 'disabled',
            expected_revision: 7,
            reason: 'Disable CIBA',
          }),
        })
      );
    });
    expect(
      screen.getAllByText(
        /HTTP 202 Accepted.*transition pending at revision 8/i
      )
    ).not.toHaveLength(0);
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.queryByText(/change completed/i)).not.toBeInTheDocument();
  });

  it('shows explicit cross-domain ownership and transition revision', async () => {
    render(
      <I18nProvider>
        <RuntimeModulesPanel />
      </I18nProvider>
    );

    await screen.findByRole('heading', {
      name: /Client Initiated Backchannel Authentication/i,
    });
    expect(screen.getByText('OAuth and OIDC extensions')).toBeInTheDocument();
    expect(
      screen.getByText('Transition revision').parentElement
    ).toHaveTextContent('7');
    expect(
      screen.queryByLabelText(/Cascade dependency changes/i)
    ).not.toBeInTheDocument();
  });

  it('shows stale audit events with actor, instance, state, outcome, and timestamp evidence', async () => {
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path === '/admin/runtime-modules' && !init?.method) {
        return moduleList;
      }
      if (path.startsWith('/admin/runtime-modules/events')) {
        return {
          total: 1,
          page: 1,
          page_size: 20,
          items: [
            {
              event_id: 'event-8',
              module_id: 'ciba',
              event_type: 'stale_transition_discarded',
              instance_id: 'server-a',
              actor_id: 'admin-1',
              reason: 'superseded by revision 9',
              before_state: 'inherit',
              after_state: null,
              revision: 8,
              outcome_code: 'revision_changed',
              created_at: '2026-07-13T08:01:00Z',
            },
          ],
        };
      }
      throw new Error(`unexpected request: ${path}`);
    });

    render(
      <I18nProvider>
        <RuntimeModulesPanel />
      </I18nProvider>
    );

    expect(
      await screen.findByText('Stale transition discarded')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Actor: admin-1.*Instance: server-a.*inherit.*revision_changed/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Reason: superseded by revision 9/)
    ).toBeInTheDocument();
  });

  it('performs MFA step-up without replaying the rejected mutation', async () => {
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path === '/admin/runtime-modules' && !init?.method) {
        return moduleList;
      }
      if (path.startsWith('/admin/runtime-modules/events')) {
        return { total: 0, page: 1, page_size: 20, items: [] };
      }
      if (path === '/admin/runtime-modules/ciba' && init?.method === 'PATCH') {
        throw new ApiError('Recent MFA is required', 403, {
          error: 'mfa_step_up_required',
        });
      }
      if (path === '/auth/me/mfa/step-up' && init?.method === 'POST') {
        return { csrf_token: 'rotated-csrf' };
      }
      throw new Error(`unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <RuntimeModulesPanel />
      </I18nProvider>
    );

    await screen.findByRole('heading', {
      name: /Client Initiated Backchannel Authentication/i,
    });
    await user.selectOptions(
      screen.getByLabelText('Desired mode for ciba'),
      'disabled'
    );
    await user.type(
      screen.getByLabelText('Reason for ciba'),
      'Reconfirm CIBA configuration'
    );
    await user.click(
      screen.getByRole('button', { name: 'Review ciba change' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirm ciba change' })
    );
    await user.type(await screen.findByLabelText('MFA code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify MFA' }));

    await screen.findByText(/MFA verified.*confirm the module change again/i);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/auth/me/mfa/step-up',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: '123456' }),
      })
    );
    expect(
      mockedApiFetch.mock.calls.filter(([, init]) => init?.method === 'PATCH')
    ).toHaveLength(1);
    expect(screen.queryByDisplayValue('123456')).not.toBeInTheDocument();
  });

  it('does not misreport a disable-policy conflict as a revision conflict', async () => {
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path === '/admin/runtime-modules' && !init?.method) {
        return moduleList;
      }
      if (path.startsWith('/admin/runtime-modules/events')) {
        return { total: 0, page: 1, page_size: 20, items: [] };
      }
      if (path === '/admin/runtime-modules/ciba' && init?.method === 'PATCH') {
        throw new ApiError(
          'Runtime module dependencies reject this change.',
          409,
          {
            error: 'invalid_request',
          }
        );
      }
      throw new Error(`unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <RuntimeModulesPanel />
      </I18nProvider>
    );

    await screen.findByRole('heading', {
      name: /Client Initiated Backchannel Authentication/i,
    });
    await user.selectOptions(
      screen.getByLabelText('Desired mode for ciba'),
      'disabled'
    );
    await user.type(screen.getByLabelText('Reason for ciba'), 'Change policy');
    await user.click(
      screen.getByRole('button', { name: 'Review ciba change' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirm ciba change' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Runtime module dependencies reject this change.'
    );
    expect(
      screen.queryByText(/Authoritative state was reloaded/i)
    ).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Change policy')).toBeInTheDocument();
    expect(
      mockedApiFetch.mock.calls.filter(
        ([path]) => path === '/admin/runtime-modules'
      )
    ).toHaveLength(1);
  });

  it('blocks a dirty draft when a manual refresh observes a newer revision', async () => {
    let listCalls = 0;
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path === '/admin/runtime-modules' && !init?.method) {
        listCalls += 1;
        if (listCalls === 1) {
          return moduleList;
        }
        return {
          items: [
            {
              ...moduleList.items[0],
              desired_state: 'disabled',
              revision: 8,
              updated_at: '2026-07-13T08:01:00Z',
            },
          ],
        };
      }
      if (path.startsWith('/admin/runtime-modules/events')) {
        return { total: 0, page: 1, page_size: 20, items: [] };
      }
      throw new Error(`unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <RuntimeModulesPanel />
      </I18nProvider>
    );

    await screen.findByRole('heading', {
      name: /Client Initiated Backchannel Authentication/i,
    });
    await user.selectOptions(
      screen.getByLabelText('Desired mode for ciba'),
      'disabled'
    );
    await user.type(screen.getByLabelText('Reason for ciba'), 'Operator draft');
    await user.click(
      screen.getByRole('button', { name: 'Refresh runtime state' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Server revision changed from 7 to 8'
    );
    expect(
      screen.getByRole('button', { name: 'Review ciba change' })
    ).toBeDisabled();
    expect(screen.getByDisplayValue('Operator draft')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Reset draft to server state' })
    );
    expect(
      screen.queryByDisplayValue('Operator draft')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Server revision changed from/i)
    ).not.toBeInTheDocument();
  });

  it('does not reset a conflict draft from a reload superseded by a newer refresh', async () => {
    let listCalls = 0;
    let resolveConflictReload!: (value: unknown) => void;
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path === '/admin/runtime-modules') {
        listCalls += 1;
        if (listCalls === 2) return new Promise((resolve) => { resolveConflictReload = resolve; });
        if (listCalls === 3) return { items: [{ ...moduleList.items[0], revision: 9, desired_state: 'disabled', updated_at: '2026-07-13T08:02:00Z' }] };
        return moduleList;
      }
      if (init?.method === 'PATCH') throw new ApiError('conflict', 409, { error: 'revision_conflict' });
      return { total: 0, page: 1, page_size: 20, items: [] };
    });
    const user = userEvent.setup();
    render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await screen.findByRole('heading', { name: /Client Initiated Backchannel Authentication/i });
    await user.selectOptions(screen.getByLabelText('Desired mode for ciba'), 'disabled');
    await user.type(screen.getByLabelText('Reason for ciba'), 'operator draft');
    await user.click(screen.getByRole('button', { name: 'Review ciba change' }));
    await user.click(screen.getByRole('button', { name: 'Confirm ciba change' }));
    await waitFor(() => expect(listCalls).toBe(2));
    await user.click(screen.getByRole('button', { name: 'Refresh runtime state' }));
    await waitFor(() => expect(listCalls).toBe(3));
    await act(async () => { resolveConflictReload({ items: [{ ...moduleList.items[0], revision: 8 }] }); });
    expect(screen.getByText(/Server revision changed from 7 to 9/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('operator draft')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset draft to server state' }));
    expect(screen.getByLabelText('Desired mode for ciba')).toHaveValue('disabled');
  });

  it('keeps a clean draft at the newer revision when a later request returns an older snapshot', async () => {
    vi.useFakeTimers();
    let listCalls = 0;
    let resolveOlder!: (value: unknown) => void;
    let resolveNewer!: (value: unknown) => void;
    mockedApiFetch.mockImplementation(async (path) => {
      if (path === '/admin/runtime-modules') {
        listCalls += 1;
        if (listCalls === 1) return { items: [{ ...moduleList.items[0], actual_state: 'draining', applied_revision: 6 }] };
        if (listCalls === 2) return new Promise((resolve) => { resolveNewer = resolve; });
        return new Promise((resolve) => { resolveOlder = resolve; });
      }
      return { total: 0, page: 1, page_size: 20, items: [] };
    });
    render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh runtime state' })); });
    await act(async () => { resolveNewer({ items: [{ ...moduleList.items[0], revision: 9, desired_state: 'disabled', actual_state: 'draining', updated_at: '2026-07-13T08:02:00Z' }] }); });
    expect(screen.getByLabelText('Desired mode for ciba')).toHaveValue('disabled');
    await act(async () => { resolveOlder({ items: [{ ...moduleList.items[0], revision: 8, desired_state: 'enabled' }] }); });
    expect(screen.getByLabelText('Desired mode for ciba')).toHaveValue('disabled');
    expect(screen.queryByText(/Server revision changed from/)).not.toBeInTheDocument();
  });

  it('keeps the submitted draft locked and blocks another save after dismissing the dialog', async () => {
    let resolvePatch!: (value: unknown) => void;
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path === '/admin/runtime-modules') return { items: [moduleList.items[0], { ...moduleList.items[0], module_id: 'jarm', description: 'JARM' }] };
      if (init?.method === 'PATCH') return new Promise((resolve) => { resolvePatch = resolve; });
      return { total: 0, page: 1, page_size: 20, items: [] };
    });
    const user = userEvent.setup();
    render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await screen.findByRole('heading', { name: 'JARM' });
    await user.selectOptions(screen.getByLabelText('Desired mode for ciba'), 'disabled');
    await user.type(screen.getByLabelText('Reason for ciba'), 'first change');
    await user.selectOptions(screen.getByLabelText('Desired mode for jarm'), 'disabled');
    await user.type(screen.getByLabelText('Reason for jarm'), 'second change');
    await user.click(screen.getByRole('button', { name: 'Review ciba change' }));
    await user.click(screen.getByRole('button', { name: 'Confirm ciba change' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Desired mode for ciba')).toBeDisabled();
    expect(screen.getByLabelText('Reason for ciba')).toBeDisabled();
    expect(screen.getByLabelText('Reason for jarm')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Review jarm change' })).toBeDisabled();
    await act(async () => { resolvePatch({ module_id: 'ciba', desired_state: 'disabled', revision: 8, actual_state: 'enabled', status_url: '/admin/runtime-modules/ciba' }); });
    expect(screen.getByLabelText('Reason for ciba')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Review jarm change' })).toBeEnabled();
    expect(screen.getByLabelText('Reason for jarm')).toHaveValue('second change');
  });

  it('does not show a late 202 as pending after the accepted revision is already stable or superseded', async () => {
    let listCalls = 0;
    let resolvePatch!: (value: unknown) => void;
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path === '/admin/runtime-modules') {
        listCalls += 1;
        if (listCalls === 1) return moduleList;
        if (listCalls === 2) return { items: [{ ...moduleList.items[0], desired_state: 'disabled', actual_state: 'disabled', revision: 8, applied_revision: 8, transition_revision: 8 }] };
        return { items: [{ ...moduleList.items[0], desired_state: 'enabled', actual_state: 'starting', revision: 9, applied_revision: 8, transition_revision: 9 }] };
      }
      if (init?.method === 'PATCH') return new Promise((resolve) => { resolvePatch = resolve; });
      return { total: 0, page: 1, page_size: 20, items: [] };
    });
    const user = userEvent.setup();
    render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await screen.findByRole('heading', { name: /Client Initiated Backchannel Authentication/i });
    await user.selectOptions(screen.getByLabelText('Desired mode for ciba'), 'disabled');
    await user.type(screen.getByLabelText('Reason for ciba'), 'operator request');
    await user.click(screen.getByRole('button', { name: 'Review ciba change' }));
    await user.click(screen.getByRole('button', { name: 'Confirm ciba change' }));
    await user.click(screen.getByRole('button', { name: 'Refresh runtime state' }));
    await waitFor(() => expect(screen.getByText('Disabled')).toBeInTheDocument());
    await act(async () => { resolvePatch({ module_id: 'ciba', desired_state: 'disabled', revision: 8, actual_state: 'enabled', status_url: '/admin/runtime-modules/ciba' }); });
    expect(screen.queryByText(/HTTP 202 Accepted.*transition pending/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh runtime state' }));
    await screen.findByText('Starting — transition pending');
    expect(screen.queryByText(/HTTP 202 Accepted.*transition pending/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Desired mode for ciba')).toHaveValue('enabled');
    expect(screen.queryByText(/Server revision changed from/)).not.toBeInTheDocument();
  });

  it.each([
    ['failure', 'success'],
    ['success', 'failure'],
  ])('keeps the newer manual read result when an older poll ends in %s and manual ends in %s', async (pollOutcome, manualOutcome) => {
    vi.useFakeTimers();
    let eventCalls = 0;
    let resolvePoll!: (value: unknown) => void;
    let rejectPoll!: (reason: Error) => void;
    const emptyEvents = { total: 0, page: 1, page_size: 20, items: [] };
    mockedApiFetch.mockImplementation(async (path) => {
      if (path === '/admin/runtime-modules') return { items: [{ ...moduleList.items[0], actual_state: 'draining', applied_revision: 6 }] };
      eventCalls += 1;
      if (eventCalls === 2) return new Promise((resolve, reject) => { resolvePoll = resolve; rejectPoll = reject; });
      if (eventCalls === 3 && manualOutcome === 'failure') throw new Error('manual failure');
      return emptyEvents;
    });
    render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh runtime state' })); });
    if (manualOutcome === 'failure') expect(screen.getByRole('alert')).toHaveTextContent('manual failure');
    await act(async () => {
      if (pollOutcome === 'failure') rejectPoll(new Error('old poll failure'));
      else resolvePoll(emptyEvents);
    });
    if (manualOutcome === 'failure') expect(screen.getByRole('alert')).toHaveTextContent('manual failure');
    else expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears an initial read error when a later complete poll succeeds', async () => {
    vi.useFakeTimers();
    let eventCalls = 0;
    mockedApiFetch.mockImplementation(async (path) => {
      if (path === '/admin/runtime-modules') {
        return { items: [{ ...moduleList.items[0], actual_state: 'draining', applied_revision: 6 }] };
      }
      eventCalls += 1;
      if (eventCalls === 1) throw new Error('initial audit failure');
      return { total: 0, page: 1, page_size: 20, items: [] };
    });
    render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await act(async () => {});
    expect(screen.getByRole('alert')).toHaveTextContent('initial audit failure');
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('retries a failed poll and stops when the transition is stable', async () => {
    vi.useFakeTimers();
    let listCalls = 0;
    mockedApiFetch.mockImplementation(async (path) => {
      if (path === '/admin/runtime-modules') {
        listCalls += 1;
        if (listCalls === 2) throw new Error('temporary failure');
        return { items: [{ ...moduleList.items[0], actual_state: listCalls === 1 ? 'draining' : 'disabled', applied_revision: listCalls === 1 ? 6 : 7 }] };
      }
      return { total: 0, page: 1, page_size: 20, items: [] };
    });
    render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole('alert')).toHaveTextContent('temporary failure');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(listCalls).toBe(3);
  });

  it('clears a poll failure after the final stable module and delayed events both succeed', async () => {
    vi.useFakeTimers();
    let listCalls = 0;
    let eventCalls = 0;
    let resolveEvents!: (value: unknown) => void;
    mockedApiFetch.mockImplementation(async (path) => {
      if (path === '/admin/runtime-modules') {
        listCalls += 1;
        if (listCalls === 2) throw new Error('temporary poll failure');
        return { items: [{ ...moduleList.items[0], actual_state: listCalls === 1 ? 'draining' : 'disabled', applied_revision: listCalls === 1 ? 6 : 7 }] };
      }
      eventCalls += 1;
      if (eventCalls === 3) return new Promise((resolve) => { resolveEvents = resolve; });
      return { total: 0, page: 1, page_size: 20, items: [] };
    });
    render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole('alert')).toHaveTextContent('temporary poll failure');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    await act(async () => { resolveEvents({ total: 0, page: 1, page_size: 20, items: [] }); });
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(listCalls).toBe(3);
  });

  it('applies a stable module even when the same poll cannot load events', async () => {
    vi.useFakeTimers();
    let listCalls = 0;
    let eventCalls = 0;
    mockedApiFetch.mockImplementation(async (path) => {
      if (path === '/admin/runtime-modules') {
        listCalls += 1;
        return { items: [{ ...moduleList.items[0], actual_state: listCalls === 1 ? 'draining' : 'disabled', applied_revision: listCalls === 1 ? 6 : 7 }] };
      }
      eventCalls += 1;
      if (eventCalls === 2) throw new Error('audit unavailable');
      return { total: 0, page: 1, page_size: 20, items: [] };
    });
    render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('audit unavailable');
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(listCalls).toBe(2);
  });

  it('preserves an action error with the same message when polling recovers', async () => {
    vi.useFakeTimers();
    let listCalls = 0;
    mockedApiFetch.mockImplementation(async (path, init) => {
      if (path === '/admin/runtime-modules') {
        listCalls += 1;
        if (listCalls === 2) throw new Error('shared failure');
        return { items: [{ ...moduleList.items[0], actual_state: 'draining', applied_revision: 6 }] };
      }
      if (init?.method === 'PATCH') throw new Error('shared failure');
      return { total: 0, page: 1, page_size: 20, items: [] };
    });
    render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole('alert')).toHaveTextContent('shared failure');
    fireEvent.change(screen.getByLabelText('Desired mode for ciba'), { target: { value: 'disabled' } });
    fireEvent.change(screen.getByLabelText('Reason for ciba'), { target: { value: 'operator request' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review ciba change' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm ciba change' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('shared failure');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(screen.getByRole('alert')).toHaveTextContent('shared failure');
  });

  it('keeps newer audit events when an earlier poll finishes after manual refresh', async () => {
    vi.useFakeTimers();
    let eventCalls = 0;
    let resolveOldEvents!: (value: unknown) => void;
    const event = (reason: string) => ({
      event_id: reason, module_id: 'ciba', event_type: 'desired_state_changed',
      instance_id: null, actor_id: null, reason, before_state: 'enabled',
      after_state: 'disabled', revision: 7, outcome_code: null,
      created_at: '2026-07-13T08:00:00Z',
    });
    const eventList = (reason: string) => ({
      total: 1, page: 1, page_size: 20, items: [event(reason)],
    });
    mockedApiFetch.mockImplementation(async (path) => {
      if (path === '/admin/runtime-modules') {
        return { items: [{ ...moduleList.items[0], actual_state: 'draining', applied_revision: 6 }] };
      }
      eventCalls += 1;
      if (eventCalls === 2) {
        return new Promise((resolve) => { resolveOldEvents = resolve; });
      }
      return eventList(eventCalls === 1 ? 'initial event' : 'new event');
    });
    render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(eventCalls).toBe(2);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Refresh runtime state' }));
    });
    expect(screen.getByText(/Reason: new event/)).toBeInTheDocument();
    await act(async () => { resolveOldEvents(eventList('old event')); });
    expect(screen.getByText(/Reason: new event/)).toBeInTheDocument();
    expect(screen.queryByText(/Reason: old event/)).not.toBeInTheDocument();
  });

  it('pauses while hidden and ignores an in-flight response after unmount', async () => {
    vi.useFakeTimers();
    let resolvePoll!: (value: unknown) => void;
    let listCalls = 0;
    mockedApiFetch.mockImplementation(async (path) => {
      if (path === '/admin/runtime-modules') {
        listCalls += 1;
        if (listCalls === 1) return { items: [{ ...moduleList.items[0], actual_state: 'draining', applied_revision: 6 }] };
        return new Promise((resolve) => { resolvePoll = resolve; });
      }
      return { total: 0, page: 1, page_size: 20, items: [] };
    });
    const view = render(<I18nProvider><RuntimeModulesPanel /></I18nProvider>);
    await act(async () => {});
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(listCalls).toBe(1);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(listCalls).toBe(2);
    view.unmount();
    await act(async () => { resolvePoll(moduleList); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(listCalls).toBe(2);
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it.each([
    [401, 'session expired'],
    [404, 'not available on this server version'],
    [409, 'changed concurrently'],
    [429, 'Too many MFA attempts'],
  ])(
    'maps MFA step-up HTTP %s to an actionable non-replay message',
    (status, message) => {
      expect(
        mfaStepUpFailureMessage(new ApiError('Request failed', status, null))
      ).toMatch(new RegExp(message, 'i'));
    }
  );
});
