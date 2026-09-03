import { Link } from 'react-router-dom';
import { Heart, Sparkles, Users } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-paper-cream via-paper-warm to-paper text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-display text-xl font-semibold">
          <Heart className="h-6 w-6 text-gold" fill="currentColor" />
          <span className="text-ink">EventCenter</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            to="/admin/login"
            className="rounded-lg border border-gold bg-white px-4 py-2 text-sm font-medium text-gold-dark hover:bg-paper-cream"
          >
            Panel super-admin
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white px-4 py-1 text-sm text-gold-dark">
          <Sparkles className="h-4 w-4 text-gold" />
          Gestion d'évènements de mariage
        </div>
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight text-ink sm:text-6xl">
          Un site unique pour chaque <span className="text-gold">mariage</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-secondary">
          EventCenter génère un site évènementiel personnalisé par mariage : invitations,
          programme, confirmation de présence, gestion des tables et partage de photos.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {[
            {
              icon: <Users className="h-6 w-6" />,
              title: 'Panel super-admin',
              desc: 'Créez des comptes clients, gérez la période d’accès et les liens.',
              to: '/admin/login',
            },
            {
              icon: <Heart className="h-6 w-6" />,
              title: 'Panel client',
              desc: 'Les mariés configurent leur site sans toucher au code.',
              to: '/app/login',
            },
          ].map((c) => (
            <Link
              key={c.title}
              to={c.to}
              className="group rounded-2xl border border-borderlight bg-white p-6 text-left shadow-sm transition hover:border-gold hover:shadow-md"
            >
              <div className="mb-3 inline-flex rounded-lg bg-gold/10 p-2 text-gold-dark">{c.icon}</div>
              <h2 className="font-semibold text-ink">{c.title}</h2>
              <p className="mt-1 text-sm text-ink-secondary">{c.desc}</p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-borderlight py-6 text-center text-sm text-ink-secondary">
        EventCenter © {new Date().getFullYear()} — Application de gestion de mariages
      </footer>
    </div>
  );
}