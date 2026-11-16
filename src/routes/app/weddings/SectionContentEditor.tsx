import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
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

  function list(key: string): Record<string, unknown>[] {
    const v = record[key];
    return Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];
  }

  function strList(key: string): string[] {
    const v = record[key];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
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
          <div>
            <label className="label">Noms des mariés</label>
            <label className="flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={bool('show_names', true)}
                onChange={(e) => set('show_names', e.target.checked)}
              />
              Afficher les noms des mariés sur la couverture
            </label>
          </div>
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
        <div className="space-y-4">
          <Field label="Mise en page">
            <select className="input" value={str('layout')} onChange={(e) => set('layout', e.target.value)}>
              <option value="">Selon le modèle de design (frise / cartes alternées)</option>
              <option value="photo">Cartes photo plein cadre + bouton « Itinéraire »</option>
            </select>
          </Field>
          <p className="text-sm text-ink-secondary">
            Le programme est alimenté par l'onglet « Programme » (sous-évènements :
            dot, mairie, église, soirée), chacun avec sa date, son lieu, sa photo et son lien Maps.
            En mise en page « cartes photo », la photo du lieu sert de fond à la carte et la
            première ligne de la description s'affiche comme sur-titre (ex. « Mariage civil »).
          </p>
        </div>
      );
    case 'story': {
      const voices = list('voices');
      const setVoices = (v: Record<string, unknown>[]) => set('voices', v);
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Notre histoire" /></Field>
            <Field label="Sous-titre (optionnel)"><input className="input" value={str('subtitle')} onChange={(e) => set('subtitle', e.target.value)} placeholder="Comment tout a commencé…" /></Field>
          </div>
          <ListEditor
            items={voices}
            onChange={setVoices}
            addLabel="Ajouter un récit"
            newItem={() => ({ name: '', photo: '', text: '' })}
            render={(v, update) => (
              <div className="space-y-3">
                <Field label="Raconté par">
                  <input className="input" value={(v.name as string) ?? ''} onChange={(e) => update({ ...v, name: e.target.value })} placeholder="Lyzette" />
                </Field>
                <MediaUploader
                  bucket="media"
                  folder={`${folder}/histoire`}
                  accept="image/*"
                  label="Photo (portrait, carrée de préférence)"
                  value={(v.photo as string) ?? ''}
                  onChange={(p) => update({ ...v, photo: p ?? '' })}
                  hint="Carrée, 600 × 600 px minimum"
                />
                <Field label="Récit">
                  <textarea className="input min-h-32" value={(v.text as string) ?? ''} onChange={(e) => update({ ...v, text: e.target.value })} placeholder="Tout commence pendant les vacances de…" />
                </Field>
              </div>
            )}
          />
          <p className="text-xs text-ink-secondary">Les récits longs sont repliés avec un bouton « Lire la suite ». Deux récits = un par marié(e), affichés en alternance.</p>
        </div>
      );
    }
    case 'quote':
      return (
        <div className="space-y-4">
          <Field label="Citation / verset">
            <textarea className="input min-h-24" value={str('text')} onChange={(e) => set('text', e.target.value)} placeholder="Ta femme sera comme une vigne féconde dans ta maison…" />
          </Field>
          <Field label="Auteur / référence">
            <input className="input" value={str('author')} onChange={(e) => set('author', e.target.value)} placeholder="Psaume 128, 3" />
          </Field>
        </div>
      );
    case 'info': {
      const items = list('items');
      return (
        <div className="space-y-4">
          <Field label="Titre"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Informations pratiques" /></Field>
          <Field label="Introduction (optionnel)"><input className="input" value={str('intro')} onChange={(e) => set('intro', e.target.value)} placeholder="À noter avant le grand jour" /></Field>
          <ListEditor
            items={items}
            onChange={(v) => set('items', v)}
            addLabel="Ajouter une information"
            newItem={() => ({ title: '', text: '' })}
            render={(it, update) => (
              <div className="space-y-3">
                <Field label="Intitulé (optionnel)">
                  <input className="input" value={(it.title as string) ?? ''} onChange={(e) => update({ ...it, title: e.target.value })} placeholder="Cadeaux" />
                </Field>
                <Field label="Texte">
                  <textarea className="input min-h-20" value={(it.text as string) ?? ''} onChange={(e) => update({ ...it, text: e.target.value })} placeholder="Vos présents seront accueillis dès votre arrivée…" />
                </Field>
              </div>
            )}
          />
        </div>
      );
    }
    case 'thanks':
      return (
        <div className="space-y-4">
          <Field label="Titre"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Remerciements" /></Field>
          <Field label="Texte">
            <textarea className="input min-h-32" value={str('text')} onChange={(e) => set('text', e.target.value)} placeholder="À nos parents, à nos grands-parents…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Citation de fin (optionnel)"><input className="input" value={str('quote')} onChange={(e) => set('quote', e.target.value)} placeholder="Une famille, ce n'est pas un lieu, c'est un lien" /></Field>
            <Field label="Auteur de la citation"><input className="input" value={str('quote_author')} onChange={(e) => set('quote_author', e.target.value)} placeholder="Proverbe africain" /></Field>
          </div>
        </div>
      );
    case 'dress_code': {
      const colors = strList('colors');
      const photos = strList('photos');
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Code vestimentaire" /></Field>
            <Field label="Thème"><input className="input" value={str('theme_name')} onChange={(e) => set('theme_name', e.target.value)} placeholder="Élégance champêtre" /></Field>
          </div>
          <Field label="Description">
            <textarea className="input min-h-20" value={str('description')} onChange={(e) => set('description', e.target.value)} placeholder="Tenue de soirée — tons terre, beige et or." />
          </Field>
          <div>
            <label className="label">Palette de couleurs</label>
            <div className="flex flex-wrap items-center gap-3">
              {colors.map((col, i) => (
                <span key={i} className="flex items-center gap-1 rounded-full border border-borderlight py-1 pl-1 pr-2">
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(col) ? col : '#c9a34a'}
                    onChange={(e) => set('colors', colors.map((c, j) => (j === i ? e.target.value : c)))}
                    className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent"
                  />
                  <span className="font-mono text-xs text-ink-secondary">{col}</span>
                  <button type="button" onClick={() => set('colors', colors.filter((_, j) => j !== i))} className="text-ink-secondary hover:text-red-600" title="Retirer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {colors.length < 8 && (
                <button type="button" onClick={() => set('colors', [...colors, '#c9a34a'])} className="btn-outline !py-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Couleur
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="label">Photos d'inspiration (jusqu'à 6)</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {photos.map((p, i) => (
                <MediaUploader
                  key={`${i}-${p}`}
                  bucket="media"
                  folder={`${folder}/dresscode`}
                  accept="image/*"
                  label={`Photo ${i + 1}`}
                  value={p}
                  onChange={(v) => set('photos', v ? photos.map((x, j) => (j === i ? v : x)) : photos.filter((_, j) => j !== i))}
                />
              ))}
              {photos.length < 6 && (
                <MediaUploader
                  key={`new-${photos.length}`}
                  bucket="media"
                  folder={`${folder}/dresscode`}
                  accept="image/*"
                  label="Ajouter une photo"
                  value=""
                  onChange={(v) => v && set('photos', [...photos, v])}
                  hint="Portrait 3:4 recommandé"
                />
              )}
            </div>
          </div>
        </div>
      );
    }
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
/** Liste éditable générique (ajout, suppression, réordonnancement). */
function ListEditor({
  items,
  onChange,
  render,
  newItem,
  addLabel,
}: {
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
  render: (item: Record<string, unknown>, update: (next: Record<string, unknown>) => void) => React.ReactNode;
  newItem: () => Record<string, unknown>;
  addLabel: string;
}) {
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-borderlight bg-paper-warm/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">#{i + 1}</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="btn-outline !px-2 !py-1" title="Monter"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="btn-outline !px-2 !py-1" title="Descendre"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="btn-outline !px-2 !py-1 hover:!border-red-300 hover:!text-red-600" title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          {render(item, (next) => onChange(items.map((x, j) => (j === i ? next : x))))}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, newItem()])} className="btn-outline">
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  );
}
