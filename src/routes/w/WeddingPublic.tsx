import { Link } from 'react-router-dom';
import type { WeddingEvent, Section } from '../../types/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/db';
import { useWeddingBySlug } from './useWeddingBySlug';
import WeddingThemeShell from './WeddingThemeShell';
import SectionRenderer from './sections';
import SplashScreen from './SplashScreen';
import IntroScreen from './IntroScreen';
import AmbientPetals from './AmbientPetals';
import StickyHeader from './StickyHeader';
import { siteOptions } from '../../lib/siteOptions';
import WelcomeModal from './WelcomeModal';
import { useInvitedGuest } from './useInvitedGuest';
import { useShareLink, visibleEvents } from './useShareLink';
import { PublicWeddingContext } from './publicContext';
import { weddingTemplate } from '../../lib/themeLook';
import { formatDate } from '../../lib/format';
import { coupleInitials, coupleLabel } from '../../lib/invitation';

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
  const share = useShareLink(wedding?.id);
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

  // Programme montré : étapes de l'invité identifié, sinon du lien par
  // étape, sinon tout (voir useShareLink.ts).
  const shownEvents = useMemo(
    () => visibleEvents(events, invited.guest?.invited_events?.length ? invited.guest.invited_events : share.link?.event_ids),
    [events, invited.guest, share.link],
  );

  const dateLabel = useMemo(() => {
    const cover = sections.find((x) => x.type === 'cover');
    const c = cover?.content && typeof cover.content === 'object' && !Array.isArray(cover.content)
      ? (cover.content as Record<string, unknown>)
      : {};
    if (typeof c['date'] === 'string' && c['date']) return c['date'] as string;
    const first = shownEvents.find((e) => e.date);
    return first?.date ? formatDate(first.date) : '';
  }, [sections, shownEvents]);

  // Date courte du bandeau fixe : « 18 · 12 · 2026 ».
  const dateShort = useMemo(() => {
    const first = shownEvents.find((e) => e.date && !e.parent_id) ?? shownEvents.find((e) => e.date);
    if (!first?.date) return '';
    const d = new Date(first.date);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())} · ${p(d.getMonth() + 1)} · ${d.getFullYear()}`;
  }, [shownEvents]);

  useEffect(() => {
    if (wedding) document.title = `${coupleLabel(wedding)} — Invitation`;
  }, [wedding]);

  if (weddingLoading || (wedding && (loading || invited.loading || share.loading))) return <p className="p-8 text-center text-ink-secondary">Chargement…</p>;

  if (!wedding) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper-warm px-6 text-center">
        <p className="font-display text-4xl font-bold text-gold">Ce lien n'est pas disponible.</p>
        <p className="mt-2 text-ink-secondary">Le mariage est peut-être inactif ou hors période d'accès.</p>
        <Link to="/" className="btn-primary mt-6">Accueil</Link>
      </div>
    );
  }

  const tpl = weddingTemplate(wedding);
  const theme = wedding.theme && typeof wedding.theme === 'object' && !Array.isArray(wedding.theme)
    ? (wedding.theme as Record<string, unknown>)
    : {};
  const accent = (theme['primaryColor'] as string) ?? '#C9A34A';
  const opts = siteOptions(wedding.theme, tpl);
  const couple = coupleLabel(wedding);
  const monogram = coupleInitials(wedding);
  const hasSplash = !!wedding.splash_media_url &&
    (wedding.splash_media_type === 'video' || wedding.splash_media_type === 'gif');
  const splashVisible = showSplash && hasSplash;
  // Page de garde (enveloppe, image/GIF, vidéo ou simple) : facultative.
  const envelopeVisible = opts.intro.enabled && !envelopeDone && !splashVisible;
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
    <PublicWeddingContext.Provider value={{ invitedGuest: guest, couple, dateLabel, tpl, linkCode: share.link?.code ?? null }}>
      {envelopeVisible && (
        <div style={{ ['--w-font' as string]: tpl.fonts.display, overflowWrap: 'anywhere' }}>
          <IntroScreen
            tpl={tpl}
            accent={accent}
            options={opts}
            couple={couple}
            monogram={monogram}
            dateLabel={dateLabel}
            guestName={guest?.name}
            onDone={closeEnvelope}
          />
        </div>
      )}
      {welcomeVisible && guest && (
        <div style={{ ['--w-font' as string]: tpl.fonts.display, overflowWrap: 'anywhere' }}>
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
        {!envelopeVisible && <AmbientPetals kind={opts.ambient} colors={opts.ambientColors} />}
        {opts.stickyHeader && (
          <StickyHeader tpl={tpl} accent={accent} monogram={monogram} couple={couple} dateShort={dateShort} />
        )}
        {sections.map((section) => (
          <SectionRenderer key={section.id} section={section} wedding={wedding} events={shownEvents} />
        ))}
      </WeddingThemeShell>
    </PublicWeddingContext.Provider>
  );
}
