import { useState } from 'react';
import { Paintbrush, ChevronDown } from 'lucide-react';
import MediaUploader from '../../../components/MediaUploader';
import { readSectionStyle, type SectionStyle } from '../../w/sections/sectionStyle';

/**
 * « Apparence du bloc » (commun à toutes les sections) : fond par défaut du
 * modèle, couleur unie ou image avec voile ; couleur du texte automatique
 * ou forcée. Enregistré dans `content.style`.
 */
export default function SectionStyleEditor({
  content,
  onChange,
  folder,
  note,
}: {
  content: unknown;
  onChange: (style: SectionStyle) => void;
  folder: string;
  /** Précision propre à la section (ex. couverture). */
  note?: string;
}) {
  const st = readSectionStyle(content);
  const [open, setOpen] = useState(st.bg !== 'default');
  const set = (patch: Partial<SectionStyle>) => onChange({ ...st, ...patch });
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? 'border-gold bg-gold text-white' : 'border-borderlight bg-white text-ink-secondary hover:border-gold/50'}`;

  return (
    <div className="rounded-xl border border-borderlight">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <Paintbrush className="h-4 w-4 text-gold" />
        <span className="flex-1 text-sm font-semibold text-ink">Apparence du bloc</span>
        <span className="text-xs text-ink-secondary">
          {st.bg === 'default' ? 'Fond du modèle' : st.bg === 'color' ? 'Couleur' : 'Image'}
        </span>
        <ChevronDown className={`h-4 w-4 text-ink-secondary transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-borderlight px-4 py-4">
          {note && <p className="text-xs text-ink-secondary">{note}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(st.bg === 'default')} onClick={() => set({ bg: 'default' })}>Fond du modèle</button>
            <button type="button" className={chip(st.bg === 'color')} onClick={() => set({ bg: 'color' })}>Couleur unie</button>
            <button type="button" className={chip(st.bg === 'image')} onClick={() => set({ bg: 'image' })}>Image de fond</button>
          </div>

          {st.bg === 'color' && (
            <div className="flex items-center gap-3">
              <input type="color" value={st.color} onChange={(e) => set({ color: e.target.value })} className="h-10 w-14 cursor-pointer rounded border border-borderlight" />
              <input className="input max-w-[9rem] font-mono" value={st.color} onChange={(e) => set({ color: e.target.value })} />
            </div>
          )}

          {st.bg === 'image' && (
            <>
              <MediaUploader
                bucket="media"
                folder={`${folder}/fonds`}
                accept="image/*"
                label="Image de fond"
                value={st.image}
                onChange={(v) => set({ image: v ?? '' })}
                hint="Paysage 1920 × 1080 px (JPG, moins de 1 Mo)"
              />
              <div>
                <label className="label">Voile de lisibilité : {st.overlay}%</label>
                <input type="range" min={0} max={85} step={5} value={st.overlay} onChange={(e) => set({ overlay: Number(e.target.value) })} className="w-full accent-gold" />
              </div>
            </>
          )}

          {st.bg !== 'default' && (
            <div>
              <label className="label">Couleur du texte</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={chip(st.text === 'auto')} onClick={() => set({ text: 'auto' })}>Automatique</button>
                <button type="button" className={chip(st.text === 'light')} onClick={() => set({ text: 'light' })}>Clair</button>
                <button type="button" className={chip(st.text === 'dark')} onClick={() => set({ text: 'dark' })}>Foncé</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
