import type { Json } from '../../../types/database';
import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord } from './types';

type Block = {
  id: string;
  type: 'text' | 'image' | 'video' | 'questionnaire';
  title?: string;
  text?: string;
  src?: string;
};

function parseBlocks(content: Json): Block[] {
  const c = asRecord(content);
  const blocks = c['blocks'];
  if (Array.isArray(blocks)) {
    return blocks.filter(isBlock);
  }
  return [];
}

function isBlock(b: unknown): b is Block {
  if (!b || typeof b !== 'object') return false;
  const o = b as Record<string, unknown>;
  return typeof o.id === 'string' &&
    (o.type === 'text' || o.type === 'image' || o.type === 'video' || o.type === 'questionnaire');
}

/** Section "partie mixte" : blocs texte / image / vidéo librement ordonnés. */
export default function Mixed({ content, accent }: SectionProps) {
  const blocks = parseBlocks(content);
  if (blocks.length === 0) return null;

  return (
    <section className="mx-auto max-w-3xl space-y-10 px-6 py-14">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'text':
            return (
              <div key={block.id}>
                {block.title && (
                  <h3 className="font-display text-2xl font-bold text-ink" style={idx === 0 ? { color: accent } : undefined}>
                    {block.title}
                  </h3>
                )}
                {block.text && <p className="mt-2 whitespace-pre-line text-ink-secondary">{block.text}</p>}
              </div>
            );
          case 'image': {
            const src = storageUrl('media', block.src) ?? block.src;
            if (!src) return null;
            return (
              <figure key={block.id}>
                <img src={src} alt="" className="w-full rounded-2xl border border-borderlight shadow-sm" />
                {block.title && <figcaption className="mt-2 text-center text-sm text-ink-secondary">{block.title}</figcaption>}
              </figure>
            );
          }
          case 'video': {
            const src = storageUrl('media', block.src) ?? block.src;
            if (!src) return null;
            return (
              <figure key={block.id}>
                <video src={src} controls className="w-full rounded-2xl border border-borderlight shadow-sm" />
              </figure>
            );
          }
          case 'questionnaire':
            return (
              <div key={block.id} className="rounded-2xl border border-gold/30 bg-paper-warm p-6">
                <h3 className="font-display text-xl font-bold text-ink">{block.title || 'Questionnaire'}</h3>
                {block.text && <p className="mt-2 text-ink-secondary">{block.text}</p>}
              </div>
            );
          default:
            return null;
        }
      })}
    </section>
  );
}