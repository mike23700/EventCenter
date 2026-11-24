import { useEffect, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { saveResponses } from '../../../lib/publicApi';
import { usePublicWedding } from '../publicContext';
import { useRsvpConfig } from './CapacityGauge';
import type { Json, WeddingEvent } from '../../../types/database';
import { storageUrl } from '../../../lib/media';
import { normalizeTextSize } from '../../../lib/fontSize';
import { readFrame } from '../../../lib/frames';
import { renderRich } from '../../../lib/richText';
import FramedImage from '../FramedImage';
import type { SectionProps } from './types';
import { asRecord } from './types';
import { SectionShell } from './shell';
import { useGuestIdentity } from './useGuestIdentity';
import GuestSelfRegister from './GuestSelfRegister';
import { useTextStyle } from '../../../lib/textStyles';

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
  titleSize?: number;
  textSize?: number;
  src?: string;
  frame?: unknown;
  titlePosition?: 'below' | 'above' | 'over';
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
  const ts = useTextStyle();
  const titleSize = normalizeTextSize(block.titleSize);
  const textSize = normalizeTextSize(block.textSize);
  return (
    <div style={id === 'minimal' ? { maxWidth: '42rem', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' } : undefined}>
      {block.title && (
        <h3
          className="font-display tpl-display text-2xl sm:text-3xl font-bold"
          style={{ color: palette.ink, ...ts('block_title'), ...(titleSize ? { fontSize: `${titleSize}px` } : {}) }}
        >
          {block.title}
        </h3>
      )}
      {block.text && (
        <p
          className={`mt-3 whitespace-pre-line leading-relaxed tpl-body ${id === 'royal' ? 'text-base' : 'text-lg'}`}
          style={{ color: palette.muted, ...ts('block_text'), ...(textSize ? { fontSize: `${textSize}px` } : {}) }}
        >
          {renderRich(block.text, palette.accent)}
        </p>
      )}
    </div>
  );
}

function ImageView({ block, tpl }: { block: Block; tpl: SectionProps['tpl'] }) {
  const { palette, id } = tpl;
  const ts = useTextStyle();
  const src = storageUrl('media', block.src) ?? block.src;
  if (!src) return null;
  const pos = block.titlePosition ?? 'below';
  const frame = readFrame(block.frame, { style: id === 'minimal' ? 'square' : 'rounded' });
  return (
    <div>
      {block.title && pos === 'above' && (
        <h3 className="mb-4 text-center font-display tpl-display text-2xl font-bold sm:text-3xl" style={{ color: palette.ink, ...ts('block_title') }}>{block.title}</h3>
      )}
      <FramedImage
        src={src}
        alt={block.title ?? ''}
        frame={frame}
        tpl={tpl}
        accent={palette.accent}
        overlay={block.title && pos === 'over' ? (
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-black/15 to-transparent p-5 text-center">
            <p className="font-display tpl-display text-2xl font-bold text-white drop-shadow sm:text-4xl" style={{ ...ts('block_title'), color: '#fff' }}>{block.title}</p>
          </div>
        ) : undefined}
      />
      {block.title && pos === 'below' && (
        <p className="mt-3 text-center text-sm tracking-wide tpl-body italic" style={{ color: palette.muted, ...ts('caption') }}>{block.title}</p>
      )}
      {accentMarker(tpl)}
    </div>
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
  const ts = useTextStyle();
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
        <figcaption className="mt-3 text-center text-sm tracking-wide tpl-body italic" style={{ color: palette.muted, ...ts('caption') }}>
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
  const { invitedGuest } = usePublicWedding();
  const rsvpCfg = useRsvpConfig(weddingId);
  const ts = useTextStyle();

  // Invité arrivé par son lien personnel : pas besoin de s'identifier.
  useEffect(() => {
    if (invitedGuest && guestStatus === 'idle') id.adopt(invitedGuest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitedGuest]);
  const [registering, setRegistering] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!block.title && questions.length === 0) return null;

  function setAnswer(qid: string, value: string | string[]) {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }

  async function registerSelf(name: string, phone: string, eventIds: string[], category?: string) {
    await id.registerSelf({ name, phone, invitedEvents: eventIds, category });
    setRegistering(false);
  }

  async function submit() {
    if (!guest) return;
    setSubmitting(true);
    setError('');
    const rows = questions.map((q) => ({
      question_key: `${sectionId}:${block.id}:${q.id}`,
      answer: (answers[q.id] ?? (q.type === 'multiple' ? [] : '')) as Json,
    }));
    try {
      await saveResponses(weddingId, guest.qr_token, rows);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setSubmitting(false);
    }
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
      <h3 className="font-display tpl-display text-xl font-bold" style={{ color: palette.ink, ...ts('block_title') }}>
        {block.title || 'Questionnaire'}
      </h3>
      {block.text && (
        <p className="mt-2 tpl-body" style={{ color: palette.muted, ...ts('block_text') }}>
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
              rsvp={rsvpCfg.config}
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
            Indiquez votre nom et votre téléphone pour que vos réponses soient rattachées à votre invitation.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input"
              placeholder="Votre nom"
              value={id.query}
              onChange={(e) => id.setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && id.search()}
              style={{ backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }}
            />
            <input
              className="input sm:max-w-[10rem]"
              placeholder="Téléphone (679...)"
              inputMode="numeric"
              maxLength={9}
              value={id.phone}
              onChange={(e) => id.setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              onKeyDown={(e) => e.key === 'Enter' && id.search()}
              style={{ backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }}
            />
            <button
              onClick={id.search}
              disabled={id.query.trim().length < 2 || id.phone.length !== 9 || guestStatus === 'searching'}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              style={{ backgroundColor: accent }}
            >
              <Search className="mx-auto h-4 w-4" />
            </button>
          </div>
          {id.error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{id.error}</p>}
        </div>
      ) : (
      <>
      <div className="mt-5 space-y-5">
        {questions.map((q, qi) => (
          <div key={q.id}>
            <p className="tpl-body text-sm font-semibold" style={{ color: palette.ink, ...ts('question') }}>
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