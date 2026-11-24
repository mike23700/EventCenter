import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import SuccessModal from '../../../components/SuccessModal';
import BulkWhatsAppSender, { readSent } from './BulkWhatsAppSender';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, Check, X, Users, Filter, ClipboardList, QrCode, Link2, MessageCircle, Download } from 'lucide-react';
import { db } from '../../../lib/db';
import type { Wedding, WeddingEvent, Guest, Section, GuestResponse, Json } from '../../../types/database';
import { formatDateTime } from '../../../lib/format';
import { generateGuestQrDataUrl } from '../../../lib/guestQr';
import { buildInviteMessage, coupleLabel, guestRef, invitationTheme, personalInviteUrl, whatsappLink } from '../../../lib/invitation';

/** Copier le lien personnel / l'envoyer par WhatsApp. */
function GuestInviteActions({ wedding, guest }: { wedding: Wedding; guest: Guest }) {
  const [copied, setCopied] = useState(false);
  const link = personalInviteUrl(wedding.slug, guest);
  const message = buildInviteMessage(invitationTheme(wedding.theme).inviteMessage, {
    nom: guest.name,
    couple: coupleLabel(wedding),
    lien: link,
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt('Copiez le lien :', link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <button onClick={copy} className="btn-outline !px-2" title={copied ? 'Lien copié !' : 'Copier le lien personnel'}>
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
      </button>
      <a
        href={whatsappLink(guest.phone, message)}
        target="_blank"
        rel="noreferrer"
        className="btn-outline !px-2"
        title={guest.phone ? 'Envoyer l\'invitation sur WhatsApp' : 'Envoyer sur WhatsApp (choisir le contact)'}
      >
        <MessageCircle className="h-4 w-4 text-emerald-600" />
      </a>
    </>
  );
}

function csvCell(v: string): string {
  return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Bouton de téléchargement du QR d'invitation d'un invité (pour impression/envoi). */
function GuestQrDownload({ wedding, guest }: { wedding: Wedding; guest: Guest }) {
  const [dataUrl, setDataUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    const url = dataUrl || (await generateGuestQrDataUrl(wedding.id, guest.qr_token));
    if (!dataUrl) setDataUrl(url);
    setLoading(false);
    // Déclenche le téléchargement immédiatement (au lieu d'attendre un
    // second clic sur un <a> qui n'apparaîtrait qu'après génération).
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitation-${guest.name.trim().toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <button onClick={download} disabled={loading} className="btn-outline !px-2" title="Télécharger le QR">
      <QrCode className="h-4 w-4" />
    </button>
  );
}

interface Draft {
  id?: string;
  name: string;
  phone: string;
  plus_ones: number;
  category: string;
  invited_events: string[];
}

const empty: Draft = { name: '', phone: '', plus_ones: 0, category: '', invited_events: [] };

interface GuestCategory {
  id: string;
  label: string;
  quota: number | null;
}

/** Catégories de réservation définies dans la section RSVP (Famille, Amis…). */
function parseCategories(sections: Section[]): GuestCategory[] {
  const rsvp = sections.find((s) => s.type === 'rsvp');
  const c = rsvp?.content && typeof rsvp.content === 'object' && !Array.isArray(rsvp.content) ? (rsvp.content as Record<string, unknown>) : {};
  return Array.isArray(c.categories)
    ? (c.categories as Record<string, unknown>[])
        .filter((x) => x && typeof x.id === 'string' && typeof x.label === 'string' && String(x.label).trim())
        .map((x) => ({ id: String(x.id), label: String(x.label), quota: typeof x.quota === 'number' ? x.quota : null }))
    : [];
}

interface QuestionMeta {
  key: string;
  label: string;
  type: 'single' | 'multiple' | 'open';
  options: string[];
  sectionTitle: string;
}

/** Extrait les questions des blocs "questionnaire" des parties mixtes du mariage. */
function parseQuestionsFromSections(sections: Section[]): QuestionMeta[] {
  const out: QuestionMeta[] = [];
  for (const section of sections) {
    const record = section.content && typeof section.content === 'object' && !Array.isArray(section.content)
      ? (section.content as Record<string, unknown>)
      : {};
    const blocks = record['blocks'];
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (!b || typeof b !== 'object') continue;
      const block = b as Record<string, unknown>;
      if (block.type !== 'questionnaire' || !Array.isArray(block.questions)) continue;
      for (const q of block.questions) {
        if (!q || typeof q !== 'object') continue;
        const question = q as Record<string, unknown>;
        if (typeof question.id !== 'string' || typeof question.label !== 'string' || !question.label) continue;
        out.push({
          key: `${section.id}:${block.id}:${question.id}`,
          label: question.label,
          type: (question.type as QuestionMeta['type']) ?? 'open',
          options: Array.isArray(question.options) ? question.options.filter((o): o is string => typeof o === 'string' && o !== '') : [],
          sectionTitle: (block.title as string) || section.title || 'Partie mixte',
        });
      }
    }
  }
  return out;
}

function answerMatches(answer: Json | undefined, wanted: string): boolean {
  if (Array.isArray(answer)) return answer.includes(wanted);
  if (typeof answer === 'string') return answer === wanted;
  return false;
}

function answerContains(answer: Json | undefined, needle: string): boolean {
  const text = Array.isArray(answer)
    ? answer.filter((v) => typeof v === 'string').join(' ')
    : typeof answer === 'string' ? answer : '';
  return text.toLowerCase().includes(needle.toLowerCase());
}

/** Gestion des invités : ajout manuel, téléphone, étapes conviées. */
export default function GuestsEditor() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [eventFilter, setEventFilter] = useState<string>('');
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [questions, setQuestions] = useState<QuestionMeta[]>([]);
  const [responses, setResponses] = useState<GuestResponse[]>([]);
  const [questionFilter, setQuestionFilter] = useState('');
  const [answerFilter, setAnswerFilter] = useState('');
  const [viewingResponsesFor, setViewingResponsesFor] = useState<string | null>(null);
  const [categories, setCategories] = useState<GuestCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  // Invité en attente de confirmation de suppression (fenêtre de confirmation).
  const [confirmingDelete, setConfirmingDelete] = useState<Guest | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Sélection multiple → envoi groupé guidé sur WhatsApp.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [waSent, setWaSent] = useState<Record<string, string>>(() => readSent(wedding.id));
  const [success, setSuccess] = useState('');
  const closeSuccess = useCallback(() => setSuccess(''), []);

  useEffect(() => {
    if (!wedding) return;
    let active = true;
    (async () => {
      const [{ data: g }, { data: evs }, { data: secs }] = await Promise.all([
        db.from<Guest>('guests').select('*').eq('wedding_id', wedding.id).order('created_at'),
        db.from('wedding_events').select('*').eq('wedding_id', wedding.id).order('position'),
        db.from('sections').select('*').eq('wedding_id', wedding.id),
      ]);
      if (!active) return;
      setGuests(g ?? []);
      setEvents(evs ?? []);
      setQuestions(parseQuestionsFromSections((secs ?? []).filter((x: Section) => x.type === 'mixed')));
      setCategories(parseCategories(secs ?? []));
      setLoading(false);

      const guestIds = (g ?? []).map((row) => row.id);
      if (guestIds.length > 0) {
        const { data: resp } = await db.from('guest_responses').select('*').in('guest_id', guestIds);
        if (!active) return;
        setResponses(resp ?? []);
        const counts: Record<string, number> = {};
        for (const r of resp ?? []) counts[r.guest_id] = (counts[r.guest_id] ?? 0) + 1;
        setResponseCounts(counts);
      }
    })();
    return () => {
      active = false;
    };
  }, [wedding]);

  // Pointage à l'entrée : se fait souvent depuis un autre appareil (scanner),
  // donc on ré-interroge périodiquement `checked_in_at` pour que la colonne
  // « Présence » se mette à jour sans que la page ait besoin d'être rechargée.
  useEffect(() => {
    if (!wedding) return;
    let active = true;
    const interval = setInterval(async () => {
      const { data } = await db
        .from<Pick<Guest, 'id' | 'checked_in_at'>>('guests')
        .select('id, checked_in_at')
        .eq('wedding_id', wedding.id);
      if (!active || !data) return;
      const checkedInById = new Map(data.map((row) => [row.id, row.checked_in_at]));
      setGuests((prev) =>
        prev.map((g) =>
          checkedInById.has(g.id) && checkedInById.get(g.id) !== g.checked_in_at
            ? { ...g, checked_in_at: checkedInById.get(g.id) ?? null }
            : g,
        ),
      );
    }, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [wedding]);

  const answersByGuestAndQuestion = useMemo(() => {
    const map = new Map<string, Json>();
    for (const r of responses) map.set(`${r.guest_id}::${r.question_key}`, r.answer);
    return map;
  }, [responses]);

  function formatAnswer(a: Json | undefined): string {
    if (Array.isArray(a)) {
      const parts = a.filter((v): v is string => typeof v === 'string' && v !== '');
      return parts.length > 0 ? parts.join(', ') : '—';
    }
    if (typeof a === 'string') return a || '—';
    return '—';
  }

  function guestAnswers(guestId: string): { question: QuestionMeta; answer: Json | undefined }[] {
    return questions
      .map((q) => ({ question: q, answer: answersByGuestAndQuestion.get(`${guestId}::${q.key}`) }))
      .filter((entry) => entry.answer !== undefined);
  }

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.key === questionFilter) ?? null,
    [questions, questionFilter],
  );

  const answerOptions = useMemo(() => {
    if (!selectedQuestion) return [];
    const seen = new Set(selectedQuestion.options);
    for (const r of responses) {
      if (r.question_key !== selectedQuestion.key) continue;
      const a = r.answer;
      if (Array.isArray(a)) a.forEach((v) => typeof v === 'string' && v && seen.add(v));
      else if (typeof a === 'string' && a) seen.add(a);
    }
    return Array.from(seen);
  }, [selectedQuestion, responses]);

  const countsByEvent = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of events) counts[ev.id] = 0;
    for (const g of guests) {
      for (const evId of g.invited_events ?? []) {
        if (evId in counts) counts[evId] += 1;
      }
    }
    return counts;
  }, [events, guests]);

  const filteredGuests = useMemo(() => {
    let list = eventFilter ? guests.filter((g) => (g.invited_events ?? []).includes(eventFilter)) : guests;
    if (categoryFilter) list = list.filter((g) => (categoryFilter === '__none' ? !g.category : g.category === categoryFilter));
    if (selectedQuestion) {
      list = list.filter((g) => {
        const answer = answersByGuestAndQuestion.get(`${g.id}::${selectedQuestion.key}`);
        if (!answerFilter) return answer !== undefined;
        return selectedQuestion.type === 'open' ? answerContains(answer, answerFilter) : answerMatches(answer, answerFilter);
      });
    }
    return list;
  }, [guests, eventFilter, categoryFilter, selectedQuestion, answerFilter, answersByGuestAndQuestion]);

  // Places (1 + accompagnants) par catégorie, pour l'affichage des quotas.
  const placesByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of guests) {
      const k = g.category || '__none';
      m[k] = (m[k] ?? 0) + 1 + Math.max(0, g.plus_ones ?? 0);
    }
    return m;
  }, [guests]);

  if (loading) return <p className="text-ink-secondary">Chargement…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;

  function eventName(id: string): string {
    const ev = events.find((e) => e.id === id);
    if (!ev) return '?';
    return ev.parent_id ? `↳ ${ev.name}` : ev.name;
  }

  function openCreate() {
    setDraft({ ...empty, invited_events: events.map((e) => e.id) });
  }
  function openEdit(g: Guest) {
    setDraft({
      id: g.id,
      name: g.name,
      phone: g.phone ?? '',
      plus_ones: g.plus_ones ?? 0,
      category: g.category ?? '',
      invited_events: g.invited_events ?? [],
    });
  }

  function toggleInvited(id: string) {
    if (!draft) return;
    const list = draft.invited_events.includes(id)
      ? draft.invited_events.filter((e) => e !== id)
      : [...draft.invited_events, id];
    setDraft({ ...draft, invited_events: list });
  }

  async function saveDraft() {
    if (!draft || !draft.name.trim()) return;
    if (draft.phone && draft.phone.length !== 9) {
      setError('Le numéro doit comporter exactement 9 chiffres (ex. 679...).');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      name: draft.name.trim(),
      phone: draft.phone.trim() || null,
      plus_ones: Math.max(0, Math.min(20, Math.floor(draft.plus_ones || 0))),
      category: draft.category || null,
      invited_events: draft.invited_events,
    };
    if (draft.id) {
      const { error } = await db.from('guests').update(payload).eq('id', draft.id);
      if (error) setError(error.message);
      else {
        setGuests((prev) => prev.map((g) => (g.id === draft.id ? { ...g, ...payload } : g)));
        setSuccess('Invité enregistré');
      }
    } else {
      const { data, error } = await db
        .from('guests')
        .insert({ wedding_id: wedding.id, ...payload })
        .select('*')
        .single();
      if (error) setError(error.message);
      else {
        setGuests((prev) => [...prev, data]);
        setSuccess('Invité ajouté');
      }
    }
    setSaving(false);
    setDraft(null);
  }

  function exportLinks() {
    const couple = coupleLabel(wedding);
    const tpl = invitationTheme(wedding.theme).inviteMessage;
    const rows = [['Nom', 'Téléphone', 'Places', 'Catégorie', 'Référence', 'Lien personnel', 'Message']];
    for (const g of filteredGuests) {
      const link = personalInviteUrl(wedding.slug, g);
      rows.push([
        g.name,
        g.phone ?? '',
        String(1 + (g.plus_ones ?? 0)),
        categories.find((c) => c.id === g.category)?.label ?? '',
        guestRef(g.qr_token),
        link,
        buildInviteMessage(tpl, { nom: g.name, couple, lien: link }),
      ]);
    }
    // BOM UTF-8 + « ; » : s'ouvre correctement dans Excel en français.
    const csv = '\uFEFF' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `liens-invitations-${wedding.slug}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function remove(id: string) {
    setDeleting(true);
    const { error } = await db.from('guests').delete().eq('id', id);
    setDeleting(false);
    setConfirmingDelete(null);
    if (error) setError(error.message);
    else {
      setGuests((prev) => prev.filter((g) => g.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Invités</h2>
          <p className="text-sm text-ink-secondary">
            Ajoutez vos invités et indiquez à quelles étapes ils sont conviés — ou laissez-les
            s'inscrire eux-mêmes depuis le site. Chacun reçoit un QR d'invitation, à scanner
            (onglet « Entrée ») pour pointer sa présence le jour J.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {guests.length > 0 && (
            <button onClick={exportLinks} className="btn-outline" title="Liens personnels de tous les invités affichés (CSV / Excel)">
              <Download className="h-4 w-4" />
              Exporter les liens
            </button>
          )}
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </div>

      {events.length === 0 && (
        <div className="card text-sm text-ink-secondary">
          Ajoutez d'abord des sous-évènements (dot, mairie, église, soirée…) dans l'onglet
          « Programme » pour pouvoir convié vos invités à des étapes précises.
        </div>
      )}

      {categories.length > 0 && !draft && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-ink-secondary">
            <Users className="h-3.5 w-3.5" /> Catégorie
          </span>
          {[{ id: '', label: 'Toutes', quota: null as number | null }, ...categories, { id: '__none', label: 'Sans catégorie', quota: null }].map((c) => (
            <button
              key={c.id || 'all'}
              onClick={() => setCategoryFilter(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                categoryFilter === c.id ? 'bg-gold text-white' : 'border border-borderlight bg-paper-warm text-ink-secondary'
              }`}
            >
              {c.label}
              {c.id && ` · ${placesByCategory[c.id] ?? 0}${c.quota ? `/${c.quota}` : ''} pl.`}
            </button>
          ))}
        </div>
      )}

      {events.length > 0 && !draft && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-ink-secondary">
            <Filter className="h-3.5 w-3.5" /> Filtrer par partie
          </span>
          <button
            onClick={() => setEventFilter('')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              eventFilter === '' ? 'bg-gold text-white' : 'border border-borderlight bg-paper-warm text-ink-secondary'
            }`}
          >
            Toutes ({guests.length})
          </button>
          {events.map((ev) => (
            <button
              key={ev.id}
              onClick={() => setEventFilter(ev.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                eventFilter === ev.id ? 'bg-gold text-white' : 'border border-borderlight bg-paper-warm text-ink-secondary'
              }`}
            >
              {eventName(ev.id)} ({countsByEvent[ev.id] ?? 0})
            </button>
          ))}
        </div>
      )}

      {questions.length > 0 && !draft && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-ink-secondary">
            <ClipboardList className="h-3.5 w-3.5" /> Filtrer par réponse
          </span>
          <select
            className="input w-auto"
            value={questionFilter}
            onChange={(e) => {
              setQuestionFilter(e.target.value);
              setAnswerFilter('');
            }}
          >
            <option value="">Toutes les questions</option>
            {questions.map((q) => (
              <option key={q.key} value={q.key}>
                {q.sectionTitle} — {q.label}
              </option>
            ))}
          </select>
          {selectedQuestion && (
            selectedQuestion.type === 'open' ? (
              <input
                className="input w-auto"
                placeholder="Contient…"
                value={answerFilter}
                onChange={(e) => setAnswerFilter(e.target.value)}
              />
            ) : (
              <select className="input w-auto" value={answerFilter} onChange={(e) => setAnswerFilter(e.target.value)}>
                <option value="">A répondu (peu importe quoi)</option>
                {answerOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )
          )}
          {selectedQuestion && (
            <button onClick={() => { setQuestionFilter(''); setAnswerFilter(''); }} className="btn-outline !px-2" title="Effacer le filtre">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {!draft && filteredGuests.length === 0 && (
        <div className="card text-center text-ink-secondary">Aucun invité pour le moment.</div>
      )}

      {draft && (
        <div className="card space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Marie Dupont" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                className="input"
                inputMode="numeric"
                maxLength={9}
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                placeholder="679..."
              />
            </div>
            <div>
              <label className="label">Accompagnant(s)</label>
              <input
                type="number"
                min={0}
                max={20}
                className="input"
                value={draft.plus_ones}
                onChange={(e) => setDraft({ ...draft, plus_ones: Number(e.target.value) || 0 })}
              />
              <p className="mt-1 text-xs text-ink-secondary">
                Le pass affichera {1 + (draft.plus_ones || 0)} personne{draft.plus_ones > 0 ? 's' : ''}.
              </p>
            </div>
            {categories.length > 0 && (
              <div>
                <label className="label">Catégorie</label>
                <select className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  <option value="">— Aucune —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}{c.quota ? ` (${placesByCategory[c.id] ?? 0}/${c.quota} places)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {events.length > 0 && (
            <div>
              <label className="label">Convié aux étapes</label>
              <div className="flex flex-wrap gap-2">
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => toggleInvited(ev.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      draft.invited_events.includes(ev.id)
                        ? 'bg-gold text-white'
                        : 'border border-borderlight bg-paper-warm text-ink-secondary'
                    }`}
                    title={ev.date ? formatDateTime(ev.date) : ''}
                  >
                    {eventName(ev.id)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setDraft(null)} className="btn-outline">
              <X className="h-4 w-4" /> Annuler
            </button>
            <button
              onClick={saveDraft}
              disabled={saving || !draft.name.trim() || (draft.phone.length > 0 && draft.phone.length !== 9)}
              className="btn-primary"
            >
              <Check className="h-4 w-4" /> {saving ? '…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {filteredGuests.length > 0 && !draft && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-borderlight bg-white px-3 py-2 text-sm">
          <span className="text-ink-secondary">
            {selected.size > 0 ? `${selected.size} invité${selected.size > 1 ? 's' : ''} sélectionné${selected.size > 1 ? 's' : ''}` : 'Cochez des invités pour leur envoyer leur invitation sur WhatsApp, un par un.'}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline !py-1.5 text-xs"
              onClick={() => setSelected(new Set(filteredGuests.filter((g) => !waSent[g.id]).map((g) => g.id)))}
              title="Sélectionner les invités affichés qui n'ont pas encore reçu leur invitation"
            >
              Pas encore envoyés
            </button>
            {selected.size > 0 && (
              <>
                <button type="button" className="btn-outline !py-1.5 text-xs" onClick={() => setSelected(new Set())}>Désélectionner</button>
                <button type="button" className="btn !py-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={() => setBulkOpen(true)}>
                  <MessageCircle className="h-4 w-4" /> Envoyer sur WhatsApp ({selected.size})
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {filteredGuests.length > 0 && !draft && (
        <div className="overflow-x-auto rounded-2xl border border-borderlight bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-borderlight bg-paper-cream text-xs uppercase tracking-wide text-ink-secondary">
              <tr>
                <th className="w-10 py-3 pl-4">
                  <input
                    type="checkbox"
                    aria-label="Tout sélectionner"
                    checked={filteredGuests.length > 0 && filteredGuests.every((g) => selected.has(g.id))}
                    onChange={(e) => setSelected(e.target.checked ? new Set(filteredGuests.map((g) => g.id)) : new Set())}
                  />
                </th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Convié à</th>
                <th className="px-4 py-3 text-center" title="Réponses aux questions personnalisées ajoutées dans une partie mixte du site (allergies, chanson, etc.)">
                  Réponses
                </th>
                <th className="px-4 py-3 text-center">Présence</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((g) => (
                <Fragment key={g.id}>
                  <tr className={`border-b border-borderlight/60 last:border-0 ${selected.has(g.id) ? 'bg-paper-cream/50' : ''}`}>
                    <td className="py-3 pl-4">
                      <input
                        type="checkbox"
                        aria-label={`Sélectionner ${g.name}`}
                        checked={selected.has(g.id)}
                        onChange={() => setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(g.id)) next.delete(g.id);
                          else next.add(g.id);
                          return next;
                        })}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{g.name}{waSent[g.id] && <span className="ml-1 rounded-full bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-700" title={`Invitation envoyée sur WhatsApp le ${new Date(waSent[g.id]).toLocaleString('fr-FR')} (depuis cet appareil)`}>WhatsApp ✓</span>}{(g.plus_ones ?? 0) > 0 && <span className="ml-1 rounded-full bg-paper-cream px-1.5 text-xs text-ink-secondary" title="Accompagnants">+{g.plus_ones}</span>}{g.category && categories.find((c) => c.id === g.category) && <span className="ml-1 rounded-full border border-gold/40 px-1.5 text-[10px] text-gold">{categories.find((c) => c.id === g.category)!.label}</span>}</td>
                    <td className="px-4 py-3 text-ink-secondary">{g.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      {(g.invited_events ?? []).length === 0 ? (
                        <span className="text-xs text-ink-secondary/70">Toutes ?</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(g.invited_events ?? []).map((id) => (
                            <span key={id} className="badge badge-slate">{eventName(id)}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-ink-secondary">
                      {responseCounts[g.id] ? (
                        <button
                          onClick={() => setViewingResponsesFor(viewingResponsesFor === g.id ? null : g.id)}
                          className="badge badge-slate hover:opacity-75"
                          title="Voir les réponses de cet invité"
                        >
                          {responseCounts[g.id]}
                        </button>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {g.checked_in_at ? (
                        <span className="badge-green" title={new Date(g.checked_in_at).toLocaleString('fr-FR')}>Présent</span>
                      ) : (
                        <span className="text-xs text-ink-secondary/70">En attente</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <GuestInviteActions wedding={wedding} guest={g} />
                        <GuestQrDownload wedding={wedding} guest={g} />
                        <button onClick={() => openEdit(g)} className="btn-outline !px-2" title="Modifier"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setConfirmingDelete(g)} className="btn-outline !px-2 hover:!border-red-300 hover:!text-red-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                  {viewingResponsesFor === g.id && (
                    <tr className="border-b border-borderlight/60 bg-paper-cream/60 last:border-0">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="space-y-2">
                          {guestAnswers(g.id).map(({ question, answer }) => (
                            <div key={question.key} className="text-sm">
                              <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
                                {question.sectionTitle} — {question.label}
                              </p>
                              <p className="text-ink">{formatAnswer(answer)}</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-ink-secondary">
        <Users className="mr-1 inline h-4 w-4" />
        {filteredGuests.length} invité{filteredGuests.length > 1 ? 's' : ''}
        {eventFilter || selectedQuestion ? ' correspondant' + (filteredGuests.length > 1 ? 's' : '') : ' enregistré' + (filteredGuests.length > 1 ? 's' : '')}
        {eventFilter || selectedQuestion ? ` (sur ${guests.length} au total).` : '.'}
      </p>

      {bulkOpen && (
        <BulkWhatsAppSender
          wedding={wedding}
          guests={guests.filter((g) => selected.has(g.id))}
          onClose={() => setBulkOpen(false)}
          onSentChange={setWaSent}
        />
      )}

      {confirmingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && setConfirmingDelete(null)}
        >
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-ink">Supprimer cet invité ?</h3>
            <p className="mt-2 text-sm text-ink-secondary">
              « {confirmingDelete.name} » sera définitivement supprimé(e), avec sa place à table, ses réponses
              et son pointage. Son lien personnel et son QR ne fonctionneront plus. Cette action est irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirmingDelete(null)} disabled={deleting} className="btn-outline">Annuler</button>
              <button onClick={() => remove(confirmingDelete.id)} disabled={deleting} className="btn bg-red-600 text-white hover:bg-red-700">
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal open={!!success} message={success} onClose={closeSuccess} />
    </div>
  );
}
