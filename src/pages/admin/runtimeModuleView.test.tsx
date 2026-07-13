import { describe, expect, it } from 'vitest';
import type { RuntimeModuleStatus } from './runtimeModuleTypes';
import {
  actualStateLabel,
  eventTypeLabel,
  mergeRuntimeModuleStatuses,
  moduleDomain,
} from './runtimeModuleView';

function status(overrides: Partial<RuntimeModuleStatus> = {}): RuntimeModuleStatus {
  return {
    module_id: 'ciba',
    description: 'CIBA',
    desired_state: 'enabled',
    resolved_enabled: true,
    actual_state: 'enabled',
    revision: 7,
    transition_revision: 7,
    applied_revision: 7,
    dependencies: [],
    dependents: [],
    allowed_actions: ['inherit', 'disable'],
    disable_policy: 'drain_stored_transactions:300s',
    drain_deadline: null,
    failure_code: null,
    updated_at: '2026-07-13T08:00:00Z',
    ...overrides,
  };
}

describe('runtime module view model', () => {
  it('maps transition, drain, and failure states without treating them as complete', () => {
    expect(actualStateLabel('starting')).toBe('Starting — transition pending');
    expect(actualStateLabel('draining')).toBe('Draining — new work rejected');
    expect(actualStateLabel('failed')).toBe('Failed');
  });

  it('keeps cross-domain modules outside the auth extension ownership label', () => {
    expect(moduleDomain('scim')).toBe('Identity provisioning');
    expect(moduleDomain('native_sso')).toBe('Session and SSO');
    expect(moduleDomain('session_management')).toBe('Session and SSO');
    expect(moduleDomain('frontchannel_logout')).toBe('Session and SSO');
    expect(moduleDomain('http_message_signatures')).toBe('Cross-cutting security');
    expect(moduleDomain('ciba')).toBe('OAuth and OIDC extensions');
    expect(moduleDomain('future_module')).toBe('Unclassified');
  });

  it('does not let a stale concurrent response roll a module revision back', () => {
    const current = status({ revision: 8, actual_state: 'starting', applied_revision: 7 });
    const stale = status({ revision: 7, actual_state: 'enabled', applied_revision: 7 });
    expect(mergeRuntimeModuleStatuses([current], [stale])).toEqual([current]);

    const completed = status({ revision: 8, actual_state: 'enabled', applied_revision: 8 });
    expect(mergeRuntimeModuleStatuses([current], [completed])).toEqual([completed]);

    const newerView = status({
      revision: 8,
      actual_state: 'enabled',
      applied_revision: 8,
      updated_at: '2026-07-13T08:00:02Z',
    });
    const delayedOlderView = status({
      revision: 8,
      actual_state: 'starting',
      applied_revision: 7,
      updated_at: '2026-07-13T08:00:01Z',
    });
    expect(mergeRuntimeModuleStatuses([newerView], [delayedOlderView])).toEqual([newerView]);
  });

  it('renders stale-transition audit outcomes explicitly', () => {
    expect(eventTypeLabel('stale_transition_discarded')).toBe('Stale transition discarded');
  });
});
