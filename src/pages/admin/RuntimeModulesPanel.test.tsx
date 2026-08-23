import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
      allowed_actions: ['inherit', 'disable'],
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
          desired_state: 'inherit',
          revision: 8,
          actual_state: 'enabled',
          status_url: '/admin/runtime-modules/ciba',
        };
      }
      throw new Error(`unexpected request: ${path}`);
    });
  });

  it('sends the revision-safe tri-state request and renders 202 as pending', async () => {
    const user = userEvent.setup();
    render(<RuntimeModulesPanel />);

    await screen.findByRole('heading', { name: /Client Initiated Backchannel Authentication/i });
    await user.selectOptions(screen.getByLabelText('Desired mode for ciba'), 'inherit');
    await user.type(
      screen.getByLabelText('Reason for ciba'),
      'Return CIBA to deployment configuration'
    );
    await user.click(screen.getByRole('button', { name: 'Review ciba change' }));
    await user.click(screen.getByRole('button', { name: 'Confirm ciba change' }));

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith(
        '/admin/runtime-modules/ciba',
        expect.objectContaining({
          method: 'PATCH',
          expectedStatus: 202,
          body: JSON.stringify({
            desired_state: 'inherit',
            expected_revision: 7,
            reason: 'Return CIBA to deployment configuration',
          }),
        })
      );
    });
    expect(screen.getAllByText(/HTTP 202 Accepted.*transition pending at revision 8/i)).not.toHaveLength(0);
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.queryByText(/change completed/i)).not.toBeInTheDocument();
  });

  it('shows explicit cross-domain ownership and transition revision', async () => {
    render(<RuntimeModulesPanel />);

    await screen.findByRole('heading', { name: /Client Initiated Backchannel Authentication/i });
    expect(screen.getByText('OAuth and OIDC extensions')).toBeInTheDocument();
    expect(screen.getByText('Transition revision').parentElement).toHaveTextContent('7');
    expect(screen.queryByLabelText(/Cascade dependency changes/i)).not.toBeInTheDocument();
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
              before_state: 'draining',
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

    render(<RuntimeModulesPanel />);

    expect(await screen.findByText('Stale transition discarded')).toBeInTheDocument();
    expect(screen.getByText(/Actor: admin-1.*Instance: server-a.*draining.*revision_changed/)).toBeInTheDocument();
    expect(screen.getByText(/Reason: superseded by revision 9/)).toBeInTheDocument();
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
        throw new ApiError('Recent MFA is required', 403, { error: 'mfa_step_up_required' });
      }
      if (path === '/auth/me/mfa/step-up' && init?.method === 'POST') {
        return { csrf_token: 'rotated-csrf' };
      }
      throw new Error(`unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(<RuntimeModulesPanel />);

    await screen.findByRole('heading', { name: /Client Initiated Backchannel Authentication/i });
    await user.selectOptions(screen.getByLabelText('Desired mode for ciba'), 'inherit');
    await user.type(screen.getByLabelText('Reason for ciba'), 'Reconfirm CIBA configuration');
    await user.click(screen.getByRole('button', { name: 'Review ciba change' }));
    await user.click(screen.getByRole('button', { name: 'Confirm ciba change' }));
    await user.type(await screen.findByLabelText('MFA code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify MFA' }));

    await screen.findByText(/MFA verified.*confirm the module change again/i);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/auth/me/mfa/step-up',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: '123456' }) })
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
        throw new ApiError('Runtime module dependencies reject this change.', 409, {
          error: 'invalid_request',
        });
      }
      throw new Error(`unexpected request: ${path}`);
    });
    const user = userEvent.setup();
    render(<RuntimeModulesPanel />);

    await screen.findByRole('heading', { name: /Client Initiated Backchannel Authentication/i });
    await user.selectOptions(screen.getByLabelText('Desired mode for ciba'), 'inherit');
    await user.type(screen.getByLabelText('Reason for ciba'), 'Change policy');
    await user.click(screen.getByRole('button', { name: 'Review ciba change' }));
    await user.click(screen.getByRole('button', { name: 'Confirm ciba change' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Runtime module dependencies reject this change.'
    );
    expect(screen.queryByText(/Authoritative state was reloaded/i)).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Change policy')).toBeInTheDocument();
    expect(
      mockedApiFetch.mock.calls.filter(([path]) => path === '/admin/runtime-modules')
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
              desired_state: 'inherit',
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
    render(<RuntimeModulesPanel />);

    await screen.findByRole('heading', { name: /Client Initiated Backchannel Authentication/i });
    await user.selectOptions(screen.getByLabelText('Desired mode for ciba'), 'inherit');
    await user.type(screen.getByLabelText('Reason for ciba'), 'Operator draft');
    await user.click(screen.getByRole('button', { name: 'Refresh runtime state' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Server revision changed from 7 to 8'
    );
    expect(screen.getByRole('button', { name: 'Review ciba change' })).toBeDisabled();
    expect(screen.getByDisplayValue('Operator draft')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset draft to server state' }));
    expect(screen.queryByDisplayValue('Operator draft')).not.toBeInTheDocument();
    expect(screen.queryByText(/Server revision changed from/i)).not.toBeInTheDocument();
  });

  it.each([
    [401, 'session expired'],
    [404, 'not available on this server version'],
    [409, 'changed concurrently'],
    [429, 'Too many MFA attempts'],
  ])('maps MFA step-up HTTP %s to an actionable non-replay message', (status, message) => {
    expect(mfaStepUpFailureMessage(new ApiError('Request failed', status, null))).toMatch(
      new RegExp(message, 'i')
    );
  });
});
