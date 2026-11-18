import { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Check, GripVertical, Pencil, Power, ArrowUp, ArrowDown, X, Trash2 } from 'lucide-react';
import { db } from '../../../lib/db';
import type { Wedding, Section, Json, SectionType } from '../../../types/database';
import SectionContentEditor from './SectionContentEditor';
import SectionStyleEditor from './SectionStyleEditor';

const SECTION_LABELS: Record<string, string> = {
  cover: 'Photo de couverture',
  location: 'Lieu',
  countdown: 'Compte à rebours',
  save_the_date: 'Save the date (calendrier)',
  program: 'Programme',
  image_video: 'Image / vidéo',
  mixed: 'Partie mixte',
  rsvp: 'Confirmation de présence (RSVP)',
  gallery: 'Galerie',
  tables: 'Tables (ancien module — géré depuis l\'onglet Tables)',
  testimonials: 'Témoignages (livre d\'or)',
  story: 'Notre histoire (à deux voix)',
  quote: 'Citation / verset',
  info: 'Informations pratiques',
  thanks: 'Remerciements',
  dress_code: 'Code vestimentaire',
  snapchat: 'Filtre Snapchat',
  gifts: 'Espace cadeaux',
  closing: 'Clôture (photo + mot des familles)',
};

export function sectionLabel(type: string): string {
  return SECTION_LABELS[type] ?? type;
}

// Les tables de placement ne sont plus une section du site : elles se
// gèrent depuis l'onglet « Tables », à part.
const ALL_TYPES: SectionType[] = [
  'cover', 'location', 'countdown', 'save_the_date', 'program', 'image_video',
  'mixed', 'rsvp', 'gallery', 'testimonials',
  'story', 'quote', 'info', 'thanks', 'dress_code', 'snapchat', 'gifts', 'closing',
];

