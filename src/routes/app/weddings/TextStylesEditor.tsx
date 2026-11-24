import { useState } from 'react';
import { Type, ChevronDown, RotateCcw, AlignLeft, AlignCenter, AlignRight, Italic, CaseUpper } from 'lucide-react';
import { TEXT_SIZE_SCALE } from '../../../lib/fontSize';
import {
  readTextStyles,
  textStyleCss,
  TEXT_FONTS,
  TEXT_SLOTS,
  TEXT_WEIGHTS,
  type TextStyle,
  type TextStyles,
} from '../../../lib/textStyles';

/**
 * « Textes : couleurs, polices, tailles » (commun à toutes les sections) :
 * pour chaque zone de texte de la section (titre, sous-titre, noms, boutons…),
 * couleur, police, taille, graisse, italique, majuscules, alignement et
 * espacement des lettres. Enregistré dans `content.text_styles` ; une zone
 * non réglée garde le rendu du modèle.
 */
export default function TextStylesEditor({
  type,
  content,
  onChange,
}: {
  type: string;
  content: unknown;
  onChange: (styles: TextStyles) => void;
}) {
  const slots = TEXT_SLOTS[type] ?? [];
  const styles = readTextStyles(content);
  const customized = Object.keys(styles).filter((k) => slots.some((s) => s.id === k)).length;
  const [open, setOpen] = useState(false);
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  if (slots.length === 0) return null;

  function setSlot(slot: string, patch: Partial<TextStyle> | null) {
    const next: TextStyles = { ...styles };
    if (patch === null) delete next[slot];
    else {
      const merged: TextStyle = { ...(next[slot] ?? {}), ...patch };
      // Une valeur « undefined » = retour au réglage du modèle.
      (Object.keys(merged) as (keyof TextStyle)[]).forEach((k) => merged[k] === undefined && delete merged[k]);
      if (Object.keys(merged).length === 0) delete next[slot];
      else next[slot] = merged;
    }
    onChange(next);
  }

  return (
    <div className="rounded-xl border border-borderlight">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <Type className="h-4 w-4 text-gold" />
        <span className="flex-1 text-sm font-semibold text-ink">Textes : couleurs, polices, tailles</span>
        <span className="text-xs text-ink-secondary">{customized > 0 ? `${customized} zone${customized > 1 ? 's' : ''} personnalisée${customized > 1 ? 's' : ''}` : 'Style du modèle'}</span>
        <ChevronDown className={`h-4 w-4 text-ink-secondary transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-borderlight px-4 py-4">
          <p className="text-xs text-ink-secondary">
            Choisissez une zone de texte, puis réglez-la. Ce qui n'est pas réglé garde le style du modèle.
          </p>
          {slots.map((slot) => {
            const ts = styles[slot.id];
            const isOpen = openSlot === slot.id;
            return (
              <div key={slot.id} className="rounded-lg border border-borderlight bg-white">
                <button type="button" onClick={() => setOpenSlot(isOpen ? null : slot.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
                  <span className="flex-1 text-sm text-ink">{slot.label}</span>
                  {ts && <span className="h-2 w-2 rounded-full bg-gold" title="Personnalisé" />}
                  <ChevronDown className={`h-3.5 w-3.5 text-ink-secondary transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <SlotControls value={ts ?? {}} onChange={(patch) => setSlot(slot.id, patch)} onReset={() => setSlot(slot.id, null)} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SlotControls({
  value,
  onChange,
  onReset,
}: {
  value: TextStyle;
  onChange: (patch: Partial<TextStyle>) => void;
  onReset: () => void;
}) {
  const iconBtn = (active: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-md border transition ${active ? 'border-gold bg-gold text-white' : 'border-borderlight bg-white text-ink-secondary hover:border-gold/50'}`;
  const font = TEXT_FONTS.find((f) => f.id === value.font);
  const preview = textStyleCss(value);

  return (
    <div className="space-y-3 border-t border-borderlight px-3 py-3">
      {font?.href && <link rel="stylesheet" href={font.href} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Couleur</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value.color && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color : '#333333'}
              onChange={(e) => onChange({ color: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-borderlight"
            />
            {value.color ? (
              <button type="button" className="text-xs text-ink-secondary underline" onClick={() => onChange({ color: undefined })}>Couleur du modèle</button>
            ) : (
              <span className="text-xs text-ink-secondary">Couleur du modèle</span>
            )}
          </div>
        </div>
        <div>
          <label className="label">Police</label>
          <select className="input" value={value.font ?? ''} onChange={(e) => onChange({ font: e.target.value || undefined })}>
            <option value="">Police du modèle</option>
            {TEXT_FONTS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Taille</label>
          <select className="input" value={value.size ?? ''} onChange={(e) => onChange({ size: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Taille du modèle</option>
            {TEXT_SIZE_SCALE.map((s) => (
              <option key={s.px} value={s.px}>{s.px} px — {s.hint}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Épaisseur</label>
          <select className="input" value={value.weight ?? ''} onChange={(e) => onChange({ weight: e.target.value ? (Number(e.target.value) as TextStyle['weight']) : undefined })}>
            <option value="">Épaisseur du modèle</option>
            {TEXT_WEIGHTS.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={iconBtn(value.italic === true)} title="Italique" onClick={() => onChange({ italic: value.italic === true ? undefined : true })}>
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={iconBtn(value.upper === true)} title="Majuscules" onClick={() => onChange({ upper: value.upper === true ? undefined : true })}>
          <CaseUpper className="h-4 w-4" />
        </button>
        <span className="mx-1 h-6 w-px bg-borderlight" />
        {([['left', AlignLeft, 'À gauche'], ['center', AlignCenter, 'Centré'], ['right', AlignRight, 'À droite']] as const).map(([id, Icon, label]) => (
          <button key={id} type="button" className={iconBtn(value.align === id)} title={label} onClick={() => onChange({ align: value.align === id ? undefined : id })}>
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <label className="ml-2 flex items-center gap-2 text-xs text-ink-secondary">
          Espacement
          <input type="range" min={0} max={40} step={2} value={value.spacing ?? 0} onChange={(e) => onChange({ spacing: Number(e.target.value) || undefined })} className="w-24 accent-gold" />
        </label>
        <button type="button" onClick={onReset} className="ml-auto inline-flex items-center gap-1 text-xs text-ink-secondary hover:text-red-600">
          <RotateCcw className="h-3.5 w-3.5" /> Style du modèle
        </button>
      </div>
      <p className="truncate rounded-lg bg-paper-warm px-3 py-2 text-ink" style={{ ...preview, fontSize: value.size ? `${Math.min(value.size, 36)}px` : undefined }}>
        Camille &amp; Jean — aperçu du texte
      </p>
    </div>
  );
}
