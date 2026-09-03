import { MapPin, CalendarDays } from 'lucide-react';
import type { WeddingEvent } from '../../../types/database';
import { formatDateTime } from '../../../lib/format';
import type { SectionProps } from './types';

export interface ProgramProps extends SectionProps {
  events: WeddingEvent[];
}

/** Section "programme" : liste des sous-évènements (dot, mairie, église, soirée...). */
export default function Program({ events, accent }: ProgramProps) {
  if (events.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-14 text-center">
        <h2 className="font-display text-3xl font-bold text-ink">Au programme</h2>
        <p className="mt-3 text-ink-secondary">Le programme arrive prochainement.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-14">
      <div className="text-center">
        <CalendarDays className="mx-auto h-6 w-6" style={{ color: accent }} />
        <h2 className="mt-2 font-display text-3xl font-bold text-ink">Au programme</h2>
      </div>

      <ol className="relative mt-10 space-y-8 border-l-2 border-gold/30 pl-8">
        {events.map((ev) => (
          <li key={ev.id} className="relative">
            <span
              className="absolute -left-[41px] top-1 h-3 w-3 rounded-full border-2 border-white"
              style={{ backgroundColor: accent, boxShadow: '0 0 0 3px rgba(201,163,74,0.2)' }}
            />
            <p className="font-display text-xl font-bold text-ink">{ev.name}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-gold-dark">
              <CalendarDays className="h-4 w-4" />
              {formatDateTime(ev.date)}
            </p>
            {ev.location_title && (
              <p className="mt-1 flex items-center gap-2 text-sm text-ink-secondary">
                <MapPin className="h-4 w-4 text-gold" />
                {ev.location_title}
                {ev.location_address && <span> — {ev.location_address}</span>}
              </p>
            )}
            {ev.location_maps_url && (
              <a
                href={ev.location_maps_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs text-gold-dark underline hover:text-gold"
              >
                Localisation exacte
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}