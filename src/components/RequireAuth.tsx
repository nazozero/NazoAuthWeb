import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { buildAuthRedirectWithNext, buildCurrentPath } from '../auth/next';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, sessionChecked } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (loading || (!user && !sessionChecked)) {
    return (
      <div className="container" style={{ padding: '64px 16px', textAlign: 'center' }}>
        {t('common.checkingSession')}
      </div>
    );
  }

  if (!user) {
    return <Navigate to={buildAuthRedirectWithNext(buildCurrentPath(location))} replace />;
  }

  return <>{children}</>;
}
