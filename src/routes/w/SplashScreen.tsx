import { useEffect, useRef, useState } from 'react';
import { storageUrl } from '../../lib/media';

const MAX_SECONDS = 8;

/**
 * Splash plein écran (GIF ou vidéo) affiché avant le site public, à chaque
 * visite. Se ferme au clic sur « Passer », à la fin de la vidéo, ou après
 * un délai de sécurité (au cas où la vidéo ne déclenche pas `onEnded`).
 */
export default function SplashScreen({
  mediaPath,
  mediaType,
  onDone,
}: {
  mediaPath: string;
  mediaType: 'video' | 'gif';
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timeoutRef.current = setTimeout(close, MAX_SECONDS * 1000);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    clearTimeout(timeoutRef.current);
    setVisible(false);
    onDone();
  }

  if (!visible) return null;
  const src = storageUrl('media', mediaPath) ?? mediaPath;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {mediaType === 'video' ? (
        <video
          src={src}
          className="h-full w-full object-contain"
          autoPlay
          muted
          playsInline
          onEnded={close}
        />
      ) : (
        <img src={src} alt="" className="h-full w-full object-contain" />
      )}
      <button
        onClick={close}
        className="absolute bottom-6 right-6 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-ink shadow-lg transition hover:bg-white"
      >
        Passer →
      </button>
    </div>
  );
}
