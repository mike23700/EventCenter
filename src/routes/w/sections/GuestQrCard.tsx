import { useEffect, useState } from 'react';
import { Download, RotateCcw, PartyPopper } from 'lucide-react';
import { generateGuestQrDataUrl } from '../../../lib/guestQr';
import type { TemplateDef } from '../../../lib/templates';

export interface QrGuest {
  id: string;
  name: string;
  qr_token: string;
}

/** QR d'invitation d'un invité identifié (inscription ou récupération) : à télécharger et présenter à l'entrée. */
export default function GuestQrCard({
  guest,
  weddingId,
  accent,
  palette,
  onReset,
}: {
  guest: QrGuest;
  weddingId: string;
  accent: string;
  palette: TemplateDef['palette'];
  onReset: () => void;
}) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let active = true;
    generateGuestQrDataUrl(weddingId, guest.qr_token).then((url) => {
      if (active) setDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [weddingId, guest.qr_token]);

  return (
    <div className="space-y-4 text-center">
      <PartyPopper className="mx-auto h-8 w-8" style={{ color: accent }} />
      <div>
        <p className="font-display tpl-display text-2xl font-bold" style={{ color: palette.ink }}>
          Merci {guest.name} !
        </p>
        <p className="mt-2 tpl-body text-sm" style={{ color: palette.muted }}>
          Voici votre QR d'invitation. Téléchargez-le et présentez-le (imprimé ou sur votre
          téléphone) à l'entrée de l'évènement.
        </p>
      </div>

      {dataUrl ? (
        <>
          <img
            src={dataUrl}
            alt="QR d'invitation"
            className="mx-auto h-48 w-48 rounded-xl border p-2"
            style={{ borderColor: palette.border, backgroundColor: '#fff' }}
          />
          <a
            href={dataUrl}
            download={`invitation-${guest.name.trim().toLowerCase().replace(/\s+/g, '-')}.png`}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-85"
            style={{ backgroundColor: accent }}
          >
            <Download className="h-4 w-4" />
            Télécharger mon QR
          </a>
        </>
      ) : (
        <p className="text-sm" style={{ color: palette.muted }}>Génération du QR…</p>
      )}

      <div>
        <button onClick={onReset} className="btn-outline">
          <RotateCcw className="h-4 w-4" />
          Ce n'est pas moi
        </button>
      </div>
    </div>
  );
}
