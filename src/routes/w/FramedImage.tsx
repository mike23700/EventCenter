import type { CSSProperties, ReactNode } from 'react';
import type { FrameConfig } from '../../lib/frames';
import type { TemplateDef } from '../../lib/templates';

/** Cœur (viewBox 100 × 90) : masque de la photo et liseré. */
const HEART_PATH = 'M50 88 C20 66 0 48 0 26 C0 10 12 0 27 0 C38 0 46 6 50 14 C54 6 62 0 73 0 C88 0 100 10 100 26 C100 48 80 66 50 88 Z';
const HEART_MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 90' preserveAspectRatio='none'><path d='${HEART_PATH}'/></svg>`)}")`;

const MAX_W: Record<FrameConfig['size'], string> = {
  sm: '16rem',
  md: '26rem',
  lg: '40rem',
  full: '100%',
};

/**
 * Photo encadrée (commune à tous les modèles) : forme, proportions et taille
 * choisies par l'admin. `overlay` permet d'afficher un titre par-dessus.
 */
export default function FramedImage({
  src,
  alt = '',
  frame,
  tpl,
  accent,
  overlay,
  className = '',
}: {
  src: string;
  alt?: string;
  frame: FrameConfig;
  tpl: TemplateDef;
  accent: string;
  overlay?: ReactNode;
  className?: string;
}) {
  const { palette } = tpl;
  const round = frame.style === 'circle' || frame.style === 'heart';
  const ratio = frame.style === 'circle' ? '1:1' : frame.ratio;
  const aspect = frame.style === 'heart' ? '10 / 9' : ratio === 'auto' ? undefined : ratio.replace(':', ' / ');
  const maxWidth = round && frame.size === 'full' ? MAX_W.md : MAX_W[frame.size];

  const img: CSSProperties = {
    display: 'block',
    width: '100%',
    height: aspect ? '100%' : 'auto',
    objectFit: 'cover',
  };
  let inner: CSSProperties = { position: 'relative', overflow: 'hidden', aspectRatio: aspect };
  let outer: CSSProperties = { maxWidth, marginLeft: 'auto', marginRight: 'auto' };

  switch (frame.style) {
    case 'square':
      break;
    case 'rounded':
      inner = { ...inner, borderRadius: '1.25rem', boxShadow: '0 18px 45px -18px rgba(0,0,0,.35)' };
      break;
    case 'circle':
      inner = { ...inner, borderRadius: '9999px', boxShadow: `0 0 0 4px ${palette.background}, 0 0 0 5px ${accent}99, 0 18px 40px -18px rgba(0,0,0,.4)` };
      break;
    case 'heart': {
      // Photo découpée en cœur, liseré clair autour (ombres portées du masque).
      inner = {
        ...inner,
        WebkitMaskImage: HEART_MASK,
        maskImage: HEART_MASK,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
      };
      const edge = palette.background === 'transparent' ? '#ffffff' : palette.background;
      outer = {
        ...outer,
        filter: `drop-shadow(3px 0 0 ${edge}) drop-shadow(-3px 0 0 ${edge}) drop-shadow(0 3px 0 ${edge}) drop-shadow(0 -3px 0 ${edge}) drop-shadow(0 14px 18px rgba(0,0,0,.28))`,
      };
      break;
    }
    case 'arch':
      outer = { ...outer, padding: 6, border: `1px solid ${accent}80`, borderRadius: '999px 999px 1.25rem 1.25rem' };
      inner = { ...inner, borderRadius: '999px 999px 1rem 1rem' };
      break;
    case 'soft':
      // Contour en fondu (halo) : l'image se dissout dans le fond.
      inner = {
        ...inner,
        WebkitMaskImage: 'radial-gradient(ellipse 72% 72% at 50% 50%, #000 52%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 72% 72% at 50% 50%, #000 52%, transparent 100%)',
      };
      break;
    case 'polaroid':
      outer = { ...outer, background: '#fff', padding: '10px 10px 34px', boxShadow: '0 20px 40px -18px rgba(0,0,0,.45)', transform: 'rotate(-1.5deg)' };
      break;
    case 'gold':
      outer = { ...outer, padding: 8, border: `2px solid ${accent}`, boxShadow: `inset 0 0 0 4px ${palette.background}, inset 0 0 0 5px ${accent}66` };
      break;
  }

  return (
    <figure className={className} style={outer}>
      <div style={inner}>
        <img src={src} alt={alt} loading="lazy" decoding="async" style={img} />
        {overlay}
      </div>
    </figure>
  );
}
