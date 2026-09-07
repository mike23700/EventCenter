import { useState } from 'react';
import { Type, Image as ImageIcon, Video, ClipboardList, GripVertical, Trash2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import type { Json } from '../../../types/database';
import MediaUploader from '../../../components/MediaUploader';
import { randomString } from '../../../lib/slug';
import { galleryImageHint } from '../../../lib/imageHints';

export interface MixedBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'questionnaire';
  title?: string;
  text?: string;
  src?: string;
  questions?: Question[];
}

export interface Question {
  id: string;
  label: string;
  type: 'single' | 'multiple' | 'open';
  options?: string[];
}

const EMPTY_QUESTION: Question = { id: '', label: '', type: 'single', options: [''] };

function newId() {
  return randomString(10);
}

function parseBlocks(content: Json): MixedBlock[] {
  const c = content && typeof content === 'object' && !Array.isArray(content)
    ? (content as Record<string, unknown>)
    : {};
  const blocks = c['blocks'];
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(isBlock);
}

function isBlock(b: unknown): b is MixedBlock {
  if (!b || typeof b !== 'object') return false;
  const o = b as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    (o.type === 'text' || o.type === 'image' || o.type === 'video' || o.type === 'questionnaire')
  );
}

function cleanBlock(b: MixedBlock): MixedBlock {
  const base: MixedBlock = { id: b.id, type: b.type };
  if (b.type === 'text') {
    base.title = b.title ?? '';
    base.text = b.text ?? '';
  } else if (b.type === 'image' || b.type === 'video') {
    base.src = b.src ?? '';
    base.title = b.title ?? '';
  } else if (b.type === 'questionnaire') {
    base.title = b.title ?? '';
    base.text = b.text ?? '';
    base.questions = (b.questions ?? []).map((q) => ({
      id: q.id || newId(),
      label: q.label ?? '',
      type: q.type ?? 'single',
      options: q.options ?? [''],
    }));
  }
  return base;
}

/**
 * Éditeur de la partie mixte : collection de blocs (texte, image, vidéo,
 * questionnaire) ajoutables, modifiables et réordonnables par glisser-déposer.
 */
