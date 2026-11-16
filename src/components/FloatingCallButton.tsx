import { MessageCircle } from 'lucide-react';

const PHONE_DISPLAY = '677 42 15 15';
const WHATSAPP_LINK = 'https://wa.me/237677421515';

/**
 * Bouton WhatsApp flottant (pages accueil + connexion).
 * Renvoie vers le WhatsApp +237 677 42 15 15.
 */
export default function FloatingCallButton() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp au ${PHONE_DISPLAY}`}
      title={`WhatsApp au ${PHONE_DISPLAY}`}
      className="group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#1DA851] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/30" aria-hidden="true" />
      <MessageCircle className="relative h-6 w-6" aria-hidden="true" />
    </a>
  );
}
