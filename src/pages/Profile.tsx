import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AppWindow,
  EyeOff,
  FileClock,
  LogOut,
  PlusCircle,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n';
import { ApiError, apiFetch } from '../lib/api';
import { resolveAvatarUrl } from '../lib/avatar';
import {
  alertVariants,
  contentSwitchVariants,
  pageVariants,
  revealContainerVariants,
  revealItemVariants,
} from '../lib/motion';
import type {
  AuthorizedApp,
  AuthorizedAppsResponse,
  AuthUser,
  AvatarUploadCapability,
  AvatarUploadInitiation,
  AvatarUploadMode,
  ClientAccessRequestItem,
  ClientAccessRequestListResponse,
  ClientCredentialDeliveryResponse,
} from '../types/auth';
import {
  ClientAccessRequestStatus,
  clientAccessRequestStatusMeta,
} from '../types/auth';
import './Profile.css';

type ProfileTab = 'profile' | 'apps' | 'access-requests';

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-US', { hour12: false });
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function normalizeTab(value: string | null): ProfileTab {
  if (value === 'apps' || value === 'access-requests') {
    return value;
  }
  return 'profile';
}

export default function Profile() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, logout } = useAuth();
  const pageActive = useRef(false);
  useEffect(() => {
    pageActive.current = true;
    return () => { pageActive.current = false; };
  }, []);

  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [apps, setApps] = useState<AuthorizedApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [avatarUploadMode, setAvatarUploadMode] =
    useState<AvatarUploadMode | null>(null);
  const [avatarCapabilityError, setAvatarCapabilityError] = useState('');

  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [requests, setRequests] = useState<ClientAccessRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestErrorMsg, setRequestErrorMsg] = useState('');
  const [requestSuccessMsg, setRequestSuccessMsg] = useState('');

  const [deliveryResult, setDeliveryResult] =
    useState<ClientCredentialDeliveryResponse | null>(null);
  const [deliveryErrorMsg, setDeliveryErrorMsg] = useState('');
  const [claimingDeliveryRequestId, setClaimingDeliveryRequestId] =
    useState('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const activeTab = useMemo(
    () => normalizeTab(searchParams.get('tab')),
    [searchParams]
  );

  const pendingRequest = useMemo(
    () =>
      requests.find(
        (item) => item.status === ClientAccessRequestStatus.Pending
      ) ?? null,
    [requests]
  );

  useEffect(() => {
    setDisplayName(user?.display_name ?? '');
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();

    const loadAvatarUploadCapability = async () => {
      try {
        const capability = await apiFetch<AvatarUploadCapability>(
          '/auth/me/avatar/uploads', { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          setAvatarUploadMode(capability.upload_mode);
          setAvatarCapabilityError('');
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
          navigate('/auth', { replace: true });
          return;
        }
        setAvatarCapabilityError(
          'Avatar storage availability could not be loaded. Try again later.'
        );
      }
    };

    void loadAvatarUploadCapability();
    return () => {
      controller.abort();
    };
  }, [setUser, navigate]);

  const updateTab = useCallback(
    (tab: ProfileTab) => {
      if (tab === activeTab) {
        return;
      }
      const nextParams = new URLSearchParams(location.search);
      if (tab === 'profile') {
        nextParams.delete('tab');
      } else {
        nextParams.set('tab', tab);
      }
      const search = nextParams.toString();
      navigate(
        { pathname: '/profile', search: search ? `?${search}` : '' },
        { replace: true }
      );
    },
    [activeTab, location.search, navigate]
  );

  useEffect(() => {
    if (activeTab === 'profile') return;
    const controller = new AbortController();
    const { signal } = controller;
    const setLoading = activeTab === 'apps' ? setLoadingApps : setLoadingRequests;
    const setError = activeTab === 'apps' ? setProfileErrorMsg : setRequestErrorMsg;
    setLoading(true);
    const load = async () => {
      try {
        if (activeTab === 'apps') {
          const response = await apiFetch<AuthorizedAppsResponse>('/auth/me/applications', { signal });
          if (!signal.aborted) setApps(response.items);
        } else {
          const response = await apiFetch<ClientAccessRequestListResponse>('/auth/me/access-requests', { signal });
          if (!signal.aborted) setRequests(response.items);
        }
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
          navigate('/auth', { replace: true });
          return;
        }
        setError(resolveErrorMessage(error, activeTab === 'apps'
          ? 'Could not load authorized apps' : 'Could not load access requests'));
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [activeTab, setUser, navigate]);

  const avatarPreview = useMemo(
    () => resolveAvatarUrl(user?.avatar_url),
    [user?.avatar_url]
  );

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      return;
    }
    setProfileErrorMsg('');
    setProfileSuccessMsg('');

    const normalizedDisplayName = displayName.trim();
    const payload: Record<string, string | null> = {};

    if (normalizedDisplayName !== (user.display_name ?? '')) {
      payload.display_name = normalizedDisplayName || null;
    }
    if (Object.keys(payload).length === 0 && !avatarFile) {
      setProfileSuccessMsg('No profile changes.');
      return;
    }

    setSavingProfile(true);
    try {
      let latestUser = user;
      if (Object.keys(payload).length > 0) {
        latestUser = await apiFetch<AuthUser>('/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!pageActive.current) return;
      }
      if (avatarFile) {
        if (avatarUploadMode === 'multipart') {
          const formData = new FormData();
          formData.append('avatar', avatarFile);
          latestUser = await apiFetch<AuthUser>('/auth/me/avatar', {
            method: 'POST',
            body: formData,
          });
        } else if (avatarUploadMode === 'direct') {
          const initiated = await apiFetch<AvatarUploadInitiation>(
            '/auth/me/avatar/uploads',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content_length: avatarFile.size }),
            }
          );
          if (!pageActive.current) return;
          const uploadResponse = await fetch(initiated.upload.url, {
            method: initiated.upload.method,
            headers: initiated.upload.headers,
            body: avatarFile,
            credentials: 'omit',
          });
          if (!pageActive.current) return;
          if (!uploadResponse.ok) {
            throw new Error('Avatar file upload failed.');
          }
          latestUser = await apiFetch<AuthUser>(
            `/auth/me/avatar/uploads/${encodeURIComponent(initiated.upload_id)}/complete`,
            { method: 'POST' }
          );
        } else {
          throw new Error(
            'Avatar storage is unavailable for this tenant. Contact the system administrator.'
          );
        }
        setAvatarFile(null);
        if (avatarInputRef.current) {
          avatarInputRef.current.value = '';
        }
      }
      if (!pageActive.current) return;
      setUser(latestUser);
      setProfileSuccessMsg('Profile updated.');
    } catch (error) {
      if (!pageActive.current) return;
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        navigate('/auth', { replace: true });
        return;
      }
      setProfileErrorMsg(
        resolveErrorMessage(error, 'Could not update profile')
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (
      !user ||
      (avatarUploadMode !== 'multipart' && avatarUploadMode !== 'direct')
    ) {
      return;
    }
    setProfileErrorMsg('');
    setProfileSuccessMsg('');
    setSavingProfile(true);
    try {
      const updatedUser = await apiFetch<AuthUser>('/auth/me/avatar', {
        method: 'DELETE',
      });
      if (!pageActive.current) return;
      setUser(updatedUser);
      setAvatarFile(null);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      setProfileSuccessMsg('Avatar reset to default.');
    } catch (error) {
      if (!pageActive.current) return;
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        navigate('/auth', { replace: true });
        return;
      }
      setProfileErrorMsg(resolveErrorMessage(error, 'Could not remove avatar'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitAccessRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      return;
    }
    setRequestErrorMsg('');
    setRequestSuccessMsg('');

    const normalizedName = siteName.trim();
    const normalizedUrl = siteUrl.trim();
    const normalizedDescription = requestDescription.trim();

    if (!normalizedName || !normalizedUrl || !normalizedDescription) {
      setRequestErrorMsg('Enter the site name, URL, and request description.');
      return;
    }
    if (pendingRequest) {
      setRequestErrorMsg(
        'You already have a pending request. Wait for review before submitting another one.'
      );
      return;
    }

    setSubmittingRequest(true);
    try {
      const created = await apiFetch<ClientAccessRequestItem>('/auth/me/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: normalizedName,
          site_url: normalizedUrl,
          request_description: normalizedDescription,
        }),
      });
      if (!pageActive.current) return;
      setRequestSuccessMsg('Request submitted. Waiting for admin review.');
      setSiteName('');
      setSiteUrl('');
      setRequestDescription('');
      setRequests((current) => [created, ...current]);
    } catch (error) {
      if (!pageActive.current) return;
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        navigate('/auth', { replace: true });
        return;
      }
      setRequestErrorMsg(
        resolveErrorMessage(error, 'Could not submit the request')
      );
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleClaimDelivery = async (request: ClientAccessRequestItem) => {
    if (!request.delivery_available || claimingDeliveryRequestId) {
      return;
    }
    setDeliveryErrorMsg('');
    setDeliveryResult(null);
    setClaimingDeliveryRequestId(request.id);
    try {
      const response = await apiFetch<ClientCredentialDeliveryResponse>(
        '/auth/me/access-delivery',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: request.id }),
        }
      );
      if (!pageActive.current) return;
      setDeliveryResult(response);
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id ? { ...item, delivery_available: false } : item
        )
      );
    } catch (error) {
      if (!pageActive.current) return;
      setDeliveryErrorMsg(
        resolveErrorMessage(error, 'Could not read one-time credentials')
      );
    } finally {
      setClaimingDeliveryRequestId('');
    }
  };

  const handleLogout = async () => {
    pageActive.current = false;
    await logout();
    navigate('/auth', { replace: true });
  };

  if (!user) {
    return null;
  }

  return (
    <motion.div
      className="page-transition-wrap profile-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="container profile-container">
        <header className="workspace-heading">
          <p className="eyebrow">{t('profile.eyebrow')}</p>
          <h1>{t('profile.welcome')}</h1>
          <p>{t('profile.intro')}</p>
        </header>
        <motion.section className="profile-overview glass" layout>
          <img
            src={avatarPreview}
            alt="User avatar"
            className="profile-avatar"
          />
          <div className="profile-overview-main">
            <h2>{user.display_name || t('profile.unnamed')}</h2>
            <p>{user.email}</p>
          </div>
          <div className="profile-stats">
            <span>{t('profile.apps')}</span>
            <strong>{user.authorized_app_count}</strong>
          </div>
        </motion.section>

        <motion.nav className="profile-tabs" layout>
          <motion.button
            layout
            type="button"
            className={activeTab === 'profile' ? 'active' : ''}
            aria-pressed={activeTab === 'profile'}
            onClick={() => updateTab('profile')}
            whileTap={{ scale: 0.98 }}
          >
            <UserRound size={16} />
            <span>{t('profile.tab')}</span>
          </motion.button>
          <motion.button
            layout
            type="button"
            className={activeTab === 'apps' ? 'active' : ''}
            aria-pressed={activeTab === 'apps'}
            onClick={() => updateTab('apps')}
            whileTap={{ scale: 0.98 }}
          >
            <AppWindow size={16} />
            <span>{t('profile.apps')}</span>
          </motion.button>
          <motion.button
            layout
            type="button"
            className={activeTab === 'access-requests' ? 'active' : ''}
            aria-pressed={activeTab === 'access-requests'}
            onClick={() => updateTab('access-requests')}
            whileTap={{ scale: 0.98 }}
          >
            <FileClock size={16} />
            <span>{t('profile.requests')}</span>
          </motion.button>
        </motion.nav>

        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.section
              key="tab-profile"
              variants={contentSwitchVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              className="profile-card glass"
            >
              <h2>
                <UserRound size={18} />
                <span>{t('profile.tab')}</span>
              </h2>
              <form onSubmit={handleSaveProfile} className="profile-form">
                <label htmlFor="display_name">{t('profile.name')}</label>
                <input
                  id="display_name"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={80}
                  placeholder="Enter your display name"
                />

                <label htmlFor="avatar_file">{t('profile.avatar')}</label>
                <input
                  ref={avatarInputRef}
                  id="avatar_file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={
                    avatarUploadMode !== 'multipart' &&
                    avatarUploadMode !== 'direct'
                  }
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setAvatarFile(file);
                  }}
                />
                <p className="profile-form-hint">
                  {avatarUploadMode === 'disabled'
                    ? t(
                        'account.ui.avatarStorageIsUnavailableForThisTenantContactTheSystemAdministrator'
                      )
                    : avatarCapabilityError || avatarUploadMode === null
                      ? avatarCapabilityError ||
                        'Checking avatar storage availability...'
                      : `PNG, JPEG, or WEBP only, up to 2MB.${avatarFile ? ` Selected: ${avatarFile.name}` : ''}`}
                </p>

                <AnimatePresence initial={false}>
                  {profileErrorMsg && (
                    <motion.div
                      className="profile-alert error"
                      variants={alertVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {profileErrorMsg}
                    </motion.div>
                  )}
                  {profileSuccessMsg && (
                    <motion.div
                      className="profile-alert success"
                      variants={alertVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {profileSuccessMsg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={savingProfile}
                  >
                    {avatarFile ? <Upload size={16} /> : <Save size={16} />}
                    <span>
                      {savingProfile
                        ? t('profile.saving')
                        : avatarFile
                          ? t('profile.saveUpload')
                          : t('profile.save')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={
                      savingProfile ||
                      !user.avatar_url ||
                      (avatarUploadMode !== 'multipart' &&
                        avatarUploadMode !== 'direct')
                    }
                    onClick={() => {
                      void handleRemoveAvatar();
                    }}
                  >
                    <Trash2 size={16} />
                    <span>{t('profile.resetAvatar')}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>{t('nav.signOut')}</span>
                  </button>
                </div>
              </form>
            </motion.section>
          )}

          {activeTab === 'apps' && (
            <motion.section
              key="tab-apps"
              variants={contentSwitchVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              className="profile-card glass"
            >
              <h2>
                <AppWindow size={18} />
                <span>{t('profile.apps')}</span>
              </h2>

              <AnimatePresence mode="wait" initial={false}>
                {loadingApps ? (
                  <motion.div
                    key="apps-loading"
                    className="profile-placeholder"
                    variants={contentSwitchVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {t('account.ui.loadingAuthorizedApps')}
                  </motion.div>
                ) : apps.length === 0 ? (
                  <motion.div
                    key="apps-empty"
                    className="profile-placeholder"
                    variants={contentSwitchVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {t('profile.emptyApps')}
                  </motion.div>
                ) : (
                  <motion.ul
                    key="apps-list"
                    className="authorized-list"
                    variants={revealContainerVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    layout
                  >
                    {apps.map((item) => (
                      <motion.li
                        key={item.client_id}
                        variants={revealItemVariants}
                        layout
                      >
                        <div className="authorized-item-top">
                          <strong>{item.client_name}</strong>
                          <span>
                            {item.authorization_count} {t('account.ui.times')}
                          </span>
                        </div>
                        <p>
                          {t('account.ui.clientId')} {item.client_id}
                        </p>
                        <p>
                          {t('account.ui.lastAuthorized')}{' '}
                          {formatDateTime(item.last_authorized_at)}
                        </p>
                        <p>
                          {t('account.ui.scope')}{' '}
                          {item.last_scopes.join(' ') || 'none'}
                        </p>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.section>
          )}

          {activeTab === 'access-requests' && (
            <motion.section
              key="tab-requests"
              variants={contentSwitchVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              className="profile-grid"
            >
              <motion.article className="profile-card glass" layout>
                <h2>
                  <PlusCircle size={18} />
                  <span>{t('profile.requestTitle')}</span>
                </h2>

                <AnimatePresence initial={false}>
                  {pendingRequest && (
                    <motion.div
                      className="profile-alert warning"
                      variants={alertVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {t(
                        'account.ui.youHaveOnePendingRequestWaitForAdminReviewBeforeSubmittingAnotherOne'
                      )}
                    </motion.div>
                  )}
                  {requestErrorMsg && (
                    <motion.div
                      className="profile-alert error"
                      variants={alertVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {requestErrorMsg}
                    </motion.div>
                  )}
                  {requestSuccessMsg && (
                    <motion.div
                      className="profile-alert success"
                      variants={alertVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {requestSuccessMsg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form
                  className="profile-form"
                  onSubmit={handleSubmitAccessRequest}
                >
                  <label htmlFor="request_site_name">
                    {t('profile.siteName')}
                  </label>
                  <input
                    id="request_site_name"
                    type="text"
                    value={siteName}
                    onChange={(event) => setSiteName(event.target.value)}
                    maxLength={120}
                    placeholder="Example: Nazo Docs"
                    disabled={Boolean(pendingRequest)}
                  />

                  <label htmlFor="request_site_url">
                    {t('profile.siteUrl')}
                  </label>
                  <input
                    id="request_site_url"
                    type="url"
                    value={siteUrl}
                    onChange={(event) => setSiteUrl(event.target.value)}
                    placeholder="https://example.com/callback"
                    disabled={Boolean(pendingRequest)}
                  />

                  <label htmlFor="request_description">
                    {t('profile.description')}
                  </label>
                  <textarea
                    id="request_description"
                    value={requestDescription}
                    onChange={(event) =>
                      setRequestDescription(event.target.value)
                    }
                    placeholder="Describe usage, callback flow, and expected scopes."
                    maxLength={2000}
                    rows={5}
                    disabled={Boolean(pendingRequest)}
                  />

                  <div className="profile-form-actions">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={loadingRequests || submittingRequest || Boolean(pendingRequest)}
                    >
                      <PlusCircle size={16} />
                      <span>
                        {submittingRequest
                          ? t('account.ui.submitting')
                          : t('account.ui.submitRequest')}
                      </span>
                    </button>
                  </div>
                </form>
              </motion.article>

              <motion.article className="profile-card glass" layout>
                <h2>
                  <FileClock size={18} />
                  <span>{t('profile.history')}</span>
                </h2>

                <AnimatePresence initial={false}>
                  {deliveryErrorMsg && (
                    <motion.div
                      className="profile-alert error"
                      variants={alertVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {deliveryErrorMsg}
                    </motion.div>
                  )}
                  {deliveryResult && (
                    <motion.div
                      className="delivery-card"
                      variants={contentSwitchVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      layout
                    >
                      <div className="delivery-card-head">
                        <ShieldAlert size={16} />
                        <strong>{t('profile.delivery')}</strong>
                      </div>
                      <p>{deliveryResult.read_once_notice}</p>
                      <p>
                        {t('account.ui.clientId')} {deliveryResult.client_id}
                      </p>
                      <p>
                        {t('account.ui.clientName')}{' '}
                        {deliveryResult.client_name}
                      </p>
                      <p>
                        {t('account.ui.clientType')}{' '}
                        {deliveryResult.client_type}
                      </p>
                      <p>
                        {t('account.ui.authMethod')}{' '}
                        {deliveryResult.token_endpoint_auth_method}
                      </p>
                      <p>
                        {t('account.ui.redirectUris')}{' '}
                        {deliveryResult.redirect_uris.join(', ') || '-'}
                      </p>
                      <p>
                        {t('account.ui.scopes')}{' '}
                        {deliveryResult.scopes.join(' ') || '-'}
                      </p>
                      <p>
                        {t('account.ui.grantTypes')}{' '}
                        {deliveryResult.grant_types.join(' ') || '-'}
                      </p>
                      <p>
                        {t('account.ui.clientSecret')}{' '}
                        {deliveryResult.client_secret
                          ? deliveryResult.client_secret
                          : t('account.ui.noSecretForPublicClients')}
                      </p>
                      <p>
                        {t('account.ui.deliveryExpires')}{' '}
                        {formatDateTime(deliveryResult.expires_at)}
                      </p>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setDeliveryResult(null)}
                      >
                        <EyeOff size={16} />
                        <span>{t('profile.hide')}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait" initial={false}>
                  {loadingRequests ? (
                    <motion.div
                      key="requests-loading"
                      className="profile-placeholder"
                      variants={contentSwitchVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {t('account.ui.loadingRequestHistory')}
                    </motion.div>
                  ) : requests.length === 0 ? (
                    <motion.div
                      key="requests-empty"
                      className="profile-placeholder"
                      variants={contentSwitchVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {t('profile.emptyRequests')}
                    </motion.div>
                  ) : (
                    <motion.ul
                      key="requests-list"
                      className="request-list"
                      variants={revealContainerVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      layout
                    >
                      {requests.map((item) => (
                        <motion.li
                          key={item.id}
                          variants={revealItemVariants}
                          layout
                        >
                          <div className="request-item-top">
                            <strong>{item.site_name}</strong>
                            <span
                              className={`request-status ${clientAccessRequestStatusMeta[item.status].className}`}
                            >
                              {clientAccessRequestStatusMeta[item.status].label}
                            </span>
                          </div>
                          <p>
                            {t('account.ui.url')} {item.site_url}
                          </p>
                          <p>
                            {t('account.ui.description')}{' '}
                            {item.request_description}
                          </p>
                          <p>
                            {t('account.ui.submitted')}{' '}
                            {formatDateTime(item.created_at)}
                          </p>
                          {item.resolved_at && (
                            <p>
                              {t('account.ui.resolved')}{' '}
                              {formatDateTime(item.resolved_at)}
                            </p>
                          )}
                          {item.admin_note && (
                            <p>
                              {t('account.ui.adminNote')} {item.admin_note}
                            </p>
                          )}
                          {item.delivery_available && (
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={Boolean(claimingDeliveryRequestId)}
                              onClick={() => void handleClaimDelivery(item)}
                            >
                              <ShieldAlert size={16} />
                              <span>
                                {claimingDeliveryRequestId === item.id
                                  ? t('account.ui.retrieving')
                                  : t('account.ui.revealOneTimeCredentials')}
                              </span>
                            </button>
                          )}
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.article>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
