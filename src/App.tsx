import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SituationProvider } from './contexts/SituationContext';
import { supabase, isAdmin } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import OnboardingSeeker from './pages/OnboardingSeeker';
import OnboardingProvider from './pages/OnboardingProvider';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/Layout';
import DemanderPage from './pages/DemanderPage';
import CapacitesPage from './pages/CapacitesPage';
import DiscussionsPage from './pages/DiscussionsPage';
import MonEspacePage from './pages/MonEspacePage';
import NotificationsPage from './pages/NotificationsPage';
import ContributionsPage from './pages/ContributionsPage';
import AdminPage from './pages/AdminPage';
import OnboardingModal from './components/OnboardingModal';
import WelcomeScreen, { shouldShowWelcome } from './components/WelcomeScreen';
import CommentCaMarchePage from './pages/CommentCaMarchePage';
import MentionsPage from './pages/MentionsPage';
import PolitiqueConfidentialitePage from './pages/PolitiqueConfidentialitePage';
import ConditionsGeneralesPage from './pages/ConditionsGeneralesPage';
import PublicProfileModal from './components/PublicProfileModal';
import PublicProfilePage from './pages/PublicProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import CartePage from './pages/CartePage';
import FeedPage from './pages/FeedPage';
import CookieBanner from './components/CookieBanner';
import {
  normalizePath,
  publicExclusiveFromPath,
  type PublicExclusiveView,
} from './lib/publicRoutes';

type Tab = 'demander' | 'capacites' | 'discussions' | 'contributions' | 'espace' | 'notifications' | 'admin' | 'carte' | 'feed';
type AppView = 'landing' | 'auth' | 'app' | '404' | PublicExclusiveView;

type Overlay =
  | { kind: 'none' }
  | { kind: 'public-profile'; userId: string }
  | { kind: 'edit-profile' };

type ParsedRoute = {
  view: AppView;
  tab: Tab;
  overlay: Overlay;
};

function parseRoute(pathname: string): ParsedRoute {
  const p = normalizePath(pathname);
  const exclusive = publicExclusiveFromPath(p);
  if (exclusive) {
    return { view: exclusive, tab: 'demander', overlay: { kind: 'none' } };
  }

  if (p === '/carte') {
    return { view: 'app', tab: 'carte', overlay: { kind: 'none' } };
  }

  const profilMatch = p.match(/^\/profil\/([^/]+)$/);
  if (profilMatch) {
    return { view: 'app', tab: 'espace', overlay: { kind: 'public-profile', userId: profilMatch[1] } };
  }

  if (p === '/mon-espace/profil/edit') {
    return { view: 'app', tab: 'espace', overlay: { kind: 'edit-profile' } };
  }

  if (p === '/entrer') {
    return { view: 'auth', tab: 'demander', overlay: { kind: 'none' } };
  }

  if (p === '/' || p === '') {
    return { view: 'landing', tab: 'demander', overlay: { kind: 'none' } };
  }

  return { view: '404', tab: 'demander', overlay: { kind: 'none' } };
}

function desiredPath(view: AppView, activeTab: Tab, overlay: Overlay): string {
  if (overlay.kind === 'public-profile') return `/profil/${overlay.userId}`;
  if (overlay.kind === 'edit-profile') return '/mon-espace/profil/edit';
  if (view === 'app') return activeTab === 'carte' ? '/carte' : '/';
  if (view === 'auth') return '/entrer';
  if (view === 'ccm') return '/comment-ca-marche';
  if (view === 'mentions') return '/mentions-legales';
  if (view === 'privacy') return '/politique-de-confidentialite';
  if (view === 'cgu') return '/conditions-generales';
  if (view === '404') return normalizePath(window.location.pathname);
  return '/';
}

