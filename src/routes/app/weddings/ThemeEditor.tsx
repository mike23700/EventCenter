import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, ExternalLink, Flower, Crown, Music, UploadCloud, X, Loader2 } from 'lucide-react';
import { db } from '../../../lib/db';
import type { Wedding, Json } from '../../../types/database';
import { DISPLAY_FONTS, BODY_FONTS } from '../../../lib/format';
import { TEMPLATE_DEFS, getTemplate } from '../../../lib/templates';
import { storageUrl, uploadFile, deleteFile, validateAudioFile } from '../../../lib/media';
import MediaUploader from '../../../components/MediaUploader';
import { DEFAULT_INVITE_MESSAGE, coupleInitials, invitationTheme } from '../../../lib/invitation';
import { AMBIENT_CHOICES, siteOptions, type IntroConfig } from '../../../lib/siteOptions';

function themeRecord(theme: Json): Record<string, unknown> {
  return theme && typeof theme === 'object' && !Array.isArray(theme)
    ? (theme as Record<string, unknown>)
    : {};
}

/** Miniature visuelle d'un template (aperçu type Canva). */
function TemplateMiniature({ id, selected }: { id: string; selected: boolean }) {
  const t = getTemplate(id);
  const { palette } = t;
  return (
    <div
      className={`overflow-hidden rounded-xl border-2 transition ${selected ? 'border-gold shadow-md' : 'border-borderlight'}`}
      style={{ backgroundColor: palette.background }}
    >
      <div className="flex items-end gap-1 p-3" style={{ height: 72, backgroundColor: palette.accent }}>
        <div className="mx-auto h-full w-16 rounded-t-lg text-center"
          style={{ backgroundColor: palette.surface, paddingTop: 14 }}>
          <span className="font-display text-[9px] leading-none text-ink-secondary" style={{ fontFamily: t.fonts.display }}>
            {t.label.split(' ')[0]}
          </span>
        </div>
      </div>
      <div className="space-y-1 px-3 pb-3 pt-2">
        <div className="h-1.5 w-4/5 rounded-full" style={{ backgroundColor: palette.border }} />
        <div className="h-1.5 w-3/5 rounded-full" style={{ backgroundColor: palette.border }} />
        <div className="mt-1 flex gap-1">
          {(['#B', '#A', '#D'] as const).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: palette.accent }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Éditeur du thème : template (4 modèles), couleur, polices. */
export default function ThemeEditor() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  const [primaryColor, setPrimaryColor] = useState<string>(
    (themeRecord(wedding.theme)['primaryColor'] as string) ?? '#C9A34A',
  );
  const [displayFont, setDisplayFont] = useState<string>(
    (themeRecord(wedding.theme)['displayFont'] as string) ?? '',
  );
  const [bodyFont, setBodyFont] = useState<string>(
    (themeRecord(wedding.theme)['bodyFont'] as string) ?? '',
  );
  const [footerText, setFooterText] = useState<string>(
    (themeRecord(wedding.theme)['footerText'] as string) ?? '',
  );
  const [displayFontScale, setDisplayFontScale] = useState<number>(
    (themeRecord(wedding.theme)['displayFontScale'] as number) ?? 1,
  );
  const [bodyFontScale, setBodyFontScale] = useState<number>(
    (themeRecord(wedding.theme)['bodyFontScale'] as number) ?? 1,
  );
  const initialInv = invitationTheme(wedding.theme);
  const initialOpts = siteOptions(wedding.theme, getTemplate(wedding.template));
  const [intro, setIntro] = useState<IntroConfig>(initialOpts.intro);
  const setIntroField = (patch: Partial<IntroConfig>) => setIntro((prev) => ({ ...prev, ...patch }));
  const [ambient, setAmbient] = useState<string>((themeRecord(wedding.theme)['ambient'] as string) || 'auto');
  const [decor, setDecor] = useState<string>((themeRecord(wedding.theme)['decor'] as string) || 'auto');
  const [stickyHeader, setStickyHeader] = useState<boolean>(themeRecord(wedding.theme)['stickyHeader'] === true);
  const [inviteMessage, setInviteMessage] = useState<string>(initialInv.inviteMessage);
  const [ogImage, setOgImage] = useState<string>((themeRecord(wedding.theme)['ogImage'] as string) ?? '');
  const [template, setTemplate] = useState<string>(wedding.template);
  const [audioPath, setAudioPath] = useState<string>(wedding.audio_url ?? '');
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioError, setAudioError] = useState('');
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const activeTpl = getTemplate(template);
  const displayFontsList = DISPLAY_FONTS.filter(
    (f) => !activeTpl.fonts.display.includes(f.id),
  );
  const bodyFontsList = BODY_FONTS.filter(
    (f) => !activeTpl.fonts.body.includes(f.id),
  );

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    const { error } = await db
      .from('weddings')
      .update({
        template,
        audio_url: audioPath || null,
        theme: {
          ...themeRecord(wedding.theme),
          primaryColor,
          displayFont,
          bodyFont,
          footerText: footerText.trim(),
          displayFontScale,
          bodyFontScale,
          intro: { ...intro, monogram: intro.monogram.trim(), tagline: intro.tagline.trim() },
          // compatibilité avec les anciens réglages d'enveloppe
          envelopeEnabled: intro.enabled && intro.mode === 'envelope',
          ambient,
          decor,
          stickyHeader,
          inviteMessage: inviteMessage.trim(),
          ogImage,
        },
      })
      .eq('id', wedding.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
  }

  async function pickAudio(file: File | undefined) {
    if (!file) return;
    const validationError = validateAudioFile(file);
    if (validationError) {
      setAudioError(validationError);
      return;
    }
    setAudioUploading(true);
    setAudioError('');
    try {
      const path = await uploadFile(file, { bucket: 'media', folder: `weddings/${wedding.slug}/audio` });
      if (audioPath) await deleteFile('media', audioPath).catch(() => {});
      setAudioPath(path);
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setAudioUploading(false);
    }
  }

  async function removeAudio() {
    if (!audioPath) return;
    setAudioUploading(true);
    setAudioError('');
    try {
      await deleteFile('media', audioPath);
    } catch {
      // fichier déjà absent : on retire quand même la référence
    } finally {
      setAudioPath('');
      setAudioUploading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Apparence du site</h2>
        <p className="text-sm text-ink-secondary">
          Choisissez un modèle de design (style Canva / Word), puis personnalisez la
          couleur et la police d'affichage.
        </p>
      </div>

      <div className="card space-y-8">
        {/* Choix du template avec aperçus */}
        <div>
          <label className="label">Modèle de design</label>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATE_DEFS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  template === t.id
                    ? 'border-gold bg-paper-cream'
                    : 'border-borderlight bg-white hover:border-gold/40'
                }`}
              >
                <div className="w-24 flex-none">
                  <TemplateMiniature id={t.id} selected={template === t.id} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-ink">{t.label}</p>
                  <p className="text-xs text-ink-secondary">{t.tagline}</p>
                  <p
                    className="mt-1 font-display text-xs"
                    style={{ fontFamily: t.fonts.display }}
                  >
                    Aa&nbsp;Bb&nbsp;— exemple
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ruban décoratif de l'élément sélectionné */}
        <div
          className="pointer-events-none flex h-10 items-center justify-center gap-2 rounded-lg"
          style={{ backgroundColor: activeTpl.palette.accentSoft }}
        >
          {template === 'royal' ? (
            <Crown className="h-4 w-4" style={{ color: activeTpl.palette.accent }} />
          ) : template === 'minimal' ? (
            <span className="h-2 w-2 rotate-45" style={{ backgroundColor: activeTpl.palette.accent }} />
          ) : (
            <Flower className="h-4 w-4" style={{ color: activeTpl.palette.accent }} />
          )}
          <span className="text-sm font-medium" style={{ color: activeTpl.palette.ink }}>
            {activeTpl.label}
          </span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="label">Couleur principale</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-borderlight"
              />
              <input
                className="input font-mono"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Police des titres</label>
            <select
              className="input"
              value={displayFont}
              onChange={(e) => setDisplayFont(e.target.value)}
            >
              <option value="">Police du modèle (recommandé)</option>
              {displayFontsList.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <p
              className="mt-2"
              style={{
                fontFamily: DISPLAY_FONTS.find((f) => f.id === displayFont)?.stack ?? activeTpl.fonts.display,
                fontSize: `${1.125 * displayFontScale}rem`,
              }}
            >
              Camille &amp; Jean
            </p>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={0.7}
                max={1.6}
                step={0.05}
                value={displayFontScale}
                onChange={(e) => setDisplayFontScale(Number(e.target.value))}
                className="flex-1 accent-gold"
              />
              <span className="w-12 shrink-0 text-right text-xs text-ink-secondary">{Math.round(displayFontScale * 100)}%</span>
            </div>
          </div>

          <div>
            <label className="label">Police du texte</label>
            <select
              className="input"
              value={bodyFont}
              onChange={(e) => setBodyFont(e.target.value)}
            >
              <option value="">Police du modèle (recommandé)</option>
              {bodyFontsList.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <p
              className="mt-2 text-ink-secondary"
              style={{
                fontFamily: BODY_FONTS.find((f) => f.id === bodyFont)?.stack ?? activeTpl.fonts.body,
                fontSize: `${0.875 * bodyFontScale}rem`,
              }}
            >
              Nous serions heureux de vous compter parmi nous.
            </p>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={0.7}
                max={1.6}
                step={0.05}
                value={bodyFontScale}
                onChange={(e) => setBodyFontScale(Number(e.target.value))}
                className="flex-1 accent-gold"
              />
              <span className="w-12 shrink-0 text-right text-xs text-ink-secondary">{Math.round(bodyFontScale * 100)}%</span>
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="footerText">Texte du pied de page</label>
          <p className="mb-2 text-xs text-ink-secondary">
            Affiché en bas de chaque page du site public. Laissez vide pour garder le texte par
            défaut (« &amp; {wedding.name}{wedding.secondary_name ? ` & ${wedding.secondary_name}` : ''} — bienvenue {new Date().getFullYear()} »).
          </p>
          <input
            id="footerText"
            className="input"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder={`& ${wedding.name}${wedding.secondary_name ? ` & ${wedding.secondary_name}` : ''} — bienvenue ${new Date().getFullYear()}`}
          />
        </div>

        <div>
          <label className="label">Musique d'ambiance</label>
          <p className="mb-2 text-xs text-ink-secondary">
            Jouée en fond sur le site public (bouton pour l'activer/couper, visible par les invités).
          </p>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a"
            className="hidden"
            onChange={(e) => pickAudio(e.target.files?.[0])}
          />
          {audioPath ? (
            <div className="flex items-center gap-3 rounded-xl border border-borderlight p-3">
              <Music className="h-5 w-5 shrink-0 text-gold" />
              <audio src={storageUrl('media', audioPath) ?? ''} controls className="h-9 flex-1 min-w-0" />
              <button
                type="button"
                onClick={removeAudio}
                disabled={audioUploading}
                className="btn-outline !px-2 !py-1.5 shrink-0 hover:!border-red-300 hover:!text-red-600"
                title="Supprimer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : audioUploading ? (
            <div className="flex h-16 items-center justify-center gap-2 rounded-xl border border-dashed border-borderlight bg-paper-warm text-ink-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Envoi…</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-borderlight bg-paper-warm text-ink-secondary transition hover:border-gold hover:text-gold"
            >
              <UploadCloud className="h-5 w-5" />
              <span className="text-xs font-medium">Importer un fichier audio (MP3, WAV, OGG…) — 15 Mo max</span>
            </button>
          )}
          {audioError && <p className="mt-1 text-xs text-red-600">{audioError}</p>}
        </div>

        {/* Page de garde (commune à tous les modèles) */}
        <div className="space-y-4 rounded-xl border border-borderlight p-4">
          <div>
            <p className="font-medium text-ink">Page de garde</p>
            <p className="text-xs text-ink-secondary">
              Écran d'ouverture avant le site (facultatif). Il reprend le style du modèle choisi (couleurs,
              polices, décor, animation) ; l'invité arrivé par son lien personnel y voit son nom.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ['none', 'Aucune'],
              ['envelope', 'Enveloppe animée'],
              ['media', 'Image ou GIF animé'],
              ['video', 'Vidéo'],
              ['simple', 'Titre + bouton'],
            ] as const).map(([id, label]) => {
              const active = id === 'none' ? !intro.enabled : intro.enabled && intro.mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => (id === 'none' ? setIntroField({ enabled: false }) : setIntroField({ enabled: true, mode: id }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-gold bg-gold text-white' : 'border-borderlight bg-white text-ink-secondary hover:border-gold/50'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {intro.enabled && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Petite ligne au-dessus</label>
                  <input className="input" value={intro.kicker} onChange={(e) => setIntroField({ kicker: e.target.value })} placeholder="Invitation au mariage de" />
                </div>
                <div>
                  <label className="label">Titre (vide = noms du couple)</label>
                  <input className="input" value={intro.title} onChange={(e) => setIntroField({ title: e.target.value })} placeholder={`${wedding.name}${wedding.secondary_name ? ` & ${wedding.secondary_name}` : ''}`} />
                </div>
                <div>
                  <label className="label">Sous-titre (vide = date du programme)</label>
                  <input className="input" value={intro.subtitle} onChange={(e) => setIntroField({ subtitle: e.target.value })} placeholder="18 décembre 2026 — Douala" />
                </div>
                <div>
                  <label className="label">Texte du bouton</label>
                  <input className="input" value={intro.button} onChange={(e) => setIntroField({ button: e.target.value })} placeholder="Ouvrir l'invitation" />
                </div>
              </div>

              {(intro.mode === 'media' || intro.mode === 'video' || intro.mode === 'envelope') && (
                <MediaUploader
                  bucket="media"
                  folder={`weddings/${wedding.slug}/page-de-garde`}
                  accept={intro.mode === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
                  label={intro.mode === 'video' ? 'Vidéo (en boucle, sans son)' : intro.mode === 'envelope' ? "Image ou GIF d'enveloppe (facultatif — sinon l'enveloppe ETAN dessinée)" : 'Image ou GIF animé'}
                  value={intro.media}
                  onChange={(v) => setIntroField({ media: v ?? '', mediaType: v ? (intro.mode === 'video' ? 'video' : 'image') : '' })}
                  hint={intro.mode === 'video' ? 'MP4, portrait 3:4 ou 9:16, 15 Mo max, quelques secondes' : 'GIF animé ou PNG transparent conseillé, 1000 px de large'}
                />
              )}

              {intro.mode === 'envelope' && !intro.media && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label">Monogramme</label>
                    <input className="input" maxLength={4} value={intro.monogram} onChange={(e) => setIntroField({ monogram: e.target.value })} placeholder={coupleInitials(wedding)} />
                  </div>
                  <div>
                    <label className="label">Couleur de l'enveloppe</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={intro.color || activeTpl.palette.surface} onChange={(e) => setIntroField({ color: e.target.value })} className="h-10 w-14 cursor-pointer rounded border border-borderlight" />
                      {intro.color && (
                        <button type="button" onClick={() => setIntroField({ color: '' })} className="text-xs text-ink-secondary underline">Couleur du modèle</button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="label">Petite phrase (optionnel)</label>
                    <input className="input" value={intro.tagline} onChange={(e) => setIntroField({ tagline: e.target.value })} placeholder="Avec toute notre affection" />
                  </div>
                </div>
              )}
              <p className="text-xs text-ink-secondary">Le toucher qui ouvre la page de garde lance aussi la musique d'ambiance.</p>
            </div>
          )}
        </div>

        {/* Animations et décor */}
        <div className="space-y-4 rounded-xl border border-borderlight p-4">
          <p className="font-medium text-ink">Animations et décor</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Animation qui tombe</label>
              <select className="input" value={ambient} onChange={(e) => setAmbient(e.target.value)}>
                {AMBIENT_CHOICES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}{a.id === 'auto' && activeTpl.ambient ? ` (${AMBIENT_CHOICES.find((x) => x.id === activeTpl.ambient?.kind)?.label.toLowerCase() ?? ''})` : a.id === 'auto' ? ' (aucune)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Décor fleuri (bouquets dans les coins)</label>
              <select className="input" value={decor} onChange={(e) => setDecor(e.target.value)}>
                <option value="auto">Selon le modèle{activeTpl.decor === 'floral-corners' ? ' (oui)' : ' (non)'}</option>
                <option value="floral-corners">Oui</option>
                <option value="none">Non</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={stickyHeader} onChange={(e) => setStickyHeader(e.target.checked)} />
            Bandeau fixe en haut du site (monogramme, noms, date)
          </label>
        </div>

        {/* Invitation personnalisée */}
        <div className="space-y-4 rounded-xl border border-borderlight p-4">
          <div>
            <p className="font-medium text-ink">Invitation personnalisée</p>
            <p className="text-xs text-ink-secondary">Message envoyé avec le lien personnel de chaque invité (onglet « Invités ») et image d'aperçu du lien.</p>
          </div>
          <div>
            <label className="label">Message d'invitation (WhatsApp)</label>
            <textarea
              className="input min-h-28 font-mono text-xs"
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder={DEFAULT_INVITE_MESSAGE}
            />
            <p className="mt-1 text-xs text-ink-secondary">
              Variables : <code>{'{nom}'}</code> (nom de l'invité), <code>{'{couple}'}</code>, <code>{'{lien}'}</code> (lien personnel). Laissez vide pour le message par défaut.
            </p>
          </div>
          <MediaUploader
            bucket="media"
            folder={`weddings/${wedding.slug}/apercu`}
            accept="image/jpeg,image/png,image/webp"
            label="Image d'aperçu du lien (WhatsApp, Facebook)"
            value={ogImage}
            onChange={(v) => setOgImage(v ?? '')}
            hint="Paysage 1200 × 630 px, JPG de moins de 300 Ko. Par défaut : la photo de couverture."
          />
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {saved && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Thème enregistré.</p>}

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-primary">
            <Check className="h-4 w-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer le thème'}
          </button>
          <a
            href={`/w/${wedding.slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline"
          >
            <ExternalLink className="h-4 w-4" />
            Aperçu
          </a>
        </div>
      </div>
    </div>
  );
}