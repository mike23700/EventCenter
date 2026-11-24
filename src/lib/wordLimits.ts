/**
 * Limites de longueur en MOTS (plus parlant qu'un nombre de caractères) :
 *  - message du livre d'or : 150 mots (aussi contrôlé par le serveur) ;
 *  - récit de « Notre histoire » : 350 mots par récit (≈ 2 min de lecture
 *    sur téléphone).
 */
export const TESTIMONIAL_MAX_WORDS = 150;
export const STORY_MAX_WORDS = 350;

export function countWords(text: string | null | undefined): number {
  const t = (text ?? '').trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Coupe un texte après `max` mots (en gardant les retours à la ligne déjà tapés). */
export function clampWords(text: string, max: number): string {
  if (countWords(text) <= max) return text;
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  let n = 0;
  let end = text.length;
  while ((m = re.exec(text))) {
    n += 1;
    if (n === max) {
      end = m.index + m[0].length;
      break;
    }
  }
  return text.slice(0, end);
}
