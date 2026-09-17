/**
 * Dimensions recommandées pour les visuels du site, par usage et par
 * template (certains templates cadrent ou n'affichent pas certaines
 * images différemment).
 */
export function coverImageHint(mode: 'mobile' | 'desktop'): string {
  return mode === 'mobile'
    ? 'Format portrait — 1080×1350 px recommandé (plein écran sur mobile)'
    : 'Format paysage — 1920×1080 px recommandé (plein écran sur grand écran)';
}

export function programStepImageHint(templateId: string): string {
  return templateId === 'africain'
    ? 'Visible sur ce thème (carte en quinconce) — 800×450 px recommandé'
    : "Non affichée sur ce thème actuellement — utile si vous passez au thème « Héritage africain »";
}

export function logoImageHint(): string {
  return 'Format carré, 400×400 px minimum — affiché en médaillon à côté des noms';
}

export function galleryImageHint(): string {
  return 'Format libre — 1600 px de large conseillé pour un bon rendu sur grand écran';
}

export function splashMediaHint(): string {
  return 'Format portrait plein écran — 1080×1920 px recommandé · GIF, WebP (animé ou non) ou vidéo MP4/WebM, 8 s max, 15 Mo max';
}
