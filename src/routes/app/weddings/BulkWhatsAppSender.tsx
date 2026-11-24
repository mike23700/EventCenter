import { useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Copy, MessageCircle, PhoneOff, SkipForward, X } from 'lucide-react';
import type { Guest, Wedding } from '../../../types/database';
import { buildInviteMessage, coupleLabel, invitationTheme, personalInviteUrl, whatsappLink } from '../../../lib/invitation';

/**
 * Envoi groupé des invitations personnelles sur WhatsApp, guidé invité par
 * invité. WhatsApp n'autorise aucun site à envoyer seul : chaque bouton ouvre
 * la conversation de l'invité avec SON message (nom + lien court) déjà écrit,
 * il ne reste qu'à toucher « Envoyer » dans WhatsApp, puis à revenir ici.
 * Les invités déjà contactés sont mémorisés sur cet appareil (évite les doublons).
 */

const SENT_KEY = 'etan_wa_sent:';

export function readSent(weddingId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(SENT_KEY + weddingId);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeSent(weddingId: string, sent: Record<string, string>) {
  try {
    localStorage.setItem(SENT_KEY + weddingId, JSON.stringify(sent));
  } catch {
    /* stockage indisponible : l'envoi fonctionne quand même */
  }
}

export default function BulkWhatsAppSender({
  wedding,
  guests,
  onClose,
  onSentChange,
}: {
  wedding: Wedding;
  guests: Guest[];
  onClose: () => void;
  /** Prévient la liste des invités (badge « Envoyé »). */
  onSentChange: (sent: Record<string, string>) => void;
}) {
  const [sent, setSent] = useState<Record<string, string>>(() => readSent(wedding.id));
  // Copie toujours à jour (les marquages sont différés après l'ouverture de WhatsApp).
  const sentRef = useRef(sent);
  const withPhone = useMemo(() => guests.filter((g) => (g.phone ?? '').replace(/\D/g, '').length >= 9), [guests]);
  const noPhone = useMemo(() => guests.filter((g) => !withPhone.includes(g)), [guests, withPhone]);
  // File d'attente : ceux pas encore contactés d'abord (dans l'ordre de la liste).
  const [skipped, setSkipped] = useState<string[]>([]);
  const queue = withPhone.filter((g) => !sent[g.id] && !skipped.includes(g.id));
  const current = queue[0] ?? null;
  const done = withPhone.filter((g) => sent[g.id]).length;
  const [copiedId, setCopiedId] = useState('');

  const template = invitationTheme(wedding.theme).inviteMessage;
  const couple = coupleLabel(wedding);
  const messageFor = (g: Guest) => buildInviteMessage(template, { nom: g.name, couple, lien: personalInviteUrl(wedding.slug, g) });

  function markSent(g: Guest) {
    const next = { ...sentRef.current, [g.id]: new Date().toISOString() };
    sentRef.current = next;
    setSent(next);
    writeSent(wedding.id, next);
    onSentChange(next);
  }

  function unmark(g: Guest) {
    const next = { ...sentRef.current };
    delete next[g.id];
    sentRef.current = next;
    setSent(next);
    writeSent(wedding.id, next);
    onSentChange(next);
  }

  async function copyFor(g: Guest) {
    const text = messageFor(g);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copiez le message :', text);
    }
    setCopiedId(g.id);
    setTimeout(() => setCopiedId(''), 1600);
  }

  const pct = withPhone.length ? Math.round((done / withPhone.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Envoi groupé sur WhatsApp"
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-borderlight px-5 py-4">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-ink">Envoi groupé sur WhatsApp</h3>
            <p className="text-xs text-ink-secondary">
              Chaque bouton ouvre WhatsApp avec le message personnel de l'invité : touchez « Envoyer », puis revenez ici.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-outline !px-2" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {/* Progression */}
          <div>
            <div className="mb-1 flex justify-between text-xs text-ink-secondary">
              <span>{done} / {withPhone.length} envoyé{done > 1 ? 's' : ''}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-paper-cream">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Invité en cours */}
          {current ? (
            <div className="rounded-xl border border-gold/40 bg-paper-warm p-4">
              <p className="text-xs uppercase tracking-wide text-ink-secondary">
                Suivant · {withPhone.length - queue.length + 1} sur {withPhone.length}
              </p>
              <p className="mt-1 font-display text-xl font-bold text-ink">{current.name}</p>
              <p className="text-sm text-ink-secondary">{current.phone}</p>
              <pre className="mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-3 font-sans text-xs text-ink">{messageFor(current)}</pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={whatsappLink(current.phone, messageFor(current))}
                  target="_blank"
                  rel="noreferrer"
                  // Marqué juste APRÈS l'ouverture : changer l'invité affiché pendant le
                  // clic modifierait le lien avant que le navigateur ne le suive.
                  onClick={() => {
                    const g = current;
                    setTimeout(() => markSent(g), 400);
                  }}
                  className="btn bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <MessageCircle className="h-4 w-4" /> Ouvrir WhatsApp pour {current.name.split(/\s+/)[0]}
                  <ChevronRight className="h-4 w-4" />
                </a>
                <button type="button" onClick={() => setSkipped((s) => [...s, current.id])} className="btn-outline">
                  <SkipForward className="h-4 w-4" /> Passer
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <Check className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-1 font-medium text-emerald-800">
                {withPhone.length === 0 ? 'Aucun invité sélectionné n\'a de numéro.' : 'Tous les invités avec numéro ont été contactés.'}
              </p>
              {skipped.length > 0 && (
                <button type="button" onClick={() => setSkipped([])} className="mt-2 text-xs font-medium text-emerald-800 underline">
                  Reprendre les {skipped.length} invité{skipped.length > 1 ? 's' : ''} passé{skipped.length > 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}

          {/* Liste complète */}
          <ul className="divide-y divide-borderlight rounded-xl border border-borderlight">
            {withPhone.map((g) => (
              <li key={g.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full ${sent[g.id] ? 'bg-emerald-500 text-white' : 'bg-paper-cream text-ink-secondary'}`}>
                  {sent[g.id] ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-ink">{g.name}</span>
                {sent[g.id] ? (
                  <button type="button" onClick={() => unmark(g)} className="text-xs text-ink-secondary underline" title="Le remettre dans la file">
                    Renvoyer
                  </button>
                ) : skipped.includes(g.id) ? (
                  <span className="text-xs text-amber-700">Passé</span>
                ) : (
                  <span className="text-xs text-ink-secondary">En attente</span>
                )}
              </li>
            ))}
          </ul>

          {/* Sans numéro : WhatsApp a besoin du numéro */}
          {noPhone.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <PhoneOff className="h-4 w-4" /> {noPhone.length} invité{noPhone.length > 1 ? 's' : ''} sans numéro
              </p>
              <p className="mt-1 text-xs text-amber-800">Ajoutez leur numéro dans la liste, ou copiez leur message pour l'envoyer autrement.</p>
              <ul className="mt-2 space-y-1">
                {noPhone.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 text-sm text-ink">
                    <span className="min-w-0 flex-1 truncate">{g.name}</span>
                    <button type="button" onClick={() => copyFor(g)} className="btn-outline !px-2 !py-1 text-xs">
                      {copiedId === g.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} Message
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-ink-secondary">
            Les invités déjà contactés sont mémorisés sur cet appareil. Sur téléphone, après « Envoyer » dans WhatsApp,
            revenez simplement sur cette page : l'invité suivant est prêt.
          </p>
        </div>
      </div>
    </div>
  );
}
