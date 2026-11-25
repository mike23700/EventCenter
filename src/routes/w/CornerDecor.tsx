import type { CSSProperties } from 'react';
import { storageUrl } from '../../lib/media';
import { cornerImageStyle, type CornerRotation, type CornersConfig } from '../../lib/siteOptions';

/**
 * Décors des coins (images envoyées dans Thème → Décors des coins).
 * Chaque image est posée dans un CADRE CARRÉ FIXE collé au coin (même
 * largeur et même hauteur, quelle que soit l'image) et ajustée sans
 * déformation (`object-fit: contain`), calée contre le coin :
 *   - haut-gauche : l'image telle quelle (orientée vers le coin haut-gauche) ;
 *   - haut-droit  : la même, en miroir horizontal ;
 *   - bas         : la même image, retournée verticalement ; à droite, en miroir.
 * Chaque image peut être tournée d'un quart de tour (Thème).
 * Le cadre ne capte jamais les clics (pointer-events: none).
 */

const BOX: Record<CornersConfig['size'], string> = {
  sm: 'h-20 w-20 sm:h-28 sm:w-28',
  md: 'h-28 w-28 sm:h-44 sm:w-44',
  lg: 'h-36 w-36 sm:h-60 sm:w-60',
};

/** Hauteur minimale d'un bloc qui porte des décors (au moins celle du cadre). */
export const CORNER_MIN_H: Record<CornersConfig['size'], string> = {
  sm: 'min-h-[5rem] sm:min-h-[7rem]',
  md: 'min-h-[7rem] sm:min-h-[11rem]',
  lg: 'min-h-[9rem] sm:min-h-[15rem]',
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
  const list: { pos: Corner; src: string; flipY: boolean; rotation: CornerRotation }[] = [];
  if (top && topSrc) {
    list.push({ pos: 'tl', src: topSrc, flipY: false, rotation: corners.rotateTop });
    if (corners.mirror) list.push({ pos: 'tr', src: topSrc, flipY: false, rotation: corners.rotateTop });
  }
  if (bottom && topSrc) {
    // Coins du bas : la même image, retournée (le motif pointe vers le coin bas).
    list.push({ pos: 'bl', src: topSrc, flipY: true, rotation: corners.rotateTop });
    if (corners.mirror) list.push({ pos: 'br', src: topSrc, flipY: true, rotation: corners.rotateTop });
  }
  if (list.length === 0) return null;

  return (
    <>
      {list.map(({ pos, src, flipY, rotation }) => {
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
        // L'image est calée dans le coin du cadre, tournée, puis retournée si
        // besoin : le miroir horizontal la ramène contre le coin droit.
        const img: CSSProperties = {
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          ...cornerImageStyle(pos, flipY, rotation),
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
