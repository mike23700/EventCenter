import { useState } from 'react';
import { Search } from 'lucide-react';
import { lookupGuest } from '../../../lib/publicApi';
import type { TemplateDef } from '../../../lib/templates';
import GuestQrCard, { type QrGuest } from './GuestQrCard';
import { clearKnownGuest } from './guestSession';

/**
 * « Retrouver mon pass » : nom ET téléphone utilisé à l'inscription. La
 * liste des invités n'est jamais exposée ; seul l'invité qui correspond aux
 * deux informations est renvoyé (API publique, recherches limitées).
 */
export default function GuestQrLookup({
  weddingId,
  accent,
  palette,
}: {
  weddingId: string;
  accent: string;
  palette: TemplateDef['palette'];
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [found, setFound] = useState<QrGuest | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const canSearch = name.trim().length >= 2 && phone.length === 9;

  async function search() {
    if (!canSearch) return;
    setSearching(true);
    setError('');
    try {
      setFound(await lookupGuest(weddingId, name.trim(), phone));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recherche impossible');
    } finally {
      setSearching(false);
    }
  }

  function reset() {
    clearKnownGuest(weddingId);
    setFound(null);
    setName('');
    setPhone('');
    setError('');
  }

  if (found) {
    return <GuestQrCard guest={found} weddingId={weddingId} accent={accent} palette={palette} onReset={reset} />;
  }

  const field = { backgroundColor: palette.background, borderColor: palette.border, color: palette.text };

  return (
    <div className="space-y-4">
      <p className="tpl-body text-sm" style={{ color: palette.muted }}>
        Indiquez votre nom et le téléphone utilisé lors de votre inscription.
      </p>
      <div>
        <label className="label">Votre nom</label>
        <input
          className="input"
          placeholder="Ex : Anne Marie"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          style={field}
        />
      </div>
      <div>
        <label className="label">Votre téléphone</label>
        <input
          className="input"
          placeholder="679..."
          inputMode="numeric"
          maxLength={9}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          style={field}
        />
      </div>
      <button
        onClick={search}
        disabled={searching || !canSearch}
        className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-40"
        style={{ backgroundColor: accent }}
      >
        <Search className="h-4 w-4" />
        {searching ? 'Recherche…' : 'Retrouver mon pass'}
      </button>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
