import { useEffect, useMemo, useState } from 'react';
import { Search, Check, PartyPopper, User, UserPlus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { WeddingEvent } from '../../../types/database';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';
import { formatDateTime } from '../../../lib/format';
import { useGuestIdentity } from './useGuestIdentity';
import GuestSelfRegister from './GuestSelfRegister';

export interface RsvpProps extends SectionProps {
  events: WeddingEvent[];
}

type Status = 'present' | 'absent';

/**
 * Section RSVP (confirmation de présence).
 * L'invité se retrouve par son nom parmi les invités saisis par les mariés,
 * ou — recevoir le lien du site vaut invitation — s'inscrit lui-même (nom,
 * téléphone, étapes) s'il n'y figure pas encore, puis confirme sa présence
 * pour chaque sous-évènement. Les réponses sont enregistrées dans
 * `attendance` (statut present/absent).
 */
export default function Rsvp({ content, accent, tpl, wedding, events }: RsvpProps) {
  const c = asRecord(content);
  const title = str(c, 'title') || 'Confirmation de présence';
  const intro = str(c, 'intro') || 'Dites-nous sur quelles étapes nous pouvons compter sur vous.';
  const notFound = str(c, 'not_found') || 'Vous avez reçu ce lien ? Vous êtes invité(e), confirmez votre présence !';
  const { palette } = tpl;

  const id = useGuestIdentity(wedding.id);
  const { status, guest } = id;
  const [registering, setRegistering] = useState(false);
  const [picks, setPicks] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const activeEvents = useMemo(
    () => events.filter((e) => e.date && !Number.isNaN(new Date(e.date).getTime())),
    [events],
  );

  useEffect(() => {
    if (status !== 'found' || !guest) return;
    let active = true;
    setSaved(false);
    (async () => {
      const { data: att } = await supabase
        .from('attendance')
        .select('event_id, status')
        .eq('guest_id', guest.id);
      if (!active) return;
      const initial: Record<string, boolean> = {};
      (att ?? []).forEach((a) => {
        initial[a.event_id] = a.status === 'present';
      });
      setPicks(initial);
    })();
    return () => {
      active = false;
    };
  }, [status, guest]);

  async function registerSelf(name: string, phone: string, eventIds: string[]) {
    await id.registerSelf({ name, phone, eventIds });
    setRegistering(false);
  }

  async function save() {
    if (!guest) return;
    setSaving(true);
    setSaveError('');
    const rows = activeEvents.map((e) => ({
      guest_id: guest.id,
      event_id: e.id,
      status: (picks[e.id] ? 'present' : 'absent') as Status,
    }));
    const { error } = await supabase.from('attendance').upsert(rows, {
      onConflict: 'guest_id,event_id',
    });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setSaved(true);
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
            saved ? (
              <div className="text-center">
                <PartyPopper className="mx-auto h-8 w-8" style={{ color: accent }} />
                <p className="mt-3 font-display tpl-display text-2xl font-bold" style={{ color: palette.ink }}>
                  Merci {guest.name} !
                </p>
                <p className="mt-2 tpl-body" style={{ color: palette.muted }}>
                  Votre présence a bien été enregistrée.
                </p>
                <button onClick={() => setSaved(false)} className="btn-outline mt-5">
                  Modifier ma réponse
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: palette.accentSoft, color: accent }}
                  >
                    <User className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display tpl-display text-lg font-bold" style={{ color: palette.ink }}>
                      {guest.name}
                    </p>
                    <p className="text-xs" style={{ color: palette.muted }}>
                      Confirmez votre présence ci-dessous.
                    </p>
                  </div>
                  <button
                    onClick={id.reset}
                    className="btn-outline ml-auto !px-2 text-xs"
                    title="Changer d'invité"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {activeEvents.map((ev) => {
                    const yes = Boolean(picks[ev.id]);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setPicks((p) => ({ ...p, [ev.id]: !yes }))}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition"
                        style={{
                          backgroundColor: yes ? palette.accentSoft : undefined,
                          border: `1px solid ${yes ? accent : palette.border}`,
                        }}
                      >
                        <div>
                          <p className="font-medium" style={{ color: palette.ink }}>{ev.name}</p>
                          <p className="text-xs" style={{ color: palette.muted }}>
                            {formatDateTime(ev.date)}
                            {ev.location_title ? ` — ${ev.location_title}` : ''}
                          </p>
                        </div>
                        <span
                          className="flex h-6 w-6 flex-none items-center justify-center rounded-full"
                          style={{
                            background: yes ? accent : 'transparent',
                            border: `1px solid ${yes ? accent : palette.border}`,
                            color: yes ? palette.surface : palette.muted,
                          }}
                        >
                          {yes && <Check className="h-4 w-4" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs" style={{ color: palette.muted }}>
                  Cocher une étape = présent à cette étape&nbsp;·&nbsp;laissez vide pour&nbsp;·&nbsp;absent.
                </p>

                {saveError && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{saveError}</p>
                )}

                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full rounded-full px-6 py-3 text-sm font-medium transition hover:opacity-85 disabled:opacity-50"
                  style={{ backgroundColor: accent, color: '#fff' }}
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer ma présence'}
                </button>
              </div>
            )
          ) : status === 'choosing' ? (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: palette.muted }}>
                Plusieurs invités correspondent. Choisissez votre nom :
              </p>
              <div className="space-y-2">
                {id.matches.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3"
                    style={{ borderColor: id.chosenId === m.id ? accent : palette.border }}
                  >
                    <input
                      type="radio"
                      name="guest-pick"
                      value={m.id}
                      checked={id.chosenId === m.id}
                      onChange={() => id.setChosenId(m.id)}
                    />
                    <span className="font-medium" style={{ color: palette.ink }}>{m.name}</span>
                    {m.phone && <span className="text-xs" style={{ color: palette.muted }}>{m.phone}</span>}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={id.reset} className="btn-outline">Retour</button>
                <button
                  onClick={id.confirmGuess}
                  disabled={!id.chosenId}
                  className="rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
                  style={{ backgroundColor: accent }}
                >
                  C'est moi
                </button>
              </div>
            </div>
          ) : status === 'missing' ? (
            registering ? (
              <GuestSelfRegister
                initialName={id.query.trim()}
                events={activeEvents}
                accent={accent}
                palette={palette}
                submitting={id.registering}
                error={id.error}
                onSubmit={registerSelf}
                onCancel={() => setRegistering(false)}
              />
            ) : (
              <div className="text-center">
                <p className="tpl-body" style={{ color: palette.ink }}>
                  Nous ne trouvons pas votre nom dans la liste des invités.
                </p>
                <p className="mt-2 text-sm" style={{ color: palette.muted }}>
                  {notFound}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button onClick={id.reset} className="btn-outline">Réessayer</button>
                  <button
                    onClick={() => setRegistering(true)}
                    className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: accent }}
                  >
                    <UserPlus className="h-4 w-4" />
                    Confirmer mon invitation
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label">Votre nom</label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="Ex : Michel Kengne"
                    value={id.query}
                    onChange={(e) => id.setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && id.search()}
                    style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}
                  />
                  <button
                    onClick={id.search}
                    disabled={id.query.trim().length < 2}
                    className="rounded-full px-6 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-40"
                    style={{ backgroundColor: accent }}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {status === 'searching' && (
                <p className="text-sm" style={{ color: palette.muted }}>Recherche…</p>
              )}
              {id.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{id.error}</p>}
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}
