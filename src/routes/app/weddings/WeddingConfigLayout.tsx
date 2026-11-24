import { useParams } from 'react-router-dom';
import { Eye, Users, Table2, ClipboardList, Image as ImageIcon, ScanLine, Share2 } from 'lucide-react';
import WeddingConfigShell, { type ConfigTab } from '../../../components/WeddingConfigShell';

const tabs: ConfigTab[] = [
  { to: 'invites', label: 'Invités', icon: Users },
  { to: 'partage', label: 'Partage', icon: Share2 },
  { to: 'tables', label: 'Tables', icon: Table2 },
  { to: 'checkin', label: 'Entrée', icon: ScanLine },
  { to: 'reponses', label: 'Réponses', icon: ClipboardList },
  { to: 'galerie', label: 'Galerie', icon: ImageIcon },
  { to: 'apercu', label: 'Aperçu', icon: Eye },
];

/**
 * Layout de configuration d'un mariage côté client (couple) : Sections,
 * Thème et Programme sont désormais gérés exclusivement côté admin.
 */
export default function WeddingConfigLayout() {
  const { weddingId } = useParams();
  return <WeddingConfigShell tabs={tabs} basePath={`/app/${weddingId}`} backTo="/app" />;
}
