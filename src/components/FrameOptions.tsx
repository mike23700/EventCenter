import { FRAME_RATIOS, FRAME_SIZES, FRAME_STYLES, frameHint, type FrameConfig } from '../lib/frames';

/** Mini aperçu visuel d'un cadre. */
function Swatch({ style }: { style: FrameConfig['style'] }) {
  const base = 'block h-7 w-6 bg-gradient-to-br from-gold/70 to-ink-secondary/60';
  const map: Record<string, string> = {
    rounded: `${base} rounded-md`,
    square: base,
    circle: 'block h-6 w-6 rounded-full bg-gradient-to-br from-gold/70 to-ink-secondary/60',
    arch: `${base} rounded-t-full rounded-b-sm`,
    soft: `${base} rounded-full opacity-60 blur-[1.5px]`,
    polaroid: 'block h-7 w-6 border-2 border-b-[6px] border-white bg-gradient-to-br from-gold/70 to-ink-secondary/60 shadow',
    gold: `${base} outline outline-2 outline-offset-1 outline-gold`,
  };
  return <span className={map[style]} />;
}

/** Choix du cadre, du format et de la taille d'une photo (admin). */
export default function FrameOptions({
  value,
  onChange,
}: {
  value: FrameConfig;
  onChange: (v: FrameConfig) => void;
}) {
  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs transition ${active ? 'border-gold bg-gold text-white' : 'border-borderlight bg-white text-ink-secondary hover:border-gold/50'}`;
  return (
    <div className="space-y-3 rounded-xl border border-borderlight bg-paper-warm/40 p-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-ink">Cadre</p>
        <div className="flex flex-wrap gap-1.5">
          {FRAME_STYLES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange({ ...value, style: f.id })}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition ${value.style === f.id ? 'border-gold bg-white text-ink shadow-sm' : 'border-borderlight bg-white text-ink-secondary hover:border-gold/50'}`}
            >
              <Swatch style={f.id} /> {f.label}
            </button>
          ))}
        </div>
      </div>
      {value.style !== 'circle' && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink">Format (dimensions)</p>
          <div className="flex flex-wrap gap-1.5">
            {FRAME_RATIOS.map((r) => (
              <button key={r.id} type="button" onClick={() => onChange({ ...value, ratio: r.id })} className={chip(value.ratio === r.id)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="mb-1.5 text-xs font-semibold text-ink">Taille d'affichage</p>
        <div className="flex flex-wrap gap-1.5">
          {FRAME_SIZES.map((s) => (
            <button key={s.id} type="button" onClick={() => onChange({ ...value, size: s.id })} className={chip(value.size === s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-ink-secondary">{frameHint(value)}</p>
    </div>
  );
}
