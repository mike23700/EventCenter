import { Link } from 'react-router-dom';
import type { WeddingEvent, Section } from '../../types/database';
import { useEffect, useState } from 'react';
import { db } from '../../lib/db';
import { useWeddingBySlug } from './useWeddingBySlug';
import WeddingThemeShell from './WeddingThemeShell';
import SectionRenderer from './sections';
import SplashScreen from './SplashScreen';

/**
 * Site public d'un mariage : /w/:slug.
 * Phase 3 : moteur de gabarits — rend les sections actives, triées par
 * position. Le filtrage (période d'accès / statut actif) est appliqué
 * côté back-end (RLS) : si le mariage est injoignable, wedding est null.
 *
 * Le template choisi par le client pilote toute la mise en page : palette,
 * typographies (Google Fonts) et ornements décoratifs.
 */
export default function WeddingPublic() {
  const { wedding, loading: weddingLoading } = useWeddingBySlug();
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!wedding) return;
    let active = true;
    (async () => {
      const [{ data: evs }, { data: secs }] = await Promise.all([
        db.from('wedding_events').select('*').eq('wedding_id', wedding.id).order('position'),
        db.from<Section>('sections').select('*').eq('wedding_id', wedding.id).order('position'),
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
  }, [wedding]);

  if (weddingLoading || (wedding && loading)) return <p className="p-8 text-center text-ink-secondary">Chargement…</p>;

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
    <>
      {showSplash && wedding.splash_media_url &&
        (wedding.splash_media_type === 'video' || wedding.splash_media_type === 'gif') && (
        <SplashScreen
          mediaPath={wedding.splash_media_url}
          mediaType={wedding.splash_media_type}
          onDone={() => setShowSplash(false)}
        />
      )}
      <WeddingThemeShell wedding={wedding}>
        {sections.map((section) => (
          <SectionRenderer key={section.id} section={section} wedding={wedding} events={events} />
        ))}
      </WeddingThemeShell>
    </>
  );
}
