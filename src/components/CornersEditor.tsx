import MediaUploader from './MediaUploader';
import { storageUrl } from '../lib/media';
import type { CornersConfig } from '../lib/siteOptions';

/**
 * Thème → « Décors des coins » : images envoyées par l'admin (bouquets,
 * feuillages, dorures…) posées dans un cadre carré fixe à chaque coin de la
 * page de garde et/ou de la couverture. Remplace les bouquets dessinés.
 */
export default function CornersEditor({
  value,
  onChange,
  folder,
}: {
  value: CornersConfig;
  onChange: (v: CornersConfig) => void;
  folder: string;
}) {
  const set = (patch: Partial<CornersConfig>) => onChange({ ...value, ...patch });
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-gold bg-gold text-white' : 'border-borderlight bg-white text-ink-secondary hover:border-gold/50'}`;
  const top = storageUrl('media', value.top || null);
  const bottom = storageUrl('media', value.bottom || null) ?? top;
  const hasImage = !!(value.top || value.bottom);

  return (
    <div className="space-y-4 rounded-xl border border-borderlight p-4">
      <div>
        <p className="font-medium text-ink">Décors des coins (images)</p>
        <p className="text-xs text-ink-secondary">
          Vos images (bouquets, feuillages, dorures…) sont posées dans les coins de la page de garde et de la
          couverture, dans un cadre carré fixe : elles ne sont jamais déformées ni coupées.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr,12rem]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <MediaUploader
              bucket="media"
              folder={`${folder}/decors`}
              accept="image/png,image/webp,image/gif,image/jpeg"
              label="Image des coins du haut"
              value={value.top}
              onChange={(v) => set({ top: v ?? '' })}
              hint="PNG transparent, carré 800 × 800 px, motif tourné vers le coin HAUT-GAUCHE"
            />
            <MediaUploader
              bucket="media"
              folder={`${folder}/decors`}
              accept="image/png,image/webp,image/gif,image/jpeg"
              label="Image des coins du bas (facultatif)"
              value={value.bottom}
              onChange={(v) => set({ bottom: v ?? '' })}
              hint="Sinon : l'image du haut, retournée. Motif tourné vers le coin BAS-GAUCHE"
            />
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={value.showTop} onChange={(e) => set({ showTop: e.target.checked })} /> Coins du haut
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={value.showBottom} onChange={(e) => set({ showBottom: e.target.checked })} /> Coins du bas
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={value.mirror} onChange={(e) => set({ mirror: e.target.checked })} /> Des deux côtés (le droit en miroir)
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Taille du cadre</label>
              <div className="flex gap-1.5">
                {([['sm', 'Petit'], ['md', 'Moyen'], ['lg', 'Grand']] as const).map(([id, label]) => (
                  <button key={id} type="button" className={chip(value.size === id)} onClick={() => set({ size: id })}>{label}</button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-ink-secondary">
                {value.size === 'sm' ? '80 px sur téléphone, 112 px sur ordinateur' : value.size === 'md' ? '112 px sur téléphone, 176 px sur ordinateur' : '144 px sur téléphone, 240 px sur ordinateur'} (carré)
              </p>
            </div>
            <div>
              <label className="label">Opacité : {value.opacity}%</label>
              <input type="range" min={30} max={100} step={5} value={value.opacity} onChange={(e) => set({ opacity: Number(e.target.value) })} className="w-full accent-gold" />
            </div>
          </div>

          <div>
            <label className="label">Où les afficher</label>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={value.intro} onChange={(e) => set({ intro: e.target.checked })} /> Page de garde
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={value.cover} onChange={(e) => set({ cover: e.target.checked })} /> Couverture
              </label>
            </div>
          </div>
        </div>

        {/* Aperçu : un écran de téléphone avec les 4 cadres */}
        <div>
          <p className="label">Aperçu</p>
          <div className="relative mx-auto h-64 w-40 overflow-hidden rounded-2xl border-4 border-ink/80 bg-paper-warm">
            {!hasImage && (
              <p className="absolute inset-0 flex items-center justify-center px-3 text-center text-[11px] text-ink-secondary">
                Ajoutez une image pour voir le rendu
              </p>
            )}
            {value.showTop && top && <PreviewBox src={top} pos="tl" opacity={value.opacity} />}
            {value.showTop && top && value.mirror && <PreviewBox src={top} pos="tr" opacity={value.opacity} />}
            {value.showBottom && bottom && <PreviewBox src={bottom} pos="bl" flipY={!value.bottom} opacity={value.opacity} />}
            {value.showBottom && bottom && value.mirror && <PreviewBox src={bottom} pos="br" flipY={!value.bottom} opacity={value.opacity} />}
            <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display text-sm text-ink">Camille &amp; Jean</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewBox({ src, pos, flipY = false, opacity }: { src: string; pos: 'tl' | 'tr' | 'bl' | 'br'; flipY?: boolean; opacity: number }) {
  const right = pos === 'tr' || pos === 'br';
  const bottom = pos === 'bl' || pos === 'br';
  return (
    <div
      className="pointer-events-none absolute h-14 w-14 outline-dashed outline-1 outline-gold/40"
      style={{ top: bottom ? undefined : 0, bottom: bottom ? 0 : undefined, left: right ? undefined : 0, right: right ? 0 : undefined, opacity: opacity / 100 }}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-contain"
        style={{
          objectPosition: `left ${bottom && !flipY ? 'bottom' : 'top'}`,
          transform: right || flipY ? `scale(${right ? -1 : 1}, ${flipY ? -1 : 1})` : undefined,
        }}
      />
    </div>
  );
}
