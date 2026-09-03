import { useEffect } from 'react';
import { useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import AdminShell from './AdminShell';

const SUPER_ADMIN_ROLE = 'super_admin';

/** Vérifie côté client que le JWT porte bien le rôle super_admin. */
function roleInJwt(appMetadata?: unknown): boolean {
  if (appMetadata && typeof appMetadata === 'object') {
    const meta = appMetadata as { role?: unknown };
    return meta.role === SUPER_ADMIN_ROLE;
  }
  return false;
}

/**
 * Layout du panel super-admin : garde d'authentification + rôle,
 * puis rend le shell (sidebar) autour du contenu.
 */
export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const loaded = useAuth((s) => s.loaded);

  useEffect(() => {
    if (!loaded) return;
    if (location.pathname === '/admin/login') return;

    if (!user) {
      const next =
        location.pathname !== '/admin' && location.pathname !== '/admin/'
          ? `${location.pathname}${location.search}`
          : '/admin';
      navigate(`/admin/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [loaded, user, location, navigate]);

  if (location.pathname === '/admin/login') {
    return <Outlet />;
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-warm text-ink-secondary">
        Chargement…
      </div>
    );
  }

  if (!user) {
    return null; // redirection par useEffect
  }

  if (!roleInJwt(user.app_metadata)) {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}