function usePathname(): [string, (path: string) => void] {
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname));

  const pushPath = useCallback((path: string) => {
    const next = normalizePath(path);
    if (normalizePath(window.location.pathname) === next) {
      setPathname(next);
      return;
    }
    window.history.pushState(null, '', next);
    setPathname(next);
  }, []);

  useEffect(() => {
    function onPopState() {
      setPathname(normalizePath(window.location.pathname));
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return [pathname, pushPath];
}

function AppInner() {
  const { user, profile, loading } = useAuth();
  const [pathname, pushPath] = usePathname();

  const routeFromUrl = parseRoute(pathname);
  const urlExclusive = publicExclusiveFromPath(pathname);

  const [view, setView] = useState<AppView>(routeFromUrl.view);
  const [activeTab, setActiveTab] = useState<Tab>(routeFromUrl.tab);
  const [overlay, setOverlay] = useState<Overlay>(routeFromUrl.overlay);

  const [showProviderOnboarding, setShowProviderOnboarding] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);

  const goTo = useCallback((next: AppView, tab: Tab = 'demander', nextOverlay: Overlay = { kind: 'none' }) => {
    setView(next);
    setActiveTab(tab);
    setOverlay(nextOverlay);
    pushPath(desiredPath(next, tab, nextOverlay));
  }, [pushPath]);

  // URL = source de vérité pour les pages exclusives (jamais la landing en doublon)
  useEffect(() => {
    const parsed = parseRoute(pathname);
    if (urlExclusive) {
      if (view !== parsed.view) setView(parsed.view);
      if (activeTab !== parsed.tab) setActiveTab(parsed.tab);
      if (overlay.kind !== 'none') setOverlay({ kind: 'none' });
      return;
    }
    if (view !== parsed.view) setView(parsed.view);
    if (activeTab !== parsed.tab) setActiveTab(parsed.tab);
    setOverlay(parsed.overlay);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: Event) => {
      const { tab } = (e as CustomEvent<{ tab: Tab }>).detail;
      goTo('app', tab);
    };
    window.addEventListener('navigate-to-tab', handler);
    return () => window.removeEventListener('navigate-to-tab', handler);
  }, [goTo]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { profileId } = (e as CustomEvent<{ profileId: string }>).detail;
      if (profileId) setPublicProfileId(profileId);
    };
    window.addEventListener('open-public-profile', handler);
    return () => window.removeEventListener('open-public-profile', handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { userId } = (e as CustomEvent<{ userId: string }>).detail;
      if (userId) goTo('app', 'espace', { kind: 'public-profile', userId });
    };
    window.addEventListener('open-profile-page', handler);
    return () => window.removeEventListener('open-profile-page', handler);
  }, [goTo]);

  useEffect(() => {
    if (!user) return;
    loadNotifCount();
    if (shouldShowWelcome()) setShowWelcome(true);
    const sub = supabase
      .channel(`notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => loadNotifCount())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [user]);

  async function loadNotifCount() {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifCount(count || 0);
  }

  function handleTabChange(tab: Tab) {
    if (tab === 'notifications') setNotifCount(0);
    goTo('app', tab);
  }

  function openProfile(userId: string) {
    goTo('app', 'espace', { kind: 'public-profile', userId });
  }

  function openEditProfile() {
    goTo('app', 'espace', { kind: 'edit-profile' });
  }

  function closeOverlay() {
    setOverlay({ kind: 'none' });
    pushPath(desiredPath(view, activeTab, { kind: 'none' }));
  }

  // ── Pages exclusives : pathname prime, rendu AVANT auth/landing ─────────────
  if (urlExclusive === 'ccm') {
    return (
      <CommentCaMarchePage
        standalone
        onClose={() => goTo(user ? 'app' : 'landing')}
        onEnter={() => goTo('auth')}
        onGoToPresence={() => goTo('auth')}
      />
    );
  }

  if (!user && urlExclusive === 'mentions') {
    return <MentionsPage onClose={() => goTo('landing')} />;
  }
  if (!user && urlExclusive === 'privacy') {
    return <PolitiqueConfidentialitePage standalone onClose={() => goTo('landing')} />;
  }
  if (!user && urlExclusive === 'cgu') {
    return <ConditionsGeneralesPage standalone onClose={() => goTo('landing')} />;
  }

  if (view === '404') {
    return <NotFoundPage onGoHome={() => goTo('landing')} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border border-amber-200/50 rounded-full animate-breathe" />
          <div className="absolute inset-2 border border-amber-300/30 rounded-full animate-breathe" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>
    );
  }

  if (!user && activeTab === 'carte' && overlay.kind === 'none') {
    return <CartePage onOpenProfile={userId => openProfile(userId)} />;
  }

  if (!user && overlay.kind === 'public-profile') {
    return (
      <PublicProfilePage
        profileUserId={overlay.userId}
        onBack={() => goTo('landing')}
        onEdit={() => {}}
        onContact={() => goTo('auth')}
      />
    );
  }

  if (!user) {
    return (
      <>
        {view === 'landing'
          ? <LandingPage
              onEnter={() => goTo('auth')}
              onHowItWorks={() => goTo('ccm')}
              onGoToPresence={() => goTo('auth')}
              onMentions={() => goTo('mentions')}
            />
          : <AuthPage onBack={() => goTo('landing')} />}
        {publicProfileId && (
          <PublicProfileModal
            profileId={publicProfileId}
            isGuest
            onClose={() => setPublicProfileId(null)}
            onEnter={() => { setPublicProfileId(null); goTo('auth'); }}
          />
        )}
      </>
    );
  }

  // Session orpheline (user sans profil) : déconnexion propre
  if (!profile) {
    supabase.auth.signOut();
    return null;
  }

  if (!profile.onboarding_seeker_done) {
    return <OnboardingSeeker onComplete={() => {}} />;
  }

  if (showWelcome) {
    return (
      <WelcomeScreen
        onSeeker={() => { setShowWelcome(false); goTo('app', 'demander'); }}
        onPresence={() => { setShowWelcome(false); goTo('app', 'capacites'); }}
      />
    );
  }

  if (showProviderOnboarding) {
    return (
      <OnboardingProvider
        onComplete={() => setShowProviderOnboarding(false)}
        onSkip={() => setShowProviderOnboarding(false)}
      />
    );
  }

  if (overlay.kind === 'public-profile') {
    return (
      <PublicProfilePage
        profileUserId={overlay.userId}
        onBack={closeOverlay}
        onEdit={openEditProfile}
        onContact={() => { closeOverlay(); handleTabChange('discussions'); }}
      />
    );
  }

  if (overlay.kind === 'edit-profile') {
    return (
      <EditProfilePage
        onBack={closeOverlay}
        onSaved={closeOverlay}
      />
    );
  }

  const isFullHeight = activeTab === 'carte';

  const renderTab = () => {
    switch (activeTab) {
      case 'demander':      return <DemanderPage />;
      case 'feed':          return (
        <FeedPage
          onViewProfile={profileId => {
            window.dispatchEvent(new CustomEvent('open-capability-profile', { detail: { profileId } }));
          }}
          onContact={() => handleTabChange('discussions')}
        />
      );
      case 'capacites':     return <CapacitesPage />;
      case 'carte':         return <CartePage onOpenProfile={openProfile} />;
      case 'discussions':   return <DiscussionsPage onNavigateSituation={() => handleTabChange('demander')} />;
      case 'contributions': return <ContributionsPage />;
      case 'espace':        return <MonEspacePage onStartProviderOnboarding={() => setShowProviderOnboarding(true)} />;
      case 'notifications': return <NotificationsPage />;
      case 'admin':         return isAdmin(profile) ? <AdminPage /> : <DemanderPage />;
      default:              return <DemanderPage />;
    }
  };

  return (
    <SituationProvider>
      <Layout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        notifCount={notifCount}
        isAdmin={isAdmin(profile)}
        onShowHowItWorks={() => goTo('ccm')}
        onGoLanding={() => goTo('landing')}
        onOpenMyProfile={() => openProfile(user.id)}
        fullHeight={isFullHeight}
      >
        {renderTab()}
      </Layout>
      <OnboardingModal />
      {showMentions && <MentionsPage onClose={() => setShowMentions(false)} />}
      {publicProfileId && (
        <PublicProfileModal
          profileId={publicProfileId}
          isGuest={false}
          onClose={() => setPublicProfileId(null)}
          onEnter={() => setPublicProfileId(null)}
        />
      )}
    </SituationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
      <CookieBanner />
    </AuthProvider>
  );
}