export default function MixedEditor({
  content,
  onChange,
  folder,
}: {
  content: Json;
  onChange: (content: Json) => void;
  folder: string;
}) {
  const [blocks, setBlocks] = useState<MixedBlock[]>(() => parseBlocks(content));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function commit(next: MixedBlock[]) {
    setBlocks(next);
    onChange({ blocks: next.map(cleanBlock) } as unknown as Json);
  }

  function addBlock(type: MixedBlock['type']) {
    const block: MixedBlock = { id: newId(), type };
    if (type === 'questionnaire') {
      block.questions = [{ ...EMPTY_QUESTION, id: newId(), options: [''] }];
    }
    commit([...blocks, block]);
  }

  function update(id: string, patch: Partial<MixedBlock>) {
    commit(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function remove(id: string) {
    commit(blocks.filter((b) => b.id !== id));
  }

  function move(dragIdx: number, dropIdx: number) {
    if (dragIdx === dropIdx) return;
    const next = [...blocks];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(dropIdx, 0, moved);
    commit(next);
  }

  return (
    <div className="space-y-5">
      {blocks.length === 0 && (
        <div className="rounded-xl border border-dashed border-borderlight bg-paper-warm p-6 text-center text-sm text-ink-secondary">
          Cette partie est vide. Ajoutez un bloc pour raconter votre histoire :
          texte de bienvenue, photos, vidéos, questionnaire…
        </div>
      )}

      <ul className="space-y-3">
        {blocks.map((block, idx) => (
          <li
            key={block.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', String(idx));
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = Number(e.dataTransfer.getData('text/plain'));
              if (!Number.isNaN(from)) move(from, idx);
            }}
            className="rounded-2xl border border-borderlight bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-ink-secondary/50 active:cursor-grabbing" />
              <BlockIcon type={block.type} />
              <span className="flex-1 text-sm font-medium text-ink">
                {blockTitle(block)}
              </span>
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [block.id]: !c[block.id] }))}
                title={collapsed[block.id] ? 'Déplier' : 'Replier'}
                className="btn-outline !px-2"
              >
                {collapsed[block.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
              <button onClick={() => remove(block.id)} title="Supprimer" className="btn-outline !px-2 hover:!border-red-300 hover:!text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {!collapsed[block.id] && (
              <div className="mt-3 space-y-3 border-t border-borderlight pt-3">
                <BlockForm
                  block={block}
                  folder={folder}
                  onChange={(patch) => update(block.id, patch)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <AddButton icon={<Type className="h-4 w-4" />} label="Texte" onClick={() => addBlock('text')} />
        <AddButton icon={<ImageIcon className="h-4 w-4" />} label="Photo" onClick={() => addBlock('image')} />
        <AddButton icon={<Video className="h-4 w-4" />} label="Vidéo" onClick={() => addBlock('video')} />
        <AddButton icon={<ClipboardList className="h-4 w-4" />} label="Questionnaire" onClick={() => addBlock('questionnaire')} />
      </div>
    </div>
  );
}

function BlockIcon({ type }: { type: MixedBlock['type'] }) {
  const common = { className: 'h-4 w-4', 'aria-hidden': true };
  switch (type) {
    case 'text': return <Type {...common} />;
    case 'image': return <ImageIcon {...common} />;
    case 'video': return <Video {...common} />;
    case 'questionnaire': return <ClipboardList {...common} />;
  }
}

function blockTitle(block: MixedBlock): string {
  if (block.type === 'image') return `Photo${block.title ? ` — ${block.title}` : ''}`;
  if (block.type === 'video') return `Vidéo${block.title ? ` — ${block.title}` : ''}`;
  if (block.type === 'questionnaire') {
    const n = block.questions?.length ?? 0;
    return `Questionnaire${block.title ? ` — ${block.title}` : ''} (${n} question${n > 1 ? 's' : ''})`;
  }
  return block.title || 'Bloc de texte';
}

function AddButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn-outline">
      <Plus className="h-4 w-4" />
      {icon}
      {label}
    </button>
  );
}

function BlockForm({
  block,
  folder,
  onChange,
}: {
  block: MixedBlock;
  folder: string;
  onChange: (patch: Partial<MixedBlock>) => void;
}) {
  switch (block.type) {
    case 'text':
      return (
        <div className="grid gap-3">
          <div>
            <label className="label">Titre</label>
            <input className="input" value={block.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Notre histoire" />
          </div>
          <div>
            <label className="label">Texte</label>
            <textarea className="input min-h-24" value={block.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} placeholder="Quelques mots sur vous, votre rencontre…" />
          </div>
        </div>
      );
    case 'image':
      return (
        <div className="grid gap-3">
          <MediaUploader
            bucket="media"
            folder={folder}
            accept="image/*"
            label="Photo"
            value={block.src}
            onChange={(src) => onChange({ src: src ?? undefined })}
            hint={`JPG, PNG ou WebP · ${galleryImageHint()}`}
          />
          <div>
            <label className="label">Légende</label>
            <input className="input" value={block.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Légende de la photo" />
          </div>
        </div>
      );
    case 'video':
      return (
        <div className="grid gap-3">
          <MediaUploader
            bucket="media"
            folder={folder}
            accept="video/*"
            label="Vidéo"
            value={block.src}
            onChange={(src) => onChange({ src: src ?? undefined })}
            hint="MP4, WebM"
          />
          <div>
            <label className="label">Titre (optionnel)</label>
            <input className="input" value={block.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Notre clip" />
          </div>
        </div>
      );
    case 'questionnaire':
      return <QuestionnaireForm block={block} onChange={onChange} />;
    default:
      return null;
  }
}

function QuestionnaireForm({
  block,
  onChange,
}: {
  block: MixedBlock;
  onChange: (patch: Partial<MixedBlock>) => void;
}) {
  const questions = block.questions ?? [];

  function setQuestions(next: Question[]) {
    onChange({ questions: next });
  }

  function addQuestion() {
    setQuestions([...questions, { ...EMPTY_QUESTION, id: newId(), options: [''] }]);
  }

  function updateQuestion(qid: string, patch: Partial<Question>) {
    setQuestions(questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
  }

  function removeQuestion(qid: string) {
    setQuestions(questions.filter((q) => q.id !== qid));
  }

  function setOption(qid: string, oi: number, value: string) {
    setQuestions(
      questions.map((q) =>
        q.id === qid
          ? { ...q, options: (q.options ?? []).map((o, i) => (i === oi ? value : o)) }
          : q,
      ),
    );
  }

  function addOption(qid: string) {
    setQuestions(
      questions.map((q) => (q.id === qid ? { ...q, options: [...(q.options ?? []), ''] } : q)),
    );
  }

  function removeOption(qid: string, oi: number) {
    setQuestions(
      questions.map((q) =>
        q.id === qid
          ? { ...q, options: (q.options ?? []).filter((_, i) => i !== oi) }
          : q,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        <div>
          <label className="label">Titre du questionnaire</label>
          <input className="input" value={block.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} placeholder="Vous nous rejoignez ?" />
        </div>
        <div>
          <label className="label">Introduction</label>
          <textarea className="input min-h-20" value={block.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} placeholder="Aidez-nous à préparer ce grand jour…" />
        </div>
      </div>

      <div className="space-y-2">
        {questions.map((q) => (
          <div key={q.id} className="rounded-xl border border-borderlight bg-paper-warm p-3">
            <div className="flex items-center gap-2">
              <input
                className="input"
                value={q.label}
                onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                placeholder="Question (ex : Présent à la soirée ?)"
              />
              <select
                className="input w-auto"
                value={q.type}
                onChange={(e) => updateQuestion(q.id, { type: e.target.value as Question['type'] })}
              >
                <option value="single">Choix unique</option>
                <option value="multiple">Choix multiples</option>
                <option value="open">Réponse libre</option>
              </select>
              <button onClick={() => removeQuestion(q.id)} className="btn-outline !px-2 hover:!border-red-300 hover:!text-red-600" title="Retirer la question">
                <X className="h-4 w-4" />
              </button>
            </div>

            {q.type !== 'open' && (
              <div className="mt-2 space-y-1.5">
                {(q.options ?? []).map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border border-ink-secondary/40" aria-hidden />
                    <input
                      className="input"
                      value={opt}
                      onChange={(e) => setOption(q.id, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                    />
                    {opt === '' && (q.options?.length ?? 0) > 1 ? (
                      <button onClick={() => removeOption(q.id, oi)} className="text-ink-secondary hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="w-4" />
                    )}
                  </div>
                ))}
                <button onClick={() => addOption(q.id)} className="text-xs font-medium text-gold hover:underline">
                  + Ajouter une option
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={addQuestion} className="btn-outline">
        <Plus className="h-4 w-4" />
        Ajouter une question
      </button>
    </div>
  );
}