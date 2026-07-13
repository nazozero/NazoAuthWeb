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
  FileClock,
  LogOut,
  PlusCircle,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ApiError, apiFetch } from '../lib/api';
import { resolveAvatarUrl } from '../lib/avatar';
import { accessRequestDeliveryPath } from '../lib/accessDelivery';
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

function AccessRequestDeliveryLink({ item }: { item: ClientAccessRequestItem }) {
  const path = accessRequestDeliveryPath(item.status, item.delivery_token);
  if (!path) {
    return null;
  }
  return (
    <Link className="btn-secondary" to={path}>
      Read one-time credentials
    </Link>
  );
}

function normalizeTab(value: string | null): ProfileTab {
  if (value === 'apps' || value === 'access-requests') {
    return value;
  }
  return 'profile';
}

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, logout } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [apps, setApps] = useState<AuthorizedApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

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
  const consumedDeliveryTokenRef = useRef<string>('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const deliveryTokenFromUrl = searchParams.get('delivery_token') ?? '';
  const activeTab = useMemo(
    () => normalizeTab(searchParams.get('tab')),
    [searchParams]
  );

  const pendingRequest = useMemo(
    () => requests.find((item) => item.status === ClientAccessRequestStatus.Pending) ?? null,
    [requests]
  );

  useEffect(() => {
    setDisplayName(user?.display_name ?? '');
  }, [user]);

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

  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const response = await apiFetch<AuthorizedAppsResponse>('/auth/me/applications');
      setApps(response.items);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
        navigate('/auth', { replace: true });
        return;
      }
      setProfileErrorMsg(resolveErrorMessage(error, 'Could not load authorized apps'));
    } finally {
      setLoadingApps(false);
    }
  }, [logout, navigate]);

  const loadAccessRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const response = await apiFetch<ClientAccessRequestListResponse>(
        '/auth/me/access-requests'
      );
      setRequests(response.items);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
        navigate('/auth', { replace: true });
        return;
      }
      setRequestErrorMsg(resolveErrorMessage(error, 'Could not load access requests'));
    } finally {
      setLoadingRequests(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    if (activeTab === 'apps') {
      void loadApplications();
      return;
    }
    if (activeTab === 'access-requests') {
      void loadAccessRequests();
    }
  }, [activeTab, loadAccessRequests, loadApplications]);

  useEffect(() => {
    if (!user || !deliveryTokenFromUrl) {
      return;
    }
    if (consumedDeliveryTokenRef.current === deliveryTokenFromUrl) {
      return;
    }
    consumedDeliveryTokenRef.current = deliveryTokenFromUrl;
    setDeliveryErrorMsg('');

    void (async () => {
      try {
        const response = await apiFetch<ClientCredentialDeliveryResponse>(
          `/auth/me/access-delivery?token=${encodeURIComponent(deliveryTokenFromUrl)}`
        );
        setDeliveryResult(response);
      } catch (error) {
        setDeliveryErrorMsg(resolveErrorMessage(error, 'Could not read one-time credentials'));
      } finally {
        const nextParams = new URLSearchParams(location.search);
        nextParams.delete('delivery_token');
        if (nextParams.get('tab') !== 'access-requests') {
          nextParams.set('tab', 'access-requests');
        }
        const search = nextParams.toString();
        const nextSearch = search ? `?${search}` : '';
        if (nextSearch !== location.search) {
          navigate(
            { pathname: '/profile', search: nextSearch },
            { replace: true }
          );
        }
      }
    })();
  }, [deliveryTokenFromUrl, location.search, navigate, user]);

  const avatarPreview = useMemo(() => resolveAvatarUrl(user?.avatar_url), [user?.avatar_url]);

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
      }
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        latestUser = await apiFetch<AuthUser>('/auth/me/avatar', {
          method: 'POST',
          body: formData,
        });
        setAvatarFile(null);
        if (avatarInputRef.current) {
          avatarInputRef.current.value = '';
        }
      }
      setUser(latestUser);
      setProfileSuccessMsg('Profile updated.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
        navigate('/auth', { replace: true });
        return;
      }
      setProfileErrorMsg(resolveErrorMessage(error, 'Could not update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) {
      return;
    }
    setProfileErrorMsg('');
    setProfileSuccessMsg('');
    setSavingProfile(true);
    try {
      const updatedUser = await apiFetch<AuthUser>('/auth/me/avatar', {
        method: 'DELETE',
      });
      setUser(updatedUser);
      setAvatarFile(null);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      setProfileSuccessMsg('Avatar reset to default.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
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
      setRequestErrorMsg('You already have a pending request. Wait for review before submitting another one.');
      return;
    }

    setSubmittingRequest(true);
    try {
      await apiFetch<ClientAccessRequestItem>('/auth/me/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: normalizedName,
          site_url: normalizedUrl,
          request_description: normalizedDescription,
        }),
      });
      setRequestSuccessMsg('Request submitted. Waiting for admin review.');
      setSiteName('');
      setSiteUrl('');
      setRequestDescription('');
      await loadAccessRequests();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await logout();
        navigate('/auth', { replace: true });
        return;
      }
      setRequestErrorMsg(resolveErrorMessage(error, 'Could not submit the request'));
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleLogout = async () => {
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
        <motion.section className="profile-overview glass" layout>
          <img src={avatarPreview} alt="User avatar" className="profile-avatar" />
          <div className="profile-overview-main">
            <h1>{user.display_name || 'Unnamed account'}</h1>
            <p>{user.email}</p>
          </div>
          <div className="profile-stats">
            <span>Authorized apps</span>
            <strong>{user.authorized_app_count}</strong>
          </div>
        </motion.section>

        <motion.nav className="profile-tabs" layout>
          <motion.button
            layout
            type="button"
            className={activeTab === 'profile' ? 'active' : ''}
            onClick={() => updateTab('profile')}
            whileTap={{ scale: 0.98 }}
          >
            <UserRound size={16} />
            <span>Profile</span>
          </motion.button>
          <motion.button
            layout
            type="button"
            className={activeTab === 'apps' ? 'active' : ''}
            onClick={() => updateTab('apps')}
            whileTap={{ scale: 0.98 }}
          >
            <AppWindow size={16} />
            <span>Authorized apps</span>
          </motion.button>
          <motion.button
            layout
            type="button"
            className={activeTab === 'access-requests' ? 'active' : ''}
            onClick={() => updateTab('access-requests')}
            whileTap={{ scale: 0.98 }}
          >
            <FileClock size={16} />
            <span>Access requests</span>
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
              <span>Profile</span>
            </h2>
            <form onSubmit={handleSaveProfile} className="profile-form">
              <label htmlFor="display_name">Display name</label>
              <input
                id="display_name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={80}
                placeholder="Enter your display name"
              />

              <label htmlFor="avatar_file">Upload avatar</label>
              <input
                ref={avatarInputRef}
                id="avatar_file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setAvatarFile(file);
                }}
              />
              <p className="profile-form-hint">
                PNG, JPEG, or WEBP only, up to 2MB.
                {avatarFile ? ` Selected: ${avatarFile.name}` : ''}
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
                <button type="submit" className="btn-primary" disabled={savingProfile}>
                  {avatarFile ? <Upload size={16} /> : <Save size={16} />}
                  <span>{savingProfile ? 'Saving...' : avatarFile ? 'Save and upload avatar' : 'Save profile'}</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={savingProfile || !user.avatar_url}
                  onClick={() => {
                    void handleRemoveAvatar();
                  }}
                >
                  <Trash2 size={16} />
                  <span>Reset avatar</span>
                </button>
                <button type="button" className="btn-secondary" onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>Sign out</span>
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
              <span>Authorized apps</span>
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
                  Loading authorized apps...
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
                  No authorization history yet.
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
                  <motion.li key={item.client_id} variants={revealItemVariants} layout>
                    <div className="authorized-item-top">
                      <strong>{item.client_name}</strong>
                      <span>{item.authorization_count} times</span>
                    </div>
                    <p>Client ID: {item.client_id}</p>
                    <p>Last authorized: {formatDateTime(item.last_authorized_at)}</p>
                    <p>Scope: {item.last_scopes.join(' ') || 'none'}</p>
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
                <span>Request application access</span>
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
                    You have one pending request. Wait for admin review before submitting another one.
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

              <form className="profile-form" onSubmit={handleSubmitAccessRequest}>
                <label htmlFor="request_site_name">Site name</label>
                <input
                  id="request_site_name"
                  type="text"
                  value={siteName}
                  onChange={(event) => setSiteName(event.target.value)}
                  maxLength={120}
                  placeholder="Example: Nazo Docs"
                  disabled={Boolean(pendingRequest)}
                />

                <label htmlFor="request_site_url">Site URL</label>
                <input
                  id="request_site_url"
                  type="url"
                  value={siteUrl}
                  onChange={(event) => setSiteUrl(event.target.value)}
                  placeholder="https://example.com/callback"
                  disabled={Boolean(pendingRequest)}
                />

                <label htmlFor="request_description">Request description</label>
                <textarea
                  id="request_description"
                  value={requestDescription}
                  onChange={(event) => setRequestDescription(event.target.value)}
                  placeholder="Describe usage, callback flow, and expected scopes."
                  maxLength={2000}
                  rows={5}
                  disabled={Boolean(pendingRequest)}
                />

                <div className="profile-form-actions">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submittingRequest || Boolean(pendingRequest)}
                  >
                    <PlusCircle size={16} />
                    <span>{submittingRequest ? 'Submitting...' : 'Submit request'}</span>
                  </button>
                </div>
              </form>
            </motion.article>

            <motion.article className="profile-card glass" layout>
              <h2>
                <FileClock size={18} />
                <span>Request history</span>
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
                    <strong>One-time credentials (read once)</strong>
                  </div>
                  <p>{deliveryResult.read_once_notice}</p>
                  <p>Client ID: {deliveryResult.client_id}</p>
                  <p>Client Name: {deliveryResult.client_name}</p>
                  <p>Client Type: {deliveryResult.client_type}</p>
                  <p>Auth Method: {deliveryResult.token_endpoint_auth_method}</p>
                  <p>Redirect URIs: {deliveryResult.redirect_uris.join(', ') || '-'}</p>
                  <p>Scopes: {deliveryResult.scopes.join(' ') || '-'}</p>
                  <p>Grant Types: {deliveryResult.grant_types.join(' ') || '-'}</p>
                  <p>
                    Client Secret:{' '}
                    {deliveryResult.client_secret ? deliveryResult.client_secret : 'No secret for public clients'}
                  </p>
                  <p>Link expires: {formatDateTime(deliveryResult.expires_at)}</p>
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
                  Loading request history...
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
                  No access requests yet.
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
                    <motion.li key={item.id} variants={revealItemVariants} layout>
                      <div className="request-item-top">
                        <strong>{item.site_name}</strong>
                        <span
                          className={`request-status ${clientAccessRequestStatusMeta[item.status].className}`}
                        >
                          {clientAccessRequestStatusMeta[item.status].label}
                        </span>
                      </div>
                      <p>URL: {item.site_url}</p>
                      <p>Description: {item.request_description}</p>
                      <p>Submitted: {formatDateTime(item.created_at)}</p>
                      {item.resolved_at && <p>Resolved: {formatDateTime(item.resolved_at)}</p>}
                      {item.admin_note && <p>Admin note: {item.admin_note}</p>}
                      <AccessRequestDeliveryLink item={item} />
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
