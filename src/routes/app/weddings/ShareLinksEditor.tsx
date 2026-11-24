import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, Copy, Link2, MessageCircle, Pencil, Plus, Share2, Trash2, X } from 'lucide-react';
import { db } from '../../../lib/db';
import { useAuth } from '../../../lib/auth-context';
import { weddingPublicUrl } from '../../../lib/format';
import type { ShareLink, Wedding, WeddingEvent } from '../../../types/database';
import {
  buildShareMessage,
  coupleLabel,
  DEFAULT_LINK_MESSAGE,
  DEFAULT_SHARE_MESSAGE,
  joinNames,
  shortUrl,
  whatsappLink,
} from '../../../lib/invitation';

/**
 * Onglet « Partage » (admin et couple) :
 *  1. Lien général : le lien normal du site + un message WhatsApp qui ne
 *     cite aucun invité (enregistré dans le Thème par l'administrateur) ;
 *  2. Liens par étape : un lien court /i/<code> par groupe d'étapes (ex.
 *     Dot + Mairie, sans l'Église). Celui qui l'ouvre ne voit que ces étapes
 *     dans le programme, et s'il s'inscrit, n'est convié qu'à celles-ci.
 */

function themeRecord(theme: unknown): Record<string, unknown> {
  return theme && typeof theme === 'object' && !Array.isArray(theme) ? (theme as Record<string, unknown>) : {};
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt('Copiez le texte :', text);
  }
}

