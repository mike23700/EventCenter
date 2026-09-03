import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Heart, LayoutDashboard, Users, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

const nav = [
  { to: '/admin', end: true, label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/admin/weddings', end: false, label: 'Mariages', icon: Users },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const signOut = useAuth((s) => s.signOut);
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-paper-warm">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-ink text-white">
        <Link to="/admin" className="flex items-center gap-2 px-5 py-5 font-display text-xl font-semibold">
          <Heart className="h-6 w-6 text-gold" fill="currentColor" />
          <span>EventCenter</span>
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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

      <div className="pl-60">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}