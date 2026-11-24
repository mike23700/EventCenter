import { useEffect, useState } from 'react';
import type { WeddingEvent } from '../../../types/database';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';
import { useTextStyle } from '../../../lib/textStyles';

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
  const ts = useTextStyle();

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const target = dateStr ? new Date(dateStr) : null;
  if (!target || Number.isNaN(target.getTime())) return null;

  const d = diff(target);
  const { palette } = tpl;
  const pad = (n: number) => String(n).padStart(2, '0');
  const units = [
    { label: 'Jours', value: d.days },
    { label: 'Heures', value: d.hours },
    { label: 'Minutes', value: d.minutes },
    { label: 'Secondes', value: d.seconds },
  ];

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-display tpl-display text-2xl sm:text-3xl font-bold" style={{ color: accent, ...ts('title') }}>
          Le compte à rebours
        </p>
        <p className="mt-2 tpl-body opacity-70" style={ts('subtitle')}>Nos derniers instants avant le « oui »</p>
        <div className="mt-10 inline-flex items-start justify-center">
          {units.map((unit, i) => (
            <div key={unit.label} className="flex items-start">
              <div className="flex flex-col items-center px-1 min-[380px]:px-1.5 sm:px-3">
                <span
                  className="font-display tpl-display text-[2rem] font-bold leading-none min-[380px]:text-4xl sm:text-6xl"
                  style={{ color: palette.ink, fontVariantNumeric: 'tabular-nums', ...ts('numbers') }}
                >
                  {pad(unit.value)}
                </span>
                <span className="mt-3 text-[9px] tracking-[0.12em] uppercase tpl-body min-[380px]:text-[10px] min-[380px]:tracking-[0.25em] sm:text-[11px]" style={{ color: palette.muted, ...ts('labels') }}>
                  {unit.label}
                </span>
              </div>
              {i < units.length - 1 && (
                <span
                  className="font-display tpl-display text-[2rem] font-bold leading-none min-[380px]:text-4xl sm:text-6xl"
                  style={{ color: accent }}
                  aria-hidden="true"
                >
                  :
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}