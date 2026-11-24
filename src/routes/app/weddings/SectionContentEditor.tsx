import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Json } from '../../../types/database';
import MediaUploader from '../../../components/MediaUploader';
import MixedEditor from './MixedEditor';
import RichTextarea from '../../../components/RichTextarea';
import FrameOptions from '../../../components/FrameOptions';
import { readFrame, frameHint, type FrameConfig } from '../../../lib/frames';
import { isSnapchatUrl } from '../../w/sections/SnapchatSection';
import { coverImageHint, locationImageHint } from '../../../lib/imageHints';
import { clampWords, countWords, STORY_MAX_WORDS } from '../../../lib/wordLimits';

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

  function frame(key: string, defaults: Partial<FrameConfig> = {}): FrameConfig {
    return readFrame(record[key], defaults);
  }

  function newId(): string {
    return Math.random().toString(36).slice(2, 9);
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
          <div className="rounded-xl border border-borderlight p-4 space-y-4">
            <p className="text-sm font-semibold text-ink">Mise en page et contenu de l'accueil</p>
            <Field label="Mise en page">
              <select className="input" value={str('layout')} onChange={(e) => set('layout', e.target.value)}>
                <option value="">Photo plein écran (noms par-dessus)</option>
                <option value="paper">Faire-part : page claire, noms calligraphiés, photo encadrée dessous</option>
              </select>
            </Field>
            {str('layout') === 'paper' && (
              <>
                <Field label="Petite ligne au-dessus des noms"><input className="input" value={str('kicker')} onChange={(e) => set('kicker', e.target.value)} placeholder="Invitation au mariage de" /></Field>
                <div>
                  <label className="label">Cadre de la photo (sous les noms)</label>
                  <FrameOptions value={frame('photo_frame', { style: 'soft', ratio: '3:4', size: 'md' })} onChange={(v) => set('photo_frame', v)} />
                </div>
              </>
            )}
            <div>
              <label className="label">Phrase des familles (facultatif)</label>
              <RichTextarea value={str('tagline')} onChange={(v) => set('tagline', v)} placeholder="Avec leurs familles, ils ont la joie de vous inviter à célébrer leur union" className="min-h-16" />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-secondary">
              <input type="checkbox" checked={bool('show_date_block')} onChange={(e) => set('show_date_block', e.target.checked)} />
              Afficher le bloc date « Vendredi | 18 | Décembre — 2026 »
            </label>
            {bool('show_date_block') && (
              <Field label="Date du bloc (vide = date de la première étape du programme)">
                <input type="datetime-local" className="input" value={str('date_iso')} onChange={(e) => set('date_iso', e.target.value)} />
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-[1fr,auto] sm:items-end">
              <Field label="Résumé des horaires (facultatif)">
                <input className="input" value={str('schedule')} onChange={(e) => set('schedule', e.target.value)} placeholder="15H00 Mairie · 16H00 Table des Élites · Akwa, Douala" />
              </Field>
              <label className="flex items-center gap-2 pb-2 text-xs text-ink-secondary">
                <input type="checkbox" checked={bool('auto_schedule')} onChange={(e) => set('auto_schedule', e.target.checked)} />
                Générer depuis le programme
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bouton « réserver » (vide = masqué)"><input className="input" value={str('btn_rsvp')} onChange={(e) => set('btn_rsvp', e.target.value)} placeholder="Réserver ma place" /></Field>
              <Field label="Bouton « programme » (vide = masqué)"><input className="input" value={str('btn_program')} onChange={(e) => set('btn_program', e.target.value)} placeholder="Le programme" /></Field>
            </div>
          </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre de la section">
              <input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Souvenirs" />
            </Field>
            <Field label="Position du titre">
              <select className="input" value={str('title_position')} onChange={(e) => set('title_position', e.target.value)}>
                <option value="">Au-dessus de l'image</option>
                <option value="over">Par-dessus l'image</option>
                <option value="none">Masqué</option>
              </select>
            </Field>
          </div>
          <MediaUploader
            bucket="media"
            folder={`${folder}/galerie`}
            accept="image/*"
            label="Photo"
            value={str('image')}
            onChange={(v) => set('image', v)}
            hint={frameHint(frame('image_frame'))}
          />
          {str('image') && (
            <div>
              <label className="label">Cadre et dimensions de la photo</label>
              <FrameOptions value={frame('image_frame')} onChange={(v) => set('image_frame', v)} />
            </div>
          )}
          <MediaUploader
            bucket="media"
            folder={`${folder}/galerie`}
            accept="video/*"
            label="Vidéo (optionnel, remplace la photo)"
            value={str('video')}
            onChange={(v) => set('video', v)}
          />
          <div>
            <label className="label">Légende (facultatif)</label>
            <RichTextarea value={str('caption')} onChange={(v) => set('caption', v)} placeholder="Nos fiançailles, *décembre 2025*" className="min-h-14" />
          </div>
        </div>
      );
    case 'program':
      return (
        <div className="space-y-4">
          <Field label="Mise en page">
            <select className="input" value={str('layout')} onChange={(e) => set('layout', e.target.value)}>
              <option value="">Selon le modèle de design (frise / cartes alternées)</option>
              <option value="photo">Cartes photo plein cadre + bouton « Itinéraire »</option>
              <option value="hours">Frise des heures (grande photo ronde, nom, description, heure + itinéraire)</option>
              <option value="days">Par jour (carte en dégradé, photo en cœur, étapes groupées par date)</option>
            </select>
          </Field>
          <Field label="Titre (vide = titre par défaut)"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder={str('layout') === 'hours' ? 'Le programme' : str('layout') === 'days' ? 'Programme de Cérémonie' : 'Notre programme'} /></Field>
          {str('layout') === 'days' && (
            <div className="space-y-4 rounded-xl border border-borderlight p-4">
              <p className="text-sm font-semibold text-ink">Carte « par jour »</p>
              <div className="grid gap-4 sm:grid-cols-[200px,1fr]">
                <MediaUploader
                  bucket="media"
                  folder={`${folder}/programme`}
                  accept="image/*"
                  label="Photo du couple (facultatif)"
                  value={str('photo')}
                  onChange={(v) => set('photo', v ?? '')}
                  hint={frameHint(frame('photo_frame', { style: 'heart', size: 'sm' }))}
                />
                <div className="space-y-3">
                  <div>
                    <label className="label">Mot des familles (facultatif)</label>
                    <RichTextarea value={str('intro')} onChange={(v) => set('intro', v)} placeholder="Les familles **Kouokam** & **Fopoussi** ont l'honneur de vous inviter à ce mariage" className="min-h-16" />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-ink-secondary">
                      Couleur du haut
                      <input type="color" value={/^#[0-9a-f]{6}$/i.test(str('card_color1')) ? str('card_color1') : '#B5472B'} onChange={(e) => set('card_color1', e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-borderlight" />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-ink-secondary">
                      Couleur du bas
                      <input type="color" value={/^#[0-9a-f]{6}$/i.test(str('card_color2')) ? str('card_color2') : '#0F5C45'} onChange={(e) => set('card_color2', e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-borderlight" />
                    </label>
                    {(str('card_color1') || str('card_color2')) && (
                      <button type="button" className="text-xs text-ink-secondary underline" onClick={() => onChange({ ...record, card_color1: '', card_color2: '' } as Json)}>
                        Couleurs du modèle
                      </button>
                    )}
                  </div>
                  {str('card_color1') || str('card_color2') ? (
                    <div
                      className="h-10 rounded-lg"
                      style={{ background: `linear-gradient(90deg, ${str('card_color1') || '#B5472B'}, ${str('card_color2') || '#0F5C45'})` }}
                      aria-hidden
                    />
                  ) : (
                    <p className="text-xs text-ink-secondary">Sans choix : dégradé de la couleur principale vers la couleur foncée du modèle.</p>
                  )}
                </div>
              </div>
              {str('photo') && (
                <div>
                  <label className="label">Cadre de la photo</label>
                  <FrameOptions value={frame('photo_frame', { style: 'heart', size: 'sm' })} onChange={(v) => set('photo_frame', v)} />
                </div>
              )}
              <p className="text-xs text-ink-secondary">
                Les étapes sont regroupées par date. Pour un horaire comme « À la suite de la cérémonie », remplissez
                « Horaire affiché » dans l'onglet Programme.
              </p>
            </div>
          )}
          {str('layout') === 'hours' && (
            <label className="flex items-center gap-2 text-sm text-ink-secondary">
              <input type="checkbox" checked={bool('show_venue')} onChange={(e) => set('show_venue', e.target.checked)} />
              Ajouter en bas la carte « Lieu » (dernier lieu du programme)
            </label>
          )}
          <p className="text-sm text-ink-secondary">
            Le programme est alimenté par l'onglet « Programme » (sous-évènements :
            dot, mairie, église, soirée), chacun avec sa date, son lieu, sa photo et son lien Maps.
            Un invité arrivé par son lien personnel ou par un lien « par étape » (onglet Partage) ne voit que
            les étapes auxquelles il est convié.
            En mise en page « cartes photo », la photo du lieu sert de fond à la carte et la
            première ligne de la description s'affiche comme sur-titre (ex. « Mariage civil »).
          </p>
        </div>
      );
    case 'story': {
      const voices = list('voices');
      const milestones = list('milestones');
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Notre histoire" /></Field>
            <Field label="Sous-titre (optionnel)"><input className="input" value={str('subtitle')} onChange={(e) => set('subtitle', e.target.value)} placeholder="Deux regards, une même histoire" /></Field>
          </div>

          <div className="rounded-xl border border-borderlight p-4">
            <p className="mb-3 text-sm font-semibold text-ink">Photo du couple et introduction <span className="font-normal text-ink-secondary">(facultatif)</span></p>
            <div className="grid gap-4 sm:grid-cols-[200px,1fr]">
              <MediaUploader
                bucket="media"
                folder={`${folder}/histoire`}
                accept="image/*"
                label="Photo du couple"
                value={str('couple_photo')}
                onChange={(p) => set('couple_photo', p ?? '')}
                hint="Portrait 3:4, 900 × 1200 px — affichée dans un cadre en arche"
              />
              <div className="space-y-3">
                <Field label="Légende de la photo"><input className="input" value={str('photo_caption')} onChange={(e) => set('photo_caption', e.target.value)} placeholder="Douala, 2013 — le début de tout" /></Field>
                <div>
                  <label className="label">Introduction</label>
                  <RichTextarea value={str('intro')} onChange={(v) => set('intro', v)} placeholder="Une partie de PlayStation, un été à Douala… et douze ans plus tard, un « oui »." />
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Les récits <span className="font-normal text-ink-secondary">— idéalement deux, un par marié(e) : photo et extrait en alternance, « Voir plus » ouvre le récit complet</span></p>
            <ListEditor
              items={voices}
              onChange={(v) => set('voices', v)}
              addLabel="Ajouter un récit"
              newItem={() => ({ name: '', label: '', photo: '', text: '' })}
              render={(v, update) => (
                <div className="grid gap-4 sm:grid-cols-[180px,1fr]">
                  <MediaUploader
                    bucket="media"
                    folder={`${folder}/histoire`}
                    accept="image/*"
                    label="Portrait"
                    value={(v.photo as string) ?? ''}
                    onChange={(p) => update({ ...v, photo: p ?? '' })}
                    hint="Carré, 600 × 600 px"
                  />
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Prénom">
                        <input className="input" value={(v.name as string) ?? ''} onChange={(e) => update({ ...v, name: e.target.value })} placeholder="Lyzette" />
                      </Field>
                      <Field label="Petite mention (optionnel)">
                        <input className="input" value={(v.label as string) ?? ''} onChange={(e) => update({ ...v, label: e.target.value })} placeholder="raconte · sa version · la mariée" />
                      </Field>
                    </div>
                    <div>
                      <label className="label">Récit</label>
                      <RichTextarea value={(v.text as string) ?? ''} onChange={(t) => update({ ...v, text: clampWords(t, STORY_MAX_WORDS) })} placeholder="Tout commence pendant les vacances de 2013…" className="min-h-40" />
                    </div>
                    <p className={`text-xs ${countWords(v.text as string) >= STORY_MAX_WORDS ? 'font-medium text-amber-700' : 'text-ink-secondary'}`}>{countWords(v.text as string)} / {STORY_MAX_WORDS} mots — la carte affiche le début ; le reste s'ouvre avec « Voir plus ».</p>
                  </div>
                </div>
              )}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Les grandes dates <span className="font-normal text-ink-secondary">(facultatif) — frise affichée sous les récits</span></p>
            <ListEditor
              items={milestones}
              onChange={(v) => set('milestones', v)}
              addLabel="Ajouter une date"
              newItem={() => ({ date: '', title: '', text: '' })}
              render={(m, update) => (
                <div className="grid gap-3 sm:grid-cols-[160px,1fr]">
                  <Field label="Date">
                    <input className="input" value={(m.date as string) ?? ''} onChange={(e) => update({ ...m, date: e.target.value })} placeholder="Été 2013" />
                  </Field>
                  <div className="space-y-3">
                    <Field label="Titre">
                      <input className="input" value={(m.title as string) ?? ''} onChange={(e) => update({ ...m, title: e.target.value })} placeholder="La rencontre" />
                    </Field>
                    <Field label="Texte (optionnel)">
                      <textarea className="input min-h-16" value={(m.text as string) ?? ''} onChange={(e) => update({ ...m, text: e.target.value })} placeholder="Une manette de PlayStation et beaucoup de fous rires." />
                    </Field>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      );
    }
    case 'snapchat': {
      const url = str('url').trim();
      const urlOk = isSnapchatUrl(url);
      return (
        <div className="space-y-4">
          <Field label="Lien du filtre Snapchat *">
            <input
              className="input font-mono text-sm"
              value={str('url')}
              onChange={(e) => set('url', e.target.value)}
              placeholder="https://www.snapchat.com/unlock/?type=SNAPCODE&uuid=…"
            />
          </Field>
          {url && !urlOk && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
              Ce lien n'est pas un lien Snapchat valide (il doit commencer par https:// et venir de snapchat.com).
            </p>
          )}
          {urlOk && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Lien valide : le QR code et le bouton « Ouvrir le filtre » apparaîtront sur le site.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Filtre Snapchat" /></Field>
            <Field label="Petit texte (optionnel)"><input className="input" value={str('text')} onChange={(e) => set('text', e.target.value)} placeholder="Partagez vos plus beaux moments avec notre filtre !" /></Field>
          </div>
          <p className="text-xs text-ink-secondary">
            Où trouver le lien : dans Snapchat (ou Lens Studio / Lens Web Builder), ouvrez le filtre → bouton
            « Partager » → « Copier le lien ». Tant qu'aucun lien valide n'est saisi, la section reste masquée sur le site.
          </p>
        </div>
      );
    }
    case 'quote':
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Citation / verset</label>
            <RichTextarea value={str('text')} onChange={(v) => set('text', v)} placeholder="Ta femme sera comme une vigne féconde dans ta maison…" />
          </div>
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
                <div>
                  <label className="label">Texte</label>
                  <RichTextarea value={(it.text as string) ?? ''} onChange={(v) => update({ ...it, text: v })} placeholder="Vos présents seront accueillis dès votre arrivée…" className="min-h-16" />
                </div>
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
          <div>
            <label className="label">Texte</label>
            <RichTextarea value={str('text')} onChange={(v) => set('text', v)} placeholder="À nos parents, à nos grands-parents…" className="min-h-32" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Citation de fin (optionnel)"><input className="input" value={str('quote')} onChange={(e) => set('quote', e.target.value)} placeholder="Une famille, ce n'est pas un lieu, c'est un lien" /></Field>
            <Field label="Auteur de la citation"><input className="input" value={str('quote_author')} onChange={(e) => set('quote_author', e.target.value)} placeholder="Proverbe africain" /></Field>
          </div>
        </div>
      );
    case 'dress_code': {
      // Couleurs : { hex, name } (ancien format : code seul, converti à la volée).
      const colors = (Array.isArray(record['colors']) ? (record['colors'] as unknown[]) : [])
        .map((x) => (typeof x === 'string' ? { hex: x, name: '' } : x && typeof x === 'object' ? { hex: String((x as Record<string, unknown>).hex ?? '#c9a34a'), name: String((x as Record<string, unknown>).name ?? '') } : null))
        .filter((x): x is { hex: string; name: string } => !!x);
      const setColors = (v: { hex: string; name: string }[]) => set('colors', v);
      const photoGroup = (key: string, label: string) => {
        // 3 photos maximum par groupe (les éventuelles photos en trop d'avant ne sont plus affichées).
        const all = strList(key);
        const photos = all.slice(0, 3);
        return (
          <div>
            <label className="label">{label} (3 photos maximum)</label>
            {all.length > 3 && <p className="mb-2 text-xs text-amber-700">{all.length - 3} photo(s) en trop ne sont plus affichées sur le site ; elles seront retirées au prochain changement.</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              {photos.map((p, i) => (
                <MediaUploader
                  key={`${key}-${i}-${p}`}
                  bucket="media"
                  folder={`${folder}/dresscode`}
                  accept="image/*"
                  label={`Photo ${i + 1}`}
                  value={p}
                  onChange={(v) => set(key, v ? photos.map((x, j) => (j === i ? v : x)) : photos.filter((_, j) => j !== i))}
                />
              ))}
              {photos.length < 3 && (
                <MediaUploader
                  key={`${key}-new-${photos.length}`}
                  bucket="media"
                  folder={`${folder}/dresscode`}
                  accept="image/*"
                  label="Ajouter une photo"
                  value=""
                  onChange={(v) => v && set(key, [...photos, v])}
                  hint="Portrait 3:4 (1200 × 1600 px)"
                />
              )}
            </div>
          </div>
        );
      };
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Code vestimentaire" /></Field>
            <Field label="Thème"><input className="input" value={str('theme_name')} onChange={(e) => set('theme_name', e.target.value)} placeholder="Terracotta" /></Field>
          </div>
          <div>
            <label className="label">Description</label>
            <RichTextarea value={str('description')} onChange={(v) => set('description', v)} placeholder="Habillez-vous aux couleurs du thème" className="min-h-16" />
          </div>
          <div>
            <label className="label">Palette de couleurs (le nom s'affiche sur le site, jamais le code)</label>
            <div className="space-y-2">
              {colors.map((col, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(col.hex) ? col.hex : '#c9a34a'}
                    onChange={(e) => setColors(colors.map((c, j) => (j === i ? { ...c, hex: e.target.value } : c)))}
                    className="h-9 w-12 cursor-pointer rounded border border-borderlight"
                  />
                  <input
                    className="input"
                    value={col.name}
                    onChange={(e) => setColors(colors.map((c, j) => (j === i ? { ...c, name: e.target.value } : c)))}
                    placeholder="Nom de la couleur (ex. Terracotta, Rouille, Crème…)"
                  />
                  <button type="button" onClick={() => setColors(colors.filter((_, j) => j !== i))} className="btn-outline !px-2 hover:!border-red-300 hover:!text-red-600" title="Retirer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {colors.length < 8 && (
                <button type="button" onClick={() => setColors([...colors, { hex: '#c9a34a', name: '' }])} className="btn-outline">
                  <Plus className="h-4 w-4" /> Ajouter une couleur
                </button>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-borderlight p-4 space-y-4">
            <p className="text-sm font-semibold text-ink">Exemples de tenues <span className="font-normal text-ink-secondary">(facultatif) — affichés directement sur le site : une rangée de 3 photos par groupe</span></p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Groupe 1 (rangée du haut)"><input className="input" value={str('label_women')} onChange={(e) => set('label_women', e.target.value)} placeholder="Pour elles" /></Field>
              <Field label="Groupe 2 (rangée du bas)"><input className="input" value={str('label_men')} onChange={(e) => set('label_men', e.target.value)} placeholder="Pour eux" /></Field>
            </div>
            {photoGroup('photos_women', str('label_women') || 'Photos « Pour elles »')}
            {photoGroup('photos_men', str('label_men') || 'Photos « Pour eux »')}
            <Field label="Petite phrase sous les exemples"><input className="input" value={str('examples_caption')} onChange={(e) => set('examples_caption', e.target.value)} placeholder="Terracotta, rouille, crème et touches dorées : laissez parler votre style !" /></Field>
          </div>
        </div>
      );
    }
    case 'rsvp': {
      const cats = list('categories');
      return (
        <div className="space-y-5">
          <Field label="Titre">
            <input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="Réserver ma place" />
          </Field>
          <Field label="Message d'introduction">
            <textarea className="input min-h-20" value={str('intro')} onChange={(e) => set('intro', e.target.value)} placeholder="Places limitées — chaque place correspond à une personne." />
          </Field>
          <div className="rounded-xl border border-borderlight p-4 space-y-4">
            <p className="text-sm font-semibold text-ink">Catégories et places <span className="font-normal text-ink-secondary">(facultatif)</span></p>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={bool('ask_category')} onChange={(e) => set('ask_category', e.target.checked)} />
              Demander la catégorie à la réservation (Famille, Amis, Collègues…)
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={bool('show_gauge')} onChange={(e) => set('show_gauge', e.target.checked)} />
              Afficher la jauge des places réservées sur le site
            </label>
            <Field label="Nombre total de places (vide = illimité)">
              <input type="number" min={1} className="input" value={(record['total_quota'] as number | undefined) ?? ''} onChange={(e) => set('total_quota', e.target.value ? Number(e.target.value) : null)} placeholder="200" />
            </Field>
            <ListEditor
              items={cats}
              onChange={(v) => set('categories', v)}
              addLabel="Ajouter une catégorie"
              newItem={() => ({ id: newId(), label: '', quota: null })}
              render={(cat, update) => (
                <div className="grid gap-3 sm:grid-cols-[1fr,160px]">
                  <Field label="Nom de la catégorie">
                    <input className="input" value={(cat.label as string) ?? ''} onChange={(e) => update({ ...cat, label: e.target.value })} placeholder="Famille" />
                  </Field>
                  <Field label="Places (vide = illimité)">
                    <input type="number" min={1} className="input" value={(cat.quota as number | null | undefined) ?? ''} onChange={(e) => update({ ...cat, quota: e.target.value ? Number(e.target.value) : null })} placeholder="60" />
                  </Field>
                </div>
              )}
            />
            <p className="text-xs text-ink-secondary">
              Chaque réservation compte 1 place, plus ses accompagnants. Quand une catégorie est pleine, elle
              apparaît « complet » et n'est plus proposée. La catégorie de chaque invité se voit et se modifie
              dans l'onglet « Invités ».
            </p>
          </div>
          <p className="text-xs text-ink-secondary">
            Le visiteur réserve avec son nom, son numéro WhatsApp (et sa catégorie si activée) et reçoit un pass
            avec QR à présenter le jour J. Il peut aussi retrouver son pass (nom + téléphone).
          </p>
        </div>
      );
    }
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
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={bool('auto_publish')} onChange={(e) => set('auto_publish', e.target.checked)} />
            Publication immédiate : les messages s'affichent tout de suite, sans validation
          </label>
          <p className="text-xs text-ink-secondary">
            {bool('auto_publish')
              ? "Les invités écrivent directement dans le livre d'or dès qu'ils reçoivent l'invitation. Vous pouvez toujours retirer un message depuis l'onglet de modération."
              : "Les messages sont mis en attente de validation depuis l'espace administrateur avant publication."}
          </p>
        </div>
      );
    case 'gifts':
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre"><input className="input" value={str('title')} onChange={(e) => set('title', e.target.value)} placeholder="L'espace cadeaux" /></Field>
            <Field label="Texte du bouton"><input className="input" value={str('button')} onChange={(e) => set('button', e.target.value)} placeholder="Voir la liste de cadeaux" /></Field>
          </div>
          <div>
            <label className="label">Message</label>
            <RichTextarea value={str('message')} onChange={(v) => set('message', v)} placeholder="Votre présence sera pour nous le plus beau des cadeaux. Toutefois, si vous souhaitez…" className="min-h-24" />
          </div>
          <Field label="Lien vers la liste de cadeaux (site externe)">
            <input className="input font-mono text-sm" value={str('url')} onChange={(e) => set('url', e.target.value)} placeholder="https://…" />
          </Field>
          {str('url') && !/^https?:\/\//i.test(str('url').trim()) && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">Le lien doit commencer par https://</p>
          )}
          <MediaUploader bucket="media" folder={`${folder}/cadeaux`} accept="image/*" label="Image (facultatif)" value={str('image')} onChange={(v) => set('image', v)} hint={frameHint(frame('image_frame', { ratio: '4:3' }))} />
          {str('image') && <FrameOptions value={frame('image_frame', { style: 'rounded', ratio: '4:3' })} onChange={(v) => set('image_frame', v)} />}
          <p className="text-xs text-ink-secondary">Sans lien, seul le message s'affiche. Section commune à tous les modèles.</p>
        </div>
      );
    case 'closing':
      return (
        <div className="space-y-4">
          <MediaUploader bucket="media" folder={`${folder}/cloture`} accept="image/*" label="Photo du couple" value={str('photo')} onChange={(v) => set('photo', v)} hint={frameHint(frame('photo_frame', { style: 'soft', ratio: '3:4' }))} />
          {str('photo') && (
            <div>
              <label className="label">Cadre de la photo</label>
              <FrameOptions value={frame('photo_frame', { style: 'soft', ratio: '3:4', size: 'md' })} onChange={(v) => set('photo_frame', v)} />
            </div>
          )}
          <Field label="Ligne de date (vide = date et ville du programme)">
            <input className="input" value={str('date')} onChange={(e) => set('date', e.target.value)} placeholder="18  12  2026  —  Douala" />
          </Field>
          <div>
            <label className="label">Mot de fin</label>
            <RichTextarea value={str('signature')} onChange={(v) => set('signature', v)} placeholder="Avec toute l'affection de nos familles" className="min-h-14" />
          </div>
          <p className="text-xs text-ink-secondary">Les noms du couple s'affichent automatiquement. Placez cette section en dernier.</p>
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
