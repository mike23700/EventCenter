/**
 * Bouquet dessiné (décor propre au modèle « Terracotta fleuri ») : fleurs
 * stylisées, boutons et feuillage, aux couleurs du modèle. Placé dans un
 * coin ; `flip` le retourne pour l'autre côté.
 */
export default function FloralCorner({
  accent,
  className = '',
  flip = false,
  style,
}: {
  accent: string;
  className?: string;
  flip?: boolean;
  style?: React.CSSProperties;
}) {
  const leaf = '#7B8A5A';
  const leaf2 = '#A3A77A';
  const blush = '#E9A07F';
  const cream = '#F4E3CF';
  return (
    <svg
      viewBox="0 0 220 160"
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      style={{ transform: flip ? 'scaleX(-1)' : undefined, ...style }}
    >
      {/* tiges et feuilles */}
      <g fill="none" stroke={leaf} strokeWidth="1.6" strokeLinecap="round">
        <path d="M10 150 C60 120 90 95 130 40" />
        <path d="M30 155 C80 140 130 120 200 110" />
        <path d="M60 150 C70 120 75 95 70 60" />
      </g>
      <g fill={leaf}>
        <path d="M95 92 c10 -14 26 -16 30 -14 c-6 12 -18 18 -30 14z" />
        <path d="M120 58 c4 -14 18 -22 24 -20 c-2 12 -12 20 -24 20z" />
        <path d="M150 122 c12 -8 28 -6 32 -2 c-10 8 -24 8 -32 2z" />
        <path d="M66 96 c-10 -10 -10 -24 -6 -28 c8 8 10 20 6 28z" />
      </g>
      <g fill={leaf2} opacity=".85">
        <path d="M40 132 c12 -10 28 -8 32 -4 c-10 8 -24 10 -32 4z" />
        <path d="M110 112 c8 -12 22 -14 26 -12 c-4 10 -16 16 -26 12z" />
      </g>
      {/* grande fleur */}
      <g transform="translate(70 120)">
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse key={a} cx="0" cy="-14" rx="10" ry="16" fill={accent} opacity=".92" transform={`rotate(${a})`} />
        ))}
        {[30, 90, 150, 210, 270, 330].map((a) => (
          <ellipse key={a} cx="0" cy="-9" rx="7" ry="11" fill={blush} transform={`rotate(${a})`} />
        ))}
        <circle r="6" fill="#5A2416" />
        <circle r="3" fill="#C9A34A" />
      </g>
      {/* fleur moyenne */}
      <g transform="translate(140 52) scale(.7)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-13" rx="10" ry="15" fill={blush} transform={`rotate(${a})`} />
        ))}
        <circle r="6" fill={accent} />
      </g>
      {/* petite fleur crème */}
      <g transform="translate(185 108) scale(.55)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-12" rx="9" ry="14" fill={cream} stroke={blush} strokeWidth="1" transform={`rotate(${a})`} />
        ))}
        <circle r="5" fill="#C9A34A" />
      </g>
      {/* boutons */}
      <g fill={accent}>
        <circle cx="108" cy="78" r="5" />
        <circle cx="160" cy="88" r="4" />
        <circle cx="35" cy="112" r="4.5" />
        <circle cx="200" cy="96" r="3" />
      </g>
    </svg>
  );
}
