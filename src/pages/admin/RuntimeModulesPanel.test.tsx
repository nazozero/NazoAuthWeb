import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../lib/api';
import { ApiError } from '../../lib/api';
import RuntimeModulesPanel from './RuntimeModulesPanel';

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
      disable_policy: 'drain_stored_transactions',
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
          body: JSON.stringify({
            desired_state: 'inherit',
            expected_revision: 7,
            reason: 'Return CIBA to deployment configuration',
            cascade: false,
          }),
        })
      );
    });
    expect(screen.getAllByText(/change accepted\/pending at revision 8/i)).not.toHaveLength(0);
    expect(screen.queryByText(/change completed/i)).not.toBeInTheDocument();
  });

  it('requires a second dependency confirmation before a cascade mutation', async () => {
    const user = userEvent.setup();
    render(<RuntimeModulesPanel />);

    await screen.findByRole('heading', { name: /Client Initiated Backchannel Authentication/i });
    await user.selectOptions(screen.getByLabelText('Desired mode for ciba'), 'disabled');
    await user.type(screen.getByLabelText('Reason for ciba'), 'Disable CIBA and its dependents');
    await user.click(screen.getByLabelText('Cascade dependency changes for ciba'));
    await user.click(screen.getByRole('button', { name: 'Review ciba change' }));
    await user.click(screen.getByRole('button', { name: 'Confirm ciba change' }));

    expect(
      mockedApiFetch.mock.calls.filter(([, init]) => init?.method === 'PATCH')
    ).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Confirm cascade impact' }));
    await waitFor(() => {
      expect(
        mockedApiFetch.mock.calls.filter(([, init]) => init?.method === 'PATCH')
      ).toHaveLength(1);
    });
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
});
