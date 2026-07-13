import { ApiError } from '../../lib/api';
import type {
  RuntimeActualState,
  RuntimeModuleEvent,
  RuntimeModuleStatus,
} from './runtimeModuleTypes';

export type RuntimeModuleDomain =
  | 'OAuth and OIDC extensions'
  | 'Identity provisioning'
  | 'Session and SSO'
  | 'Cross-cutting security'
  | 'Unclassified';

const DOMAIN_BY_MODULE: Record<string, RuntimeModuleDomain> = {
  device_authorization: 'OAuth and OIDC extensions',
  token_exchange: 'OAuth and OIDC extensions',
  jwt_bearer_grant: 'OAuth and OIDC extensions',
  ciba: 'OAuth and OIDC extensions',
  dynamic_client_registration: 'OAuth and OIDC extensions',
  request_objects: 'OAuth and OIDC extensions',
  jarm: 'OAuth and OIDC extensions',
  authorization_details: 'OAuth and OIDC extensions',
  frontchannel_logout: 'Session and SSO',
  session_management: 'Session and SSO',
  native_sso: 'Session and SSO',
  scim: 'Identity provisioning',
  http_message_signatures: 'Cross-cutting security',
};

export function moduleDomain(moduleId: string): RuntimeModuleDomain {
  return DOMAIN_BY_MODULE[moduleId] ?? 'Unclassified';
}

export function actualStateLabel(state: RuntimeActualState): string {
  switch (state) {
    case 'disabled':
      return 'Disabled';
    case 'starting':
      return 'Starting — transition pending';
    case 'enabled':
      return 'Enabled';
    case 'draining':
      return 'Draining — new work rejected';
    case 'failed':
      return 'Failed';
  }
}

export function eventTypeLabel(eventType: RuntimeModuleEvent['event_type']): string {
  switch (eventType) {
    case 'desired_state_changed':
      return 'Desired state changed';
    case 'transition_started':
      return 'Transition started';
    case 'transition_completed':
      return 'Transition completed';
    case 'transition_failed':
      return 'Transition failed';
    case 'drain_started':
      return 'Drain started';
    case 'drain_completed':
      return 'Drain completed';
    case 'stale_transition_discarded':
      return 'Stale transition discarded';
    default:
      return eventType;
  }
}

export function mergeRuntimeModuleStatuses(
  current: RuntimeModuleStatus[],
  incoming: RuntimeModuleStatus[]
): RuntimeModuleStatus[] {
  const currentById = new Map(current.map((module) => [module.module_id, module]));
  return incoming.map((module) => {
    const previous = currentById.get(module.module_id);
    if (!previous || previous.revision < module.revision) {
      return module;
    }
    if (previous.revision > module.revision) {
      return previous;
    }
    const previousUpdatedAt = Date.parse(previous.updated_at);
    const incomingUpdatedAt = Date.parse(module.updated_at);
    return Number.isFinite(previousUpdatedAt) && previousUpdatedAt > incomingUpdatedAt
      ? previous
      : module;
  });
}

export function mfaStepUpFailureMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : 'MFA verification failed.';
  }
  switch (error.status) {
    case 401:
      return 'Your session expired. Sign in again before changing runtime modules.';
    case 404:
      return 'MFA step-up is not available on this server version. No module change was replayed.';
    case 409:
      return 'The MFA session changed concurrently. Refresh your session and try again.';
    case 429:
      return 'Too many MFA attempts. Wait for the server retry window before trying again.';
    default:
      return error.message;
  }
}
