import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { TemplateDef } from '../../../lib/templates';

/**
 * Formulaire d'auto-inscription : nom + téléphone uniquement. Recevoir le
 * lien du site vaut invitation à toutes les étapes — plus besoin de cocher
 * quoi que ce soit. Utilisé par la section RSVP et par les blocs
 * "questionnaire" de la partie mixte.
 */
export default function GuestSelfRegister({
  initialName,
  accent,
  palette,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  accent: string;
  palette: TemplateDef['palette'];
  submitting: boolean;
  error?: string;
  onSubmit: (name: string, phone: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');

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

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && <button onClick={onCancel} className="btn-outline">Retour</button>}
        <button
          onClick={() => onSubmit(name, phone)}
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
