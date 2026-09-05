import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';

/**
 * Section "image / vidéo" : illustre une étape du mariage avec une photo
 * ou une vidéo, mise en avant et légendée selon le template.
 */
export default function ImageVideo({ content, accent, tpl }: SectionProps) {
  const c = asRecord(content);
  const title = str(c, 'title');
  const image = str(c, 'image');
  const video = str(c, 'video');
  const { palette, id } = tpl;

  const imageSrc = image ? storageUrl('media', image) ?? image : null;
  const videoSrc = video ? storageUrl('media', video) ?? video : null;

  if (!title && !image && !video) return null;

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center">
          <h2
            className="font-display tpl-display text-3xl sm:text-4xl font-bold"
            style={{ color: palette.ink }}
          >
            {title || 'Souvenirs'}
          </h2>
          <div className="mt-3 flex items-center justify-center gap-2" style={{ color: accent }}>
            <span className="h-px w-10" style={{ backgroundColor: accent }} />
            <span className="h-2 w-2 rotate-45" style={{ backgroundColor: accent }} />
            <span className="h-px w-10" style={{ backgroundColor: accent }} />
          </div>
        </div>

        {(videoSrc || imageSrc) && (
          <div className="mt-8">
            {videoSrc ? (
              <video
                src={videoSrc}
                controls
                className="w-full"
                style={{
                  borderRadius: id === 'minimal' ? '0.25rem' : '1.25rem',
                  border: `1px solid ${palette.border}`,
                  boxShadow: '0 18px 45px rgba(0,0,0,0.12)',
                }}
              />
            ) : (
              <img
                src={imageSrc!}
                alt={title || ''}
                className="w-full"
                style={{
                  borderRadius: id === 'minimal' ? '0.25rem' : '1.25rem',
                  boxShadow: '0 18px 45px rgba(0,0,0,0.12)',
                }}
              />
            )}
          </div>
        )}
      </div>
    </SectionShell>
  );
}