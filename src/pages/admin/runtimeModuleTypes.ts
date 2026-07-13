export type RuntimeDesiredMode = 'inherit' | 'enabled' | 'disabled';
export type RuntimeActualState = 'disabled' | 'starting' | 'enabled' | 'draining' | 'failed';

export interface RuntimeModuleStatus {
  module_id: string;
  description: string;
  desired_state: RuntimeDesiredMode;
  resolved_enabled: boolean;
  actual_state: RuntimeActualState;
  revision: number;
  transition_revision: number | null;
  applied_revision: number | null;
  dependencies: string[];
  dependents: string[];
  allowed_actions: RuntimeDesiredMode[];
  disable_policy: string;
  drain_deadline: string | null;
  failure_code: string | null;
  updated_at: string;
}

export interface RuntimeModuleListResponse {
  items: RuntimeModuleStatus[];
}

export interface RuntimeModuleEvent {
  event_id: string;
  module_id: string;
  event_type: string;
  instance_id: string | null;
  actor_id: string | null;
  reason: string | null;
  before_state: string | null;
  after_state: string | null;
  revision: number;
  outcome_code: string | null;
  created_at: string;
}

export interface RuntimeModuleEventListResponse {
  total: number;
  page: number;
  page_size: number;
  items: RuntimeModuleEvent[];
}

export interface AcceptedRuntimeModuleChange {
  module_id: string;
  desired_state: RuntimeDesiredMode;
  revision: number;
  actual_state: RuntimeActualState;
  status_url: string;
}
