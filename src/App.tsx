import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { authService, setAccessToken } from './api';
import { getPersistedSession } from './api/services/authService';
import type { AppPage } from './types';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CRMPage } from './pages/CRMPage';
import { ClientsPage } from './pages/ClientsPage';
import { OmnichannelPage } from './pages/OmnichannelPage';
import { AutomationPage } from './pages/AutomationPage';
import { TasksPage } from './pages/TasksPage';
import { FinancePage } from './pages/FinancePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AIInsightsPage } from './pages/AIInsightsPage';
import { AgendaPage } from './pages/AgendaPage';
import { initEmergencyUnblock, forceCleanup } from './utils/fixClickBlock';
import { logger } from './utils/logger';

export function App() {
  const { currentPage, isAuthenticated, setCurrentPage, login, logout } = useStore();
  const prevPageRef = useRef(currentPage);
  const didBootstrapAuthRef = useRef(false);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);

  const refreshAndGetMeWithTimeout = async (timeoutMs = 10000) => {
    return Promise.race([
      (async () => {
        await authService.refreshToken();
        return authService.getMe();
      })(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('auth_bootstrap_timeout')), timeoutMs);
      }),
    ]);
  };

  useEffect(() => {
    if (didBootstrapAuthRef.current) return;
    didBootstrapAuthRef.current = true;

    const bootstrapAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const oauthStatus = url.searchParams.get('auth');
        const oauthToken = url.searchParams.get('accessToken');
        const oauthMessage = url.searchParams.get('message');

        if (oauthStatus === 'success' && oauthToken) {
          setAccessToken(oauthToken);
          const me = await authService.getMe();
          if (me?.user) {
            login(me.user.email, '', me.user);
            localStorage.setItem('nexcrm:oauth:lastProvider', url.searchParams.get('provider') || '');
            window.history.replaceState({}, '', url.pathname);
            const savedPage = localStorage.getItem('nexcrm:lastPage') as AppPage | null;
            if (savedPage && savedPage !== 'login') {
              setCurrentPage(savedPage);
            }
            return;
          }
        }

        if (oauthStatus === 'error') {
          if (oauthMessage) {
            localStorage.setItem('nexcrm:oauth:error', oauthMessage);
          }
          window.history.replaceState({}, '', url.pathname);
        }

        const persisted = getPersistedSession();
        if (persisted?.token && persisted?.user) {
          setAccessToken(persisted.token);
          login(persisted.user.email, '', persisted.user);
          const savedPage = localStorage.getItem('nexcrm:lastPage') as AppPage | null;
          if (savedPage && savedPage !== 'login') {
            setCurrentPage(savedPage);
          }

          // Validate silently in background; do not force logout if network/cookie fails.
          refreshAndGetMeWithTimeout()
            .then((me) => {
              if (me?.user) {
                login(me.user.email, '', me.user);
              }
            })
            .catch((err: unknown) => {
              const status = (err as { response?: { status?: number } })?.response?.status;
              if (status === 401) {
                // Persisted token became invalid; clear session to avoid refresh loops.
                logout();
              }
            });
          return;
        }

        const me = await refreshAndGetMeWithTimeout();
        if (me?.user) {
          login(me.user.email, '', me.user);
          const savedPage = localStorage.getItem('nexcrm:lastPage') as AppPage | null;
          if (savedPage && savedPage !== 'login') {
            setCurrentPage(savedPage);
          }
          return;
        }

        logout();
      } catch {
        logout();
      } finally {
        setAuthBootstrapping(false);
      }
    };

    bootstrapAuth();
  }, [login, logout, setCurrentPage]);

  useEffect(() => {
    if (isAuthenticated && currentPage !== 'login') {
      localStorage.setItem('nexcrm:lastPage', currentPage);
    }
  }, [isAuthenticated, currentPage]);

  // Initialize emergency unblock handler (ESC x3 to force cleanup)
  useEffect(() => {
    initEmergencyUnblock();
    
    // Listen for emergency cleanup event
    const handleEmergencyCleanup = () => {
      // Force close any open modals/panels by resetting store state
      logger.log('[NexCRM] Emergency cleanup - resetting UI state');
    };
    
    window.addEventListener('nexcrm:emergency-cleanup', handleEmergencyCleanup);
    return () => window.removeEventListener('nexcrm:emergency-cleanup', handleEmergencyCleanup);
  }, []);

  // Cleanup overlays when navigating between pages
  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      // Small delay to allow React to complete state updates
      const timeoutId = setTimeout(() => {
        // Clean up any stuck overlays
        document.querySelectorAll('.fixed.inset-0').forEach(el => {
          const zIndex = window.getComputedStyle(el).zIndex;
          const opacity = window.getComputedStyle(el).opacity;
          // Remove overlays that are invisible or have high z-index (modals)
          if (parseInt(zIndex) >= 40 && parseFloat(opacity) < 0.1) {
            el.remove();
          }
        });
        
        // Reset body scroll
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
      }, 100);

      prevPageRef.current = currentPage;
      return () => clearTimeout(timeoutId);
    }
  }, [currentPage]);

  // Global click handler to detect and fix blocked clicks
  useEffect(() => {
    let clickAttempts = 0;
    let lastClickTime = 0;

    const handleClick = (e: MouseEvent) => {
      const now = Date.now();
      
      // If clicking on a fixed overlay that's invisible, force cleanup
      const target = e.target as HTMLElement;
      if (target.classList.contains('fixed') && target.classList.contains('inset-0')) {
        const opacity = window.getComputedStyle(target).opacity;
        if (parseFloat(opacity) < 0.1) {
          e.stopPropagation();
          target.remove();
          logger.log('[NexCRM] Removed invisible blocking overlay');
        }
      }

      // Detect rapid clicking (user trying to click but nothing happens)
      if (now - lastClickTime < 500) {
        clickAttempts++;
        if (clickAttempts >= 5) {
          logger.log('[NexCRM] Detected stuck UI, running cleanup');
          forceCleanup();
          clickAttempts = 0;
        }
      } else {
        clickAttempts = 1;
      }
      lastClickTime = now;
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  if (authBootstrapping) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">Carregando sessao...</div>;
  }

  if (!isAuthenticated || currentPage === 'login') {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'crm': return <CRMPage />;
      case 'clients': return <ClientsPage />;
      case 'omnichannel': return <OmnichannelPage />;
      case 'automation': return <AutomationPage />;
      case 'tasks': return <TasksPage />;
      case 'finance': return <FinancePage />;
      case 'analytics': return <AnalyticsPage />;
      case 'ai': return <AIInsightsPage />;
      case 'agenda': return <AgendaPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
}
