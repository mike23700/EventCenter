import { useEffect, useState } from 'react';
import { useTextStyle } from '../../../lib/textStyles';
import QRCode from 'qrcode';
import { Camera, ExternalLink, Smartphone, Monitor } from 'lucide-react';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';

/**
 * Section « Filtre Snapchat » (type `snapchat`) : l'admin colle simplement
 * le lien de partage du filtre (Lens) ; le site génère le QR code à scanner
 * avec Snapchat (depuis un ordinateur ou un autre téléphone) et un bouton
 * pour l'ouvrir directement sur mobile.
 *
 * Contenu : { title, url, text }
 */

/** Lien de filtre accepté : https sur un domaine snapchat.com uniquement. */
export function isSnapchatUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' && (u.hostname === 'snapchat.com' || u.hostname.endsWith('.snapchat.com'));
  } catch {
    return false;
  }
}

export default function SnapchatSection({ content, accent, tpl }: SectionProps) {
  const ts = useTextStyle();
  const c = asRecord(content);
  const { palette } = tpl;
  const url = str(c, 'url')?.trim() ?? '';
  const valid = isSnapchatUrl(url);
  const [qr, setQr] = useState('');

  useEffect(() => {
    if (!valid) return;
    let active = true;
    QRCode.toDataURL(url, { width: 440, margin: 1, color: { dark: '#111111', light: '#FFFFFF' } })
      .then((d) => active && setQr(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [url, valid]);

  if (!valid) return null;

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-md px-6 py-16">
        <div
          className="rounded-[1.75rem] px-7 pb-8 pt-7 text-center"
          style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}`, boxShadow: '0 18px 40px -28px rgba(0,0,0,.35)' }}
        >
          <div className="flex items-center justify-center gap-2" style={{ color: accent }}>
            <Camera className="h-5 w-5" />
            <p className="tpl-body text-xs font-semibold uppercase tracking-[0.3em]" style={ts('title')}>{str(c, 'title') || 'Filtre Snapchat'}</p>
          </div>
          {str(c, 'text') && (
            <p className="mx-auto mt-3 max-w-xs tpl-body text-sm leading-relaxed" style={{ color: palette.muted, ...ts('text') }}>{str(c, 'text')}</p>
          )}

          <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-3" style={{ boxShadow: `0 0 0 1px ${palette.border}` }}>
            {qr ? (
              <img src={qr} alt="QR code du filtre Snapchat" className="h-48 w-48" />
            ) : (
              <div className="h-48 w-48" />
            )}
          </div>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 tpl-body text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:opacity-90"
            style={{ backgroundColor: accent, ...ts('button') }}
          >
            Ouvrir le filtre <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <div className="mt-6 space-y-1.5 tpl-body text-xs" style={{ color: palette.muted }}>
            <p className="flex items-center justify-center gap-2"><Smartphone className="h-3.5 w-3.5" style={{ color: accent }} /> Sur mobile : touchez « Ouvrir le filtre »</p>
            <p className="flex items-center justify-center gap-2"><Monitor className="h-3.5 w-3.5" style={{ color: accent }} /> Sur ordinateur : scannez le code avec Snapchat</p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
