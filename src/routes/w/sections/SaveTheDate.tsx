import { Heart } from 'lucide-react';
import type { WeddingEvent } from '../../../types/database';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell, SectionTitle } from './shell';
import { formatDate } from '../../../lib/format';

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
 * Section "Save the date" : mini-calendrier du mois du mariage avec un cœur
 * posé sur le jour J. La date vient du contenu de la section, sinon du
 * premier sous-évènement du programme (comme pour le compte à rebours).
 * Le style suit entièrement la palette du template actif.
 */
export default function SaveTheDate({ content, accent, tpl, events }: SaveTheDateProps) {
  const c = asRecord(content);
  const title = str(c, 'title') || 'Réservez la date';
  const message = str(c, 'message');
  const dateStr = str(c, 'date') || events?.[0]?.date;
  const { palette } = tpl;

  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;

  const year = target.getFullYear();
  const month = target.getMonth();
  const day = target.getDate();
  const cells = monthGrid(year, month);
  const monthLabel = target.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const onAccent = tpl.id === 'royal' ? palette.ink : '#fff';

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <SectionTitle tpl={tpl} accent={accent}>{title}</SectionTitle>

        <div
          className="mx-auto mt-8 overflow-hidden rounded-2xl"
          style={{
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            boxShadow: tpl.id === 'royal' ? `0 0 0 1px ${palette.accent}33, 0 18px 45px rgba(0,0,0,0.35)` : '0 10px 30px rgba(0,0,0,0.06)',
          }}
        >
          <div
            className="py-3 text-sm font-medium uppercase tracking-[0.2em] tpl-body"
            style={{ backgroundColor: accent, color: onAccent }}
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
              const isTarget = d === day;
              return (
                <div key={i} className="relative flex h-9 items-center justify-center">
                  {d && (
                    <>
                      {isTarget && (
                        <Heart
                          className="absolute h-8 w-8"
                          style={{ color: accent }}
                          fill={accent}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className="relative font-display tpl-display text-sm font-semibold"
                        style={{ color: isTarget ? onAccent : palette.text }}
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

        <p className="mt-6 font-display tpl-display text-xl font-semibold" style={{ color: palette.ink }}>
          {formatDate(dateStr)}
        </p>
        {message && (
          <p className="mt-2 tpl-body" style={{ color: palette.muted }}>{message}</p>
        )}
      </div>
    </SectionShell>
  );
}
