import type { CSSProperties } from 'react';
import { storageUrl } from '../../lib/media';
import type { CornersConfig } from '../../lib/siteOptions';

/**
 * Décors des coins (images envoyées dans Thème → Décors des coins).
 * Chaque image est posée dans un CADRE CARRÉ FIXE collé au coin (même
 * largeur et même hauteur, quelle que soit l'image) et ajustée sans
 * déformation (`object-fit: contain`), calée contre le coin :
 *   - haut-gauche : l'image telle quelle (orientée vers le coin haut-gauche) ;
 *   - haut-droit  : la même, en miroir horizontal ;
 *   - bas         : l'image du bas, ou à défaut celle du haut retournée
 *                   verticalement ; à droite, en miroir.
 * Le cadre ne capte jamais les clics (pointer-events: none).
 */

const BOX: Record<CornersConfig['size'], string> = {
  sm: 'h-20 w-20 sm:h-28 sm:w-28',
  md: 'h-28 w-28 sm:h-44 sm:w-44',
  lg: 'h-36 w-36 sm:h-60 sm:w-60',
};

type Corner = 'tl' | 'tr' | 'bl' | 'br';

export default function CornerDecor({
  corners,
  top,
  bottom,
  className = '',
}: {
  corners: CornersConfig;
  top: boolean;
  bottom: boolean;
  className?: string;
}) {
  const topSrc = storageUrl('media', corners.top || null);
  const bottomOwn = storageUrl('media', corners.bottom || null);
  const bottomSrc = bottomOwn ?? topSrc;
  const list: { pos: Corner; src: string; flipY: boolean }[] = [];
  if (top && topSrc) {
    list.push({ pos: 'tl', src: topSrc, flipY: false });
    if (corners.mirror) list.push({ pos: 'tr', src: topSrc, flipY: false });
  }
  if (bottom && bottomSrc) {
    // Sans image propre au bas, celle du haut est retournée (le motif pointe vers le coin bas).
    const flipY = !bottomOwn;
    list.push({ pos: 'bl', src: bottomSrc, flipY });
    if (corners.mirror) list.push({ pos: 'br', src: bottomSrc, flipY });
  }
  if (list.length === 0) return null;

  return (
    <>
      {list.map(({ pos, src, flipY }) => {
        const right = pos === 'tr' || pos === 'br';
        const isBottom = pos === 'bl' || pos === 'br';
        const box: CSSProperties = {
          position: 'absolute',
          top: isBottom ? undefined : 0,
          bottom: isBottom ? 0 : undefined,
          left: right ? undefined : 0,
          right: right ? 0 : undefined,
          opacity: corners.opacity / 100,
        };
        // L'image est calée dans le coin du cadre, puis retournée si besoin :
        // le miroir horizontal la ramène contre le coin droit.
        const sx = right ? -1 : 1;
        const sy = flipY ? -1 : 1;
        const img: CSSProperties = {
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: `left ${isBottom && !flipY ? 'bottom' : 'top'}`,
          transform: sx === 1 && sy === 1 ? undefined : `scale(${sx}, ${sy})`,
        };
        return (
          <div key={pos} aria-hidden className={`pointer-events-none z-[1] select-none ${BOX[corners.size]} ${className}`} style={box}>
            <img src={src} alt="" draggable={false} loading="lazy" decoding="async" style={img} />
          </div>
        );
      })}
    </>
  );
}
