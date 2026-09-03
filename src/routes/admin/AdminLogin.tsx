import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, LogIn } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export default function AdminLogin() {
  const { loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next') || '/admin';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await signIn(email.trim(), password);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate(next, { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-paper-cream via-paper-warm to-paper">
      <div className="m-auto w-full max-w-sm px-6">
        <div className="rounded-2xl border border-borderlight bg-white p-8 shadow-lg">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 inline-flex rounded-full bg-gold/10 p-3 text-gold">
              <Heart className="h-8 w-8" fill="currentColor" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">EventCenter</h1>
            <p className="mt-1 text-sm text-ink-secondary">Panel super-admin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eventcenter.app"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              <LogIn className="h-4 w-4" />
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-secondary">
            Compte initial fourni par l'administrateur du projet.
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-ink-secondary">
          <Link to="/" className="text-gold-dark hover:underline">
            ← Retour à l’accueil
          </Link>
        </p>
      </div>
    </div>
  );
}