import { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

/** Layout du panel client (mariés). Garde d'authentification simple. */
export default function AppLayout() {
  const user = useAuth((s) => s.user);
  const loaded = useAuth((s) => s.loaded);
  const navigate = useNavigate();
  const location = useLocation();

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
      <header className="flex h-14 items-center justify-between border-b border-borderlight bg-white px-6">
        <Link to="/app" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Heart className="h-5 w-5 text-gold" fill="currentColor" />
          Espace client
        </Link>
        <span className="text-sm text-ink-secondary">{user.email}</span>
      </header>
      <main className="p-8">
        <Outlet />
      </main>
    </div>
  );
}