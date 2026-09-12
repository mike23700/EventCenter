import QRCode from 'qrcode';

const PREFIX = 'WEDQR1';

/** Contenu encodé dans le QR d'un invité : préfixe + wedding + jeton. */
export function guestQrPayload(weddingId: string, qrToken: string): string {
  return `${PREFIX}:${weddingId}:${qrToken}`;
}

/** Décode le contenu scanné ; renvoie null si ce n'est pas un QR d'invitation. */
export function parseGuestQrPayload(raw: string): { weddingId: string; qrToken: string } | null {
  const parts = raw.trim().split(':');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, weddingId, qrToken] = parts;
  if (!weddingId || !qrToken) return null;
  return { weddingId, qrToken };
}

/** Génère le QR (data URL PNG) à afficher/télécharger pour un invité. */
export async function generateGuestQrDataUrl(weddingId: string, qrToken: string): Promise<string> {
  return QRCode.toDataURL(guestQrPayload(weddingId, qrToken), { width: 480, margin: 1 });
}
