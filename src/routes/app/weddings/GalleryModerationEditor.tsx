import { useOutletContext } from 'react-router-dom';
import type { Wedding } from '../../../types/database';
import { weddingPublicUrl } from '../../../lib/format';
import WeddingMediaPanel from '../../../components/WeddingMediaPanel';

/**
 * Onglet « Galerie » côté client (marié) : mêmes QR codes et modération
 * galerie/témoignages que côté admin, bornés à son propre mariage par les
 * policies RLS `*_owner_all`.
 */
export default function GalleryModerationEditor() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Galerie, témoignages & QR codes</h2>
        <p className="text-sm text-ink-secondary">
          Validez les photos, vidéos et messages déposés par vos invités avant qu'ils n'apparaissent
          sur le site, et générez les QR codes à imprimer pour vos tables.
        </p>
      </div>
      <WeddingMediaPanel wedding={wedding} publicUrl={weddingPublicUrl(wedding.slug)} />
    </div>
  );
}
