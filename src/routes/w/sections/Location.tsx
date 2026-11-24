import { MapPin, ExternalLink } from 'lucide-react';
import { useTextStyle } from '../../../lib/textStyles';
import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';

/** Section "lieu" : titre, adresse, image, lien Google Maps. */
export default function Location({ content, accent, tpl }: SectionProps) {
  const ts = useTextStyle();
  const c = asRecord(content);
  const title = str(c, 'title');
  const address = str(c, 'address');
  const image = str(c, 'image');
  const mapsUrl = str(c, 'maps_url');

  if (!title && !address && !image && !mapsUrl) return null;

  const { palette } = tpl;

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center">
          <MapPin className="mx-auto h-6 w-6" style={{ color: accent }} />
          <h2 className="mt-2 font-display tpl-display text-3xl sm:text-4xl font-bold" style={{ color: palette.ink, ...ts('title') }}>
            {title || 'Lieu de la cérémonie'}
          </h2>
        </div>

        <div
          className="mt-10 overflow-hidden rounded-2xl"
          style={{
            backgroundColor: palette.surface,
            border: `1px solid ${palette.border}`,
            boxShadow: tpl.id === 'royal' ? '0 18px 45px rgba(0,0,0,0.35)' : '0 10px 30px rgba(0,0,0,0.06)',
          }}
        >
          {image && (
            <img loading="lazy" decoding="async"
              src={storageUrl('media', image) ?? image}
              alt=""
              className="h-56 w-full object-cover"
              // tramée esthétique pour "royal"
              style={tpl.id === 'royal' ? { filter: 'saturate(0.85) contrast(1.05)' } : undefined}
            />
          )}
          <div className="p-7">
            {address && (
              <p className="text-lg tpl-body" style={{ color: palette.muted, ...ts('text') }}>
                {address}
              </p>
            )}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition hover:opacity-85 tpl-body"
                style={{
                  backgroundColor: accent,
                  color: tpl.id === 'royal' ? palette.ink : '#fff',
                  boxShadow: tpl.id === 'royal' ? `0 0 0 1px ${palette.accent}, 0 6px 18px ${palette.accent}44` : undefined,
                  ...ts('button'),
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Voir sur Google Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}