/** Liste des sections, activation, réordonnancement et édition de contenu. */
export default function SectionsEditor() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!wedding) return;
    let active = true;
    (async () => {
      const { data, error } = await db
        .from('sections')
        .select('*')
        .eq('wedding_id', wedding.id)
        .order('position');
      if (!active) return;
      if (error) setError(error.message);
      else setSections(data ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [wedding]);

  if (loading) return <p className="text-ink-secondary">Chargement…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;

  async function toggleSection(section: Section) {
    const next = !section.enabled;
    setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, enabled: next } : s)));
    const { error } = await db
      .from('sections')
      .update({ enabled: next })
      .eq('id', section.id);
    if (error) setError(error.message);
  }

  async function move(section: Section, dir: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === section.id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sections.length) return;
    const list = [...sections];
    const a = list[idx];
    list[idx] = list[swapIdx];
    list[swapIdx] = a;
    const withPos = list.map((s, i) => ({ ...s, position: i }));
    setSections(withPos);
    // Met à jour les deux positions échangées (update partiel par ligne).
    for (const s of [withPos[idx], withPos[swapIdx]]) {
      const { error } = await db.from('sections').update({ position: s.position }).eq('id', s.id);
      if (error) setError(error.message);
    }
  }

  async function moveTo(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const list = [...sections];
    const [movedSection] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, movedSection);
    const withPos = list.map((s, i) => ({ ...s, position: i }));
    setSections(withPos);
    for (const s of withPos) {
      const { error } = await db.from('sections').update({ position: s.position }).eq('id', s.id);
      if (error) setError(error.message);
    }
  }

  async function saveContent(section: Section, content: Json) {
    setSaving(true);
    setError('');
    const { error } = await db
      .from('sections')
      .update({ content })
      .eq('id', section.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, content } : s)));
    setEditingId(null);
  }

  async function confirmDelete() {
    if (!confirmingDelete) return;
    const section = confirmingDelete;
    setDeleting(true);
    setError('');
    const { error } = await db.from('sections').delete().eq('id', section.id);
    setDeleting(false);
    if (error) {
      setError(error.message);
      setConfirmingDelete(null);
      return;
    }
    setSections((prev) =>
      prev
        .filter((s) => s.id !== section.id)
        .map((s, i) => ({ ...s, position: i })),
    );
    if (editingId === section.id) setEditingId(null);
    setConfirmingDelete(null);
  }

  async function addSection(type: string) {
    if (!wedding) return;
    const position = sections.length;
    const defaultContent: Json = type === 'countdown' || type === 'save_the_date' ? { date: '' } : {};
    const { data, error } = await db
      .from('sections')
      .insert({ wedding_id: wedding.id, type, position, enabled: true, content: defaultContent })
      .select('*')
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setSections((prev) => [...prev, data]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Sections du site</h2>
          <p className="text-sm text-ink-secondary">
            Activez, ordonnez ou supprimez les modules. L'ordre affiché correspond au site public.
          </p>
        </div>
        <label className="label flex items-center gap-2 text-sm">
          <span className="mb-0">Ajouter une section</span>
          <select className="input w-auto" defaultValue="" onChange={(e) => e.target.value && addSection(e.target.value)}>
            <option value="" disabled>Choisir…</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>{sectionLabel(t)}</option>
            ))}
          </select>
        </label>
      </div>

      {sections.length === 0 && (
        <div className="card text-center text-ink-secondary">
          Aucune section. Ajoutez la couverture etc. depuis le menu ci-dessus.
        </div>
      )}

      <ul className="space-y-3">
        {sections.map((section, i) => (
          <li
            key={section.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', String(i));
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = Number(e.dataTransfer.getData('text/plain'));
              if (!Number.isNaN(from)) moveTo(from, i);
            }}
            className="rounded-2xl border border-borderlight bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-ink-secondary/50 active:cursor-grabbing" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{sectionLabel(section.type)}</p>
                <p className="text-xs text-ink-secondary">
                  Position {i + 1} · {section.enabled ? 'Activé' : 'Désactivé'}
                </p>
              </div>
              <button onClick={() => move(section, -1)} disabled={i === 0} className="btn-outline !px-2" title="Monter">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button onClick={() => move(section, 1)} disabled={i === sections.length - 1} className="btn-outline !px-2" title="Descendre">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button onClick={() => toggleSection(section)} className="btn-outline !px-2" title={section.enabled ? 'Désactiver' : 'Activer'}>
                <Power className={`h-4 w-4 ${section.enabled ? 'text-gold' : 'text-ink-secondary'}`} />
              </button>
              <button onClick={() => setEditingId(editingId === section.id ? null : section.id)} className="btn-outline !px-2" title="Modifier le contenu">
                {editingId === section.id ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setConfirmingDelete(section)}
                className="btn-outline !px-2 hover:!border-red-300 hover:!text-red-600"
                title="Supprimer la section"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {editingId === section.id && (
              <div className="mt-4 space-y-3 border-t border-borderlight pt-4">
                <SectionContentEditor
                  type={section.type}
                  content={section.content}
                  folder={`weddings/${wedding.slug}`}
                  onChange={(content) => setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, content } : s)))}
                />
                {section.type !== 'cover' && (
                  <SectionStyleEditor
                    content={section.content}
                    folder={`weddings/${wedding.slug}`}
                    onChange={(style) => setSections((prev) => prev.map((s) => (s.id === section.id
                      ? { ...s, content: { ...(s.content && typeof s.content === 'object' && !Array.isArray(s.content) ? s.content : {}), style } as unknown as Json }
                      : s)))}
                  />
                )}
                <button onClick={() => saveContent(section, section.content)} disabled={saving} className="btn-primary">
                  <Check className="h-4 w-4" />
                  {saving ? 'Enregistrement…' : 'Enregistrer le contenu'}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="text-sm text-ink-secondary">
        <Link to={`/w/${wedding.slug}`} target="_blank" rel="noreferrer" className="text-gold underline">
          Voir le site public →
        </Link>
      </p>

      {confirmingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && setConfirmingDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-ink">Supprimer cette section ?</h3>
            <p className="mt-2 text-sm text-ink-secondary">
              « {sectionLabel(confirmingDelete.type)} » sera définitivement supprimée, avec tout son
              contenu. Cette action est irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirmingDelete(null)} disabled={deleting} className="btn-outline">
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="btn bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}