import type { ReactNode } from 'react';

/**
 * Moteur de gabarits — Phase 3.
 * Chaque template correspond à un véritable design différencié (style
 * "Canva / Word") : palette propre, polices, éléments décoratifs et
 * mise en page distincts. Le champ `weddings.template` référence un id.
 */

export interface TemplateDef {
  id: string;
  label: string;
  tagline: string;
  palette: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accentSoft: string;
    ink: string;
    border: string;
  };
  /** Classes utilitaires Tailwind communes à ce template (accents, fonds…) */
  fonts: {
    display: string;
    body: string;
  };
  /** URL(s) Google Fonts à charger */
  googleFonts: string[];
  preview: { bg: string; accent: string; name: string }[];
  /**
   * Éléments PROPRES au modèle (les réglages, eux, sont communs à tous) :
   *  - ambient : animation d'ambiance par défaut (pétales, roses…) ;
   *  - script  : police manuscrite pour les noms / signatures.
   * (Les décors des coins sont des images envoyées par l'admin : Thème.)
   */
  ambient?: { kind: AmbientKind; colors: string[] };
  script?: string;
}

export type AmbientKind = 'petals' | 'roses' | 'hearts' | 'gold' | 'butterflies' | 'none';

export const TEMPLATE_DEFS: TemplateDef[] = [
  {
    id: 'florale',
    label: 'Romantique floral',
    tagline: 'Fleurs délicates, tons blush & blanc cassé',
    palette: {
      background: '#FBF7F2',
      surface: '#FFFFFF',
      text: '#4A3B3B',
      muted: '#8A7777',
      accent: '#C98A9E',
      accentSoft: '#F3DCE3',
      ink: '#3A2B2B',
      border: '#EADFD4',
    },
    fonts: {
      display: "'Great Vibes', 'Playfair Display', Georgia, serif",
      body: "'Cormorant Garamond', Georgia, serif",
    },
    googleFonts: [
      'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@400;600&display=swap',
    ],
    preview: [
      { bg: '#FBF7F2', accent: '#C98A9E', name: 'Floral' },
      { bg: '#FFFFFF', accent: '#F3DCE3', name: 'Blush' },
      { bg: '#F7EDE4', accent: '#C98A9E', name: 'Pétale' },
    ],
  },
  {
    id: 'royal',
    label: 'Royal or',
    tagline: 'Navy profond, dorures & faste',
    palette: {
      background: '#101826',
      surface: '#16202F',
      text: '#ECE6D8',
      muted: '#B8AD92',
      accent: '#D4AF37',
      accentSoft: '#2A3450',
      ink: '#F5F0E4',
      border: '#2C3852',
    },
    fonts: {
      display: "'Cinzel', 'Playfair Display', Georgia, serif",
      body: "'Cormorant Garamond', Georgia, serif",
    },
    googleFonts: [
      'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap',
    ],
    preview: [
      { bg: '#101826', accent: '#D4AF37', name: 'Navy' },
      { bg: '#16202F', accent: '#D4AF37', name: 'Or' },
      { bg: '#262F3F', accent: '#E6C56A', name: 'Faste' },
    ],
  },
  {
    id: 'minimal',
    label: 'Minimal épuré',
    tagline: 'Blanc, lignes fines & modernité',
    palette: {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#111111',
      muted: '#6B7280',
      accent: '#0F172A',
      accentSoft: '#F3F4F6',
      ink: '#0F172A',
      border: '#E5E7EB',
    },
    fonts: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'Inter', system-ui, sans-serif",
    },
    googleFonts: [
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500&display=swap',
    ],
    preview: [
      { bg: '#FFFFFF', accent: '#0F172A', name: 'Blanc' },
      { bg: '#F9FAFB', accent: '#111111', name: 'Gris' },
      { bg: '#FFFFFF', accent: '#0F172A', name: 'Épurer' },
    ],
  },
  {
    id: 'africain',
    label: 'Héritage africain',
    tagline: 'Tons terre, motifs wax & chaleur',
    palette: {
      background: '#F7EFE3',
      surface: '#FCF7EE',
      text: '#39281B',
      muted: '#7C6A57',
      accent: '#B5472B',
      accentSoft: '#F0DCC9',
      ink: '#2C1E12',
      border: '#E4D4BE',
    },
    fonts: {
      display: "'Playfair Display', Georgia, serif",
      body: "'Lato', system-ui, sans-serif",
    },
    googleFonts: [
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Lato:wght@300;400;700&display=swap',
    ],
    preview: [
      { bg: '#F7EFE3', accent: '#B5472B', name: 'Terre' },
      { bg: '#EAD9C4', accent: '#8A5A2B', name: 'Wax' },
      { bg: '#F7EFE3', accent: '#2E6E4E', name: 'Kente' },
    ],
  },
  {
    id: 'ivoire',
    label: 'Ivoire & Rose',
    tagline: 'Papier crème rosé, cartes élégantes & pétales qui tombent',
    palette: {
      background: '#F6EFE9',
      surface: '#FFFCF9',
      text: '#4A3A33',
      muted: '#8C7B72',
      accent: '#A0705A',
      accentSoft: '#EFE1D8',
      ink: '#2F2420',
      border: '#E7D9CF',
    },
    fonts: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'Jost', system-ui, sans-serif",
    },
    script: "'Pinyon Script', 'Great Vibes', cursive",
    googleFonts: [
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Pinyon+Script&display=swap',
    ],
    preview: [
      { bg: '#F6EFE9', accent: '#A0705A', name: 'Ivoire' },
      { bg: '#FFFCF9', accent: '#C9938A', name: 'Rose' },
      { bg: '#EFE1D8', accent: '#7A5444', name: 'Moka' },
    ],
    ambient: { kind: 'petals', colors: ['#E8B7B0', '#D99A92', '#F2D3CD', '#C98C84'] },
  },
  {
    id: 'terracotta',
    label: 'Terracotta fleuri',
    tagline: 'Terracotta, rouille & crème, roses qui tombent',
    palette: {
      background: '#FBF5EE',
      surface: '#FFFFFF',
      text: '#4B2A20',
      muted: '#8E6A5C',
      accent: '#A8432A',
      accentSoft: '#F3E2D5',
      ink: '#5A2416',
      border: '#EBD8C8',
    },
    fonts: {
      display: "'Pinyon Script', 'Great Vibes', cursive",
      body: "'Cormorant Garamond', Georgia, serif",
    },
    script: "'Pinyon Script', 'Great Vibes', cursive",
    googleFonts: [
      'https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap',
    ],
    preview: [
      { bg: '#FBF5EE', accent: '#A8432A', name: 'Terracotta' },
      { bg: '#F3E2D5', accent: '#8E2F1D', name: 'Rouille' },
      { bg: '#FFFFFF', accent: '#C9A34A', name: 'Doré' },
    ],
    ambient: { kind: 'roses', colors: ['#B8452C', '#D0613F', '#E9A07F', '#8E2F1D'] },
  },
];

