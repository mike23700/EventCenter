import { createContext, useContext } from 'react';
import type { TemplateDef } from '../../lib/templates';
import type { InvitedGuest } from './useInvitedGuest';

/**
 * Contexte partagé du site public d'un mariage : invité identifié (lien
 * personnel ou visite précédente), libellés du couple et de la date, et
 * template — utile aux sections qui en ont besoin sans faire descendre ces
 * valeurs à travers toutes les props (pass d'invitation, accueil…).
 */
export interface PublicWeddingContextValue {
  invitedGuest: InvitedGuest | null;
  couple: string;
  dateLabel: string;
  tpl: TemplateDef | null;
}

export const PublicWeddingContext = createContext<PublicWeddingContextValue>({
  invitedGuest: null,
  couple: '',
  dateLabel: '',
  tpl: null,
});

export function usePublicWedding(): PublicWeddingContextValue {
  return useContext(PublicWeddingContext);
}
