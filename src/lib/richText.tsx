import { Fragment, type ReactNode } from 'react';

/**
 * Texte enrichi simple, commun à tous les modèles :
 *   **gras**   *italique*   __souligné__   ==mis en avant== (couleur d'accent)
 * Les retours à la ligne sont conservés par l'appelant (whitespace-pre-line).
 * Rendu en éléments React (jamais de HTML injecté) : aucune faille XSS
 * possible, quel que soit le texte saisi.
 */

const TOKEN = /(\*\*[^*\n][^\n]*?\*\*|__[^_\n][^\n]*?__|==[^=\n][^\n]*?==|\*[^*\s][^*\n]*?\*)/g;

export function renderRich(text: string | null | undefined, accent?: string): ReactNode {
  if (!text) return null;
  const parts = text.split(TOKEN);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-semibold">{renderRich(part.slice(2, -2), accent)}</strong>;
    }
    if (part.startsWith('__') && part.endsWith('__') && part.length > 4) {
      return <u key={i} className="underline-offset-4">{renderRich(part.slice(2, -2), accent)}</u>;
    }
    if (part.startsWith('==') && part.endsWith('==') && part.length > 4) {
      return <span key={i} className="font-semibold" style={accent ? { color: accent } : undefined}>{renderRich(part.slice(2, -2), accent)}</span>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{renderRich(part.slice(1, -1), accent)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** Version texte brut (extraits, aperçus WhatsApp, attributs alt…). */
export function stripRich(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\*\*([^\n]*?)\*\*/g, '$1')
    .replace(/__([^\n]*?)__/g, '$1')
    .replace(/==([^\n]*?)==/g, '$1')
    .replace(/\*([^*\s][^*\n]*?)\*/g, '$1');
}

/** Paragraphe enrichi prêt à l'emploi (retours à la ligne conservés). */
export function RichText({
  text,
  accent,
  className = '',
  style,
  as: Tag = 'p',
}: {
  text: string | null | undefined;
  accent?: string;
  className?: string;
  style?: React.CSSProperties;
  as?: 'p' | 'div' | 'span' | 'blockquote' | 'h2' | 'h3';
}) {
  if (!text) return null;
  return (
    <Tag className={`whitespace-pre-line ${className}`} style={style}>
      {renderRich(text, accent)}
    </Tag>
  );
}
