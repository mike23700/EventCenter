import { useParams } from 'react-router-dom';
import { LayoutGrid, Palette, CalendarDays, Users, Table2, Eye, Share2 } from 'lucide-react';
import WeddingConfigShell, { type ConfigTab } from '../../../components/WeddingConfigShell';

const tabs: ConfigTab[] = [
  { to: 'sections', label: 'Sections', icon: LayoutGrid },
  { to: 'theme', label: 'Thème', icon: Palette },
  { to: 'programme', label: 'Programme', icon: CalendarDays },
  { to: 'invites', label: 'Invités', icon: Users },
  { to: 'partage', label: 'Partage', icon: Share2 },
  { to: 'tables', label: 'Tables', icon: Table2 },
  { to: 'apercu', label: 'Aperçu', icon: Eye },
];

/**
 * Configuration avancée d'un mariage, réservée à l'admin plateforme :
 * Sections, Thème et Programme restent exclusives à l'admin. Invités et
 * Tables sont dupliqués ici en lecture/écriture (même composants que côté
 * client) pour que la plateforme puisse aussi gérer la liste d'invités et
 * le plan de tables en support.
 */
export default function WeddingConfigLayout() {
  const { id } = useParams();
  return (
    <WeddingConfigShell
      tabs={tabs}
      basePath={`/admin/weddings/${id}/config`}
      backTo={`/admin/weddings/${id}`}
      titlePrefix="Configurer — "
    />
  );
}
