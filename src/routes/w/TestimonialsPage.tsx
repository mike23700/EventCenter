import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircleHeart } from 'lucide-react';
import { db } from '../../lib/db';
import type { Testimonial } from '../../types/database';
import { useWeddingBySlug } from './useWeddingBySlug';
import WeddingThemeShell from './WeddingThemeShell';
import TestimonialForm from './sections/TestimonialForm';
import { weddingTemplate } from '../../lib/themeLook';
import { readTextStyles, textStyleCss, textStyleFontHrefs, TextStyleContext } from '../../lib/textStyles';
import TestimonialSlides from './TestimonialSlides';

/**
 * Page dédiée : tous les témoignages validés en diaporama horizontal
 * (/w/:slug/temoignages), avec les styles de texte de la section Livre d'or.
 * Accessible depuis le bouton « Voir tous les témoignages » du site
 * principal ou directement via le QR code généré côté client/admin.
 */
export default function TestimonialsPage() {
  const { wedding, loading: weddingLoading } = useWeddingBySlug();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  // réglages de la section Livre d'or (titre, intro, publication immédiate)
  const [section, setSection] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!wedding) return;
    let active = true;
    (async () => {
      const { data } = await db
        .from('sections')
        .select('content')
        .eq('wedding_id', wedding.id)
        .eq('type', 'testimonials')
        .limit(1);
      const c = (data as { content: unknown }[] | null)?.[0]?.content;
      if (active && c && typeof c === 'object' && !Array.isArray(c)) setSection(c as Record<string, unknown>);
    })();
    return () => {
      active = false;
    };
  }, [wedding]);
  const autoPublish = section['auto_publish'] === true || section['auto_publish'] === 'true';
  const title = typeof section['title'] === 'string' && section['title'].trim() ? section['title'] : 'Témoignages';
  const intro = typeof section['intro'] === 'string' && section['intro'].trim() ? section['intro'] : 'Laissez un petit mot aux mariés.';

  useEffect(() => {
    if (!wedding) return;
    let active = true;
    (async () => {
      const { data } = await db
        .from('testimonials')
        .select('*')
        .eq('wedding_id', wedding.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (!active) return;
      setItems((data ?? []) as Testimonial[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [wedding, reloadKey]);

  if (weddingLoading || (wedding && loading)) return <p className="p-8 text-center text-ink-secondary">Chargement…</p>;

  if (!wedding) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper-warm px-6 text-center">
        <p className="font-display text-4xl font-bold text-gold">Ce lien n'est pas disponible.</p>
        <Link to="/" className="btn-primary mt-6">Accueil</Link>
      </div>
    );
  }

  const tpl = weddingTemplate(wedding);
  const { palette } = tpl;
  const accent = (wedding.theme && typeof wedding.theme === 'object'
    ? (wedding.theme as Record<string, unknown>)['primaryColor'] as string
    : undefined) ?? palette.accent;

  const textStyles = readTextStyles(section);

  return (
    <WeddingThemeShell wedding={wedding}>
      <TextStyleContext.Provider value={textStyles}>
      {textStyleFontHrefs(textStyles).map((href) => <link key={href} rel="stylesheet" href={href} />)}
      <div className="mx-auto max-w-2xl px-6 pt-14">
        <Link
          to={`/w/${wedding.slug}`}
          className="inline-flex items-center gap-2 text-sm tpl-body"
          style={{ color: palette.muted }}
        >
          <ArrowLeft className="h-4 w-4" /> Retour au site
        </Link>

        <div className="mt-6 text-center">
          <MessageCircleHeart className="mx-auto h-6 w-6" style={{ color: accent }} />
          <h1 className="mt-2 font-display tpl-display text-3xl sm:text-4xl font-bold" style={{ color: palette.ink, ...textStyleCss(textStyles.title) }}>
            {title}
          </h1>
          <p className="mt-2 tpl-body" style={{ color: palette.muted, ...textStyleCss(textStyles.subtitle) }}>
            {intro}
          </p>
        </div>

        <div className="mt-8">
          <TestimonialForm
            weddingId={wedding.id}
            accent={accent}
            tpl={tpl}
            autoPublish={autoPublish}
            onSent={() => autoPublish && setReloadKey((k) => k + 1)}
          />
        </div>

      </div>

      <div className="mx-auto max-w-5xl pb-14 pt-10">
        {items.length === 0 ? (
          <p className="text-center text-sm tpl-body" style={{ color: palette.muted }}>
            Aucun témoignage publié pour l'instant.
          </p>
        ) : (
          <>
            <p className="mb-4 text-center tpl-body text-xs uppercase tracking-[0.25em]" style={{ color: palette.muted }}>
              {items.length} message{items.length > 1 ? 's' : ''} — faites glisser
            </p>
            <TestimonialSlides items={items} tpl={tpl} accent={accent} label={title as string} />
          </>
        )}
      </div>
      </TextStyleContext.Provider>
    </WeddingThemeShell>
  );
}
