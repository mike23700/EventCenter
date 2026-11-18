import { useState } from 'react';
import { Send } from 'lucide-react';
import { db } from '../../../lib/db';
import type { TemplateDef } from '../../../lib/templates';

/**
 * Formulaire de dépôt d'un témoignage — mis en attente de modération.
 * Partagé entre le teaser « Témoignages » du site principal et la page
 * dédiée, pour un comportement identique.
 */
export default function TestimonialForm({
  weddingId,
  accent,
  tpl,
  autoPublish = false,
  onSent,
}: {
  weddingId: string;
  accent: string;
  tpl: TemplateDef;
  /** Livre d'or en publication immédiate (option de la section). */
  autoPublish?: boolean;
  onSent?: () => void;
}) {
  const { palette } = tpl;
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!text.trim()) return;
    setSubmitting(true);
    setError('');
    const { error } = await db.from('testimonials').insert({
      wedding_id: weddingId,
      author: author.trim() || null,
      content: text.trim(),
      status: 'pending',
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    onSent?.();
    setAuthor('');
    setText('');
  }

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
      {done ? (
        <p className="text-center tpl-body" style={{ color: palette.ink }}>
          {autoPublish ? 'Merci pour votre message, il est publié dans le livre d’or !' : 'Merci pour votre message ! Il sera visible après validation.'}
        </p>
      ) : (
        <div className="space-y-3">
          <input
            className="input"
            placeholder="Votre nom (optionnel)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}
          />
          <textarea
            className="input min-h-24"
            placeholder="Votre message pour les mariés…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={submitting || !text.trim()}
              className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-40"
              style={{ backgroundColor: accent }}
            >
              <Send className="h-4 w-4" /> {submitting ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
