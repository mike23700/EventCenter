import type { Json } from '../../../types/database';
import MediaUploader from '../../../components/MediaUploader';
import MixedEditor from './MixedEditor';

export interface SectionContentEditorProps {
  type: string;
  content: Json;
  onChange: (content: Json) => void;
  /** Dossier Storage du mariage courant, ex: `weddings/<slug>` */
  folder?: string;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

/**
 * Éditeur de contenu selon le type de section.
 * Le contenu est stocké en JSON (champ `content` de la table sections).
 * Phase 4 : couverture avec upload, lieu + plan, compte à rebours,
 * partie mixte complète (texte / photo / vidéo / questionnaire).
 */
export default function SectionContentEditor({ type, content, onChange, folder = 'uploads' }: SectionContentEditorProps) {
  const record: Record<string, unknown> =
    content && typeof content === 'object' && !Array.isArray(content)
      ? (content as Record<string, unknown>)
      : {};

  function set(key: string, value: unknown) {
    onChange({ ...record, [key]: value } as Json);
  }

  function str(key: string): string {
    return typeof record[key] === 'string' ? (record[key] as string) : '';
  }

  function bool(key: string, dflt = false): boolean {
    return typeof record[key] === 'boolean' ? (record[key] as boolean) : dflt;
  }

  switch (type) {
    case 'cover':
      return (
        <div className="space-y-4">
          <MediaUploader
            bucket="covers"
            folder={`${folder}/cover`}
            accept="image/*"
            label="Photo de couverture — mobile / portrait"
            value={str('image_mobile')}
            onChange={(v) => set('image_mobile', v)}
            hint="Affichée en priorité sur mobile"
          />
          <MediaUploader
            bucket="covers"
            folder={`${folder}/cover`}
            accept="image/*"
            label="Photo de couverture — bureau / paysage"
            value={str('image_desktop')}
            onChange={(v) => set('image_desktop', v)}
            hint="Utilisée pour grands écrans"
          />
          <MediaUploader
            bucket="covers"
            folder={`${folder}/cover`}
            accept="video/*"
            label="Vidéo de couverture (optionnel)"
            value={str('video')}
            onChange={(v) => set('video', v)}
            hint="MP4 ou WebM, courte"
          />
          <div>
            <label className="label">Mode vidéo</label>
            <label className="flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={bool('video_enabled')}
                onChange={(e) => set('video_enabled', e.target.checked)}
              />
              Utiliser la vidéo à la place de la photo
            </label>
          </div>
          <Field label="Date courte (affichée sous les noms)">
            <input className="input" value={str('date')} onChange={(e) => set('date', e.target.value)} placeholder="12 juin 2026 — Douala" />
          </Field>
        </div>
      );
    case 'countdown':
      return (
        <Field label="Date du compte à rebours">
          <input
            type="datetime-local"
            className="input"
            value={str('date')}
            onChange={(e) => set('date', e.target.value)}
          />
        </Field>
      );
    case 'location':
      return (
        <div className="space-y-4">
          <Field label="Titre"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Mairie de Douala" /></Field>
          <Field label="Adresse"><input className="input" value={str('address')} onChange={(e) => set('address', e.target.value)} placeholder="123 rue Exemple, Douala" /></Field>
          <MediaUploader
            bucket="media"
            folder={`${folder}/lieux`}
            accept="image/*"
            label="Photo du lieu"
            value={str('image')}
            onChange={(v) => set('image', v)}
          />
          <Field label="Lien Google Maps (URL)">
            <input className="input" value={str('maps_url')} onChange={(e) => set('maps_url', e.target.value)} placeholder="https://maps.app.goo.gl/..." />
          </Field>
        </div>
      );
    case 'image_video':
      return (
        <div className="space-y-4">
          <Field label="Titre de la section">
            <input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Souvenirs" />
          </Field>
          <MediaUploader
            bucket="media"
            folder={`${folder}/galerie`}
            accept="image/*"
            label="Photo"
            value={str('image')}
            onChange={(v) => set('image', v)}
          />
          <MediaUploader
            bucket="media"
            folder={`${folder}/galerie`}
            accept="video/*"
            label="Vidéo (optionnel)"
            value={str('video')}
            onChange={(v) => set('video', v)}
          />
        </div>
      );
    case 'program':
      return (
        <p className="text-sm text-ink-secondary">
          Le programme est alimenté par l'onglet « Programme » (sous-évènements :
          dot, mairie, église, soirée), chacun avec sa date, son lieu, sa photo et son lien Maps.
        </p>
      );
    case 'rsvp':
      return (
        <div className="space-y-4">
          <Field label="Titre">
            <input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Confirmation de présence" />
          </Field>
          <Field label="Message d'introduction">
            <textarea className="input min-h-20" value={str('intro')} onChange={(e) => set('intro', e.target.value)} placeholder="Dites-nous sur quelles étapes nous pouvons compter sur vous…" />
          </Field>
          <Field label="Message si l'invité n'est pas trouvé">
            <textarea className="input min-h-16" value={str('not_found')} onChange={(e) => set('not_found', e.target.value)} placeholder="Nom introuvable, contactez les mariés." />
          </Field>
          <p className="text-xs text-ink-secondary">
            Les invités sont saisis et envoyés depuis l'onglet « Invités » (venir). Les étapes proposées
            sont celles du programme.
          </p>
        </div>
      );
    case 'mixed':
      return <MixedEditor content={content} onChange={onChange} folder={folder} />;
    case 'gallery':
    case 'tables':
    case 'testimonials':
      return (
        <p className="text-sm text-ink-secondary">
          Ce module sera bientôt configurable ici (phase de développement invités & RSVP).
        </p>
      );
    default:
      return <p className="text-sm text-ink-secondary">Ce type de section n'a pas encore de configuration dédiée.</p>;
  }
}