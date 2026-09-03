import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, ExternalLink } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Wedding, Json } from '../../../types/database';
import { TEMPLATES } from '../../../lib/format';

function themeRecord(theme: Json): Record<string, unknown> {
  return theme && typeof theme === 'object' && !Array.isArray(theme)
    ? (theme as Record<string, unknown>)
    : {};
}

/** Éditeur du thème : couleur principale, template (3 modèles), polices. */
export default function ThemeEditor() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  const [primaryColor, setPrimaryColor] = useState<string>(
    (themeRecord(wedding.theme)['primaryColor'] as string) ?? '#C9A34A',
  );
  const [displayFont, setDisplayFont] = useState<string>(
    (themeRecord(wedding.theme)['displayFont'] as string) ?? 'Georgia',
  );
  const [template, setTemplate] = useState<string>(wedding.template);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    const { error } = await supabase
      .from('weddings')
      .update({
        template,
        theme: {
          ...themeRecord(wedding.theme),
          primaryColor,
          displayFont,
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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Apparence du site</h2>
        <p className="text-sm text-ink-secondary">
          Choisissez le modèle de design, la couleur principale et la police d'affichage.
        </p>
      </div>

      <div className="card space-y-6">
        <div>
          <label className="label">Modèle de design</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  template === t.id
                    ? 'border-gold bg-paper-cream'
                    : 'border-borderlight bg-white hover:border-gold/40'
                }`}
              >
                <p className="font-medium text-ink">{t.label}</p>
                <p className="text-xs text-ink-secondary">Modèle {t.id}</p>
              </button>
            ))}
          </div>
        </div>

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
          <label className="label">Police d'affichage</label>
          <select className="input" value={displayFont} onChange={(e) => setDisplayFont(e.target.value)}>
            <option value="Georgia">Georgia (classique)</option>
            <option value="Playfair Display">Playfair Display (élégant)</option>
            <option value="Great Vibes">Great Vibes (calligraphié)</option>
          </select>
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