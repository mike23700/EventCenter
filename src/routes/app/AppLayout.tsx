import { Outlet, Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

/** Layout du panel client (mariés) — activé à partir de la phase 3. */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-paper-warm">
      <header className="flex h-14 items-center justify-between border-b border-borderlight bg-white px-6">
        <Link to="/app" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Heart className="h-5 w-5 text-gold" fill="currentColor" />
          Espace client
        </Link>
        <span className="text-sm text-ink-secondary">Phase 3 — en construction</span>
      </header>
      <main className="p-8">
        <Outlet />
      </main>
    </div>
  );
}