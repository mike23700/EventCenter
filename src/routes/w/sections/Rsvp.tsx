import { useState } from 'react';
import { PartyPopper } from 'lucide-react';
import type { WeddingEvent } from '../../../types/database';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';
import { useGuestIdentity } from './useGuestIdentity';
import GuestSelfRegister from './GuestSelfRegister';
import GuestQrCard from './GuestQrCard';
import GuestQrLookup from './GuestQrLookup';

type Mode = 'register' | 'lookup';

export interface RsvpProps extends SectionProps {
  events: WeddingEvent[];
}

/**
 * Section RSVP (confirmation de présence) : recevoir le lien du site vaut
 * invitation. Deux parcours :
 *  - « Je m'inscris » : nom + téléphone (+ étapes si plusieurs) → génère un
 *    QR d'invitation à présenter le jour J (scanné à l'entrée pour le
 *    pointage de présence).
 *  - « Retrouver mon QR » : recherche par nom (désambiguïsation par
 *    téléphone en cas d'homonymes) pour réafficher un QR déjà généré.
 */
export default function Rsvp({ content, accent, tpl, wedding, events }: RsvpProps) {
  const c = asRecord(content);
  const title = str(c, 'title') || 'Confirmez votre invitation';
  const intro = str(c, 'intro') || "Inscrivez-vous pour recevoir votre QR d'invitation, à présenter le jour J.";
  const { palette } = tpl;

  const [mode, setMode] = useState<Mode>('register');
  const id = useGuestIdentity(wedding.id);
  const { status, guest } = id;

  async function registerSelf(name: string, phone: string, eventIds: string[]) {
    await id.registerSelf({ name, phone, invitedEvents: eventIds });
  }

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center">
          <PartyPopper className="mx-auto h-6 w-6" style={{ color: accent }} />
          <h2 className="mt-2 font-display tpl-display text-3xl sm:text-4xl font-bold" style={{ color: palette.ink }}>
            {title}
          </h2>
          <p className="mt-2 tpl-body" style={{ color: palette.muted }}>{intro}</p>
        </div>

        <div
          className="mt-8 rounded-2xl p-6"
          style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}
        >
          {status === 'found' && guest ? (
            <GuestQrCard guest={guest} weddingId={wedding.id} accent={accent} palette={palette} onReset={id.reset} />
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setMode('register')}
                  className="rounded-full px-4 py-1.5 text-sm font-medium transition"
                  style={{
                    backgroundColor: mode === 'register' ? accent : 'transparent',
                    color: mode === 'register' ? '#fff' : palette.muted,
                    border: `1px solid ${mode === 'register' ? accent : palette.border}`,
                  }}
                >
                  Je m'inscris
                </button>
                <button
                  onClick={() => setMode('lookup')}
                  className="rounded-full px-4 py-1.5 text-sm font-medium transition"
                  style={{
                    backgroundColor: mode === 'lookup' ? accent : 'transparent',
                    color: mode === 'lookup' ? '#fff' : palette.muted,
                    border: `1px solid ${mode === 'lookup' ? accent : palette.border}`,
                  }}
                >
                  Déjà inscrit(e) ? Retrouver mon QR
                </button>
              </div>

              {mode === 'register' ? (
                <GuestSelfRegister
                  initialName=""
                  accent={accent}
                  palette={palette}
                  submitting={id.registering}
                  error={id.error}
                  events={events}
                  onSubmit={registerSelf}
                />
              ) : (
                <GuestQrLookup weddingId={wedding.id} accent={accent} palette={palette} />
              )}
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}
