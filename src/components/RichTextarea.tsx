import { useRef } from 'react';
import { Bold, Italic, Underline, Highlighter } from 'lucide-react';

/**
 * Zone de texte de l'admin avec barre de mise en forme (gras, italique,
 * souligné, mis en avant). Insère les balises simples comprises par le site
 * public (voir lib/richText.tsx) autour de la sélection.
 */
export default function RichTextarea({
  value,
  onChange,
  placeholder,
  className = 'min-h-24',
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(marker: string, sample: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const selected = value.slice(a, b) || sample;
    const next = value.slice(0, a) + marker + selected + marker + value.slice(b);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + marker.length, a + marker.length + selected.length);
    });
  }

  const btn = 'flex h-7 w-7 items-center justify-center rounded-md text-ink-secondary transition hover:bg-paper-cream hover:text-ink';
  return (
    <div className="rounded-xl border border-borderlight bg-white focus-within:border-gold">
      <div className="flex items-center gap-1 border-b border-borderlight px-2 py-1">
        <button type="button" className={btn} title="Gras (**texte**)" onClick={() => wrap('**', 'texte en gras')}><Bold className="h-3.5 w-3.5" /></button>
        <button type="button" className={btn} title="Italique (*texte*)" onClick={() => wrap('*', 'texte en italique')}><Italic className="h-3.5 w-3.5" /></button>
        <button type="button" className={btn} title="Souligné (__texte__)" onClick={() => wrap('__', 'texte souligné')}><Underline className="h-3.5 w-3.5" /></button>
        <button type="button" className={btn} title="Mis en avant, couleur du thème (==texte==)" onClick={() => wrap('==', 'texte mis en avant')}><Highlighter className="h-3.5 w-3.5" /></button>
        <span className="ml-auto hidden text-[10px] text-ink-secondary sm:inline">**gras** · *italique* · __souligné__ · ==couleur==</span>
      </div>
      <textarea
        ref={ref}
        rows={rows}
        className={`block w-full resize-y rounded-b-xl border-0 bg-transparent px-3 py-2 text-sm text-ink outline-none ${className}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
