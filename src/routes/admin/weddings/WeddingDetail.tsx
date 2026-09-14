import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, ExternalLink, Copy, Check, Power, PowerOff, User, ShieldCheck, Settings, ScanLine } from 'lucide-react';
import { db } from '../../../lib/db';
import { formatDateTime, formatDate, weddingPublicUrl } from '../../../lib/format';
import type { Wedding } from '../../../types/database';
import WeddingMediaPanel from '../../../components/WeddingMediaPanel';

const LINK_EXPIRY_DAYS = 14;

export default function WeddingDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [lastEventDate, setLastEventDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const clientCreated = (location.state as { clientCreated?: { email: string; password: string } } | null)
    ?.clientCreated;

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const [{ data, error }, { data: evs }] = await Promise.all([
        db.from('weddings').select('*').eq('id', id).single(),
        db.from('wedding_events').select('date').eq('wedding_id', id).not('date', 'is', null).order('date', { ascending: false }).limit(1),
      ]);
      if (active) {
        if (error) setError(error.message);
        else setWedding(data);
        setLastEventDate(evs?.[0]?.date ?? null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <p className="text-ink-secondary">Chargement…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!wedding) return <p className="text-ink-secondary">Mariage introuvable.</p>;

  const publicUrl = weddingPublicUrl(wedding.slug);
  // Si `access_end` n'est pas défini manuellement, le lien expire tout seul
  // 14 jours après le dernier évènement du programme (voir wedding_is_accessible en base).
  const autoExpiry = lastEventDate ? new Date(new Date(lastEventDate).getTime() + LINK_EXPIRY_DAYS * 86400000) : null;
  const effectiveEnd = wedding.access_end ? new Date(wedding.access_end) : autoExpiry;
  const canAccess =
    wedding.is_active &&
    (!wedding.access_start || new Date(wedding.access_start) <= new Date()) &&
    (!effectiveEnd || effectiveEnd >= new Date());

  async function toggleActive(next: boolean) {
    if (!wedding) return;
    setNotice('');
    setError('');
    const { error } = await db.from('weddings').update({ is_active: next }).eq('id', wedding.id);
    if (error) {
      setError(error.message);
      return;
    }
    setWedding({ ...wedding, is_active: next });
    setNotice(next ? 'Compte activé — lien maintenant accessible.' : 'Compte désactivé — lien inaccessible.');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice(`Copiez ce lien : ${publicUrl}`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/weddings" className="inline-flex rounded-md p-2 text-ink-secondary hover:bg-paper-cream">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-[12rem]">
          <h1 className="font-display text-2xl font-bold text-ink">{wedding.name}</h1>
          {wedding.secondary_name && <p className="text-ink-secondary">&amp; {wedding.secondary_name}</p>}
        </div>
        <Link to={`/admin/weddings/${wedding.id}/config/sections`} className="btn-outline">
          <Settings className="h-4 w-4" />
          Sections / Thème / Programme
        </Link>
        <Link to={`/admin/weddings/${wedding.id}/checkin`} className="btn-outline">
          <ScanLine className="h-4 w-4" />
          Pointage entrée
        </Link>
        <Link to={`/admin/weddings/${wedding.id}/edit`} className="btn-outline">
          <Pencil className="h-4 w-4" />
          Modifier
        </Link>
      </div>

      {notice && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {clientCreated && (
        <div className="rounded-2xl border border-gold/40 bg-gold/5 p-4">
          <div className="mb-1 flex items-center gap-2 font-semibold text-ink">
            <User className="h-4 w-4 text-gold" />
            Compte client créé — à transmettre aux mariés
          </div>
          <p className="text-sm text-ink-secondary">
            Ils se connectent sur <span className="font-mono">/login</span> puis configurent leur site.
          </p>
          <div className="mt-2 space-y-1 rounded-lg bg-white/70 p-3 font-mono text-sm text-ink">
            <div>Email : {clientCreated.email}</div>
            <div>Mot de passe : {clientCreated.password}</div>
          </div>
        </div>
      )}

      <div className="card space-y-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs uppercase tracking-wide text-ink-secondary">Statut</dt><dd>{wedding.is_active ? <span className="badge-green">Actif</span> : <span className="badge-red">Inactif</span>}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-ink-secondary">Accès</dt><dd>{canAccess ? <span className="badge-green">Lien accessible</span> : <span className="badge-amber">Hors période / inactive</span>}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-ink-secondary">Type d'évènement</dt><dd>{wedding.event_type ?? 'Évènement'}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-ink-secondary">Template</dt><dd>{wedding.template}</dd></div>
          {wedding.client_email && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-secondary">
                <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Compte client</span>
              </dt>
              <dd className="font-mono text-sm">{wedding.client_email}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-secondary">Période d'accès</dt>
            <dd>
              {formatDateTime(wedding.access_start)} → {wedding.access_end ? formatDateTime(wedding.access_end) : autoExpiry ? `${formatDateTime(autoExpiry.toISOString())} (auto, 14j après le dernier évènement)` : '—'}
            </dd>
          </div>
          <div><dt className="text-xs uppercase tracking-wide text-ink-secondary">Créé le</dt><dd>{formatDate(wedding.created_at)}</dd></div>
        </dl>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">Lien du site public</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md bg-paper-cream px-3 py-2 text-sm text-ink">{publicUrl}</code>
          <button onClick={copyLink} className="btn-outline" title="Copier le lien">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="btn-outline" title="Ouvrir">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <p className="text-xs text-ink-secondary">Partagez ce lien aux invités (RSVP, table, galerie…).</p>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-ink">État du compte</h2>
          <p className="text-sm text-ink-secondary">Désactiver le compte rend le lien inaccessible.</p>
        </div>
        {wedding.is_active ? (
          <button onClick={() => toggleActive(false)} className="btn-danger">
            <PowerOff className="h-4 w-4" />
            Désactiver
          </button>
        ) : (
          <button onClick={() => toggleActive(true)} className="btn-primary">
            <Power className="h-4 w-4" />
            Activer
          </button>
        )}
      </div>

      <WeddingMediaPanel wedding={wedding} publicUrl={publicUrl} />
    </div>
  );
}
