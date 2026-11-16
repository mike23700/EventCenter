import { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

/** Layout du panel client (mariés). Garde d'authentification simple. */
export default function AppLayout() {
  const user = useAuth((s) => s.user);
  const loaded = useAuth((s) => s.loaded);
  const signOut = useAuth((s) => s.signOut);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    if (!loaded) return;
    if (!user) {
      const next = `${location.pathname}${location.search}`;
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [loaded, user, navigate, location]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-warm text-ink-secondary">
        Chargement…
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-paper-warm">
      <header className="flex h-14 items-center justify-between gap-3 border-b border-borderlight bg-white px-4 sm:px-6">
        <Link to="/app" className="flex shrink-0 items-center gap-2 font-display text-lg font-bold text-ink">
          <img src="/logo-icon.png" alt="EVENTS ETAN" className="h-6 w-6" />
          <span className="hidden sm:inline">Espace client</span>
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden truncate text-sm text-ink-secondary sm:inline">{user.email}</span>
          <button
            onClick={handleLogout}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-borderlight px-3 py-1.5 text-sm text-ink-secondary transition hover:border-red-300 hover:text-red-600"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>
      <main className="p-4 sm:p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}