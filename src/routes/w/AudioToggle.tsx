import { useEffect, useRef, useState } from 'react';
import { Music, Volume2 } from 'lucide-react';
import { storageUrl } from '../../lib/media';

/**
 * Bouton flottant de musique d'ambiance pour le site public. Les navigateurs
 * bloquant l'autoplay avec son, la lecture démarre uniquement au clic (geste
 * utilisateur) — le bouton reste visible pour couper le son à tout moment.
 */
export default function AudioToggle({ audioPath }: { audioPath: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.5;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  const src = storageUrl('media', audioPath) ?? audioPath;

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="auto" />
      <button
        onClick={toggle}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur transition hover:bg-black/85"
        title={playing ? 'Couper la musique' : 'Activer la musique'}
        aria-label={playing ? 'Couper la musique' : 'Activer la musique'}
      >
        {playing ? (
          <Volume2 className="h-5 w-5 animate-pulse" />
        ) : (
          <Music className="h-5 w-5" />
        )}
      </button>
    </>
  );
}
