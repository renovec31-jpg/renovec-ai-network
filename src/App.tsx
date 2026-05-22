import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SituationProvider } from './contexts/SituationContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { supabase, isAdmin } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import OnboardingSeeker from './pages/OnboardingSeeker';
import OnboardingProvider from './pages/OnboardingProvider';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/Layout';
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
import PublicProfileModal from './components/PublicProfileModal';
import PublicProfilePage from './pages/PublicProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import CartePage from './pages/CartePage';
import FeedPage from './pages/FeedPage';

type Tab = 'demander' | 'capacites' | 'discussions' | 'contributions' | 'espace' | 'notifications' | 'admin' | 'carte' | 'feed';
type AppView = 'landing' | 'auth' | 'app' | '404';

// Full-screen overlays rendered instead of Layout
type Overlay =
  | { kind: 'none' }
  | { kind: 'public-profile'; userId: string }
  | { kind: 'edit-profile' };

// ── URL routing ────────────────────────────────────────────────────────────────
// Parse window.location.pathname to determine initial app state.
// Pattern → { view, tab, overlay }
type ParsedRoute = {
  view: AppView;
  tab: Tab;
  overlay: Overlay;
};


function parseRoute(pathname: string): ParsedRoute {
  const p = pathname.replace(/\/$/, '') || '/';

  // /carte
  if (p === '/carte') {
    return { view: 'app', tab: 'carte', overlay: { kind: 'none' } };
  }

  // /profil/:id
  const profilMatch = p.match(/^\/profil\/([^/]+)$/);
  if (profilMatch) {
    return { view: 'app', tab: 'espace', overlay: { kind: 'public-profile', userId: profilMatch[1] } };
  }

  // /mon-espace/profil/edit  (protected)
  if (p === '/mon-espace/profil/edit') {
    return { view: 'app', tab: 'espace', overlay: { kind: 'edit-profile' } };
  }

  // /entrer
  if (p === '/entrer') {
    return { view: 'auth', tab: 'demander', overlay: { kind: 'none' } };
  }

  // /comment-ca-marche
  if (p === '/comment-ca-marche') {
    return { view: 'landing', tab: 'demander', overlay: { kind: 'none' } };
  }

  // / → landing
  if (p === '/' || p === '') {
    return { view: 'landing', tab: 'demander', overlay: { kind: 'none' } };
  }

  // Unknown → 404
  return { view: '404', tab: 'demander', overlay: { kind: 'none' } };
}

function navigate(path: string) {
  window.history.pushState(null, '', path);
}

