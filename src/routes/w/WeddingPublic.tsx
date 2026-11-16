import { Link } from 'react-router-dom';
import type { WeddingEvent, Section } from '../../types/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/db';
import { useWeddingBySlug } from './useWeddingBySlug';
import WeddingThemeShell from './WeddingThemeShell';
import SectionRenderer from './sections';
import SplashScreen from './SplashScreen';
import EnvelopeIntro from './EnvelopeIntro';
import WelcomeModal from './WelcomeModal';
import { useInvitedGuest } from './useInvitedGuest';
import { PublicWeddingContext } from './publicContext';
import { getTemplate } from '../../lib/templates';
import { formatDate } from '../../lib/format';
import { coupleInitials, coupleLabel, invitationTheme } from '../../lib/invitation';

const WELCOME_SEEN_KEY = 'etan_welcome_seen:';

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
  const [envelopeDone, setEnvelopeDone] = useState(false);
  const [welcomeClosed, setWelcomeClosed] = useState(false);
  const invited = useInvitedGuest(wedding?.id);
  const closeEnvelope = useCallback(() => setEnvelopeDone(true), []);

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

  const dateLabel = useMemo(() => {
    const cover = sections.find((x) => x.type === 'cover');
    const c = cover?.content && typeof cover.content === 'object' && !Array.isArray(cover.content)
      ? (cover.content as Record<string, unknown>)
      : {};
    if (typeof c['date'] === 'string' && c['date']) return c['date'] as string;
    const first = events.find((e) => e.date);
    return first?.date ? formatDate(first.date) : '';
  }, [sections, events]);

  useEffect(() => {
    if (wedding) document.title = `${coupleLabel(wedding)} — Invitation`;
  }, [wedding]);

  if (weddingLoading || (wedding && (loading || invited.loading))) return <p className="p-8 text-center text-ink-secondary">Chargement…</p>;

  if (!wedding) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper-warm px-6 text-center">
        <p className="font-display text-4xl font-bold text-gold">Ce lien n'est pas disponible.</p>
        <p className="mt-2 text-ink-secondary">Le mariage est peut-être inactif ou hors période d'accès.</p>
        <Link to="/" className="btn-primary mt-6">Accueil</Link>
      </div>
    );
  }

  const tpl = getTemplate(wedding.template);
  const theme = wedding.theme && typeof wedding.theme === 'object' && !Array.isArray(wedding.theme)
    ? (wedding.theme as Record<string, unknown>)
    : {};
  const accent = (theme['primaryColor'] as string) ?? '#C9A34A';
  const inv = invitationTheme(wedding.theme);
  const couple = coupleLabel(wedding);
  const hasSplash = !!wedding.splash_media_url &&
    (wedding.splash_media_type === 'video' || wedding.splash_media_type === 'gif');
  const splashVisible = showSplash && hasSplash;
  const envelopeVisible = inv.envelopeEnabled && !envelopeDone && !splashVisible;
  const guest = invited.guest;
  let welcomeAlreadySeen = false;
  try {
    welcomeAlreadySeen = !!guest && sessionStorage.getItem(WELCOME_SEEN_KEY + guest.id) === '1';
  } catch {
    /* stockage indisponible */
  }
  const welcomeVisible = !!guest && invited.fromLink && !welcomeAlreadySeen && !welcomeClosed &&
    !splashVisible && !envelopeVisible;

  function closeWelcome() {
    setWelcomeClosed(true);
    try {
      if (guest) sessionStorage.setItem(WELCOME_SEEN_KEY + guest.id, '1');
    } catch {
      /* ignore */
    }
  }

  return (
    <PublicWeddingContext.Provider value={{ invitedGuest: guest, couple, dateLabel, tpl }}>
      {envelopeVisible && (
        <div style={{ ['--w-font' as string]: tpl.fonts.display }}>
          <EnvelopeIntro
            tpl={tpl}
            accent={accent}
            monogram={inv.envelopeMonogram || coupleInitials(wedding)}
            couple={couple}
            guestName={guest?.name}
            color={inv.envelopeColor}
            tagline={inv.envelopeTagline}
            onDone={closeEnvelope}
          />
        </div>
      )}
      {welcomeVisible && guest && (
        <div style={{ ['--w-font' as string]: tpl.fonts.display }}>
        <WelcomeModal
          guest={guest}
          weddingId={wedding.id}
          couple={couple}
          tpl={tpl}
          accent={accent}
          hasPassSection={sections.some((x) => x.type === 'rsvp')}
          onClose={closeWelcome}
        />
        </div>
      )}
      {invited.invalidLink && !guest && (
        <div className="fixed inset-x-0 top-0 z-40 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 shadow">
          Ce lien d'invitation n'est plus valide. Vous pouvez retrouver votre pass dans la section « Confirmation ».
        </div>
      )}
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
    </PublicWeddingContext.Provider>
  );
}