export function getTemplate(id?: string | null): TemplateDef {
  return TEMPLATE_DEFS.find((t) => t.id === id) ?? TEMPLATE_DEFS[0];
}

export function templateFontStyle(t: TemplateDef): string {
  return `
    @import url('${t.googleFonts[0]}');
    .tpl-display { font-family: ${t.fonts.display}; }
    .tpl-body { font-family: ${t.fonts.body}; }
  `;
}

/** Var CSS personnalisées pour le thème utilisateur + palette du template. */
export function templateCssVars(t: TemplateDef): Record<string, string> {
  return {
    '--tpl-bg': t.palette.background,
    '--tpl-surface': t.palette.surface,
    '--tpl-text': t.palette.text,
    '--tpl-muted': t.palette.muted,
    '--tpl-accent': t.palette.accent,
    '--tpl-accent-soft': t.palette.accentSoft,
    '--tpl-ink': t.palette.ink,
    '--tpl-border': t.palette.border,
  };
}

// ---------------------------------------------------------------------
// Composants décoratifs (ornements propres à chaque template)
// ---------------------------------------------------------------------

function BaseSvg(props: { className?: string; style?: React.CSSProperties; children: ReactNode; viewBox?: string }) {
  return (
    <svg
      viewBox={props.viewBox ?? '0 0 100 100'}
      fill="none"
      className={props.className}
      style={props.style}
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

export type OrnamentProps = { color?: string; className?: string; style?: React.CSSProperties };

/** Fleur délicate — template "florale". */
export function Flower({ color = 'currentColor', className, style }: OrnamentProps) {
  return (
    <BaseSvg className={className} style={style}>
      <g fill={color}>
        <path d="M50 0 C55 20 60 35 72 45 C72 45 72 45 72 45 C57 42 43 42 28 45 C28 45 28 45 28 45 C40 35 45 20 50 0Z" />
        <path d="M72 45 C76 55 76 62 72 72 C62 68 53 63 44 57 C44 57 44 57 44 57 Z" fillOpacity="0.9" />
        <path d="M28 45 C24 55 24 62 28 72 C38 68 47 63 56 57 C56 57 56 57 56 57 Z" fillOpacity="0.9" />
        <path d="M44 57 C47 68 50 78 50 95 C50 78 47 68 44 57 Z" fillOpacity="0.8" />
        <path d="M56 57 C53 68 50 78 50 95 C50 78 53 68 56 57 Z" fillOpacity="0.8" />
        <circle cx="50" cy="50" r="6" fill="#FFF" fillOpacity="0.7" />
      </g>
    </BaseSvg>
  );
}

/** Plume / feather — ornement (template florale). */
export function Feather({ color = 'currentColor', className, style }: OrnamentProps) {
  return (
    <BaseSvg className={className} style={style} viewBox="0 0 24 24">
      <g fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round">
        <path d="M3 21 L14 10" />
        <path d="M14 10 C10 11 7 13 6 17 C9 14 12 13 15 13 C19 10 20 6 15 3 C12 1 8 2 5 5 C3 8 2 12 5 15" fill={color} fillOpacity="0.12" />
        <path d="M9 13 L13 9" opacity="0.6" />
      </g>
    </BaseSvg>
  );
}

/** Séparateur ornemental avec cœur — florale / classique. */
export function FloralDivider({ color = 'currentColor', className, style }: OrnamentProps) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className ?? ''}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 60 10" className="h-2.5 w-16" style={{ color }} fill={color} opacity="0.7">
        <path d="M0 5 H25 M35 5 H60 M25 5 q5 -5 10 0 q5 5 10 0" stroke="none" />
      </svg>
      <svg viewBox="0 0 24 24" className="h-4 w-4" style={{ color }} fill={color} aria-hidden="true">
        <path d="M12 21 L11 20.5 C5 17 2 12.5 2 8.5 C2 5.5 4.5 3 7.5 3 C9.3 3 11 4 12 5.5 C13 4 14.7 3 16.5 3 C19.5 3 22 5.5 22 8.5 C22 12.5 19 17 13 20.5 L12 21Z" />
      </svg>
      <svg viewBox="0 0 60 10" className="h-2.5 w-16" style={{ color }} fill={color} opacity="0.7">
        <path d="M0 5 H25 M35 5 H60 M25 5 q5 -5 10 0 q5 5 10 0" />
      </svg>
    </div>
  );
}

