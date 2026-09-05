import { useEffect, useState } from 'react';
import type { WeddingEvent } from '../../../types/database';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms / 3600000) % 24),
    minutes: Math.floor((ms / 60000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

export interface CountdownProps extends SectionProps {
  events: WeddingEvent[];
}

/**
 * Section "compte à rebours" jusqu'à la date du mariage.
 * La date est soit définie dans la section, soit reprise du premier
 * sous-évènement du programme si elle n'est pas renseignée.
 */
export default function Countdown({ content, accent, tpl, events }: CountdownProps) {
  const c = asRecord(content);
  const dateStr = str(c, 'date') || events?.[0]?.date || null;
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const target = dateStr ? new Date(dateStr) : null;
  if (!target || Number.isNaN(target.getTime())) return null;

  const d = diff(target);
  const { palette } = tpl;

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-display tpl-display text-2xl sm:text-3xl font-bold" style={{ color: accent }}>
          Le compte à rebours
        </p>
        <p className="mt-2 tpl-body opacity-70">Nos derniers instants avant le « oui »</p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Jours', value: d.days },
            { label: 'Heures', value: d.hours },
            { label: 'Minutes', value: d.minutes },
            { label: 'Secondes', value: d.seconds },
          ].map((unit) => (
            <div
              key={unit.label}
              className="rounded-xl px-4 py-6"
              style={{
                backgroundColor: palette.surface,
                border: `1px solid ${palette.border}`,
                boxShadow: tpl.id === 'royal' ? `0 0 0 1px ${palette.accent}33, 0 10px 30px rgba(0,0,0,0.25)` : undefined,
              }}
            >
              <div className="font-display tpl-display text-4xl font-bold sm:text-5xl" style={{ color: tpl.id === 'minimal' ? accent : palette.ink, fontVariantNumeric: 'tabular-nums' }}>
                {unit.value}
              </div>
              <div className="mt-2 text-[11px] tracking-[0.25em] uppercase" style={{ color: palette.muted }}>
                {unit.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}