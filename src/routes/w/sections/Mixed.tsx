import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { db } from '../../../lib/db';
import type { Json, WeddingEvent } from '../../../types/database';
import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord } from './types';
import { SectionShell } from './shell';
import { useGuestIdentity } from './useGuestIdentity';
import GuestSelfRegister from './GuestSelfRegister';

export interface MixedProps extends SectionProps {
  events: WeddingEvent[];
}

type Question = {
  id: string;
  label: string;
  type: 'single' | 'multiple' | 'open';
  options?: string[];
};

type Block = {
  id: string;
  type: 'text' | 'image' | 'video' | 'questionnaire';
  title?: string;
  text?: string;
  src?: string;
  questions?: Question[];
};

function parseBlocks(content: Json): Block[] {
  const c = asRecord(content);
  const blocks = c['blocks'];
  if (Array.isArray(blocks)) {
    return blocks.filter(isBlock);
  }
  return [];
}

function isBlock(b: unknown): b is Block {
  if (!b || typeof b !== 'object') return false;
  const o = b as Record<string, unknown>;
  return typeof o.id === 'string' &&
    (o.type === 'text' || o.type === 'image' || o.type === 'video' || o.type === 'questionnaire');
}

/**
 * Section "partie mixte" : blocs texte / image / vidéo / questionnaire
 * librement ordonnés, mise en page façon magazine selon le template.
 */
