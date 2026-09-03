import { Heart } from 'lucide-react';
import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord, str, bool } from './types';

/**
 * Section "cover" : couverture (image mobile/desktop ou vidéo),
 * logo, noms des mariés, date / localisation courte.
 * Si `enabled` vide, on affiche un fond neutre crème.
 */
export default function Cover({ content, wedding, accent }: SectionProps) {
  const c = asRecord(content);
  const imageDesktop = str(c, 'image_desktop');
  const imageMobile = str(c, 'image_mobile');
  const video = str(c, 'video');
  const showVideo = bool(c, 'video_enabled', false);
  const coverImage = imageMobile || imageDesktop;

  if (showVideo && video) {
    return (
      <CoverShell accent={accent} wedding={wedding}>
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={storageUrl('covers', video) ?? video}
          autoPlay
          muted
          loop
          playsInline
        />
      </CoverShell>
    );
  }

  return (
    <CoverShell accent={accent} wedding={wedding}>
      {coverImage && (
        <img
          src={storageUrl('covers', coverImage) ?? coverImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </CoverShell>
  );
}

function CoverShell({
  accent,
  wedding,
  children,
}: {
  accent: string;
  wedding: { name: string; secondary_name: string | null; logo: string | null };
  children: React.ReactNode;
}) {
  const logoUrl = storageUrl('logos', wedding.logo);
  return (
    <header className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-ink text-center text-white">
      <div className="absolute inset-0 bg-black/50" />
      {children}
      <div className="relative z-10 px-6 py-16">
        {logoUrl && (
          <img src={logoUrl} alt="" className="mx-auto mb-6 h-20 w-20 rounded-full object-cover shadow-lg" />
        )}
        <div className="mx-auto mb-4 flex items-center justify-center gap-3 text-gold">
          <span className="h-px w-10 bg-gold/60" />
          <Heart className="h-4 w-4" fill="currentColor" />
          <span className="h-px w-10 bg-gold/60" />
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">
          {wedding.name}
          {wedding.secondary_name && (
            <span className="mt-2 block text-2xl sm:text-4xl">&amp; {wedding.secondary_name}</span>
          )}
        </h1>
        <p className="mt-5 inline-block border border-gold/40 px-4 py-1 text-sm tracking-widest uppercase text-gold-light" style={{ color: accent }}>
          Nous nous marions
        </p>
      </div>
    </header>
  );
}