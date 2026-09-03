import { MapPin, ExternalLink } from 'lucide-react';
import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord, str } from './types';

/** Section "lieu" : titre, adresse, image, lien Google Maps. */
export default function Location({ content, accent }: SectionProps) {
  const c = asRecord(content);
  const title = str(c, 'title');
  const address = str(c, 'address');
  const image = str(c, 'image');
  const mapsUrl = str(c, 'maps_url');

  if (!title && !address && !image && !mapsUrl) return null;

  return (
    <section className="mx-auto max-w-3xl px-6 py-14">
      <div className="text-center">
        <MapPin className="mx-auto h-6 w-6" style={{ color: accent }} />
        <h2 className="mt-2 font-display text-3xl font-bold text-ink">{title || 'Lieu de la cérémonie'}</h2>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-borderlight bg-white shadow-sm">
        {image && (
          <img
            src={storageUrl('media', image) ?? image}
            alt=""
            className="h-52 w-full object-cover"
          />
        )}
        <div className="p-6">
          {address && <p className="text-lg text-ink-secondary">{address}</p>}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-outline mt-4"
            >
              <ExternalLink className="h-4 w-4" />
              Voir sur Google Maps
            </a>
          )}
        </div>
      </div>
    </section>
  );
}