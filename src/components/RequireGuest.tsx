import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { resolveSafeNextFromSearch } from '../auth/next';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n';

export default function RequireGuest({ children }: { children: ReactNode }) {
  const { user, loading, sessionChecked, sessionError, refreshSession } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  useEffect(() => {
    if (!user && !sessionChecked && !sessionError) void refreshSession();
  }, [user, sessionChecked, sessionError, refreshSession]);

  if (!user && sessionError) {
    return <div className="container" style={{ padding: '64px 16px', textAlign: 'center' }}>
      <p>{t('consent.accountCheckFailed')}</p>
      <button type="button" onClick={() => void refreshSession()}>{t('consent.retryAccountCheck')}</button>
    </div>;
  }

  if (loading || (!user && !sessionChecked)) {
    return (
      <div className="container" style={{ padding: '64px 16px', textAlign: 'center' }}>
        {t('common.checkingSession')}
      </div>
    );
  }

  if (user) {
    const next = resolveSafeNextFromSearch(location.search);
    return <Navigate to={next ?? '/profile'} replace />;
  }

  return <>{children}</>;
}
