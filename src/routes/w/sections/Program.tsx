import { MapPin, CalendarDays, Navigation } from 'lucide-react';
import type { WeddingEvent } from '../../../types/database';
import { formatDateTime } from '../../../lib/format';
import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
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
export default function Program({ events, accent, tpl, content }: ProgramProps) {
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

  // Mise en page « cartes photo » (choisie dans l'éditeur de la section) :
  // la photo du lieu en fond plein cadre, quel que soit le template.
  if (str(asRecord(content), 'layout') === 'photo') {
    return <PhotoCards events={topLevel} childrenOf={childrenOf} accent={accent} tpl={tpl} />;
  }
  if (str(asRecord(content), 'layout') === 'hours') {
    return <HoursTimeline events={topLevel} childrenOf={childrenOf} accent={accent} tpl={tpl} title={str(asRecord(content), 'title')} />;
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
                    <img loading="lazy" decoding="async"
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
                    <div className="mt-1 text-sm tpl-body" style={{ color: palette.muted }}>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" style={{ color: accent }} />
                        {ev.location_title}
                      </p>
                      {ev.location_address && <p className="pl-6">{ev.location_address}</p>}
                    </div>
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
                className="overflow-hidden rounded-2xl"
                style={{
                  backgroundColor: palette.surface,
                  border: `1px solid ${palette.border}`,
                }}
              >
              {ev.location_image && (
                <img loading="lazy" decoding="async"
                  src={storageUrl('media', ev.location_image) ?? ''}
                  alt=""
                  className="h-36 w-full object-cover"
                />
              )}
              <div className="p-5">
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
                  <div className="mt-1 text-sm" style={{ color: palette.muted }}>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" style={{ color: accent }} />
                      {ev.location_title}
                    </p>
                    {ev.location_address && <p className="pl-6">{ev.location_address}</p>}
                  </div>
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
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function PhotoCards({
  events,
  childrenOf,
  accent,
  tpl,
}: {
  events: WeddingEvent[];
  childrenOf: (id: string) => WeddingEvent[];
  accent: string;
  tpl: SectionProps['tpl'];
}) {
  const { palette } = tpl;
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-5 py-16">
        <ProgramHeading accent={accent} tpl={tpl} />
        <div className="mt-10 space-y-5">
          {events.map((ev, i) => {
            const img = storageUrl('media', ev.location_image);
            return (
              <article
                key={ev.id}
                className="relative overflow-hidden rounded-3xl shadow-lg"
                style={{ backgroundColor: palette.ink, minHeight: 260 }}
              >
                {img && <img src={img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.55) 45%, rgba(0,0,0,.85) 100%)' }} />
                <div className="relative flex h-full min-h-[260px] flex-col justify-end p-6 text-white">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full font-display tpl-display text-sm"
                      style={{ border: `1px solid ${accent}`, color: accent, backgroundColor: 'rgba(0,0,0,.35)' }}
                    >
                      {ROMAN[i] ?? i + 1}
                    </span>
                    {ev.description && (
                      <span className="tpl-body text-[11px] uppercase tracking-[0.3em] text-white/80 line-clamp-1">
                        {ev.description.split('\n')[0]}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-display tpl-display text-3xl font-bold">{ev.name}</h3>
                  {ev.date && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-white/90">
                      <CalendarDays className="h-4 w-4" style={{ color: accent }} />
                      {formatDateTime(ev.date)}
                    </p>
                  )}
                  {ev.location_title && (
                    <div className="mt-1 text-sm text-white/90">
                      <p className="flex items-center gap-2 font-medium">
                        <MapPin className="h-4 w-4 shrink-0" style={{ color: accent }} />
                        {ev.location_title}
                      </p>
                      {ev.location_address && <p className="pl-6 text-white/70">{ev.location_address}</p>}
                    </div>
                  )}
                  {childrenOf(ev.id).length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-white/20 pt-3 text-sm">
                      {childrenOf(ev.id).map((child) => (
                        <li key={child.id}>
                          <span className="font-semibold">{child.name}</span>
                          {child.date && <span className="text-white/70"> — {formatDateTime(child.date)}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {ev.location_maps_url && (
                    <a
                      href={ev.location_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-900 transition hover:opacity-90"
                    >
                      <Navigation className="h-3.5 w-3.5" style={{ color: accent }} /> Itinéraire
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
}

function hhmm(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}H${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Mise en page « heures » : l'heure en grand, une photo ronde par étape, puis la carte du lieu. */
function HoursTimeline({
  events,
  childrenOf,
  accent,
  tpl,
  title,
}: {
  events: WeddingEvent[];
  childrenOf: (id: string) => WeddingEvent[];
  accent: string;
  tpl: SectionProps['tpl'];
  title?: string;
}) {
  const { palette } = tpl;
  // Carte « Lieu » : le dernier lieu renseigné (souvent la réception).
  const venue = [...events].reverse().find((e) => e.location_title);
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
        <div className="text-center">
          <p className="tpl-body text-[11px] font-semibold uppercase tracking-[0.35em]" style={{ color: accent }}>Déroulé de la journée</p>
          <h2 className="mt-2 font-display tpl-display text-4xl sm:text-5xl" style={{ color: palette.ink }}>{title || 'Le programme'}</h2>
          <div className="mx-auto mt-3 flex w-32 items-center gap-2">
            <span className="h-px flex-1" style={{ backgroundColor: `${accent}99` }} />
            <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: accent }} />
            <span className="h-px flex-1" style={{ backgroundColor: `${accent}99` }} />
          </div>
        </div>

        <ol className="relative mt-12">
          <span aria-hidden className="absolute bottom-8 top-8 left-[7.5rem] w-px sm:left-[8rem]" style={{ backgroundColor: `${accent}40` }} />
          {events.map((ev) => {
            const img = storageUrl('media', ev.location_image);
            const kids = childrenOf(ev.id);
            return (
              <li key={ev.id} className="relative mb-8 flex items-center gap-4 last:mb-0 sm:gap-6">
                <span className="w-[4.5rem] flex-none whitespace-nowrap text-right font-display tpl-display text-[1.35rem] leading-none [overflow-wrap:normal] min-[380px]:text-2xl sm:text-3xl" style={{ color: accent }}>
                  {hhmm(ev.date)}
                </span>
                <span
                  className="relative z-10 flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full"
                  style={{ boxShadow: `0 0 0 3px ${palette.background}, 0 0 0 4px ${accent}99`, backgroundColor: palette.accentSoft }}
                >
                  {img ? (
                    <img src={img} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <CalendarDays className="h-6 w-6" style={{ color: accent }} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display tpl-display text-xl leading-tight sm:text-2xl" style={{ color: palette.ink }}>{ev.name}</p>
                  {ev.description && (
                    <p className="mt-0.5 tpl-body text-sm leading-snug" style={{ color: palette.muted }}>{ev.description.split('\n')[0]}</p>
                  )}
                  {kids.length > 0 && (
                    <p className="mt-1 tpl-body text-xs" style={{ color: palette.muted }}>
                      {kids.map((k) => `${hhmm(k.date)} ${k.name}`.trim()).join(' · ')}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {venue && (
          <div className="mx-auto mt-12 max-w-md rounded-2xl px-6 py-8 text-center text-white shadow-xl" style={{ background: `linear-gradient(160deg, ${accent}, ${palette.ink})` }}>
            <MapPin className="mx-auto h-6 w-6 opacity-90" />
            <p className="mt-2 tpl-body text-[11px] font-semibold uppercase tracking-[0.35em] opacity-80">Lieu</p>
            <p className="mt-2 font-display tpl-display text-2xl leading-tight sm:text-3xl">{venue.location_title}</p>
            {venue.location_address && <p className="mt-1 tpl-body text-sm opacity-85">{venue.location_address}</p>}
            {venue.location_maps_url && (
              <a
                href={venue.location_maps_url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 tpl-body text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-900 transition hover:opacity-90"
              >
                <Navigation className="h-3.5 w-3.5" style={{ color: accent }} /> Itinéraire
              </a>
            )}
          </div>
        )}
      </div>
    </SectionShell>
  );
}
