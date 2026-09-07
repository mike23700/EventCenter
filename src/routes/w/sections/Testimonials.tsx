import { useEffect, useState } from 'react';
import { MessageCircleHeart, Send } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Testimonial } from '../../../types/database';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';

/**
 * Section « Témoignages » : messages laissés par les invités (modérés par
 * les mariés avant publication) + formulaire de dépôt.
 */
export default function Testimonials({ content, accent, tpl, wedding }: SectionProps) {
  const c = asRecord(content);
  const title = str(c, 'title') || 'Témoignages';
  const intro = str(c, 'intro') || 'Laissez un petit mot aux mariés.';
  const { palette } = tpl;

  const [items, setItems] = useState<Testimonial[]>([]);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('testimonials')
        .select('*')
        .eq('wedding_id', wedding.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (!active) return;
      setItems((data ?? []) as Testimonial[]);
    })();
    return () => {
      active = false;
    };
  }, [wedding.id]);

  async function submit() {
    if (!text.trim()) return;
    setSubmitting(true);
    setError('');
    const { error } = await supabase.from('testimonials').insert({
      wedding_id: wedding.id,
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
    setAuthor('');
    setText('');
  }

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div id="testimonials" className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center">
          <MessageCircleHeart className="mx-auto h-6 w-6" style={{ color: accent }} />
          <h2 className="mt-2 font-display tpl-display text-3xl sm:text-4xl font-bold" style={{ color: palette.ink }}>
            {title}
          </h2>
          <p className="mt-2 tpl-body" style={{ color: palette.muted }}>{intro}</p>
        </div>

        <div className="mt-8 rounded-2xl p-6" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
          {done ? (
            <p className="text-center tpl-body" style={{ color: palette.ink }}>
              Merci pour votre message ! Il sera visible après validation.
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

        {items.length > 0 && (
          <div className="mt-10 space-y-4">
            {items.map((t) => (
              <div key={t.id} className="rounded-2xl p-5" style={{ backgroundColor: palette.accentSoft }}>
                <p className="whitespace-pre-line tpl-body italic" style={{ color: palette.ink }}>“{t.content}”</p>
                {t.author && (
                  <p className="mt-2 text-right text-xs font-medium uppercase tracking-wide" style={{ color: accent }}>
                    — {t.author}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionShell>
  );
}
