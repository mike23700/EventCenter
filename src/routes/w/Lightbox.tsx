import { useEffect, useRef } from 'react';
import type { TouchEvent } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Media } from '../../types/database';
import { mediaUrl } from '../../lib/media';

const SWIPE_THRESHOLD = 50;

/**
 * Visionneuse plein écran pour la galerie publique : ouverte au clic sur une
 * miniature, navigation entre médias au clavier (flèches/Échap), au clic sur
 * les boutons, ou au swipe tactile (mobile).
 */
export default function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: Media[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const goNext = () => onNavigate((index + 1) % items.length);
  const goPrev = () => onNavigate((index - 1 + items.length) % items.length);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length]);

  const item = items[index];
  const src = item ? mediaUrl(item) : null;
  if (!item || !src) return null;

  function handleTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0) goNext();
    else goPrev();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Fermer"
      >
        <X className="h-6 w-6" />
      </button>

      {items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-4"
            aria-label="Média précédent"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-4"
            aria-label="Média suivant"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
        {item.type === 'video' ? (
          <video src={src} controls autoPlay className="max-h-[85vh] max-w-full rounded-lg" />
        ) : (
          <img src={src} alt="" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
        )}
      </div>

      {items.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
          {index + 1} / {items.length}
        </p>
      )}
    </div>
  );
}
