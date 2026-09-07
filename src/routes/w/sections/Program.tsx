import { MapPin, CalendarDays } from 'lucide-react';
import type { WeddingEvent } from '../../../types/database';
import { formatDateTime } from '../../../lib/format';
import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { SectionShell } from './shell';
import { Crown, Flower } from '../../../lib/templates';

export interface ProgramProps extends SectionProps {
  events: WeddingEvent[];
}

/**
 * Section "programme" : parcours multi-étapes (dot, mairie, église,
 * soirée...). Chaque sous-évènement a sa date et son lieu. La mise en
 * page (timeline verticale, cartes alternées) varie selon le template.
 */
export default function Program({ events, accent, tpl }: ProgramProps) {
  const { palette, id } = tpl;
  const topLevel = events.filter((e) => !e.parent_id);
  const childrenOf = (evId: string) => events.filter((e) => e.parent_id === evId);

  if (events.length === 0) {
    return (
      <SectionShell tpl={tpl} accent={accent}>
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-display tpl-display text-3xl sm:text-4xl font-bold" style={{ color: palette.ink }}>
            Au programme
          </h2>
          <p className="mt-3 tpl-body" style={{ color: palette.muted }}>Le programme arrive prochainement.</p>
        </div>
      </SectionShell>
    );
  }

  // "africain" : cartes alternées en quinconce ; sinon timeline verticale.
  if (id === 'africain') {
    return (
      <SectionShell tpl={tpl} accent={accent}>
        <div className="mx-auto max-w-4xl px-6 py-16">
          <ProgramHeading accent={accent} tpl={tpl} />
          <div className="mt-12 space-y-12">
            {topLevel.map((ev, i) => (
              <div key={ev.id} className={`flex flex-col items-center gap-4 sm:flex-row ${i % 2 === 1 ? 'sm:flex-row-reverse' : ''}`}>
                <div
                  className="w-full flex-1 overflow-hidden rounded-2xl"
                  style={{
                    backgroundColor: palette.surface,
                    border: `1px solid ${palette.border}`,
                    borderLeftWidth: 4,
                    borderLeftColor: accent,
                  }}
                >
                  {ev.location_image && (
                    <img
                      src={storageUrl('media', ev.location_image) ?? ''}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                  )}
                  <div className="p-6">
                  <div className="flex items-center gap-2 text-xs tracking-widest uppercase" style={{ color: accent }}>
                    <span>Étape {i + 1}</span>
                  </div>
                  <h3 className="mt-2 font-display tpl-display text-2xl font-bold" style={{ color: palette.ink }}>
                    {ev.name}
                  </h3>
                  <p className="mt-3 flex items-center gap-2 text-sm tpl-body" style={{ color: palette.muted }}>
                    <CalendarDays className="h-4 w-4" style={{ color: accent }} />
                    {formatDateTime(ev.date)}
                  </p>
                  {ev.location_title && (
                    <p className="mt-1 flex items-center gap-2 text-sm tpl-body" style={{ color: palette.muted }}>
                      <MapPin className="h-4 w-4" style={{ color: accent }} />
                      {ev.location_title}
                      {ev.location_address && <span> — {ev.location_address}</span>}
                    </p>
                  )}
                  {ev.description && (
                    <p className="mt-2 whitespace-pre-line text-sm tpl-body" style={{ color: palette.muted }}>
                      {ev.description}
                    </p>
                  )}
                  {ev.location_maps_url && (
                    <a
                      href={ev.location_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-xs underline tpl-body"
                      style={{ color: accent }}
                    >
                      Localisation exacte
                    </a>
                  )}
                  {childrenOf(ev.id).length > 0 && (
                    <ul className="mt-4 space-y-2 border-t pt-3" style={{ borderColor: palette.border }}>
                      {childrenOf(ev.id).map((child) => (
                        <li key={child.id} className="text-sm tpl-body" style={{ color: palette.ink }}>
                          <span className="font-semibold">{child.name}</span>
                          {child.date && <span style={{ color: palette.muted }}> — {formatDateTime(child.date)}</span>}
                          {child.description && (
                            <p className="text-xs" style={{ color: palette.muted }}>{child.description}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  </div>
                </div>
                <div
                  className="flex h-14 w-14 flex-none items-center justify-center rounded-full font-display tpl-display text-xl font-bold"
                  style={{ backgroundColor: accent, color: palette.surface, boxShadow: `0 0 0 6px ${accent}22` }}
                >
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <ProgramHeading accent={accent} tpl={tpl} />
        <ol
          className="relative mt-12 space-y-10 pl-8"
          style={{ borderLeft: `2px solid ${accent}55` }}
        >
          {topLevel.map((ev, i) => (
            <li key={ev.id} className="relative">
              <span
                className="absolute -left-[41px] top-1 flex h-6 w-6 items-center justify-center"
                style={{ backgroundColor: palette.background, boxShadow: `0 0 0 2px ${accent}` }}
              >
                {id === 'royal' ? (
                  <Crown color={accent} className="h-3.5 w-3.5" />
                ) : (
                  <Flower color={accent} className="h-4 w-4" />
                )}
              </span>
              <div
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: palette.surface,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <div className="text-[11px] tracking-[0.3em] uppercase" style={{ color: accent }}>
                  Étape {i + 1}
                </div>
                <h3 className="font-display tpl-display text-xl font-bold" style={{ color: palette.ink }}>
                  {ev.name}
                </h3>
                <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: palette.muted }}>
                  <CalendarDays className="h-4 w-4" style={{ color: accent }} />
                  {formatDateTime(ev.date)}
                </p>
                {ev.location_title && (
                  <p className="mt-1 flex items-center gap-2 text-sm" style={{ color: palette.muted }}>
                    <MapPin className="h-4 w-4" style={{ color: accent }} />
                    {ev.location_title}
                    {ev.location_address && <span> — {ev.location_address}</span>}
                  </p>
                )}
                {ev.description && (
                  <p className="mt-2 whitespace-pre-line text-sm" style={{ color: palette.muted }}>
                    {ev.description}
                  </p>
                )}
                {ev.location_maps_url && (
                  <a
                    href={ev.location_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs underline"
                    style={{ color: accent }}
                  >
                    Localisation exacte
                  </a>
                )}
                {childrenOf(ev.id).length > 0 && (
                  <ul className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: palette.border }}>
                    {childrenOf(ev.id).map((child) => (
                      <li key={child.id} className="text-sm" style={{ color: palette.ink }}>
                        <span className="font-semibold">{child.name}</span>
                        {child.date && <span style={{ color: palette.muted }}> — {formatDateTime(child.date)}</span>}
                        {child.description && (
                          <p className="text-xs" style={{ color: palette.muted }}>{child.description}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </SectionShell>
  );
}

function ProgramHeading({
  accent,
  tpl,
}: {
  accent: string;
  tpl: SectionProps['tpl'];
}) {
  const { palette } = tpl;
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex items-center justify-center gap-3" style={{ color: accent }}>
        <CalendarDays className="h-6 w-6" />
      </div>
      <h2
        className="font-display tpl-display text-3xl sm:text-4xl font-bold"
        style={{ color: palette.ink }}
      >
        Notre programme
      </h2>
      <p className="mt-2 tpl-body" style={{ color: palette.muted }}>
        Chaque étape a son lieu et son horaire
      </p>
    </div>
  );
}