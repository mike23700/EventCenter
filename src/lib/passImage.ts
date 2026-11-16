import type { TemplateDef } from './templates';

/**
 * Génère l'image PNG du pass d'invitation (à enregistrer dans la galerie du
 * téléphone ou à partager), dessinée directement sur un <canvas> : pas de
 * dépendance de capture d'écran, rendu identique sur tous les appareils.
 */
export async function renderPassImage(opts: {
  tpl: TemplateDef;
  accent: string;
  couple: string;
  dateLabel?: string;
  guestName: string;
  persons: number;
  tables: string[];
  reference: string;
  qrDataUrl: string;
}): Promise<Blob> {
  const { tpl, accent, couple, dateLabel, guestName, persons, tables, reference, qrDataUrl } = opts;
  const { palette, fonts } = tpl;
  const W = 1080;
  const H = 1680;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');

  // Les polices du template doivent être chargées avant de dessiner.
  try {
    await document.fonts?.ready;
  } catch {
    /* ignore */
  }

  // Fond + cadre double
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  roundRect(ctx, 40, 40, W - 80, H - 80, 36);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  roundRect(ctx, 62, 62, W - 124, H - 124, 26);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // En-tête
  ctx.fillStyle = accent;
  ctx.font = `600 30px ${fonts.body}`;
  spaced(ctx, "PASS D'INVITATION", W / 2, 170, 8);

  ctx.fillStyle = palette.ink;
  ctx.font = `96px ${fonts.display}`;
  fitText(ctx, couple, W / 2, 290, W - 200, 96, fonts.display);

  if (dateLabel) {
    ctx.fillStyle = palette.muted;
    ctx.font = `34px ${fonts.body}`;
    ctx.fillText(dateLabel, W / 2, 352);
  }

  // Séparateur
  ctx.fillStyle = accent;
  ctx.fillRect(W / 2 - 60, 392, 120, 3);

  // Invité
  ctx.fillStyle = palette.muted;
  ctx.font = `30px ${fonts.body}`;
  ctx.fillText('Invité(e)', W / 2, 470);
  ctx.fillStyle = palette.ink;
  ctx.font = `600 58px ${fonts.body}`;
  fitText(ctx, guestName, W / 2, 540, W - 200, 58, fonts.body, '600 ');

  // QR sur carte blanche
  const qr = await loadImage(qrDataUrl);
  const qrSize = 560;
  const qrX = (W - qrSize) / 2;
  const qrY = 600;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 28);
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);

  // Pavés Personnes / Table / Réf.
  const boxes: [string, string][] = [
    ['PERSONNES', String(persons)],
    ['TABLE', tables.length ? tables.join(' · ') : '—'],
    ['RÉF.', reference],
  ];
  const gap = 24;
  const bw = (W - 160 - gap * 2) / 3;
  const by = 1270;
  boxes.forEach(([label, value], i) => {
    const bx = 80 + i * (bw + gap);
    ctx.fillStyle = palette.surface;
    roundRect(ctx, bx, by, bw, 150, 22);
    ctx.fill();
    ctx.strokeStyle = palette.border;
    ctx.stroke();
    ctx.fillStyle = palette.muted;
    ctx.font = `600 24px ${fonts.body}`;
    spaced(ctx, label, bx + bw / 2, by + 52, 4);
    ctx.fillStyle = palette.ink;
    ctx.font = `600 46px ${fonts.body}`;
    fitText(ctx, value, bx + bw / 2, by + 115, bw - 30, 46, fonts.body, '600 ');
  });

  // Pied
  ctx.fillStyle = palette.muted;
  ctx.font = `28px ${fonts.body}`;
  ctx.fillText("À présenter à l'entrée — imprimé ou sur votre téléphone", W / 2, 1515);
  ctx.fillStyle = accent;
  ctx.font = `600 24px ${fonts.body}`;
  spaced(ctx, 'EVENTS ETAN', W / 2, 1580, 6);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export impossible'))), 'image/png'),
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Texte centré réduit jusqu'à tenir dans maxWidth. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  family: string,
  weight = '',
) {
  let s = size;
  ctx.font = `${weight}${s}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && s > 18) {
    s -= 2;
    ctx.font = `${weight}${s}px ${family}`;
  }
  ctx.fillText(text, x, y);
}

/** Texte centré avec espacement des lettres (letter-spacing). */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}
