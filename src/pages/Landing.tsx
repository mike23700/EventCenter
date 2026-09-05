import { Link } from 'react-router-dom';
import { Heart, Sparkles, LogIn } from 'lucide-react';

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
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-gold bg-white px-4 py-2 text-sm font-medium text-gold-dark hover:bg-paper-cream"
          >
            <LogIn className="h-4 w-4" />
            Connexion
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white px-4 py-1 text-sm text-gold-dark">
          <Sparkles className="h-4 w-4 text-gold" />
          Gestion d'évènements de mariage
        </div>
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight text-ink sm:text-6xl">
          Un site unique pour chaque <span className="text-gold">mariage</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-secondary">
          Programme, confirmation de présence, gestion des tables et partage de photos :
          tout ce qu'il faut pour votre mariage, accessible partout.
        </p>

        <div className="mt-12">
          <Link to="/login" className="btn-primary inline-flex px-6 py-3 text-base">
            <LogIn className="h-5 w-5" />
            Se connecter à mon espace
          </Link>
          <p className="mt-3 text-xs text-ink-secondary">
            Accédez à votre site de mariage avec le compte communiqué par votre organisateur.
          </p>
        </div>
      </main>

      <footer className="border-t border-borderlight py-6 text-center text-sm text-ink-secondary">
        EventCenter © {new Date().getFullYear()} — Gestion d'évènements de mariage
      </footer>
    </div>
  );
}