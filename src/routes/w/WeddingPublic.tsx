import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Wedding, WeddingEvent, Section } from '../../types/database';
import { getTemplate } from '../../lib/templates';
import { DISPLAY_FONTS } from '../../lib/format';
import SectionRenderer from './sections';

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

  const theme = wedding.theme && typeof wedding.theme === 'object'
    ? (wedding.theme as Record<string, unknown>)
    : {};
  const accent = (theme['primaryColor'] as string) ?? '#C9A34A';
  const displayFont = (theme['displayFont'] as string) ?? '';
  const tpl = getTemplate(wedding.template);
  const overrideFont = DISPLAY_FONTS.find((f) => f.id === displayFont && !tpl.fonts.display.includes(f.id));
  const {
    background, surface, text, muted, ink, border, accent: tplAccent, accentSoft,
  } = tpl.palette;

  return (
    <div
      className="min-h-screen font-display"
      style={{
        backgroundColor: background,
        color: text,
        ['--w-accent' as string]: accent,
        ['--w-font' as string]: overrideFont?.stack ?? tpl.fonts.display,
        ['--tpl-bg' as string]: background,
        ['--tpl-surface' as string]: surface,
        ['--tpl-accent' as string]: tplAccent,
        ['--tpl-accent-soft' as string]: accentSoft,
        ['--tpl-text' as string]: text,
        ['--tpl-muted' as string]: muted,
        ['--tpl-ink' as string]: ink,
        ['--tpl-border' as string]: border,
      }}
    >
      {/* Typographies du template */}
      <link rel="stylesheet" href={tpl.googleFonts[0]} />
      {overrideFont?.href && <link rel="stylesheet" href={overrideFont.href} />}
      <style>{`
        .font-display { font-family: var(--w-font), ${tpl.fonts.display}; }
        .tpl-body { font-family: ${tpl.fonts.body}; }
      `}</style>

      {/* Fond ambiance selon le template (subtile) */}
      {tpl.id === 'africain' && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(${tplAccent}66 1px, transparent 1px), linear-gradient(90deg, ${tplAccent}66 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      )}
      {tpl.id === 'florale' && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.045]"
          style={{
            backgroundImage: `radial-gradient(circle at 15% 20%, ${tplAccent} 0 3px, transparent 4px), radial-gradient(circle at 85% 70%, ${tplAccent} 0 2px, transparent 3px), radial-gradient(circle at 70% 15%, ${tplAccent} 0 2px, transparent 3px)`,
            backgroundSize: '160px 160px',
          }}
        />
      )}

      <div className="relative z-10">
        {sections.map((section) => (
          <SectionRenderer key={section.id} section={section} wedding={wedding} events={events} />
        ))}

        <footer
          className="border-t py-10 text-center text-sm"
          style={{ borderColor: border, color: muted }}
        >
          <span className="font-display tpl-display text-xl" style={{ color: accent }}>
            &amp;
          </span>
          {' '}{wedding.name}
          {wedding.secondary_name ? ` & ${wedding.secondary_name}` : ''} — bienvenue&nbsp;
          <span className="inline-flex items-center gap-1">{new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}