function CopyButton({ text, label, title }: { text: string; label?: string; title: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await copyText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      className={label ? 'btn-outline' : 'btn-outline !px-2'}
      title={title}
    >
      {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      {label && (done ? 'Copié !' : label)}
    </button>
  );
}

interface Draft {
  id?: string;
  label: string;
  event_ids: string[];
  message: string;
}

export default function ShareLinksEditor() {
  const { wedding, setWedding } = useOutletContext<{ wedding: Wedding; setWedding?: (w: Wedding) => void }>();
  const isAdmin = useAuth((s) => s.user?.app_metadata.role === 'super_admin');
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const couple = coupleLabel(wedding);
  const generalUrl = weddingPublicUrl(wedding.slug);
  const savedGeneral = typeof themeRecord(wedding.theme).shareMessage === 'string' ? (themeRecord(wedding.theme).shareMessage as string) : '';
  const [generalMessage, setGeneralMessage] = useState(savedGeneral.trim() || DEFAULT_SHARE_MESSAGE);
  const [generalSaved, setGeneralSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: evs, error: e1 }, { data: ls, error: e2 }] = await Promise.all([
        db.from<WeddingEvent>('wedding_events').select('*').eq('wedding_id', wedding.id).order('position'),
        db.from<ShareLink>('share_links').select('*').eq('wedding_id', wedding.id).order('created_at'),
      ]);
      if (!active) return;
      if (e1 || e2) setError((e1 ?? e2)?.message ?? 'Chargement impossible');
      setEvents(evs ?? []);
      setLinks(ls ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [wedding.id]);

  const topEvents = useMemo(() => events.filter((e) => !e.parent_id), [events]);
  const eventName = (id: string) => events.find((e) => e.id === id)?.name ?? '';
  const linkEvents = (l: { event_ids: string[] }) => l.event_ids.filter((id) => events.some((e) => e.id === id));
  const etapes = (ids: string[]) => joinNames(ids.map(eventName).filter(Boolean));

  const generalText = buildShareMessage(generalMessage, DEFAULT_SHARE_MESSAGE, { couple, lien: generalUrl });

  async function saveGeneral() {
    setError('');
    const theme = { ...themeRecord(wedding.theme), shareMessage: generalMessage.trim() };
    const { error } = await db.from('weddings').update({ theme }).eq('id', wedding.id);
    if (error) {
      setError(error.message);
      return;
    }
    setWedding?.({ ...wedding, theme } as Wedding);
    setGeneralSaved(true);
    setTimeout(() => setGeneralSaved(false), 2000);
  }

  function openCreate() {
    setDraft({ label: '', event_ids: [], message: DEFAULT_LINK_MESSAGE });
  }

  function openEdit(l: ShareLink) {
    setDraft({ id: l.id, label: l.label, event_ids: linkEvents(l), message: l.message?.trim() || DEFAULT_LINK_MESSAGE });
  }

  function toggleEvent(id: string) {
    if (!draft) return;
    setDraft({ ...draft, event_ids: draft.event_ids.includes(id) ? draft.event_ids.filter((x) => x !== id) : [...draft.event_ids, id] });
  }

  async function saveDraft() {
    if (!draft || draft.event_ids.length === 0) return;
    setSaving(true);
    setError('');
    // Ordre du programme, étapes existantes uniquement.
    const ids = topEvents.map((e) => e.id).filter((id) => draft.event_ids.includes(id));
    const payload = {
      label: draft.label.trim().slice(0, 80) || etapes(ids),
      event_ids: ids,
      message: draft.message.trim() === DEFAULT_LINK_MESSAGE ? null : draft.message.trim().slice(0, 2000) || null,
    };
    if (draft.id) {
      const { error } = await db.from('share_links').update(payload).eq('id', draft.id);
      if (error) setError(error.message);
      else {
        setLinks((prev) => prev.map((l) => (l.id === draft.id ? { ...l, ...payload } : l)));
        setDraft(null);
      }
    } else {
      const { data, error } = await db.from<ShareLink>('share_links').insert({ wedding_id: wedding.id, ...payload }).select('*').single();
      if (error) setError(error.message);
      else if (data) {
        setLinks((prev) => [...prev, data]);
        setDraft(null);
      }
    }
    setSaving(false);
  }

  async function remove(l: ShareLink) {
    if (!window.confirm(`Supprimer le lien « ${l.label} » ? Il ne fonctionnera plus pour ceux qui l'ont reçu.`)) return;
    const { error } = await db.from('share_links').delete().eq('id', l.id);
    if (error) setError(error.message);
    else setLinks((prev) => prev.filter((x) => x.id !== l.id));
  }

  if (loading) return <p className="text-ink-secondary">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Partage</h2>
        <p className="text-sm text-ink-secondary">
          Le lien général du site avec un message prêt à envoyer, et des liens courts limités à certaines
          étapes du programme. Les liens personnels de chaque invité se trouvent dans l'onglet « Invités ».
        </p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* 1. Lien général */}
      <div className="card space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gold/10 text-gold"><Share2 className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="font-medium text-ink">Lien général (tout le programme)</p>
            <p className="text-xs text-ink-secondary">À envoyer à tout le monde : le message ne cite aucun invité.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-paper-warm px-3 py-2 text-sm text-ink">{generalUrl}</code>
          <CopyButton text={generalUrl} title="Copier le lien" />
        </div>
        <div>
          <label className="label">Message WhatsApp</label>
          <textarea className="input min-h-32 font-mono text-xs" value={generalMessage} onChange={(e) => setGeneralMessage(e.target.value)} maxLength={2000} />
          <p className="mt-1 text-xs text-ink-secondary">
            Variables : <code>{'{couple}'}</code>, <code>{'{lien}'}</code> (lien du site).
            {!isAdmin && " Le message par défaut est réglé par l'administrateur ; vos changements servent pour l'envoi en cours."}
          </p>
          {!generalMessage.includes('{lien}') && (
            <p className="mt-1 text-xs text-amber-700">Attention : sans <code>{'{lien}'}</code>, le message ne contient pas le lien du site.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={whatsappLink(null, generalText)} target="_blank" rel="noreferrer" className="btn-primary">
            <MessageCircle className="h-4 w-4" /> Envoyer sur WhatsApp
          </a>
          <CopyButton text={generalText} label="Copier le message" title="Copier le message complet" />
          {isAdmin && (
            <button type="button" onClick={saveGeneral} className="btn-outline">
              <Check className="h-4 w-4" /> {generalSaved ? 'Enregistré !' : 'Enregistrer ce message'}
            </button>
          )}
          {generalMessage !== DEFAULT_SHARE_MESSAGE && (
            <button type="button" className="text-xs font-medium text-gold underline" onClick={() => setGeneralMessage(DEFAULT_SHARE_MESSAGE)}>
              Message par défaut
            </button>
          )}
        </div>
      </div>

      {/* 2. Liens par étape */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-ink">Liens par étape</p>
            <p className="text-xs text-ink-secondary">
              Ex. un lien « Dot + Mairie » sans l'Église : le programme du site ne montre que ces étapes.
            </p>
          </div>
          {!draft && topEvents.length > 0 && (
            <button type="button" onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> Créer un lien
            </button>
          )}
        </div>

        {topEvents.length === 0 && (
          <div className="card text-sm text-ink-secondary">
            Ajoutez d'abord les étapes du programme (dot, mairie, église, soirée…) dans l'onglet « Programme ».
          </div>
        )}

        {draft && (
          <div className="card space-y-4">
            <div>
              <label className="label">Étapes concernées *</label>
              <div className="flex flex-wrap gap-2">
                {topEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => toggleEvent(ev.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${draft.event_ids.includes(ev.id) ? 'bg-gold text-white' : 'border border-borderlight bg-paper-warm text-ink-secondary'}`}
                  >
                    {ev.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Nom du lien (pour vous, jamais affiché aux invités)</label>
              <input className="input" maxLength={80} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder={etapes(draft.event_ids) || 'Famille — Dot et Mairie'} />
            </div>
            <div>
              <label className="label">Message WhatsApp</label>
              <textarea className="input min-h-32 font-mono text-xs" maxLength={2000} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
              <p className="mt-1 text-xs text-ink-secondary">
                Variables : <code>{'{couple}'}</code>, <code>{'{etapes}'}</code> (ex. « Dot et Mairie »), <code>{'{lien}'}</code> (lien court).
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDraft(null)} className="btn-outline"><X className="h-4 w-4" /> Annuler</button>
              <button type="button" onClick={saveDraft} disabled={saving || draft.event_ids.length === 0} className="btn-primary">
                <Check className="h-4 w-4" /> {saving ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {links.length === 0 && !draft && topEvents.length > 0 && (
          <div className="card text-center text-sm text-ink-secondary">Aucun lien par étape pour le moment.</div>
        )}

        {links.map((l) => {
          const url = shortUrl(l.code);
          const ids = linkEvents(l);
          const text = buildShareMessage(l.message ?? '', DEFAULT_LINK_MESSAGE, { couple, lien: url, etapes: etapes(ids) });
          return (
            <div key={l.id} className="rounded-2xl border border-borderlight bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-paper-cream text-gold"><Link2 className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{l.label || etapes(ids)}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ids.length === 0 ? (
                      <span className="badge badge-amber">Étapes supprimées : tout le programme</span>
                    ) : (
                      ids.map((id) => <span key={id} className="badge badge-slate">{eventName(id)}</span>)
                    )}
                  </div>
                  <code className="mt-2 block truncate text-xs text-ink-secondary">{url}</code>
                </div>
                <div className="flex gap-1">
                  <CopyButton text={url} title="Copier le lien" />
                  <a href={whatsappLink(null, text)} target="_blank" rel="noreferrer" className="btn-outline !px-2" title="Envoyer sur WhatsApp (choisir le contact)">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                  </a>
                  <CopyButton text={text} title="Copier le message" />
                  <button type="button" onClick={() => openEdit(l)} className="btn-outline !px-2" title="Modifier"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => remove(l)} className="btn-outline !px-2 hover:!border-red-300 hover:!text-red-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
