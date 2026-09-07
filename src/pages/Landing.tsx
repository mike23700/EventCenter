import { Link } from 'react-router-dom';
import { Heart, LogIn, CalendarDays, Users, Image as ImageIcon, QrCode, ArrowRight } from 'lucide-react';
import { TEMPLATE_DEFS, Flower, Crown, WaxPattern } from '../lib/templates';
import type { TemplateDef } from '../lib/templates';

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Un programme en plusieurs étapes',
    text: "Dot, mairie, église, soirée… chaque étape a sa date, son lieu et peut se découper en sous-parties (cocktail, discours) avec leur propre description.",
  },
  {
    icon: Users,
    title: 'Invités, RSVP et plan de tables',
    text: 'Vos invités confirment leur présence étape par étape ; vous organisez le placement à part, sans jamais toucher aux sections du site.',
  },
  {
    icon: ImageIcon,
    title: 'Galerie et témoignages modérés',
    text: 'Vos invités déposent photos, vidéos et messages — vous les validez avant qu’ils apparaissent sur le site public.',
  },
  {
    icon: QrCode,
    title: 'QR codes prêts à imprimer',
    text: 'Un scan sur table ouvre directement le site, la galerie ou les témoignages : plus besoin de dicter un lien.',
  },
];

/** Icône ornementale associée à chaque template (identité visuelle propre). */
function TemplateOrnament({ id, color, className }: { id: string; color: string; className?: string }) {
  if (id === 'royal') return <Crown color={color} className={className} />;
  if (id === 'africain') return <WaxPattern color={color} className={className} />;
  if (id === 'minimal') return <span className={`inline-block rotate-45 ${className}`} style={{ backgroundColor: color }} />;
  return <Flower color={color} className={className} />;
}

/** Réplique miniature d'une couverture de site — le vrai produit, pas une illustration. */
function WeddingCardPreview({ t, className = '' }: { t: TemplateDef; className?: string }) {
  const { palette, id } = t;
  // Sur le site réel, la couleur d'accent vient du choix du client (défaut doré) — le
  // template "minimal" n'a pas d'accent propre distinct de sa couleur d'encre, donc on
  // simule ce défaut ici plutôt que d'utiliser tpl.palette.accent (invisible sur fond ink).
  const badge = id === 'minimal' ? '#C9A34A' : palette.accent;
  return (
    <div
      className={`w-64 overflow-hidden rounded-2xl shadow-xl ${className}`}
      style={{ backgroundColor: palette.background, border: `1px solid ${palette.border}` }}
    >
      <div className="flex flex-col items-center gap-2.5 px-6 py-9" style={{ backgroundColor: palette.ink }}>
        <TemplateOrnament id={id} color={badge} className="h-5 w-5" />
        <p className="text-center text-xl font-bold leading-tight" style={{ fontFamily: t.fonts.display, color: palette.surface }}>
          Camille <span style={{ color: badge }}>&amp; Jean</span>
        </p>
        <span
          className="rounded-full border px-3 py-1 text-[9px] tracking-[0.3em] uppercase"
          style={{ borderColor: badge, color: badge }}
        >
          Nous nous marions
        </span>
      </div>
      <div className="space-y-1.5 px-6 py-4">
        <div className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: palette.border }} />
        <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: palette.border }} />
      </div>
      <div
        className="flex items-center justify-between px-6 pb-4 text-[10px] font-medium"
        style={{ color: palette.muted, fontFamily: t.fonts.body }}
      >
        <span>{t.label}</span>
        <span style={{ color: badge }}>{t.tagline.split(',')[0]}</span>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Polices des 4 templates, pour que les aperçus ci-dessous s'affichent avec leur vraie typographie */}
      {TEMPLATE_DEFS.map((t) => (
        <link key={t.id} rel="stylesheet" href={t.googleFonts[0]} />
      ))}

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-display text-xl font-semibold">
          <Heart className="h-6 w-6 text-gold" fill="currentColor" />
          <span className="text-ink">EventCenter</span>
        </div>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-lg border border-gold bg-white px-4 py-2 text-sm font-medium text-gold-dark hover:bg-paper-cream"
        >
          <LogIn className="h-4 w-4" />
          Connexion
        </Link>
      </header>

      {/* Hero asymétrique : texte à gauche, aperçus réels du produit à droite */}
      <main className="mx-auto grid max-w-6xl gap-16 px-6 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dark">
            Sites de mariage sur mesure
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
            Le site de votre mariage, dans le style qui vous ressemble.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-secondary">
            Floral, royal, minimaliste ou héritage africain — quatre univers complets, chacun avec sa
            palette, ses polices et ses ornements. Vous choisissez le style ; le programme, les
            invités et les souvenirs suivent.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/login" className="btn-primary inline-flex px-6 py-3 text-base">
              <LogIn className="h-5 w-5" />
              Se connecter à mon espace
            </Link>
            <p className="text-xs text-ink-secondary">
              Avec le compte communiqué par votre organisateur.
            </p>
          </div>
        </div>

        <div className="relative flex justify-center py-6 lg:justify-end lg:py-0">
          <WeddingCardPreview t={TEMPLATE_DEFS[1]} className="hidden -rotate-6 sm:block lg:absolute lg:-left-6 lg:top-10" />
          <WeddingCardPreview t={TEMPLATE_DEFS[0]} className="relative z-10 rotate-3" />
        </div>
      </main>

      {/* Les 4 styles, avec leur vraie identité visuelle */}
      <section className="border-t border-borderlight bg-paper-cream/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">Quatre styles, un seul site</h2>
            <p className="mt-3 text-ink-secondary">
              Pas une couleur qu'on change sur un modèle unique : chaque style est pensé comme une
              identité à part entière.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATE_DEFS.map((t) => (
              <WeddingCardPreview key={t.id} t={t} className="w-full" />
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnalités, en liste alternée plutôt qu'en cartes identiques */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Toute l'organisation, au même endroit
          </h2>
          <div className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="flex gap-4">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gold/10 text-gold-dark">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-ink">
                    <span className="mr-2 text-sm font-normal text-gold-dark">0{i + 1}</span>
                    {f.title}
                  </p>
                  <p className="mt-1.5 text-sm text-ink-secondary">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bande finale contrastée (palette "royal") pour rompre la monotonie visuelle */}
      <section className="bg-[#101826] py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center">
          <Crown className="h-6 w-6" style={{ color: '#D4AF37' }} />
          <h2 className="max-w-xl font-display text-2xl font-bold text-[#F5F0E4] sm:text-3xl">
            Prêt à donner vie au site de votre mariage ?
          </h2>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-[#101826] transition hover:opacity-90"
            style={{ backgroundColor: '#D4AF37' }}
          >
            Se connecter
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-borderlight py-6 text-center text-sm text-ink-secondary">
        EventCenter © {new Date().getFullYear()} — Gestion d'évènements de mariage
      </footer>
    </div>
  );
}
