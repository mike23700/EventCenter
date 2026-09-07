import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { weddingSlugFromNames } from '../../../lib/slug';
import { toIso, fromIsoForInput, EVENT_TYPES, TEMPLATES } from '../../../lib/format';
import { logoImageHint } from '../../../lib/imageHints';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import type { Wedding, Database } from '../../../types/database';

/**
 * Crée le compte client via l'Edge Function serveur `create-client-account`.
 * La clé service_role y est gardée côté serveur (jamais exposée dans le front).
 * Retourne l'id du compte (créé ou déjà existant).
 */
async function createClientUserViaEdge(
  email: string,
  password: string,
): Promise<{ id: string; error: string }> {
  const { data, error } = await supabase.functions.invoke('create-client-account', {
    body: { email, password },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => ({}))) as { error?: string };
      return { id: '', error: body.error || 'Erreur serveur lors de la création du compte.' };
    }
    if (error instanceof FunctionsFetchError) {
      return {
        id: '',
        error:
          "Impossible de joindre l'Edge Function 'create-client-account'. Déployez-la avec la CLI Supabase (voir instructions) puis réessayez.",
      };
    }
    return { id: '', error: error.message || 'Erreur lors de la création du compte.' };
  }

  const id = (data as { id?: string })?.id;
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
  const [accessStart, setAccessStart] = useState('');
  const [accessEnd, setAccessEnd] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [logoPath, setLogoPath] = useState('');
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
      const { data, error } = await supabase.from('weddings').select('*').eq('id', id).single();
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
        setClientEmail(w.client_email ?? '');
        const theme = w.theme as { primaryColor?: string } | null;
        setPrimaryColor(theme?.primaryColor ?? '#C9A34A');
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
      const path = `weddings/${id ?? 'new'}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: false });
      if (error) throw error;
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
      theme: { primaryColor },
      logo: logoPath || null,
      access_start: toIso(accessStart),
      access_end: toIso(accessEnd),
      is_active: isActive,
    };

    try {
      if (isEdit && id) {
        const { error } = await supabase.from('weddings').update(payload).eq('id', id);
        if (error) throw error;
        navigate(`/admin/weddings/${id}`);
        return;
      }

      // Création : c'est l'Edge Function serveur qui crée le compte client
      // (la clé service_role est gardée côté serveur, jamais dans le front).
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

      const { data, error } = await supabase.from('weddings').insert(payload).select('id').single();
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
                <img src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/${logoPath}`} alt="logo" className="h-10 w-10 rounded object-cover" />
                <button type="button" onClick={() => setLogoPath('')} className="text-sm text-red-500 hover:underline">Retirer</button>
              </div>
            ) : (
              <input id="logo" type="file" accept="image/*" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleUploadLogo(e.target.files[0])} className="block w-full text-sm text-ink-secondary file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-2 file:text-sm file:text-white" />
            )}
            {uploading && <p className="mt-1 text-xs text-ink-secondary">Upload…</p>}
            <p className="mt-1 text-xs text-ink-secondary">{logoImageHint()}</p>
          </div>
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
