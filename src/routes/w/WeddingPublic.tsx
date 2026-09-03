import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, MapPin, CalendarDays } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Wedding, WeddingEvent, Section } from '../../types/database';
import { formatDate } from '../../lib/format';

/**
 * Site public d'un mariage : /w/:slug.
 * Phase 1 : filtre selon période d'accès et statut actif (appliqué par le RLS back-end).
 * Le rendu complet des sections (module) arrive à la phase 3.
 */
export default function WeddingPublic() {
  const { slug } = useParams();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    (async () => {
      const { data: w, error: werr } = await supabase
        .from('weddings')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (!active) return;
      if (werr || !w) {
        setLoading(false);
        return;
      }
      setWedding(w);
      const [{ data: evs }, { data: secs }] = await Promise.all([
        supabase.from('wedding_events').select('*').eq('wedding_id', w.id).order('position'),
        supabase.from('sections').select('*').eq('wedding_id', w.id).order('position'),
      ]);
      if (!active) return;
      setEvents(evs ?? []);
      setSections((secs ?? []).filter((s) => s.enabled));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) return <p className="p-8 text-center text-ink-secondary">Chargement…</p>;

  if (!wedding) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper-warm px-6 text-center">
        <p className="font-display text-4xl font-bold text-gold">Ce lien n'est pas disponible.</p>
        <p className="mt-2 text-ink-secondary">Le mariage est peut-être inactif ou hors période d'accès.</p>
        <Link to="/" className="btn-primary mt-6">Accueil</Link>
      </div>
    );
  }

  const theme = wedding.theme as { primaryColor?: string } | null;
  const accent = theme?.primaryColor ?? '#C9A34A';

  return (
    <div style={{ ['--w-accent' as string]: accent }} className="min-h-screen bg-paper text-ink">
      {/* En-tête / couverture provisoire (rendu complet en phase 3) */}
      <header className="relative flex min-h-[60vh] items-end justify-center bg-gradient-to-b from-ink/80 via-ink/70 to-ink p-8 text-center text-white">
        {wedding.cover_image && (
          <img
            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/covers/${wedding.cover_image}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        )}
        <div className="relative">
          {wedding.logo && (
            <img
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${wedding.logo}`}
              alt="logo"
              className="mx-auto mb-4 h-16 w-16 rounded-full object-cover"
            />
          )}
          <h1 className="font-display text-4xl font-bold sm:text-6xl">
            {wedding.name}
            {wedding.secondary_name && <span className="block text-2xl sm:text-4xl">&amp; {wedding.secondary_name}</span>}
          </h1>
          {wedding.event_type && <p className="mt-3 text-lg text-white/80">{wedding.event_type}</p>}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* Carte "Lieu / prochain évènement" (aperçu phase 1) */}
        <section className="mb-10 rounded-2xl border border-borderlight bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold" style={{ color: accent }}>
            <CalendarDays className="h-5 w-5" /> Au programme
          </h2>
          {events.length === 0 ? (
            <p className="text-ink-secondary">Le programme arrive prochainement.</p>
          ) : (
            <ul className="space-y-4">
              {events.map((ev) => (
                <li key={ev.id} className="flex items-start gap-3 rounded-lg border border-borderlight bg-paper-warm p-3">
                  <span className="mt-0.5 text-gold"><MapPin className="h-4 w-4" /></span>
                  <div>
                    <p className="font-semibold text-ink">{ev.name}</p>
                    <p className="text-sm text-ink-secondary">{formatDate(ev.date ?? undefined)}</p>
                    {ev.location_title && <p className="text-sm text-ink-secondary">{ev.location_title}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-ink-secondary">
          <Heart className="mr-1 inline h-3 w-3" style={{ color: accent }} fill="currentColor" />
          Sections actives : {sections.map((s) => s.type).join(', ') || 'aucune'}
        </p>
      </main>
    </div>
  );
}