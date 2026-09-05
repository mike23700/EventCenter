import type { Json } from '../../../types/database';
import type { TemplateDef } from '../../../lib/templates';

export interface SectionProps {
  content: Json;
  wedding: { id: string; slug: string; name: string; secondary_name: string | null; logo: string | null };
  accent: string;
  tpl: TemplateDef;
}

/** Extrait un objet depuis content (Json) */
export function asRecord(content: Json): Record<string, unknown> {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    return content as Record<string, unknown>;
  }
  return {};
}

export function str(record: Record<string, unknown>, key: string): string | undefined {
  const v = record[key];
  return typeof v === 'string' ? v : undefined;
}

export function bool(record: Record<string, unknown>, key: string, dflt = false): boolean {
  return typeof record[key] === 'boolean' ? (record[key] as boolean) : dflt;
}

export function num(record: Record<string, unknown>, key: string, dflt = 0): number {
  return typeof record[key] === 'number' ? (record[key] as number) : dflt;
}