import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from './auth/AuthContext';
import Navbar from './components/Navbar';
import RequireAuth from './components/RequireAuth';
import RequireGuest from './components/RequireGuest';
import Footer from './components/Footer';
import { I18nProvider, useI18n } from './i18n';
import { pageVariants } from './lib/motion';
import './App.css';

const Home = lazy(() => import('./pages/Home'));
const Auth = lazy(() => import('./pages/Auth'));
const Security = lazy(() => import('./pages/Security'));
const Docs = lazy(() => import('./pages/Docs'));
const Contact = lazy(() => import('./pages/Contact'));
const Profile = lazy(() => import('./pages/Profile'));
const Consent = lazy(() => import('./pages/Consent'));
const Admin = lazy(() => import('./pages/Admin'));
const Delivery = lazy(() => import('./pages/Delivery'));

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
          <Route path="/delivery" element={<Delivery />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function AppShell() {
  const location = useLocation();
  const isIsolatedPage =
    location.pathname === '/consent' || location.pathname === '/delivery';

  return (
    <div className="app-layout">
      {!isIsolatedPage && <Navbar />}
      <main className={`main-content ${isIsolatedPage ? 'main-content-isolated' : ''}`}>
        <MainRoutes />
      </main>
      {!isIsolatedPage && <Footer />}
    </div>
  );
}

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter basename={basename}>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
