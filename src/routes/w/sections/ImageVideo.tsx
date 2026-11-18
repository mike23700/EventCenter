import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';
import { readFrame } from '../../../lib/frames';
import { renderRich } from '../../../lib/richText';
import FramedImage from '../FramedImage';

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
  // Titre au-dessus de l'image (par défaut), par-dessus l'image, ou masqué.
  const titlePos = str(c, 'title_position') === 'over' ? 'over' : str(c, 'title_position') === 'none' ? 'none' : 'above';
  const caption = str(c, 'caption');

  const imageSrc = image ? storageUrl('media', image) ?? image : null;
  const videoSrc = video ? storageUrl('media', video) ?? video : null;

  if (!title && !image && !video) return null;

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6">
        {(titlePos === 'above' || !imageSrc || videoSrc) && titlePos !== 'none' && (
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
        )}

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
              <FramedImage
                src={imageSrc!}
                alt={title || ''}
                tpl={tpl}
                accent={accent}
                frame={readFrame(c.image_frame, { style: id === 'minimal' ? 'square' : 'rounded' })}
                overlay={titlePos === 'over' && title ? (
                  <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6 text-center">
                    <h2 className="font-display tpl-display text-3xl font-bold text-white drop-shadow sm:text-5xl">{title}</h2>
                  </div>
                ) : undefined}
              />
            )}
            {caption && (
              <p className="mt-4 whitespace-pre-line text-center tpl-body italic" style={{ color: palette.muted }}>{renderRich(caption, accent)}</p>
            )}
          </div>
        )}
      </div>
    </SectionShell>
  );
}