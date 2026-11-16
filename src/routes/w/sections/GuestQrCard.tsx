import { useEffect, useState } from 'react';
import { Download, RotateCcw, Share2, CheckCircle2, Loader2 } from 'lucide-react';
import { generateGuestQrDataUrl } from '../../../lib/guestQr';
import { getTemplate, type TemplateDef } from '../../../lib/templates';
import { fetchPassDetails, type PassDetails } from '../../../lib/invitation';
import { renderPassImage } from '../../../lib/passImage';
import { saveKnownGuestToken } from './guestSession';
import { usePublicWedding } from '../publicContext';
import { PASS_ANCHOR_ID } from '../WelcomeModal';

export interface QrGuest {
  id: string;
  name: string;
  qr_token: string;
  plus_ones?: number;
}

function fileSlug(name: string): string {
  return name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
}

/**
 * Pass d'invitation d'un invité identifié (lien personnel, inscription ou
 * « retrouver mon QR ») : QR d'entrée, nombre de places, table et
 * référence ; enregistrable en image ou partageable (WhatsApp, etc.).
 */
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
  const ctx = usePublicWedding();
  const tpl = ctx.tpl ?? getTemplate('florale');
  const [dataUrl, setDataUrl] = useState('');
  const [details, setDetails] = useState<PassDetails | null>(null);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const [error, setError] = useState('');
  const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

  useEffect(() => {
    saveKnownGuestToken(weddingId, guest.qr_token);
    let active = true;
    generateGuestQrDataUrl(weddingId, guest.qr_token).then((url) => active && setDataUrl(url));
    fetchPassDetails(weddingId, guest).then((d) => active && setDetails(d)).catch(() => {});
    return () => {
      active = false;
    };
  }, [weddingId, guest]);

  async function buildPng(): Promise<Blob> {
    return renderPassImage({
      tpl,
      accent,
      couple: ctx.couple,
      dateLabel: ctx.dateLabel,
      guestName: guest.name,
      persons: details?.persons ?? 1,
      tables: details?.tables ?? [],
      reference: details?.ref ?? '',
      qrDataUrl: dataUrl,
    });
  }

  async function save() {
    setBusy('save');
    setError('');
    try {
      const blob = await buildPng();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pass-${fileSlug(guest.name)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    setBusy('share');
    setError('');
    try {
      const blob = await buildPng();
      const file = new File([blob], `pass-${fileSlug(guest.name)}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Pass — ${ctx.couple}`, text: `Mon pass pour le mariage de ${ctx.couple}` });
      } else {
        await save();
      }
    } catch (e) {
      // L'utilisateur qui ferme la feuille de partage n'est pas une erreur.
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setError(e instanceof Error ? e.message : 'Partage impossible');
      }
    } finally {
      setBusy(null);
    }
  }

  const cell = { backgroundColor: palette.background, border: `1px solid ${palette.border}` };

  return (
    <div id={PASS_ANCHOR_ID} className="space-y-5 text-center scroll-mt-24">
      <div>
        <CheckCircle2 className="mx-auto h-8 w-8" style={{ color: accent }} />
        <p className="mt-2 font-display tpl-display text-2xl font-bold" style={{ color: palette.ink }}>
          Bonjour {guest.name} !
        </p>
        <p className="mt-1 tpl-body text-sm" style={{ color: palette.muted }}>
          Votre invitation est confirmée — votre place est réservée.
        </p>
      </div>

      {/* Le pass */}
      <div
        className="mx-auto max-w-sm overflow-hidden rounded-2xl text-left shadow-sm"
        style={{ backgroundColor: palette.surface, border: `1px solid ${accent}55` }}
      >
        <div className="px-5 pb-3 pt-5 text-center" style={{ borderBottom: `1px dashed ${palette.border}` }}>
          <p className="tpl-body text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>
            Pass d'invitation
          </p>
          {ctx.couple && (
            <p className="mt-1 font-display tpl-display text-xl" style={{ color: palette.ink }}>{ctx.couple}</p>
          )}
          {ctx.dateLabel && <p className="tpl-body text-xs" style={{ color: palette.muted }}>{ctx.dateLabel}</p>}
        </div>
        <div className="flex justify-center p-4">
          {dataUrl ? (
            <img src={dataUrl} alt="QR d'invitation" className="h-48 w-48 rounded-xl bg-white p-2" style={{ border: `1px solid ${palette.border}` }} />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center" style={{ color: palette.muted }}>
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 pb-4 text-center">
          {[
            ['Personnes', details ? String(details.persons) : '…'],
            ['Table', details ? (details.tables.join(' · ') || '—') : '…'],
            ['Réf.', details?.ref ?? '…'],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col justify-center rounded-xl px-1 py-2" style={cell}>
              <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: palette.muted }}>{label}</p>
              <p className="mt-0.5 break-words text-[13px] font-semibold leading-tight" style={{ color: palette.ink }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="tpl-body text-xs" style={{ color: palette.muted }}>
        Présentez ce pass à l'entrée (imprimé ou sur votre téléphone).
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={save}
          disabled={!dataUrl || !details || busy !== null}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Enregistrer le pass
        </button>
        {canShareFiles && (
          <button
            onClick={share}
            disabled={!dataUrl || !details || busy !== null}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition hover:opacity-80 disabled:opacity-50"
            style={{ border: `1px solid ${palette.border}`, color: palette.ink }}
          >
            {busy === 'share' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Partager
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div>
        <button onClick={onReset} className="btn-outline">
          <RotateCcw className="h-4 w-4" />
          Ce n'est pas moi
        </button>
      </div>
    </div>
  );
}
