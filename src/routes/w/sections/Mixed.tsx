import type { Json } from '../../../types/database';
import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord } from './types';
import { SectionShell } from './shell';

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

/**
 * Section "partie mixte" : blocs texte / image / vidéo librement ordonnés.
 * Les images sont mises en page façon magazine / blog selon le template.
 */
export default function Mixed({ content, accent, tpl }: SectionProps) {
  const blocks = parseBlocks(content);
  if (blocks.length === 0) return null;

  const { palette, id } = tpl;

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl space-y-12 px-6 py-16">
        {blocks.map((block, idx) => {
          switch (block.type) {
            case 'text':
              return (
                <div key={block.id} style={tpl.id === 'minimal' ? { maxWidth: '42rem', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' } : undefined}>
                  {block.title && (
                    <h3
                      className="font-display tpl-display text-2xl sm:text-3xl font-bold"
                      style={{ color: id === 'florale' && idx === 0 ? accent : palette.ink }}
                    >
                      {block.title}
                    </h3>
                  )}
                  {block.text && (
                    <p
                      className={`mt-3 whitespace-pre-line leading-relaxed tpl-body ${id === 'royal' ? 'text-base' : 'text-lg'}`}
                      style={{ color: palette.muted }}
                    >
                      {block.text}
                    </p>
                  )}
                </div>
              );
            case 'image': {
              const src = storageUrl('media', block.src) ?? block.src;
              if (!src) return null;
              return (
                <figure key={block.id} className={id === 'florale' ? 'rounded-3xl p-3' : undefined} style={id === 'florale' ? { backgroundColor: palette.accentSoft } : undefined}>
                  <img
                    src={src}
                    alt=""
                    className="w-full"
                    style={{
                      borderRadius: id === 'minimal' ? '0.25rem' : '1rem',
                      border: id === 'minimal' ? `1px solid ${palette.border}` : 'none',
                      boxShadow: id === 'florale' ? '0 14px 34px rgba(201,138,158,0.25)' : '0 14px 40px rgba(0,0,0,0.1)',
                    }}
                  />
                  {/* Légende style magazine */}
                  {block.title && (
                    <figcaption
                      className="mt-3 text-center text-sm tracking-wide tpl-body italic"
                      style={{ color: palette.muted }}
                    >
                      {block.title}
                    </figcaption>
                  )}
                </figure>
              );
            }
            case 'video': {
              const src = storageUrl('media', block.src) ?? block.src;
              if (!src) return null;
              return (
                <figure key={block.id}>
                  <video
                    src={src}
                    controls
                    className="w-full"
                    style={{
                      borderRadius: id === 'minimal' ? '0.25rem' : '1rem',
                      border: `1px solid ${palette.border}`,
                      boxShadow: '0 14px 40px rgba(0,0,0,0.1)',
                    }}
                  />
                </figure>
              );
            }
            case 'questionnaire':
              return (
                <div
                  key={block.id}
                  className="rounded-2xl p-7"
                  style={{
                    backgroundColor: palette.accentSoft,
                    border: `1px solid ${palette.border}`,
                  }}
                >
                  <h3 className="font-display tpl-display text-xl font-bold" style={{ color: palette.ink }}>
                    {block.title || 'Questionnaire'}
                  </h3>
                  {block.text && (
                    <p className="mt-2 tpl-body" style={{ color: palette.muted }}>
                      {block.text}
                    </p>
                  )}
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    </SectionShell>
  );
}