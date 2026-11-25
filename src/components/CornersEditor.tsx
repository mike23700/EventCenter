import { RotateCw } from 'lucide-react';
import MediaUploader from './MediaUploader';
import { storageUrl } from '../lib/media';
import { cornerImageStyle, type CornerRotation, type CornersConfig } from '../lib/siteOptions';

const nextRotation = (r: CornerRotation): CornerRotation => ((r + 90) % 360) as CornerRotation;

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
  const hasImage = !!value.top;

  return (
    <div className="space-y-4 rounded-xl border border-borderlight p-4">
      <div>
        <p className="font-medium text-ink">Décors des coins (images)</p>
        <p className="text-xs text-ink-secondary">
          Une image (bouquet, feuillage, dorure…) posée dans un cadre carré fixe à chaque coin, sans être déformée ni
          coupée. Pour les coins du bas, elle est retournée automatiquement.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr,16rem]">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* L'image et sa rotation */}
            <div>
              <MediaUploader
                bucket="media"
                folder={`${folder}/decors`}
                accept="image/png,image/webp,image/gif,image/jpeg"
                label="Image des coins"
                value={value.top}
                onChange={(v) => set({ top: v ?? '' })}
                hint="PNG transparent, carré 800 × 800 px, motif tourné vers le coin HAUT-GAUCHE"
              />
              {value.top && (
                <RotateButton rotation={value.rotateTop} onClick={() => set({ rotateTop: nextRotation(value.rotateTop) })} />
              )}
            </div>

            {/* Où les afficher */}
            <div>
              <p className="label">Emplacements</p>
              <div className="divide-y divide-borderlight rounded-lg border border-borderlight text-sm text-ink">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5">
                  <span className="w-28 font-medium">Page de garde</span>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={value.introTop} onChange={(e) => set({ introTop: e.target.checked })} /> En haut
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={value.introBottom} onChange={(e) => set({ introBottom: e.target.checked })} /> En bas
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5">
                  <span className="w-28 font-medium">Site</span>
                  <label className="flex items-center gap-2" title="Coins du haut du premier bloc (couverture)">
                    <input type="checkbox" checked={value.siteTop} onChange={(e) => set({ siteTop: e.target.checked })} /> En haut
                  </label>
                  <label className="flex items-center gap-2" title="Coins du bas du dernier bloc (pied de page)">
                    <input type="checkbox" checked={value.siteBottom} onChange={(e) => set({ siteBottom: e.target.checked })} /> En bas
                  </label>
                </div>
                <label className="flex items-center gap-2 px-3 py-2.5">
                  <input type="checkbox" checked={value.mirror} onChange={(e) => set({ mirror: e.target.checked })} /> Des deux côtés (le droit en miroir)
                </label>
              </div>
              <p className="mt-1 text-[11px] text-ink-secondary">Site : en haut du premier bloc, en bas du dernier bloc.</p>
            </div>
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
        </div>

        {/* Aperçus : la page de garde et le site, chacun avec ses coins */}
        <div className="space-y-3">
          <p className="label">Aperçu</p>
          <div className="flex justify-center gap-3">
            <PreviewScreen label="Page de garde" value={value} top={top} hasImage={hasImage} showTop={value.introTop} showBottom={value.introBottom} />
            <PreviewScreen label="Site" value={value} top={top} hasImage={hasImage} showTop={value.siteTop} showBottom={value.siteBottom} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewScreen({
  label,
  value,
  top,
  hasImage,
  showTop,
  showBottom,
}: {
  label: string;
  value: CornersConfig;
  top: string | null;
  hasImage: boolean;
  showTop: boolean;
  showBottom: boolean;
}) {
  return (
    <div className="text-center">
      <div className="relative h-52 w-28 overflow-hidden rounded-2xl border-4 border-ink/80 bg-paper-warm">
        {!hasImage && (
          <p className="absolute inset-0 flex items-center justify-center px-2 text-center text-[10px] text-ink-secondary">
            Ajoutez une image
          </p>
        )}
        {showTop && top && <PreviewBox src={top} pos="tl" rotation={value.rotateTop} opacity={value.opacity} />}
        {showTop && top && value.mirror && <PreviewBox src={top} pos="tr" rotation={value.rotateTop} opacity={value.opacity} />}
        {showBottom && top && <PreviewBox src={top} pos="bl" flipY rotation={value.rotateTop} opacity={value.opacity} />}
        {showBottom && top && value.mirror && <PreviewBox src={top} pos="br" flipY rotation={value.rotateTop} opacity={value.opacity} />}
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display text-xs text-ink">Camille &amp; Jean</p>
      </div>
      <p className="mt-1 text-[11px] text-ink-secondary">{label}</p>
    </div>
  );
}

function RotateButton({ rotation, onClick }: { rotation: CornerRotation; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-borderlight bg-white px-3 py-1.5 text-xs font-medium text-ink-secondary transition hover:border-gold/50"
    >
      <RotateCw className="h-3.5 w-3.5" /> Tourner d'un quart de tour{rotation ? ` (${rotation}°)` : ''}
    </button>
  );
}

function PreviewBox({ src, pos, flipY = false, rotation, opacity }: { src: string; pos: 'tl' | 'tr' | 'bl' | 'br'; flipY?: boolean; rotation: CornerRotation; opacity: number }) {
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
        style={cornerImageStyle(pos, flipY, rotation)}
      />
    </div>
  );
}
