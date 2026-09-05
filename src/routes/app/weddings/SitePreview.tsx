import { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { RefreshCw, ExternalLink, Smartphone, Monitor } from 'lucide-react';
import type { Wedding } from '../../../types/database';

/**
 * Aperçu intégré du site public directement dans le panel client.
 * L'iframe recharge les données de la base à chaque réinitialisation,
 * pour refléter instantanément les derniers changements enregistrés.
 */
export default function SitePreview() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  const [reloadKey, setReloadKey] = useState(0);
  const [width, setWidth] = useState<'mobile' | 'desktop'>('desktop');

  const url = `${window.location.origin}/w/${wedding.slug}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Aperçu du site</h2>
          <p className="text-sm text-ink-secondary">
            Toutes vos modifications enregistrées s'affichent ici, en direct.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-borderlight bg-white p-0.5">
            <button
              onClick={() => setWidth('mobile')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                width === 'mobile' ? 'bg-gold text-white' : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </button>
            <button
              onClick={() => setWidth('desktop')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                width === 'desktop' ? 'bg-gold text-white' : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" /> Bureau
            </button>
          </div>

          <button onClick={() => setReloadKey((k) => k + 1)} className="btn-outline" title="Rafraîchir l'aperçu">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="btn-outline">
            <ExternalLink className="h-4 w-4" />
            Ouvrir
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-borderlight shadow-sm">
        <div className="flex items-center gap-2 border-b border-borderlight bg-paper-cream px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-ink-secondary">
            {url}
          </span>
        </div>
        <div
          className={`mx-auto bg-white transition-all ${width === 'mobile' ? 'max-w-[400px]' : 'max-w-none'}`}
        >
          <iframe
            key={reloadKey}
            src={url}
            title={`Aperçu — ${wedding.name}`}
            className="h-[70vh] w-full"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </div>

      <p className="text-sm text-ink-secondary">
        Astuce : pensez à <Link to={`/app/${wedding.id}/sections`} className="text-gold underline">enregistrer le contenu</Link> de
        chaque section puis à cliquer « Actualiser » pour voir vos changements.
      </p>
    </div>
  );
}