import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export default function ClientLogin() {
  const signIn = useAuth((s) => s.signIn);
  const signUp = useAuth((s) => s.signUp);
  const loading = useAuth((s) => s.loading);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get('next') || '/app';

  function switchMode(m: 'login' | 'signup') {
    setMode(m);
    setError('');
    setInfo('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      if (password !== confirm) {
        setError('La confirmation du mot de passe ne correspond pas.');
        return;
      }
      const res = await signUp(email.trim(), password);
      if (res.error) {
        setError(res.error);
        return;
      }
      // Si session ouverte (confirmation automatique), on va direct sur /app.
      setInfo('Compte créé. Connectez-vous puis rattachez votre mariage.');
      setMode('login');
      setPassword('');
      setConfirm('');
      return;
    }
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
            <h1 className="font-display text-2xl font-bold text-ink">Espace client</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {mode === 'login' ? 'Connectez-vous à votre espace marié' : 'Créez votre compte marié'}
            </p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-paper-cream p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === 'login' ? 'bg-white text-ink shadow-sm' : 'text-ink-secondary'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === 'signup' ? 'bg-white text-ink shadow-sm' : 'text-ink-secondary'
              }`}
            >
              Inscription
            </button>
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
                placeholder="vous@exemple.com"
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
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="confirm">
                  Confirmez le mot de passe
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}

            {info && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {loading ? 'Patientez…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
            </button>
          </form>
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