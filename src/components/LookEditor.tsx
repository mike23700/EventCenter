import { PATTERNS, patternBackground, weddingTemplate, type ThemeLook } from '../lib/themeLook';
import type { TemplateDef } from '../lib/templates';

/**
 * Thème → « Fond du site » : couleur de fond (à la place de celle du modèle)
 * et motif d'arrière-plan. Aperçu en direct, sur le modèle choisi.
 */
export default function LookEditor({
  value,
  onChange,
  tpl,
}: {
  value: ThemeLook;
  onChange: (v: ThemeLook) => void;
  tpl: TemplateDef;
}) {
  const set = (patch: Partial<ThemeLook>) => onChange({ ...value, ...patch });
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-gold bg-gold text-white' : 'border-borderlight bg-white text-ink-secondary hover:border-gold/50'}`;
  // Même calcul que le site : couleur de fond + textes adaptés.
  const shown = weddingTemplate({ template: tpl.id, theme: { look: { ...value } } });
  const preview = patternBackground(value, shown);

  return (
    <div className="space-y-4 rounded-xl border border-borderlight p-4">
      <div>
        <p className="font-medium text-ink">Fond du site</p>
        <p className="text-xs text-ink-secondary">
          Couleur de fond et motif d'arrière-plan, sur tout le site. Une section qui a sa propre « Apparence du
          bloc » (couleur ou image) garde son fond.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr,13rem]">
        <div className="space-y-4">
          <div>
            <label className="label">Couleur de fond</label>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={chip(!value.bgColor)} onClick={() => set({ bgColor: '' })}>Couleur du modèle</button>
              <input
                type="color"
                value={value.bgColor || tpl.palette.background}
                onChange={(e) => set({ bgColor: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-borderlight"
                title="Choisir une couleur"
              />
              {value.bgColor && <code className="text-xs text-ink-secondary">{value.bgColor}</code>}
            </div>
          </div>
          {value.bgColor && (
            <div>
              <label className="label">Couleur du texte</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={chip(value.text === 'auto')} onClick={() => set({ text: 'auto' })}>Automatique</button>
                <button type="button" className={chip(value.text === 'light')} onClick={() => set({ text: 'light' })}>Clair</button>
                <button type="button" className={chip(value.text === 'dark')} onClick={() => set({ text: 'dark' })}>Foncé</button>
              </div>
            </div>
          )}
          <div>
            <label className="label">Motif d'arrière-plan</label>
            <div className="flex flex-wrap gap-1.5">
              {PATTERNS.map((p) => (
                <button key={p.id} type="button" className={chip(value.pattern === p.id)} onClick={() => set({ pattern: p.id })}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {value.pattern !== 'auto' && value.pattern !== 'none' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Couleur du motif</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={value.patternColor || tpl.palette.accent}
                    onChange={(e) => set({ patternColor: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border border-borderlight"
                  />
                  {value.patternColor && (
                    <button type="button" className="text-xs text-ink-secondary underline" onClick={() => set({ patternColor: '' })}>
                      Couleur du modèle
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Intensité : {value.patternOpacity}%</label>
                <input type="range" min={3} max={40} step={1} value={value.patternOpacity} onChange={(e) => set({ patternOpacity: Number(e.target.value) })} className="w-full accent-gold" />
              </div>
              <div>
                <label className="label">Taille</label>
                <div className="flex gap-1.5">
                  {([['sm', 'Petit'], ['md', 'Moyen'], ['lg', 'Grand']] as const).map(([id, label]) => (
                    <button key={id} type="button" className={chip(value.patternSize === id)} onClick={() => set({ patternSize: id })}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Aperçu */}
        <div
          className="flex h-40 flex-col items-center justify-center rounded-xl border border-borderlight text-center"
          style={{ backgroundColor: shown.palette.background, backgroundImage: preview?.image, backgroundSize: preview?.size }}
          aria-label="Aperçu du fond"
        >
          <p className="text-lg" style={{ fontFamily: tpl.fonts.display, color: shown.palette.ink }}>Camille &amp; Jean</p>
          <p className="mt-1 text-xs" style={{ color: shown.palette.muted }}>Nous serions heureux…</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: tpl.palette.accent }}>Aperçu</p>
        </div>
      </div>
    </div>
  );
}
