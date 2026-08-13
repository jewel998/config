import { useEffect, useRef } from "react";

/**
 * Interactive aurora + grid canvas background.
 * Inspired by React Bits' DotGrid and Aurora components.
 * Dots react to the cursor, connections glow on proximity.
 */
export default function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let animId: number;
    let W: number, H: number;
    let cols: number, rows: number;
    let dots: Array<{
      x: number;
      y: number;
      bx: number;
      by: number;
      vx: number;
      vy: number;
    }> = [];
    const mouse = { x: -9999, y: -9999 };
    const SP = 44;
    const MR = 150;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / SP) + 1;
      rows = Math.ceil(H / SP) + 1;
      dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dots.push({
            x: c * SP,
            y: r * SP,
            bx: c * SP,
            by: r * SP,
            vx: 0,
            vy: 0,
          });
        }
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);

      for (const d of dots) {
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MR) {
          const f = (1 - dist / MR) * 2.2;
          d.vx += (dx / dist) * f;
          d.vy += (dy / dist) * f;
        }
        d.vx += (d.bx - d.x) * 0.04;
        d.vy += (d.by - d.y) * 0.04;
        d.vx *= 0.88;
        d.vy *= 0.88;
        d.x += d.vx;
        d.y += d.vy;
      }

      // Connections
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        const ri = i + 1,
          bi = i + cols;
        if (ri < dots.length && (i + 1) % cols !== 0) drawLine(a, dots[ri]);
        if (bi < dots.length) drawLine(a, dots[bi]);
      }

      // Dots
      for (const d of dots) {
        const dist = Math.sqrt((d.x - mouse.x) ** 2 + (d.y - mouse.y) ** 2);
        const p = Math.max(0, 1 - dist / (MR * 1.3));
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1 + p * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.08 + p * 0.5})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(frame);
    }

    function drawLine(a: (typeof dots)[0], b: (typeof dots)[0]) {
      const dx = a.x - b.x,
        dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > SP * 1.8) return;
      const mx = (a.x + b.x) / 2,
        my = (a.y + b.y) / 2;
      const md = Math.sqrt((mx - mouse.x) ** 2 + (my - mouse.y) ** 2);
      const p = Math.max(0, 1 - md / MR);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(255,255,255,${0.025 + p * 0.18})`;
      ctx.lineWidth = 0.4 + p * 0.6;
      ctx.stroke();
    }

    function onMove(e: MouseEvent) {
      const r = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }

    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function onTouch(e: TouchEvent) {
      const r = canvas!.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - r.left;
      mouse.y = e.touches[0].clientY - r.top;
    }

    resize();
    frame();

    const parent = canvas.parentElement!;
    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);
    parent.addEventListener("touchmove", onTouch, { passive: true });
    parent.addEventListener("touchend", onLeave);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
      parent.removeEventListener("touchmove", onTouch);
      parent.removeEventListener("touchend", onLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
      }}
    />
  );
}