function AppInner() {
  const { user, profile, loading } = useAuth();

  const initial = parseRoute(window.location.pathname);
  const [view, setView] = useState<AppView>(initial.view);
  const [activeTab, setActiveTab] = useState<Tab>(initial.tab);
  const [overlay, setOverlay] = useState<Overlay>(initial.overlay);

  const [showProviderOnboarding, setShowProviderOnboarding] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [showHowItWorks, setShowHowItWorks] = useState(
    window.location.pathname.replace(/\/$/, '') === '/comment-ca-marche'
  );
  const [showMentions, setShowMentions] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);

  // Sync URL on overlay/tab changes
  useEffect(() => {
    if (overlay.kind === 'public-profile') {
      navigate(`/profil/${overlay.userId}`);
    } else if (overlay.kind === 'edit-profile') {
      navigate('/mon-espace/profil/edit');
    } else if (view === 'app') {
      navigate(activeTab === 'carte' ? '/carte' : '/');
    } else if (view === 'auth') {
      navigate('/entrer');
    } else {
      navigate('/');
    }
  }, [overlay, activeTab, view]);

  // Handle browser back/forward
  useEffect(() => {
    function onPopState() {
      const parsed = parseRoute(window.location.pathname);
      setView(parsed.view);
      setActiveTab(parsed.tab);
      setOverlay(parsed.overlay);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Custom events from other components
  useEffect(() => {
    const handler = (e: Event) => {
      const { tab } = (e as CustomEvent<{ tab: Tab }>).detail;
      setOverlay({ kind: 'none' });
      setActiveTab(tab);
    };
    window.addEventListener('navigate-to-tab', handler);
    return () => window.removeEventListener('navigate-to-tab', handler);
  }, []);

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
      if (userId) setOverlay({ kind: 'public-profile', userId });
    };
    window.addEventListener('open-profile-page', handler);
    return () => window.removeEventListener('open-profile-page', handler);
  }, []);

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
    setOverlay({ kind: 'none' });
    setActiveTab(tab);
    setView('app');
  }

  function openProfile(userId: string) {
    setOverlay({ kind: 'public-profile', userId });
  }

  function openEditProfile() {
    setOverlay({ kind: 'edit-profile' });
  }

  function closeOverlay() {
    setOverlay({ kind: 'none' });
  }

  // ── 404 ─────────────────────────────────────────────────────────────────────
  if (view === '404') {
    return <NotFoundPage onGoHome={() => { setView('landing'); navigate('/'); }} />;
  }

  // ── Loading spinner ──────────────────────────────────────────────────────────
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

  // ── Public routes (accessible without auth) ──────────────────────────────────
  // /carte is public
  if (!user && activeTab === 'carte' && overlay.kind === 'none') {
    return (
      <CartePage
        onOpenProfile={userId => openProfile(userId)}
      />
    );
  }

  // /profil/:id is public
  if (!user && overlay.kind === 'public-profile') {
    return (
      <PublicProfilePage
        profileUserId={overlay.userId}
        onBack={() => { closeOverlay(); setView('landing'); }}
        onEdit={() => {}}
        onContact={() => setView('auth')}
      />
    );
  }

  // ── Unauthenticated views ────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        {view === 'landing'
          ? <LandingPage
              onEnter={() => setView('auth')}
              onHowItWorks={() => { setShowHowItWorks(true); navigate('/comment-ca-marche'); }}
              onGoToPresence={() => setView('auth')}
              onMentions={() => setShowMentions(true)}
            />
          : <AuthPage onBack={() => setView('landing')} />}
        {showHowItWorks && (
          <CommentCaMarchePage
            standalone
            onClose={() => { setShowHowItWorks(false); navigate('/'); }}
            onEnter={() => { setShowHowItWorks(false); navigate('/entrer'); setView('auth'); }}
            onGoToPresence={() => { setShowHowItWorks(false); navigate('/entrer'); setView('auth'); }}
          />
        )}
        {showMentions && <MentionsPage onClose={() => setShowMentions(false)} />}
        {publicProfileId && (
          <PublicProfileModal
            profileId={publicProfileId}
            isGuest
            onClose={() => setPublicProfileId(null)}
            onEnter={() => { setPublicProfileId(null); setView('auth'); }}
          />
        )}
      </>
    );
  }

  // ── Profile loading ──────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border border-amber-200 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Onboarding gates ─────────────────────────────────────────────────────────
  if (!profile.onboarding_seeker_done) {
    return <OnboardingSeeker onComplete={() => {}} />;
  }

  // WelcomeScreen removed — the two-column split IS the welcome now
  if (showWelcome) {
    setShowWelcome(false);
  }

  if (showProviderOnboarding) {
    return (
      <OnboardingProvider
        onComplete={() => setShowProviderOnboarding(false)}
        onSkip={() => setShowProviderOnboarding(false)}
      />
    );
  }

  // ── Authenticated full-screen overlays ───────────────────────────────────────
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

  // ── Main app with Layout ─────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'demander':      return null; // Chat is handled by Layout directly
      case 'feed':          return (
        <FeedPage
          onViewProfile={(id) => {
            window.dispatchEvent(new CustomEvent('open-capability-profile', { detail: { profileId: id } }));
          }}
          onContact={() => {
            handleTabChange('discussions');
          }}
        />
      );
      case 'capacites':     return <CapacitesPage />;
      case 'carte':         return <CartePage onOpenProfile={openProfile} />;
      case 'discussions':   return <DiscussionsPage onNavigateSituation={() => handleTabChange('demander')} />;
      case 'contributions': return <ContributionsPage />;
      case 'espace':        return <MonEspacePage onStartProviderOnboarding={() => setShowProviderOnboarding(true)} />;
      case 'notifications': return <NotificationsPage />;
      case 'admin':         return isAdmin(profile) ? <AdminPage /> : null;
      default:              return null;
    }
  };

  return (
    <SituationProvider>
      <WorkspaceProvider>
        <Layout
          activeTab={activeTab}
          onTabChange={handleTabChange}
          notifCount={notifCount}
          isAdmin={isAdmin(profile)}
          onShowHowItWorks={() => setShowHowItWorks(true)}
          onGoLanding={() => { setView('landing'); setActiveTab('demander'); setOverlay({ kind: 'none' }); }}
          onOpenMyProfile={() => openProfile(user.id)}
        >
          {renderTab()}
        </Layout>
        <OnboardingModal />
        {showHowItWorks && (
          <CommentCaMarchePage
            onClose={() => setShowHowItWorks(false)}
            onEnter={() => { setShowHowItWorks(false); setActiveTab('demander'); }}
            onGoToPresence={() => { setShowHowItWorks(false); handleTabChange('capacites'); }}
          />
        )}
        {showMentions && <MentionsPage onClose={() => setShowMentions(false)} />}
        {publicProfileId && (
          <PublicProfileModal
            profileId={publicProfileId}
            isGuest={false}
            onClose={() => setPublicProfileId(null)}
            onEnter={() => setPublicProfileId(null)}
          />
        )}
      </WorkspaceProvider>
    </SituationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
