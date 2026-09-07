import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Wedding, Section, Guest, GuestResponse, Json } from '../../../types/database';

interface QuestionMeta {
  key: string;
  label: string;
  type: 'single' | 'multiple' | 'open';
  sectionTitle: string;
}

function parseQuestionsFromSection(section: Section): QuestionMeta[] {
  const content = section.content;
  const record = content && typeof content === 'object' && !Array.isArray(content)
    ? (content as Record<string, unknown>)
    : {};
  const blocks = record['blocks'];
  if (!Array.isArray(blocks)) return [];
  const out: QuestionMeta[] = [];
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;
    const block = b as Record<string, unknown>;
    if (block.type !== 'questionnaire' || !Array.isArray(block.questions)) continue;
    for (const q of block.questions) {
      if (!q || typeof q !== 'object') continue;
      const question = q as Record<string, unknown>;
      if (typeof question.id !== 'string' || typeof question.label !== 'string' || !question.label) continue;
      out.push({
        key: `${section.id}:${block.id}:${question.id}`,
        label: question.label,
        type: (question.type as QuestionMeta['type']) ?? 'open',
        sectionTitle: (block.title as string) || section.title || 'Partie mixte',
      });
    }
  }
  return out;
}

function formatAnswer(answer: Json): string {
  if (Array.isArray(answer)) return answer.filter((v) => typeof v === 'string').join(', ') || '—';
  if (typeof answer === 'string') return answer || '—';
  return '—';
}

/**
 * Onglet « Réponses » : consultation des réponses au(x) questionnaire(s) de
 * la partie mixte, groupées par question, avec le nom de l'invité.
 */
export default function ResponsesEditor() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  const [questions, setQuestions] = useState<QuestionMeta[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [responses, setResponses] = useState<GuestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!wedding) return;
    let active = true;
    (async () => {
      const [{ data: secs, error: secErr }, { data: gs, error: gErr }] = await Promise.all([
        supabase.from('sections').select('*').eq('wedding_id', wedding.id).eq('type', 'mixed'),
        supabase.from('guests').select('*').eq('wedding_id', wedding.id),
      ]);
      if (!active) return;
      if (secErr || gErr) {
        setError((secErr ?? gErr)?.message ?? 'Erreur de chargement');
        setLoading(false);
        return;
      }
      const qs = (secs ?? []).flatMap(parseQuestionsFromSection);
      setQuestions(qs);
      setGuests(gs ?? []);

      const guestIds = (gs ?? []).map((g) => g.id);
      if (guestIds.length === 0) {
        setResponses([]);
        setLoading(false);
        return;
      }
      const { data: resp, error: rErr } = await supabase
        .from('guest_responses')
        .select('*')
        .in('guest_id', guestIds);
      if (!active) return;
      if (rErr) setError(rErr.message);
      else setResponses(resp ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [wedding]);

  const guestName = useMemo(() => {
    const map = new Map(guests.map((g) => [g.id, g.name]));
    return (id: string) => map.get(id) ?? '?';
  }, [guests]);

  const responsesByQuestion = useMemo(() => {
    const map = new Map<string, GuestResponse[]>();
    for (const r of responses) {
      const list = map.get(r.question_key) ?? [];
      list.push(r);
      map.set(r.question_key, list);
    }
    return map;
  }, [responses]);

  const responseCountByGuest = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of responses) map.set(r.guest_id, (map.get(r.guest_id) ?? 0) + 1);
    return map;
  }, [responses]);

  if (loading) return <p className="text-ink-secondary">Chargement…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Réponses au questionnaire</h2>
        <p className="text-sm text-ink-secondary">
          Les réponses saisies par vos invités sur la partie mixte du site, rattachées à leur fiche
          « Invités » ({responses.length} réponse{responses.length > 1 ? 's' : ''} au total sur{' '}
          {responseCountByGuest.size} invité{responseCountByGuest.size > 1 ? 's' : ''}).
        </p>
      </div>

      {questions.length === 0 && (
        <div className="card text-center text-ink-secondary">
          Aucun questionnaire configuré. Ajoutez un bloc « Questionnaire » dans la section
          « Partie mixte » (onglet Sections).
        </div>
      )}

      {questions.map((q) => {
        const answers = responsesByQuestion.get(q.key) ?? [];
        return (
          <div key={q.key} className="card space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">{q.sectionTitle}</p>
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <ClipboardList className="h-4 w-4 text-gold" />
                {q.label}
              </h3>
            </div>
            {answers.length === 0 ? (
              <p className="text-sm text-ink-secondary/70">Aucune réponse pour l'instant.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-borderlight">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-borderlight bg-paper-cream text-xs uppercase tracking-wide text-ink-secondary">
                    <tr>
                      <th className="px-4 py-2">Invité</th>
                      <th className="px-4 py-2">Réponse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {answers.map((a) => (
                      <tr key={a.id} className="border-b border-borderlight/60 last:border-0">
                        <td className="px-4 py-2 font-medium text-ink">{guestName(a.guest_id)}</td>
                        <td className="px-4 py-2 text-ink-secondary">{formatAnswer(a.answer)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
