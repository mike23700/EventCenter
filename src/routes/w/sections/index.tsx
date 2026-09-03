import type { ComponentType } from 'react';
import type { Section, WeddingEvent, Wedding } from '../../../types/database';
import Cover from './Cover';
import Countdown from './Countdown';
import Location from './Location';
import Program from './Program';
import Mixed from './Mixed';

export interface SectionRendererProps {
  section: Section;
  wedding: Wedding;
  events: WeddingEvent[];
}

/** Registre des composants de section (moteur de gabarits). */
const registry: Record<string, ComponentType<any>> = {
  cover: Cover,
  countdown: Countdown,
  location: Location,
  program: Program,
  mixed: Mixed,
};

/**
 * Rendu d'une section active du site public.
 * - filtrage `enabled` fait en amont (fetch)
 * - ordre déterminé par la propriété `position` (trié avant rendu)
 */
export default function SectionRenderer({ section, wedding, events }: SectionRendererProps) {
  const C = registry[section.type];
  const shared = {
    accent: wedding.theme && typeof wedding.theme === 'object'
      ? (wedding.theme as Record<string, unknown>)['primaryColor'] ?? '#C9A34A'
      : '#C9A34A',
  };

  if (!C) return null;

  if (section.type === 'program') {
    return <C {...shared} content={section.content} wedding={wedding} events={events} />;
  }
  return <C {...shared} content={section.content} wedding={wedding} />;
}