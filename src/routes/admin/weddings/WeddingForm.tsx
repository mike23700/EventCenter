import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { db } from '../../../lib/db';
import { weddingSlugFromNames } from '../../../lib/slug';
import { toIso, fromIsoForInput, EVENT_TYPES, TEMPLATES } from '../../../lib/format';
import { logoImageHint } from '../../../lib/imageHints';
import { validateSplashFile, uploadFile, storageUrl } from '../../../lib/media';
import type { Wedding, Database } from '../../../types/database';
import MediaUploader from '../../../components/MediaUploader';

/**
 * Crée le compte client via `POST /api/admin/clients` (le super-admin est
 * déjà vérifié côté serveur par `requireSuperAdmin`).
 * Retourne l'id du compte (créé ou déjà existant).
 */
async function createClientUserViaEdge(
  email: string,
  password: string,
): Promise<{ id: string; error: string }> {
  const res = await fetch('/api/admin/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));

  if (!res.ok) {
    return { id: '', error: json.error || 'Erreur lors de la création du compte.' };
  }

  const id = (json as { id?: string })?.id;
  return id
    ? { id, error: '' }
    : { id: '', error: 'Réponse vide de la création du compte.' };
}

export default function WeddingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [slug, setSlug] = useState('');
  const [eventType, setEventType] = useState('Mariage');
  const [template, setTemplate] = useState('florale');
  const [contactPhone, setContactPhone] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#C9A34A');
  // Autres clés du thème (polices…) définies côté client dans l'onglet
  // « Thème » : à préserver telles quelles, ce formulaire ne les édite pas.
  const [themeRest, setThemeRest] = useState<Record<string, unknown>>({});
  const [accessStart, setAccessStart] = useState('');
  const [accessEnd, setAccessEnd] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [logoPath, setLogoPath] = useState('');
  const [splashPath, setSplashPath] = useState('');
  const [splashType, setSplashType] = useState<'video' | 'gif' | null>(null);
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const { data, error } = await db.from('weddings').select('*').eq('id', id).single();
      if (!active) return;
      if (error) {
        setError(error.message);
      } else if (data) {
        const w: Wedding = data;
        setName(w.name);
        setSecondaryName(w.secondary_name ?? '');
        setSlug(w.slug);
        setEventType(w.event_type ?? 'Mariage');
        setTemplate(w.template);
        setContactPhone(w.contact_phone ?? '');
        setAccessStart(fromIsoForInput(w.access_start));
        setAccessEnd(fromIsoForInput(w.access_end));
        setIsActive(w.is_active);
        setLogoPath(w.logo ?? '');
        setSplashPath(w.splash_media_url ?? '');
        setSplashType(w.splash_media_type === 'gif' ? 'gif' : w.splash_media_type === 'video' ? 'video' : null);
        setClientEmail(w.client_email ?? '');
        const theme = (w.theme && typeof w.theme === 'object' && !Array.isArray(w.theme))
          ? (w.theme as Record<string, unknown>)
          : {};
        setPrimaryColor((theme.primaryColor as string) ?? '#C9A34A');
        const { primaryColor: _pc, ...rest } = theme;
        setThemeRest(rest);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  function onNameChange(value: string) {
    setName(value);
    if (!isEdit) setSlug(weddingSlugFromNames(value, secondaryName));
  }

  function onSecondaryNameChange(value: string) {
    setSecondaryName(value);
    if (!isEdit) setSlug(weddingSlugFromNames(name, value));
  }

  async function handleUploadLogo(file: File) {
    setUploading(true);
    try {
      const path = await uploadFile(file, { bucket: 'logos', folder: `weddings/${id ?? 'new'}` });
      setLogoPath(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur upload du logo');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const finalSlug = slug.trim() || weddingSlugFromNames(name, secondaryName);

    const payload: Database['public']['Tables']['weddings']['Insert'] = {
      name: name.trim(),
      secondary_name: secondaryName.trim() || null,
      slug: finalSlug,
      event_type: eventType,
      template,
      contact_phone: contactPhone.trim() || null,
      theme: { ...themeRest, primaryColor },
      logo: logoPath || null,
      splash_media_url: splashPath || null,
      splash_media_type: splashPath ? splashType : null,
      access_start: toIso(accessStart),
      access_end: toIso(accessEnd),
      is_active: isActive,
    };

    try {
      if (isEdit && id) {
        const { error } = await db.from('weddings').update(payload).eq('id', id);
        if (error) throw error;
        navigate(`/admin/weddings/${id}`);
        return;
      }

      // Création : c'est le serveur qui crée le compte client
      // (le mot de passe est haché côté serveur, jamais dans le front).
      const email = clientEmail.trim();
      const password = clientPassword;
      if (!email || !email.includes('@') || !password || password.length < 6) {
        setError("Compte client : saisissez un email valide et un mot de passe d'au moins 6 caractères.");
        setSaving(false);
        return;
      }

      const { id: ownerUserId, error: userError } = await createClientUserViaEdge(email, password);
      if (userError) {
        setError(userError);
        setSaving(false);
        return;
      }

      payload.owner_user_id = ownerUserId;
      payload.client_email = email;

      const { data, error } = await db.from('weddings').insert(payload).select('id').single();
      if (error) throw error;
      navigate(`/admin/weddings/${data.id}`, {
        state: { clientCreated: { email, password } },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('duplicate key') ? 'Ce lien (slug) existe déjà. Modifiez-le.' : msg);
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-ink-secondary">Chargement…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/weddings" className="inline-flex rounded-md p-2 text-ink-secondary hover:bg-paper-cream">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink">
          {isEdit ? 'Modifier le mariage' : 'Nouveau mariage'}
        </h1>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Nom du marié(e) *</label>
            <input id="name" className="input" value={name} onChange={(e) => onNameChange(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="secondaryName">Nom du conjoint(e)</label>
            <input id="secondaryName" className="input" value={secondaryName} onChange={(e) => onSecondaryNameChange(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="slug">Lien du site</label>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm text-ink-secondary">/w/</span>
            <input id="slug" className="input font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex : camille-et-jean" />
          </div>
          <p className="mt-1 text-xs text-ink-secondary">Généré automatiquement — modifiable.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="eventType">Type d'évènement</label>
            <select id="eventType" className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="template">Template</label>
            <select id="template" className="input" value={template} onChange={(e) => setTemplate(e.target.value)}>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="contactPhone">Téléphone de contact</label>
          <input id="contactPhone" className="input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+237 ....." />
        </div>

        <div className="rounded-lg border border-borderlight bg-paper-cream/50 p-4">
          <div className="mb-2">
            <h2 className="font-semibold text-ink">Compte client (mariés)</h2>
            <p className="text-xs text-ink-secondary">
              {isEdit
                ? 'Les identifiants du compte sont définis à la création du mariage.'
                : 'Ces identifiants permettent aux mariés de se connecter via le portail unique (/login) et de configurer leur site.'}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="clientEmail">Email du compte</label>
              <input
                id="clientEmail"
                type="email"
                className="input"
                value={clientEmail}
                disabled={isEdit}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="maries@exemple.com"
                required={!isEdit}
              />
            </div>
            {!isEdit && (
              <div>
                <label className="label" htmlFor="clientPassword">Mot de passe</label>
                <input
                  id="clientPassword"
                  type="text"
                  className="input font-mono"
                  value={clientPassword}
                  onChange={(e) => setClientPassword(e.target.value)}
                  placeholder="au moins 6 caractères"
                  required
                  autoComplete="off"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="accessStart">Début d'accès (lien disponible à partir de)</label>
            <input id="accessStart" type="datetime-local" className="input" value={accessStart} onChange={(e) => setAccessStart(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="accessEnd">Fin d'accès</label>
            <input id="accessEnd" type="datetime-local" className="input" value={accessEnd} onChange={(e) => setAccessEnd(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="primaryColor">Couleur principale</label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-borderlight" />
              <input className="input font-mono" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="logo">Photo des mariés (affichée sur le site, à côté du titre)</label>
            {logoPath ? (
              <div className="flex items-center gap-2">
                <img src={storageUrl('logos', logoPath) ?? ''} alt="logo" className="h-10 w-10 rounded object-cover" />
                <button type="button" onClick={() => setLogoPath('')} className="text-sm text-red-500 hover:underline">Retirer</button>
              </div>
            ) : (
              <input id="logo" type="file" accept="image/*" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleUploadLogo(e.target.files[0])} className="block w-full text-sm text-ink-secondary file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-2 file:text-sm file:text-white" />
            )}
            {uploading && <p className="mt-1 text-xs text-ink-secondary">Upload…</p>}
            <p className="mt-1 text-xs text-ink-secondary">{logoImageHint()}</p>
          </div>
        </div>

        <div>
          <MediaUploader
            bucket="media"
            folder={`weddings/${id ?? 'new'}/splash`}
            accept="video/mp4,video/webm,image/gif,image/webp"
            label="Splash d'accueil (GIF, WebP ou vidéo, avant le site public)"
            hint={`GIF, WebP (animé ou non) ou vidéo MP4/WebM, ${8}s max, 15 Mo max`}
            value={splashPath || null}
            validate={validateSplashFile}
            onChange={(path) => {
              setSplashPath(path ?? '');
              const isImage = /\.(gif|webp)$/i.test(path ?? '');
              setSplashType(path ? (isImage ? 'gif' : 'video') : null);
            }}
          />
          <p className="mt-1 text-xs text-ink-secondary">
            Affiché en plein écran à chaque visite du site public, avant que le contenu n'apparaisse. Laissez vide pour ne pas en afficher.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-borderlight" />
          Compte actif (lien accessible)
        </label>

        <div className="flex items-center justify-end gap-3 border-t border-borderlight pt-4">
          <Link to={isEdit ? `/admin/weddings/${id}` : '/admin/weddings'} className="btn-outline">Annuler</Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </div>
  );
}
