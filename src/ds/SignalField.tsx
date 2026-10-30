import { useEffect, useRef } from 'react';

// "Signal lattice": the AI motif of the identity (bench-04). A dot grid on the night canvas;
// coral pulses travel along the grid lines, and some of the nodes they reach light up in mint,
// the "verified answer". Colours come from the workspace tokens (CSS custom properties).
// Decorative: hidden from assistive technology. Static frame under reduced motion, paused when
// off-screen or when the host asks (`paused`).

type Pulse = { x: number; y: number; dx: number; dy: number; trail: [number, number][]; life: number };

export function SignalField({ paused = false, still = false, density = 1, className = '' }: { paused?: boolean; still?: boolean; density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = still || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const css = getComputedStyle(canvas);
    const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const signal = read('--ds-color-signal', '#f8485e');
    const evidence = read('--ds-color-surface-accent', '#d7ebe6');
    const dot = read('--ds-color-border-on-night', '#6b6b68');
    const STEP = 28;
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let pulses: Pulse[] = [];
    let lit: { x: number; y: number; t: number }[] = [];
    let raf = 0;
    let visible = true;
    let last = 0;
    // Deterministic generator: the static frame is the same on every load.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    const spawn = (): Pulse => {
      const horizontal = rnd() > 0.5;
      const x = Math.floor(rnd() * cols) * STEP;
      const y = Math.floor(rnd() * rows) * STEP;
      const dir = rnd() > 0.5 ? 1 : -1;
      return { x, y, dx: horizontal ? dir : 0, dy: horizontal ? 0 : dir, trail: [], life: 40 + Math.floor(rnd() * 60) };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / STEP) + 1;
      rows = Math.ceil(h / STEP) + 1;
      seed = 7;
      const n = Math.max(3, Math.round(((w * h) / 60000) * density));
      pulses = Array.from({ length: n }, spawn);
      lit = [];
      if (reduce) {
        // Advance once so the still frame shows trails and a few answers.
        for (let i = 0; i < 26; i++) tick();
      }
      draw();
    };

    const tick = () => {
      for (const p of pulses) {
        p.trail.push([p.x, p.y]);
        if (p.trail.length > 9) p.trail.shift();
        p.x += p.dx * STEP;
        p.y += p.dy * STEP;
        p.life -= 1;
        if (rnd() < 0.18) {
          // turn at a node
          if (p.dx) {
            p.dy = rnd() > 0.5 ? 1 : -1;
            p.dx = 0;
          } else {
            p.dx = rnd() > 0.5 ? 1 : -1;
            p.dy = 0;
          }
        }
        if (rnd() < 0.05) lit.push({ x: p.x, y: p.y, t: 1 });
        if (p.life <= 0 || p.x < -STEP || p.y < -STEP || p.x > w + STEP || p.y > h + STEP) Object.assign(p, spawn());
      }
      lit = lit.map((l) => ({ ...l, t: l.t - 0.025 })).filter((l) => l.t > 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = dot;
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) ctx.fillRect(i * STEP - 0.75, j * STEP - 0.75, 1.5, 1.5);
      ctx.globalAlpha = 1;
      for (const l of lit) {
        ctx.globalAlpha = Math.max(0, l.t);
        ctx.fillStyle = evidence;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = evidence;
        ctx.globalAlpha = Math.max(0, l.t * 0.35);
        ctx.beginPath();
        ctx.arc(l.x, l.y, 10 + (1 - l.t) * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const p of pulses) {
        const pts = [...p.trail, [p.x, p.y] as [number, number]];
        for (let i = 1; i < pts.length; i++) {
          ctx.globalAlpha = (i / pts.length) * 0.9;
          ctx.strokeStyle = signal;
          ctx.beginPath();
          ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
          ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = signal;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (pausedRef.current || !visible) return;
      if (now - last < 110) return; // one grid step every 110 ms: calm, not frantic
      last = now;
      tick();
      draw();
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((es) => {
            visible = es.some((e) => e.isIntersecting);
          })
        : null;
    io?.observe(canvas);
    if (!reduce) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
    };
  }, [density, still]);

  return <canvas ref={ref} className={`ds-signal ${className}`} aria-hidden />;
}
