import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { TemplateDef } from '../../../lib/templates';
import type { WeddingEvent } from '../../../types/database';
import type { RsvpConfig } from '../../../lib/publicApi';

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
  rsvp,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  accent: string;
  palette: TemplateDef['palette'];
  submitting: boolean;
  error?: string;
  events?: WeddingEvent[];
  /** Catégories (Famille, Amis…) si l'admin les a activées. */
  rsvp?: RsvpConfig | null;
  onSubmit: (name: string, phone: string, eventIds: string[], category?: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  // Téléphone obligatoire : il sert ensuite à retrouver son pass (nom + téléphone).
  const phoneInvalid = phone.length > 0 && phone.length !== 9;
  const phoneMissing = phone.length === 0;
  const selectable = (events ?? []).filter((e) => !e.parent_id);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(selectable.map((e) => e.id));

  function toggleEvent(id: string) {
    setSelectedEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  const needsChoice = selectable.length > 1;
  const askCategory = !!rsvp?.askCategory && rsvp.categories.length > 0;
  const [category, setCategory] = useState('');

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
        <label className="label">Votre numéro WhatsApp *</label>
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

      {askCategory && (
        <div>
          <label className="label">Vous êtes invité(e) en tant que *</label>
          <div className="flex flex-wrap gap-2">
            {rsvp!.categories.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  disabled={cat.full}
                  onClick={() => setCategory(cat.id)}
                  className="rounded-full px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    backgroundColor: active ? accent : 'transparent',
                    color: active ? '#fff' : palette.text,
                    border: `1px solid ${active ? accent : palette.border}`,
                  }}
                >
                  {cat.label}{cat.full ? ' — complet' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {rsvp?.allFull && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Toutes les places sont réservées. Contactez les mariés si besoin.</p>
      )}

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
          onClick={() => onSubmit(name, phone, selectedEvents, askCategory ? category : undefined)}
          disabled={submitting || name.trim().length < 2 || phoneInvalid || phoneMissing || (needsChoice && selectedEvents.length === 0) || (askCategory && !category) || !!rsvp?.allFull}
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
