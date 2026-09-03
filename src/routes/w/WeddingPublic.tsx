import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Wedding, WeddingEvent, Section } from '../../types/database';
import SectionRenderer from './sections';

/**
 * Site public d'un mariage : /w/:slug.
 * Phase 3 : moteur de gabarits — rend les sections actives, triées par
 * position. Le filtrage (période d'accès / statut actif) est appliqué
 * côté back-end (RLS) : si le mariage est injoignable, wedding est null.
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
      setSections((secs ?? [])
        .filter((s) => s.enabled)
        .sort((a, b) => a.position - b.position));
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

  return (
    <div className="min-h-screen bg-paper text-ink">
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} wedding={wedding} events={events} />
      ))}

      <footer className="border-t border-borderlight py-8 text-center text-sm text-ink-secondary">
        <span className="font-display text-lg text-gold">&amp;</span> {wedding.name}
        {wedding.secondary_name ? ` & ${wedding.secondary_name}` : ''} — bienvenue&nbsp;
        <span className="inline-flex items-center gap-1">{new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}