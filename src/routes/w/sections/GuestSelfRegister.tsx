import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { WeddingEvent } from '../../../types/database';
import type { TemplateDef } from '../../../lib/templates';
import { formatDateTime } from '../../../lib/format';

/**
 * Formulaire d'auto-inscription : un visiteur qui a reçu le lien du site
 * mais ne se trouve pas dans la liste saisie par les mariés peut se
 * déclarer lui-même (nom, téléphone, étape(s) où il sera présent). Utilisé
 * par la section RSVP et par les blocs "questionnaire" de la partie mixte.
 */
export default function GuestSelfRegister({
  initialName,
  events,
  accent,
  palette,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  events: WeddingEvent[];
  accent: string;
  palette: TemplateDef['palette'];
  submitting: boolean;
  error?: string;
  onSubmit: (name: string, phone: string, eventIds: string[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [eventIds, setEventIds] = useState<string[]>([]);

  function toggle(id: string) {
    setEventIds((ids) => (ids.includes(id) ? ids.filter((e) => e !== id) : [...ids, id]));
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="tpl-body text-sm" style={{ color: palette.ink }}>
          Nous ne trouvons pas votre nom, mais si vous avez reçu ce lien, vous êtes invité(e) !
          Confirmez votre invitation en quelques secondes.
        </p>
      </div>

      <div>
        <label className="label">Votre nom</label>
        <input
          className="input"
          placeholder="Ex : Michel Kengne"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}
        />
      </div>

      <div>
        <label className="label">Votre téléphone</label>
        <input
          className="input"
          placeholder="+237 6.."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}
        />
      </div>

      {events.length > 0 && (
        <div>
          <label className="label">À quelle(s) étape(s) serez-vous présent(e) ?</label>
          <div className="space-y-1.5">
            {events.map((ev) => {
              const on = eventIds.includes(ev.id);
              return (
                <label
                  key={ev.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5"
                  style={{ backgroundColor: on ? palette.accentSoft : undefined, border: `1px solid ${on ? accent : palette.border}` }}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(ev.id)} />
                  <span>
                    <span className="block font-medium" style={{ color: palette.ink }}>{ev.name}</span>
                    <span className="block text-xs" style={{ color: palette.muted }}>
                      {formatDateTime(ev.date)}
                      {ev.location_title ? ` — ${ev.location_title}` : ''}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-outline">Retour</button>
        <button
          onClick={() => onSubmit(name, phone, eventIds)}
          disabled={submitting || name.trim().length < 2}
          className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          <UserPlus className="h-4 w-4" />
          {submitting ? 'Confirmation…' : 'Confirmer mon invitation'}
        </button>
      </div>
    </div>
  );
}
