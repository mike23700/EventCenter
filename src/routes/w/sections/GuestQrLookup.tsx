import { useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { TemplateDef } from '../../../lib/templates';
import GuestQrCard, { type QrGuest } from './GuestQrCard';

interface Row extends QrGuest {
  phone: string | null;
}

function normalizePhone(v: string): string {
  return v.replace(/[\s.\-()]/g, '');
}

/**
 * Retrouver son QR déjà généré : recherche par nom parmi les invités, avec
 * désambiguïsation par téléphone en cas d'homonymes (le nom seul n'est pas
 * garanti unique).
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
  const [matches, setMatches] = useState<Row[] | null>(null);
  const [found, setFound] = useState<Row | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  async function search() {
    const q = name.trim();
    if (q.length < 2) return;
    setSearching(true);
    setError('');
    setFound(null);
    setMatches(null);
    const { data, error } = await supabase
      .from('guests')
      .select('id, name, phone, qr_token')
      .eq('wedding_id', weddingId)
      .ilike('name', `%${q}%`);
    setSearching(false);
    if (error) {
      setError(error.message);
      return;
    }
    const rows = (data ?? []) as Row[];
    if (rows.length === 1) {
      setFound(rows[0]);
    } else {
      setMatches(rows);
    }
  }

  function confirmWithPhone() {
    if (!matches) return;
    const p = normalizePhone(phone);
    const hits = matches.filter((m) => m.phone && normalizePhone(m.phone) === p);
    if (hits.length === 1) {
      setFound(hits[0]);
      setMatches(null);
      setError('');
    } else {
      setError(
        "Aucune correspondance avec ce numéro. Vérifiez l'orthographe de votre nom et le " +
          'téléphone utilisé lors de votre inscription, ou contactez les mariés.',
      );
    }
  }

  function reset() {
    setFound(null);
    setMatches(null);
    setName('');
    setPhone('');
    setError('');
  }

  if (found) {
    return <GuestQrCard guest={found} weddingId={weddingId} accent={accent} palette={palette} onReset={reset} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Votre nom</label>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Ex : Michel Kengne"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}
          />
          <button
            onClick={search}
            disabled={searching || name.trim().length < 2}
            className="rounded-full px-6 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
        {searching && <p className="mt-2 text-sm" style={{ color: palette.muted }}>Recherche…</p>}
      </div>

      {matches && matches.length === 0 && (
        <p className="text-sm" style={{ color: palette.muted }}>
          Aucune inscription trouvée avec ce nom. Vérifiez l'orthographe, ou inscrivez-vous si ce
          n'est pas encore fait.
        </p>
      )}

      {matches && matches.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm" style={{ color: palette.muted }}>
            Plusieurs invités portent ce nom. Confirmez avec le téléphone utilisé lors de
            l'inscription :
          </p>
          <input
            className="input"
            placeholder="+237 6.."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmWithPhone()}
            style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}
          />
          <button
            onClick={confirmWithPhone}
            disabled={!phone.trim()}
            className="rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            Valider
          </button>
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