/** Couronne ornementale / laurier — template "royal". */
export function Crown({ color = 'currentColor', className, style }: OrnamentProps) {
  return (
    <BaseSvg className={className} style={style} viewBox="0 0 24 24">
      <path
        d="M2 8 L6 14 L9 6 L12 11 L15 6 L18 14 L22 8 L20 18 H4 Z"
        fill={color}
      />
      <circle cx="4" cy="18.5" r="1.2" fill={color} />
      <circle cx="12" cy="18.5" r="1.4" fill={color} />
      <circle cx="20" cy="18.5" r="1.2" fill={color} />
      <circle cx="12" cy="12.8" r="1" fill="#FFF" fillOpacity="0.5" />
    </BaseSvg>
  );
}

/** Feuille de laurier — template "royal". */
export function Laurel({ color = 'currentColor', className, style }: OrnamentProps) {
  return (
    <BaseSvg className={className} style={style} viewBox="0 0 24 24">
      <g fill={color}>
        <path d="M12 22 C4 20 2 12 6 5 C8 12 8 14 12 18 C14 20 17 21 12 22Z" />
        <path d="M12 22 C20 20 22 12 18 5 C16 12 16 14 12 18 C10 20 7 21 12 22Z" opacity="0.85" />
      </g>
    </BaseSvg>
  );
}

