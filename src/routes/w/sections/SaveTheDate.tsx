import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import type { WeddingEvent } from '../../../types/database';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell, SectionTitle } from './shell';
import { useTextStyle } from '../../../lib/textStyles';
import { formatDateNoYear } from '../../../lib/format';
import { getKnownGuestToken, onKnownGuestChange } from './guestSession';
import { resolveGuest } from '../../../lib/publicApi';

export interface SaveTheDateProps extends SectionProps {
  events: WeddingEvent[];
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Grille d'un mois (7 colonnes, cases vides avant/après pour aligner les jours). */
function monthGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Section "Save the date" : mini-calendrier du/des mois du mariage avec un
 * cœur posé sur chaque jour J. La date vient du contenu de la section (un
 * seul cœur dans ce cas), sinon de tous les évènements du programme — si
 * ceux-ci tombent sur des mois différents (ex. mairie en septembre, église
 * le mois suivant), un calendrier est affiché par mois concerné.
 * Le style suit entièrement la palette du template actif. Les cœurs des
 * jours ne sont remplis qu'aux étapes auxquelles l'invité identifié dans ce
 * navigateur (inscrit ou retrouvé via le QR) a confirmé sa venue ; les
 * autres jours de programme restent en contour — voir `guestSession.ts`.
 */
export default function SaveTheDate({ content, accent, tpl, events, wedding }: SaveTheDateProps) {
  const c = asRecord(content);
  const title = str(c, 'title') || 'Réservez la date';
  const message = str(c, 'message');
  const manualDate = str(c, 'date');

  const [invitedEvents, setInvitedEvents] = useState<string[] | null>(null);
  const ts = useTextStyle();

  useEffect(() => {
    let active = true;

    function loadKnownGuest() {
      const token = getKnownGuestToken(wedding.id);
      if (!token) {
        setInvitedEvents(null);
        return;
      }
      resolveGuest(wedding.id, token)
        .then((g) => {
          if (active) setInvitedEvents(g ? g.invited_events ?? [] : null);
        })
        .catch(() => {
          if (active) setInvitedEvents(null);
        });
    }

    loadKnownGuest();
    // L'invité peut s'identifier (inscription/QR retrouvé) via une autre
    // section de la même page, une fois ce composant déjà monté.
    const unsubscribe = onKnownGuestChange(wedding.id, loadKnownGuest);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [wedding.id]);

  // Sans date manuelle : un jour par évènement du programme, avec son
  // identifiant "de rattachement" (celui d'une sous-étape est ramené à sa
  // maman, ex. cocktail → soirée) pour vérifier si l'invité y est convié.
  const programDays = (events ?? [])
    .filter((e) => e.date)
    .map((e) => ({ date: e.date as string, refId: e.parent_id ?? e.id }));

  const dateStrs = manualDate
    ? [manualDate]
    : Array.from(new Set(programDays.map((e) => e.date)));

  const validDates = dateStrs
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (validDates.length === 0) return null;

  const { palette } = tpl;
  const onAccent = tpl.id === 'royal' ? palette.ink : '#fff';

  // Regroupe les dates par mois (une carte de calendrier par mois concerné).
  // `refIds === null` = date manuelle (pas d'étape précise à vérifier, cœur
  // toujours plein) ; sinon, liste des étapes de ce jour à confronter à
  // `invitedEvents`.
  const monthsMap = new Map<string, { year: number; month: number; days: Map<number, string[] | null> }>();
  for (const d of validDates) {
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${month}`;
    if (!monthsMap.has(key)) monthsMap.set(key, { year, month, days: new Map() });
    const day = d.getDate();
    const refIds = manualDate
      ? null
      : programDays.filter((e) => new Date(e.date).toDateString() === d.toDateString()).map((e) => e.refId);
    monthsMap.get(key)!.days.set(day, refIds);
  }
  const months = Array.from(monthsMap.values());

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <SectionTitle tpl={tpl} accent={accent}>{title}</SectionTitle>

        <div className={`mx-auto mt-8 flex flex-wrap justify-center gap-6 ${months.length > 1 ? '' : 'max-w-md'}`}>
          {months.map(({ year, month, days }) => {
            const cells = monthGrid(year, month);
            const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            return (
              <div
                key={`${year}-${month}`}
                className="w-full max-w-md flex-1 overflow-hidden rounded-2xl"
                style={{
                  backgroundColor: palette.surface,
                  border: `1px solid ${palette.border}`,
                  boxShadow: tpl.id === 'royal' ? `0 0 0 1px ${palette.accent}33, 0 18px 45px rgba(0,0,0,0.35)` : '0 10px 30px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="py-3 text-sm font-medium uppercase tracking-[0.2em] tpl-body"
                  style={{ backgroundColor: accent, color: onAccent, ...ts('calendar'), fontSize: undefined }}
                >
                  {monthLabel}
                </div>

                <div
                  className="grid grid-cols-7 gap-y-2 px-4 pt-4 text-[11px] uppercase tracking-wide"
                  style={{ color: palette.muted }}
                >
                  {WEEKDAYS.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-2 px-4 pb-6 pt-2">
                  {cells.map((d, i) => {
                    const refIds = d !== null ? days.get(d) : undefined;
                    const hasHeart = refIds !== undefined;
                    // Plein : date manuelle (refIds === null), ou l'invité identifié
                    // a confirmé au moins une des étapes de ce jour.
                    const filled = hasHeart && (refIds === null || (invitedEvents?.some((id) => refIds.includes(id)) ?? false));
                    return (
                      <div key={i} className="relative flex h-9 items-center justify-center">
                        {d && (
                          <>
                            {hasHeart && (
                              <Heart
                                className="absolute h-8 w-8"
                                style={{ color: accent }}
                                fill={filled ? accent : 'none'}
                                strokeWidth={1.5}
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className="relative font-display tpl-display text-sm font-semibold"
                              style={{ color: filled ? onAccent : palette.text }}
                            >
                              {d}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 font-display tpl-display text-base font-semibold" style={{ color: palette.ink, ...ts('calendar') }}>
          {validDates.map((d) => formatDateNoYear(d.toISOString())).join(' · ')}
        </p>
        {message && (
          <p className="mt-2 tpl-body" style={{ color: palette.muted, ...ts('text') }}>{message}</p>
        )}
      </div>
    </SectionShell>
  );
}
