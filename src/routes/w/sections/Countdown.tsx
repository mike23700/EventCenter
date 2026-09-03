import { useEffect, useState } from 'react';
import type { SectionProps } from './types';
import { asRecord, str } from './types';

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

/** Section "compte à rebours" jusqu'à la date du mariage. */
export default function Countdown({ content, accent }: SectionProps) {
  const c = asRecord(content);
  const dateStr = str(c, 'date');
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const target = dateStr ? new Date(dateStr) : null;
  if (!target || Number.isNaN(target.getTime())) return null;

  const d = diff(target);

  return (
    <section className="mx-auto max-w-3xl px-6 py-14 text-center">
      <p className="font-display text-2xl font-bold" style={{ color: accent }}>
        Le compte à rebours
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Jours', value: d.days },
          { label: 'Heures', value: d.hours },
          { label: 'Minutes', value: d.minutes },
          { label: 'Secondes', value: d.seconds },
        ].map((unit) => (
          <div key={unit.label} className="rounded-2xl border border-borderlight bg-paper-warm p-4">
            <div className="font-display text-4xl font-bold text-ink">{unit.value}</div>
            <div className="mt-1 text-xs tracking-widest uppercase text-ink-secondary">{unit.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}