/** Séparateur or — template "royal". */
export function RoyalDivider({ color = 'currentColor', className, style }: OrnamentProps) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className ?? ''}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 60 12" className="h-3 w-16" style={{ color }} fill={color}>
        <rect x="0" y="4.5" width="40" height="1.2" />
        <path d="M40 6 h20 M47 2 l4 4 l-4 4 M52 2 l4 4 l-4 4" stroke={color} strokeWidth="1.2" fill="none" />
      </svg>
      <Crown color={color} className="h-5 w-5" />
      <svg viewBox="0 0 60 12" className="h-3 w-16" style={{ color }} fill={color}>
        <rect x="20" y="4.5" width="40" height="1.2" />
        <path d="M0 6 h20 M7 2 l4 4 l-4 4 M13 2 l4 4 l-4 4" stroke={color} strokeWidth="1.2" fill="none" />
      </svg>
    </div>
  );
}

/** Motif géométrique wax — template "africain". */
export function WaxPattern({ color = 'currentColor', className, style }: OrnamentProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 80" aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth="1.5" opacity="0.5">
        <path d="M0 20 H80 M0 40 H80 M0 60 H80 M20 0 V80 M40 0 V80 M60 0 V80" />
        {[20, 60].map((x) =>
          [20, 60].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="6" fill={color} fillOpacity="0.12" />
          )),
        )}
        <circle cx="40" cy="40" r="12" strokeWidth="2" />
        <path d="M40 32 l8 8 l-8 8 l-8-8 Z" fill={color} fillOpacity="0.18" />
      </g>
    </svg>
  );
}

/** Arc / arche kente — template "africain". */
export function KenteDivider({ color = 'currentColor', className, style }: OrnamentProps) {
  return (
    <div className={`flex items-center justify-center ${className ?? ''}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 200 30" className="h-6 w-48 opacity-80">
        <g fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
          <path d="M5 5 C60 28 140 28 195 5" />
          <path d="M60 8 l6 14 M100 10 l0 16 M140 8 l-6 14" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}

/** Cachet "pour toujours" — séparateur simple (minimal). */
export function MinimalDivider({ color = 'currentColor', className, style }: OrnamentProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className ?? ''}`} style={style} aria-hidden="true">
      <span className="h-px w-14" style={{ backgroundColor: color }} />
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={color}>
        <path d="M12 2 L13.8 8.2 L20 10 L13.8 11.8 L12 18 L10.2 11.8 L4 10 L10.2 8.2 Z" />
      </svg>
      <span className="h-px w-14" style={{ backgroundColor: color }} />
    </div>
  );
}

export function DividerByTemplate(tid: string) {
  switch (tid) {
    case 'royal':
      return RoyalDivider;
    case 'minimal':
      return MinimalDivider;
    case 'africain':
      return KenteDivider;
    default:
      return FloralDivider;
  }
}
