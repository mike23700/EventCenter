import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { TemplateDef } from '../../../lib/templates';
import type { WeddingEvent } from '../../../types/database';

/**
 * Formulaire d'auto-inscription : nom + téléphone, et — quand le programme
 * comporte plusieurs étapes (mairie, église, soirée…) — un choix des étapes
 * auxquelles l'invité compte venir, pour que son QR corresponde vraiment à
 * son invitation (sinon `invited_events` reste vide, donc conviée à rien).
 * Une seule étape : pas de choix à faire, elle est retenue automatiquement.
 * Utilisé par la section RSVP et par les blocs "questionnaire" de la partie mixte.
 */
export default function GuestSelfRegister({
  initialName,
  accent,
  palette,
  submitting,
  error,
  events,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  accent: string;
  palette: TemplateDef['palette'];
  submitting: boolean;
  error?: string;
  events?: WeddingEvent[];
  onSubmit: (name: string, phone: string, eventIds: string[]) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const phoneInvalid = phone.length > 0 && phone.length !== 9;
  const selectable = (events ?? []).filter((e) => !e.parent_id);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(selectable.map((e) => e.id));

  function toggleEvent(id: string) {
    setSelectedEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  const needsChoice = selectable.length > 1;

  return (
    <div className="space-y-4">
      <div>
        <p className="tpl-body text-sm" style={{ color: palette.ink }}>
          Recevoir ce lien vaut invitation ! Inscrivez-vous en quelques secondes pour recevoir
          votre QR d'invitation, à présenter le jour J.
        </p>
      </div>

      <div>
        <label className="label">Votre nom</label>
        <input
          className="input"
          placeholder="Ex : Anne Marie"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}
        />
      </div>

      <div>
        <label className="label">Votre téléphone</label>
        <input
          className="input"
          placeholder="679..."
          inputMode="numeric"
          maxLength={9}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
          style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}
        />
        {phoneInvalid && (
          <p className="mt-1 text-xs text-red-600">Le numéro doit comporter exactement 9 chiffres (ex. 679...).</p>
        )}
      </div>

      {needsChoice && (
        <div>
          <label className="label">Vous serez présent(e) à</label>
          <div className="flex flex-wrap gap-2">
            {selectable.map((ev) => {
              const checked = selectedEvents.includes(ev.id);
              return (
                <label
                  key={ev.id}
                  className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition"
                  style={{
                    backgroundColor: checked ? accent : 'transparent',
                    color: checked ? '#fff' : palette.muted,
                    border: `1px solid ${checked ? accent : palette.border}`,
                  }}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={checked}
                    onChange={() => toggleEvent(ev.id)}
                  />
                  {ev.name}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && <button onClick={onCancel} className="btn-outline">Retour</button>}
        <button
          onClick={() => onSubmit(name, phone, selectedEvents)}
          disabled={submitting || name.trim().length < 2 || phoneInvalid || (needsChoice && selectedEvents.length === 0)}
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
