import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { AuthProvider } from './auth/AuthContext';
import Navbar from './components/Navbar';
import RequireAuth from './components/RequireAuth';
import RequireGuest from './components/RequireGuest';
import Footer from './components/Footer';
import ScrollBackdrop, { BrandStage } from './components/ScrollBackdrop';
import VerificationResult from './pages/VerificationResult';
import { I18nProvider, useI18n } from './i18n';
import { pageVariants } from './lib/motion';
import { canonicalVerificationResultPath } from './lib/verificationReceipt';
import './App.css';

const Home = lazy(() => import('./pages/Home'));
const Auth = lazy(() => import('./pages/Auth'));
const Security = lazy(() => import('./pages/Security'));
const Docs = lazy(() => import('./pages/Docs'));
const Contact = lazy(() => import('./pages/Contact'));
const Profile = lazy(() => import('./pages/Profile'));
const Consent = lazy(() => import('./pages/Consent'));
const Device = lazy(() => import('./pages/Device'));
const Ciba = lazy(() => import('./pages/Ciba'));
const Admin = lazy(() => import('./pages/admin/AdminPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RouteLoadingFallback() {
  const { t } = useI18n();

  return (
    <motion.div
      className="container"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ padding: '64px 16px', textAlign: 'center' }}
    >
      {t('common.loadingPage')}
    </motion.div>
  );
}

function MainRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/security" element={<Security />} />
          <Route
            path="/auth"
            element={
              <RequireGuest>
                <Auth />
              </RequireGuest>
            }
          />
          <Route path="/consent" element={<Consent />} />
          <Route
            path="/device"
            element={
              <RequireAuth>
                <Device />
              </RequireAuth>
            }
          />
          <Route
            path="/ciba/:authReqId"
            element={
              <RequireAuth>
                <Ciba />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route path="/docs" element={<Docs />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <Admin />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function AppShell() {
  const location = useLocation();
  const { locale } = useI18n();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  useEffect(() => {
    const titles: Record<string, [string, string]> = {
      '/': ['Self-hosted identity server', '自主部署的身份认证服务'],
      '/auth': ['Your account', '登录账户'],
      '/security': ['Security features', '安全功能'],
      '/docs': ['Developer handbook', '开发者手册'],
      '/contact': ['Support', '支持'],
      '/profile': ['Account', '账户'],
      '/admin': ['Administration', '管理工作台'],
      '/consent': ['Review access', '确认授权'],
      '/device': ['Connect your device', '连接设备'],
    };
    const title =
      titles[location.pathname]?.[locale === 'zh-CN' ? 1 : 0] ?? 'NazoAuth';
    document.title = `${title} · NazoAuth`;
  }, [location.pathname, locale]);
  const isIsolatedPage =
    location.pathname === '/consent' ||
    location.pathname === '/device' ||
    location.pathname.startsWith('/ciba/');

  return (
    <div className="app-layout">
      {!isIsolatedPage && <Navbar />}
      <main
        className={`main-content ${isIsolatedPage ? 'main-content-isolated' : ''}`}
      >
        {location.pathname === '/' && <BrandStage />}
        <MainRoutes />
      </main>
      {!isIsolatedPage && <Footer />}
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  if (canonicalVerificationResultPath(location.pathname, '/')) {
    return <VerificationResult />;
  }

  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

  return (
    <MotionConfig reducedMotion="user">
      <I18nProvider>
        <BrowserRouter basename={basename}>
          <div className="site-frame">
            <ScrollBackdrop />
            <AppRoutes />
          </div>
        </BrowserRouter>
      </I18nProvider>
    </MotionConfig>
  );
}

export default App;
