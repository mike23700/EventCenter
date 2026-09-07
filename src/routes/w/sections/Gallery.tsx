import { Link } from 'react-router-dom';
import { Image as ImageIcon, ArrowRight } from 'lucide-react';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';
import GalleryUploadButton from './GalleryUploadButton';

/**
 * Section « Galerie » : teaser sur le site principal — aucun média affiché
 * directement ici, seulement un bouton pour déposer une photo/vidéo et un
 * bouton vers la galerie publique dédiée (`/w/:slug/galerie`), où les
 * médias validés sont visibles et où l'on peut aussi déposer les siens.
 */
export default function Gallery({ content, accent, tpl, wedding }: SectionProps) {
  const c = asRecord(content);
  const title = str(c, 'title') || 'Galerie';
  const intro = str(c, 'intro') || "Photos et vidéos de l'évènement — ajoutez les vôtres !";
  const { palette } = tpl;

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <ImageIcon className="mx-auto h-6 w-6" style={{ color: accent }} />
        <h2 className="mt-2 font-display tpl-display text-3xl sm:text-4xl font-bold" style={{ color: palette.ink }}>
          {title}
        </h2>
        <p className="mt-2 tpl-body" style={{ color: palette.muted }}>{intro}</p>

        <div className="mt-8 flex flex-col items-center gap-4">
          <GalleryUploadButton weddingId={wedding.id} weddingSlug={wedding.slug} accent={accent} />

          <Link
            to={`/w/${wedding.slug}/galerie`}
            className="inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition hover:opacity-75"
            style={{ borderColor: accent, color: accent }}
          >
            Voir la galerie
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}
