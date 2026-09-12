import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Heart, LayoutDashboard, Users, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

const nav = [
  { to: '/admin', end: true, label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/admin/weddings', end: false, label: 'Mariages', icon: Users },
];

/**
 * Coquille du panel admin : sidebar fixe sur desktop, tiroir coulissant
 * (ouvert via une barre supérieure) sur mobile — la sidebar fixe en dur
 * prenait sinon l'essentiel de l'écran sur téléphone.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const signOut = useAuth((s) => s.signOut);
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-paper-warm">
      <header className="flex h-14 items-center justify-between border-b border-borderlight bg-ink px-4 text-white md:hidden">
        <Link to="/admin" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Heart className="h-5 w-5 text-gold" fill="currentColor" />
          EventCenter
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] flex-col bg-ink text-white transition-transform duration-200 ease-out md:w-60 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 font-display text-xl font-semibold"
          >
            <Heart className="h-6 w-6 text-gold" fill="currentColor" />
            <span>EventCenter</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-gold/20 text-gold-light' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="h-4 w-4 text-gold" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 truncate px-1 text-xs text-white/60">{user?.email}</div>
          <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4 text-gold" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="md:pl-60">
        <main className="p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
