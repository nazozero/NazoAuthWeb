import { useI18n } from '../../i18n';
import type { ClientFormModel } from './clientFormModel';
export default function ClientFormFields({
  form,
  onChange,
  includeActive = false,
}: {
  form: ClientFormModel;
  onChange: (form: ClientFormModel) => void;
  includeActive?: boolean;
}) {
  const { t } = useI18n();
  const text = (
    field: 'redirectUris' | 'scopes' | 'allowedAudiences' | 'grantTypes',
    value: string
  ) =>
    onChange({
      ...form,
      [field]: value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    });
  return (
    <div className="admin-form">
      <label>
        {t('admin.ui.clientName')}
        <input
          aria-label={t('admin.ui.clientName')}
          value={form.clientName}
          onChange={(e) => onChange({ ...form, clientName: e.target.value })}
        />
      </label>
      <label>
        {t('admin.ui.clientType')}
        <select
          value={form.clientType}
          onChange={(e) =>
            onChange({
              ...form,
              clientType: e.target.value as ClientFormModel['clientType'],
            })
          }
        >
          <option value="public">public</option>
          <option value="confidential">confidential</option>
        </select>
      </label>
      <label>
        token_endpoint_auth_method
        <select
          value={
            form.clientType === 'public' ? 'none' : form.tokenEndpointAuthMethod
          }
          disabled={form.clientType === 'public'}
          onChange={(e) =>
            onChange({
              ...form,
              tokenEndpointAuthMethod: e.target
                .value as ClientFormModel['tokenEndpointAuthMethod'],
            })
          }
        >
          <option value="none">none</option>
          <option value="client_secret_basic">client_secret_basic</option>
          <option value="client_secret_post">client_secret_post</option>
        </select>
      </label>
      <label>
        {t('admin.ui.redirectUris')}
        <textarea
          aria-label={t('admin.ui.redirectUris')}
          value={form.redirectUris.join('\n')}
          onChange={(e) => text('redirectUris', e.target.value)}
        />
      </label>
      <label>
        {t('admin.ui.scopes')}
        <textarea
          aria-label={t('admin.ui.scopes')}
          value={form.scopes.join('\n')}
          onChange={(e) => text('scopes', e.target.value)}
        />
      </label>
      <label>
        {t('admin.ui.allowedAudiences')}
        <textarea
          aria-label={t('admin.ui.allowedAudiences')}
          value={form.allowedAudiences.join('\n')}
          onChange={(e) => text('allowedAudiences', e.target.value)}
        />
      </label>
      <label>
        {t('admin.ui.grantTypes')}
        <textarea
          aria-label={t('admin.ui.grantTypes')}
          value={form.grantTypes.join('\n')}
          onChange={(e) => text('grantTypes', e.target.value)}
        />
      </label>
      {includeActive && (
        <label>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
          />
          {t('admin.ui.active')}
        </label>
      )}
    </div>
  );
}
