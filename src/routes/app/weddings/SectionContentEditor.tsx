import type { Json } from '../../../types/database';
import MediaUploader from '../../../components/MediaUploader';
import MixedEditor from './MixedEditor';
import { coverImageHint, galleryImageHint, locationImageHint } from '../../../lib/imageHints';

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
            hint={coverImageHint('mobile')}
          />
          <MediaUploader
            bucket="covers"
            folder={`${folder}/cover`}
            accept="image/*"
            label="Photo de couverture — bureau / paysage"
            value={str('image_desktop')}
            onChange={(v) => set('image_desktop', v)}
            hint={coverImageHint('desktop')}
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
    case 'save_the_date':
      return (
        <div className="space-y-4">
          <Field label="Date du mariage (calendrier)">
            <input
              type="datetime-local"
              className="input"
              value={str('date')}
              onChange={(e) => set('date', e.target.value)}
            />
          </Field>
          <Field label="Titre">
            <input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Réservez la date" />
          </Field>
          <Field label="Message (optionnel)">
            <textarea className="input min-h-16" value={str('message')} onChange={(e) => set('message', e.target.value)} placeholder="Les détails suivront très bientôt !" />
          </Field>
          <p className="text-xs text-ink-secondary">
            Si aucune date n'est renseignée ici, celle du premier évènement du programme est utilisée.
          </p>
        </div>
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
            hint={locationImageHint()}
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
            hint={galleryImageHint()}
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
            <input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Confirmez votre invitation" />
          </Field>
          <Field label="Message d'introduction">
            <textarea className="input min-h-20" value={str('intro')} onChange={(e) => set('intro', e.target.value)} placeholder="Inscrivez-vous pour recevoir votre QR d'invitation, à présenter le jour J." />
          </Field>
          <p className="text-xs text-ink-secondary">
            Un visiteur s'inscrit avec juste son nom et son téléphone et reçoit un QR
            d'invitation à télécharger (à présenter le jour J, scanné depuis l'onglet
            « Entrée » pour pointer sa présence). Il peut aussi retrouver un QR déjà généré en
            recherchant son nom.
          </p>
        </div>
      );
    case 'mixed':
      return <MixedEditor content={content} onChange={onChange} folder={folder} />;
    case 'gallery':
      return (
        <div className="space-y-4">
          <Field label="Titre"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Galerie" /></Field>
          <Field label="Message d'introduction">
            <textarea className="input min-h-16" value={str('intro')} onChange={(e) => set('intro', e.target.value)} placeholder="Photos et vidéos de l'évènement — ajoutez les vôtres !" />
          </Field>
          <p className="text-xs text-ink-secondary">
            Les invités peuvent y déposer leurs photos/vidéos ; elles sont mises en attente de
            validation depuis l'espace administrateur avant publication.
          </p>
        </div>
      );
    case 'testimonials':
      return (
        <div className="space-y-4">
          <Field label="Titre"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Témoignages" /></Field>
          <Field label="Message d'introduction">
            <textarea className="input min-h-16" value={str('intro')} onChange={(e) => set('intro', e.target.value)} placeholder="Laissez un petit mot aux mariés." />
          </Field>
          <p className="text-xs text-ink-secondary">
            Les messages sont mis en attente de validation depuis l'espace administrateur avant
            publication.
          </p>
        </div>
      );
    case 'tables':
      return (
        <p className="text-sm text-ink-secondary">
          Les tables ne se configurent plus ici : rendez-vous dans l'onglet « Tables » du menu.
        </p>
      );
    default:
      return <p className="text-sm text-ink-secondary">Ce type de section n'a pas encore de configuration dédiée.</p>;
  }
}