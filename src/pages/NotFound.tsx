import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper-warm px-6 text-center">
      <p className="font-display text-7xl font-bold text-gold">404</p>
      <p className="mt-4 text-lg text-ink-secondary">Page introuvable.</p>
      <Link to="/" className="btn-primary mt-6">
        Retour à l’accueil
      </Link>
    </div>
  );
}