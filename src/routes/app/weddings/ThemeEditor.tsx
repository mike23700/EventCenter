import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, ExternalLink, Flower, Crown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Wedding, Json } from '../../../types/database';
import { DISPLAY_FONTS, BODY_FONTS } from '../../../lib/format';
import { TEMPLATE_DEFS, getTemplate } from '../../../lib/templates';

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
  const [template, setTemplate] = useState<string>(wedding.template);
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
    const { error } = await supabase
      .from('weddings')
      .update({
        template,
        theme: {
          ...themeRecord(wedding.theme),
          primaryColor,
          displayFont,
          bodyFont,
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
            <p className="mt-2 text-lg" style={{ fontFamily: DISPLAY_FONTS.find((f) => f.id === displayFont)?.stack ?? activeTpl.fonts.display }}>
              Camille &amp; Jean
            </p>
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
            <p className="mt-2 text-sm text-ink-secondary" style={{ fontFamily: BODY_FONTS.find((f) => f.id === bodyFont)?.stack ?? activeTpl.fonts.body }}>
              Nous serions heureux de vous compter parmi nous.
            </p>
          </div>
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