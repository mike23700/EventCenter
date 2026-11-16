import { useEffect, useRef, useState } from 'react';
import { Music, Volume2 } from 'lucide-react';
import { storageUrl } from '../../lib/media';
import { INVITATION_OPENED_EVENT } from './EnvelopeIntro';

/**
 * Bouton flottant de musique d'ambiance pour le site public. Les navigateurs
 * bloquant l'autoplay avec son, la lecture démarre uniquement au clic (geste
 * utilisateur) — le bouton reste visible pour couper le son à tout moment.
 */
export default function AudioToggle({
  audioPath,
  title,
  artworkUrl,
}: {
  audioPath: string;
  /** Titre affiché sur l'écran de verrouillage / centre de contrôle (ex. « Lyzette & Jean »). */
  title?: string;
  artworkUrl?: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.5;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));

    // Ouverture de l'enveloppe = geste utilisateur : on (re)lance la musique
    // de façon synchrone dans ce même geste, sinon le navigateur la bloque.
    function onOpened() {
      const a = audioRef.current;
      if (!a || !a.paused) return;
      a.play().then(() => setPlaying(true)).catch(() => {});
    }
    window.addEventListener(INVITATION_OPENED_EVENT, onOpened);
    return () => window.removeEventListener(INVITATION_OPENED_EVENT, onOpened);
  }, []);

  // Écran de verrouillage / centre de contrôle du téléphone.
  useEffect(() => {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Musique',
        artist: 'EVENTS ETAN',
        artwork: artworkUrl ? [{ src: new URL(artworkUrl, window.location.origin).href, sizes: '512x512' }] : [],
      });
      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().then(() => setPlaying(true)).catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setPlaying(false);
      });
    } catch {
      // API partielle sur certains navigateurs : non bloquant
    }
  }, [title, artworkUrl]);

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