export default function Mixed({ content, accent, tpl, wedding, sectionId, events }: MixedProps) {
  const blocks = parseBlocks(content);
  if (blocks.length === 0) return null;

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl space-y-12 px-6 py-16">
        {blocks.map((block) => {
          switch (block.type) {
            case 'text':
              return <TextView key={block.id} block={block} tpl={tpl} />;
            case 'image':
              return <ImageView key={block.id} block={block} tpl={tpl} />;
            case 'video':
              return <VideoView key={block.id} block={block} tpl={tpl} />;
            case 'questionnaire':
              return (
                <QuestionnaireView
                  key={block.id}
                  block={block}
                  accent={accent}
                  tpl={tpl}
                  weddingId={wedding.id}
                  sectionId={sectionId ?? ''}
                  events={events}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    </SectionShell>
  );
}

function TextView({ block, tpl }: { block: Block; tpl: SectionProps['tpl'] }) {
  const { palette, id } = tpl;
  return (
    <div style={id === 'minimal' ? { maxWidth: '42rem', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' } : undefined}>
      {block.title && (
        <h3 className="font-display tpl-display text-2xl sm:text-3xl font-bold" style={{ color: palette.ink }}>
          {block.title}
        </h3>
      )}
      {block.text && (
        <p
          className={`mt-3 whitespace-pre-line leading-relaxed tpl-body ${id === 'royal' ? 'text-base' : 'text-lg'}`}
          style={{ color: palette.muted }}
        >
          {block.text}
        </p>
      )}
    </div>
  );
}

function ImageView({ block, tpl }: { block: Block; tpl: SectionProps['tpl'] }) {
  const { palette, id } = tpl;
  const src = storageUrl('media', block.src) ?? block.src;
  if (!src) return null;
  return (
    <figure className={id === 'florale' ? 'rounded-3xl p-3' : undefined} style={id === 'florale' ? { backgroundColor: palette.accentSoft } : undefined}>
      <img
        src={src}
        alt=""
        className="w-full"
        style={{
          borderRadius: id === 'minimal' ? '0.25rem' : '1rem',
          border: id === 'minimal' ? `1px solid ${palette.border}` : 'none',
          boxShadow: id === 'florale' ? '0 14px 34px rgba(201,138,158,0.25)' : '0 14px 40px rgba(0,0,0,0.1)',
        }}
      />
      {block.title && (
        <figcaption className="mt-3 text-center text-sm tracking-wide tpl-body italic" style={{ color: palette.muted }}>
          {block.title}
        </figcaption>
      )}
      {accentMarker(tpl)}
    </figure>
  );
}

function accentMarker(tpl: SectionProps['tpl']): React.ReactNode {
  if (tpl.id !== 'royal') return null;
  return (
    <div className="mt-3 flex items-center justify-center gap-2" style={{ color: tpl.palette.accent }}>
      <span className="h-px w-10" style={{ backgroundColor: tpl.palette.accent }} />
      <span className="h-2 w-2 rotate-45" style={{ backgroundColor: tpl.palette.accent }} />
      <span className="h-px w-10" style={{ backgroundColor: tpl.palette.accent }} />
    </div>
  );
}

function VideoView({ block, tpl }: { block: Block; tpl: SectionProps['tpl'] }) {
  const { palette, id } = tpl;
  const src = storageUrl('media', block.src) ?? block.src;
  if (!src) return null;
  return (
    <figure>
      <video
        src={src}
        controls
        className="w-full"
        style={{
          borderRadius: id === 'minimal' ? '0.25rem' : '1rem',
          border: `1px solid ${palette.border}`,
          boxShadow: '0 14px 40px rgba(0,0,0,0.1)',
        }}
      />
      {block.title && (
        <figcaption className="mt-3 text-center text-sm tracking-wide tpl-body italic" style={{ color: palette.muted }}>
          {block.title}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Questionnaire public : identifie l'invité par son nom (comme la section
 * RSVP), ou — recevoir le lien du site vaut invitation — laisse la personne
 * s'inscrire elle-même si elle n'y figure pas, puis enregistre ses réponses
 * dans `guest_responses` — une ligne par question, avec
 * `question_key = "<section>:<bloc>:<question>"` — pour qu'elles
 * apparaissent dans l'onglet « Réponses » côté client.
 */
function QuestionnaireView({
  block,
  accent,
  tpl,
  weddingId,
  sectionId,
  events,
}: {
  block: Block;
  accent: string;
  tpl: SectionProps['tpl'];
  weddingId: string;
  sectionId: string;
  events: WeddingEvent[];
}) {
  const { palette } = tpl;
  const questions = (block.questions ?? []).filter((q) => q.label);
  const id = useGuestIdentity(weddingId);
  const { guest } = id;
  const guestStatus = id.status;
  const [registering, setRegistering] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!block.title && questions.length === 0) return null;

  function setAnswer(qid: string, value: string | string[]) {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }

  async function registerSelf(name: string, phone: string, eventIds: string[]) {
    await id.registerSelf({ name, phone, invitedEvents: eventIds });
    setRegistering(false);
  }

  async function submit() {
    if (!guest) return;
    setSubmitting(true);
    setError('');
    const rows = questions.map((q) => ({
      guest_id: guest.id,
      question_key: `${sectionId}:${block.id}:${q.id}`,
      answer: (answers[q.id] ?? (q.type === 'multiple' ? [] : '')) as Json,
    }));
    const { error } = await db
      .from('guest_responses')
      .upsert(rows, { onConflict: 'guest_id,question_key' });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div
        className="rounded-2xl p-7 text-center"
        style={{ backgroundColor: palette.accentSoft, border: `1px solid ${palette.border}` }}
      >
        <h3 className="font-display tpl-display text-xl font-bold" style={{ color: palette.ink }}>
          Merci ! 💐
        </h3>
        <p className="mt-2 tpl-body" style={{ color: palette.muted }}>
          Vos réponses ont bien été prises en compte.
        </p>
      </div>
    );
  }

  const hasRequiredUnanswered = questions.some(
    (q) => (q.type === 'single' || q.type === 'multiple') && !answers[q.id],
  );

  return (
    <div
      className="rounded-2xl p-7"
      style={{ backgroundColor: palette.accentSoft, border: `1px solid ${palette.border}` }}
    >
      <h3 className="font-display tpl-display text-xl font-bold" style={{ color: palette.ink }}>
        {block.title || 'Questionnaire'}
      </h3>
      {block.text && (
        <p className="mt-2 tpl-body" style={{ color: palette.muted }}>
          {block.text}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {guestStatus === 'missing' ? (
        registering ? (
          <div className="mt-5">
            <GuestSelfRegister
              initialName={id.query.trim()}
              accent={accent}
              palette={palette}
              submitting={id.registering}
              error={id.error}
              events={events}
              onSubmit={registerSelf}
              onCancel={() => setRegistering(false)}
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3 text-center">
            <p className="tpl-body text-sm" style={{ color: palette.muted }}>
              Nous ne trouvons pas votre nom. Vous avez reçu ce lien ? Vous êtes invité(e), confirmez votre invitation !
            </p>
            <div className="flex justify-center gap-2">
              <button onClick={id.reset} className="btn-outline">Réessayer</button>
              <button
                onClick={() => setRegistering(true)}
                className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: accent }}
              >
                <UserPlus className="h-4 w-4" />
                Confirmer mon invitation
              </button>
            </div>
          </div>
        )
      ) : guestStatus !== 'found' ? (
        <div className="mt-5 space-y-3">
          <p className="tpl-body text-sm" style={{ color: palette.muted }}>
            Indiquez votre nom pour que vos réponses soient rattachées à votre invitation.
          </p>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Votre nom"
              value={id.query}
              onChange={(e) => id.setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && id.search()}
              style={{ backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }}
            />
            <button
              onClick={id.search}
              disabled={id.query.trim().length < 2}
              className="rounded-full px-5 text-sm font-medium text-white disabled:opacity-40"
              style={{ backgroundColor: accent }}
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          {guestStatus === 'choosing' && (
            <div className="space-y-2">
              {id.matches.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5"
                  style={{ borderColor: id.chosenId === m.id ? accent : palette.border }}
                >
                  <input type="radio" name={`gp-${block.id}`} checked={id.chosenId === m.id} onChange={() => id.setChosenId(m.id)} />
                  <span style={{ color: palette.ink }}>{m.name}</span>
                </label>
              ))}
              <button
                onClick={id.confirmGuess}
                disabled={!id.chosenId}
                className="rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: accent }}
              >
                C'est moi
              </button>
            </div>
          )}
        </div>
      ) : (
      <>
      <div className="mt-5 space-y-5">
        {questions.map((q, qi) => (
          <div key={q.id}>
            <p className="tpl-body text-sm font-semibold" style={{ color: palette.ink }}>
              {qi + 1}. {q.label}
            </p>
            {q.type === 'open' ? (
              <textarea
                className="input mt-2 min-h-20"
                placeholder="Votre réponse…"
                value={(answers[q.id] as string) ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                style={{ backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }}
              />
            ) : q.type === 'multiple' ? (
              <div className="mt-2 space-y-1.5">
                {(q.options ?? []).filter(Boolean).map((opt) => {
                  const val = (answers[q.id] as string[]) ?? [];
                  const checked = val.includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm"
                      style={{ backgroundColor: palette.surface, border: `1px solid ${checked ? accent : palette.border}`, color: palette.text }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setAnswer(q.id, checked ? val.filter((v) => v !== opt) : [...val, opt])
                        }
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 space-y-1.5">
                {(q.options ?? []).filter(Boolean).map((opt) => (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: palette.surface, border: `1px solid ${answers[q.id] === opt ? accent : palette.border}`, color: palette.text }}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={submit}
          disabled={submitting || (questions.length > 0 && hasRequiredUnanswered)}
          className="rounded-full px-6 py-2.5 text-sm font-medium transition hover:opacity-85 disabled:opacity-40"
          style={{ backgroundColor: accent, color: '#fff' }}
        >
          {submitting ? 'Envoi…' : 'Envoyer mes réponses'}
        </button>
      </div>
      </>
      )}
    </div>
  );
}