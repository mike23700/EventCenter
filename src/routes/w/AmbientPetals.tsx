import { useEffect, useRef } from 'react';
import type { AmbientKind } from '../../lib/templates';

/**
 * Animation d'ambiance (pétales, roses, cœurs, paillettes, papillons) qui tombent
 * doucement sur tout le site. Dessinée sur un <canvas> : légère pour le
 * téléphone, en pause quand l'onglet est caché, coupée si l'utilisateur a
 * demandé à réduire les animations (réglage d'accessibilité du téléphone).
 */

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
  phase: number;
  rot: number;
  spin: number;
  color: string;
  alpha: number;
}

export default function AmbientPetals({ kind, colors }: { kind: AmbientKind; colors: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Clé stable : la liste de couleurs est recréée à chaque rendu par l'appelant.
  const colorKey = colors.join('|');

  useEffect(() => {
    const colors = colorKey ? colorKey.split('|') : [];
    if (kind === 'none' || colors.length === 0) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = Math.round(Math.min(26, Math.max(10, w / 45)) * (kind === 'gold' ? 1.4 : 1));
    const base = kind === 'roses' ? 13 : kind === 'gold' ? 3 : kind === 'hearts' ? 9 : kind === 'butterflies' ? 11 : 10;
    const make = (initial: boolean): Particle => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : -20 - Math.random() * 60,
      size: base * (0.6 + Math.random() * 0.8),
      speed: 0.25 + Math.random() * 0.55,
      sway: 0.4 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.02,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.55 + Math.random() * 0.4,
    });
    const parts = Array.from({ length: count }, () => make(true));

    const drawPetal = (p: Particle, roseShape: boolean) => {
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * (roseShape ? 1.05 : 0.8), -s * 0.7, s * (roseShape ? 0.9 : 0.7), s * 0.6, 0, s);
      ctx.bezierCurveTo(-s * (roseShape ? 0.9 : 0.7), s * 0.6, -s * (roseShape ? 1.05 : 0.8), -s * 0.7, 0, -s);
      const g = ctx.createLinearGradient(0, -s, 0, s);
      g.addColorStop(0, p.color);
      g.addColorStop(1, roseShape ? shade(p.color, -28) : shade(p.color, 18));
      ctx.fillStyle = g;
      ctx.fill();
      if (roseShape) {
        ctx.strokeStyle = shade(p.color, -40);
        ctx.globalAlpha *= 0.35;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.6);
        ctx.quadraticCurveTo(s * 0.15, 0, 0, s * 0.7);
        ctx.stroke();
      }
    };
    const drawHeart = (p: Particle) => {
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.45, -s, 0, -s * 0.45);
      ctx.bezierCurveTo(s * 0.45, -s, s, -s * 0.3, 0, s * 0.35);
      ctx.fillStyle = p.color;
      ctx.fill();
    };
    // Papillon : deux paires d'ailes (haut plus grandes) autour d'un corps fin.
    const drawButterfly = (p: Particle) => {
      const s = p.size;
      const wing = (dir: 1 | -1) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(dir * s * 0.9, -s * 1.3, dir * s * 1.6, -s * 0.5, dir * s * 0.35, -s * 0.05);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(dir * s * 1.05, s * 0.2, dir * s * 0.8, s * 1.05, dir * s * 0.15, s * 0.35);
        ctx.fill();
      };
      const g = ctx.createLinearGradient(-s, 0, s, 0);
      g.addColorStop(0, shade(p.color, 25));
      g.addColorStop(0.5, p.color);
      g.addColorStop(1, shade(p.color, 25));
      ctx.fillStyle = g;
      wing(1);
      wing(-1);
      ctx.strokeStyle = shade(p.color, -60);
      ctx.lineWidth = Math.max(0.8, s * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.45);
      ctx.lineTo(0, s * 0.45);
      ctx.stroke();
    };
    const drawSpark = (p: Particle) => {
      const s = p.size;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        ctx.lineTo(Math.cos(a) * s * 1.6, Math.sin(a) * s * 1.6);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * s * 0.45, Math.sin(a + Math.PI / 4) * s * 0.45);
      }
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
    };

    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        // Les papillons volettent : chute lente, grands écarts de côté.
        const fly = kind === 'butterflies';
        p.y += fly ? p.speed * 0.55 : p.speed;
        p.x += Math.sin(t * (fly ? 0.02 : 0.01) + p.phase) * p.sway * (fly ? 0.9 : 0.35);
        p.rot += p.spin + Math.sin(t * 0.008 + p.phase) * 0.004;
        if (p.y > h + 30 || p.x < -40 || p.x > w + 40) parts[i] = make(false);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = kind === 'gold' ? p.alpha * (0.5 + 0.5 * Math.abs(Math.sin(t * 0.03 + p.phase))) : p.alpha;
        if (kind === 'hearts') drawHeart(p);
        else if (kind === 'gold') drawSpark(p);
        else if (kind === 'butterflies') {
          // battement d'ailes
          ctx.rotate(Math.sin(t * 0.02 + p.phase) * 0.3 - p.rot);
          ctx.scale(0.25 + 0.75 * Math.abs(Math.cos(t * 0.16 + p.phase)), 1);
          drawButterfly(p);
        }
        else {
          // effet 3D : le pétale « bascule » en tombant
          ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(t * 0.012 + p.phase)));
          drawPetal(p, kind === 'roses');
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [kind, colorKey]);

  if (kind === 'none') return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[25]" />;
}

/** Éclaircit (+) ou assombrit (−) une couleur hexadécimale. */
function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  if (Number.isNaN(n)) return hex;
  const c = (v: number) => Math.max(0, Math.min(255, v + amount));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
