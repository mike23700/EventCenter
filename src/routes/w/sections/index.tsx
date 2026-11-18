import type { ComponentType } from 'react';
import type { Section, WeddingEvent, Wedding } from '../../../types/database';
import { getTemplate } from '../../../lib/templates';
import { applySectionStyle, readSectionStyle, SectionBackgroundContext } from './sectionStyle';
import Cover from './Cover';
import Countdown from './Countdown';
import SaveTheDate from './SaveTheDate';
import Location from './Location';
import Program from './Program';
import Mixed from './Mixed';
import ImageVideo from './ImageVideo';
import Rsvp from './Rsvp';
import Gallery from './Gallery';
import Testimonials from './Testimonials';
import StorySection from './StorySection';
import SnapchatSection from './SnapchatSection';
import { GiftsSection, ClosingSection } from './GiftsClosing';
import { QuoteSection, InfoSection, ThanksSection, DressCodeSection } from './storyBlocks';

export interface SectionRendererProps {
  section: Section;
  wedding: Wedding;
  events: WeddingEvent[];
}

/** Registre des composants de section (moteur de gabarits). */
const registry: Record<string, ComponentType<any>> = {
  cover: Cover,
  countdown: Countdown,
  save_the_date: SaveTheDate,
  location: Location,
  program: Program,
  mixed: Mixed,
  image_video: ImageVideo,
  rsvp: Rsvp,
  gallery: Gallery,
  testimonials: Testimonials,
  story: StorySection,
  quote: QuoteSection,
  info: InfoSection,
  thanks: ThanksSection,
  dress_code: DressCodeSection,
  snapchat: SnapchatSection,
  gifts: GiftsSection,
  closing: ClosingSection,
};

/**
 * Rendu d'une section active du site public.
 * - filtrage `enabled` fait en amont (fetch)
 * - ordre déterminé par la propriété `position` (trié avant rendu)
 * - le template sélectionné est résolu ici et transmis à chaque section
 */
export default function SectionRenderer({ section, wedding, events }: SectionRendererProps) {
  const C = registry[section.type];
  const theme = wedding.theme && typeof wedding.theme === 'object'
    ? (wedding.theme as Record<string, unknown>)
    : {};
  const accent = (theme['primaryColor'] as string) ?? '#C9A34A';
  // Fond de bloc (couleur / image) : modèle recoloré pour cette section.
  const styled = section.type === 'cover'
    ? { tpl: getTemplate(wedding.template), background: null }
    : applySectionStyle(getTemplate(wedding.template), readSectionStyle(section.content));
  const tpl = styled.tpl;
  const shared = { accent, tpl, wedding, sectionId: section.id };

  if (!C) return null;

  // Ancre (« Réserver ma place », « Le programme »…) + fond éventuel.
  const wrap = (node: React.ReactNode) => (
    <div id={`section-${section.type}`} className="scroll-mt-16">
      <SectionBackgroundContext.Provider value={styled.background}>{node}</SectionBackgroundContext.Provider>
    </div>
  );

  if (
    section.type === 'program' ||
    section.type === 'countdown' ||
    section.type === 'save_the_date' ||
    section.type === 'rsvp' ||
    section.type === 'mixed'
  ) {
    return wrap(<C {...shared} content={section.content} events={events} />);
  }
  return wrap(<C {...shared} content={section.content} events={section.type === 'cover' || section.type === 'closing' ? events : undefined} />);
}