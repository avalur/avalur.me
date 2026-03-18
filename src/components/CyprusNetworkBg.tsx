import { useEffect, useRef } from "react";

interface Props {
  darkRatio: number; // 0 = fully light, 1 = fully dark
  nodeCount?: number;
}

interface Palette {
  bg0: [number, number, number];
  bg1: [number, number, number];
  bg2: [number, number, number];
  line: [number, number, number];
  node: [number, number, number];
  glow: [number, number, number];
  aura: [number, number, number];
}

const DAY: Palette = {
  bg0: [22, 58, 110],
  bg1: [35, 90, 155],
  bg2: [55, 125, 195],
  line: [90, 155, 215],
  node: [175, 210, 248],
  glow: [255, 225, 140],
  aura: [255, 210, 120],
};

const NIGHT: Palette = {
  bg0: [26, 16, 64],
  bg1: [45, 27, 105],
  bg2: [74, 32, 128],
  line: [140, 120, 220],
  node: [200, 190, 255],
  glow: [255, 255, 255],
  aura: [180, 160, 255],
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpC(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function lerpPalette(a: Palette, b: Palette, t: number): Palette {
  return {
    bg0: lerpC(a.bg0, b.bg0, t),
    bg1: lerpC(a.bg1, b.bg1, t),
    bg2: lerpC(a.bg2, b.bg2, t),
    line: lerpC(a.line, b.line, t),
    node: lerpC(a.node, b.node, t),
    glow: lerpC(a.glow, b.glow, t),
    aura: lerpC(a.aura, b.aura, t),
  };
}

function rgb(c: [number, number, number], a?: number) {
  if (a !== undefined) return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}

interface Node {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseR: number;
}

const DEPTH = 600;
const CONNECT_DIST = 100;
const BASE_SPEED = 0.25;
const MOUSE_RADIUS = 160;

export default function CyprusNetworkBg({
  darkRatio,
  nodeCount = 250,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ratioRef = useRef(darkRatio);
  const currentRef = useRef(darkRatio);

  // Keep ratioRef in sync with prop
  ratioRef.current = darkRatio;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;
    const mouse = { x: -9999, y: -9999 };
    const nodes: Node[] = [];

    function resize() {
      const rect = canvas!.parentElement!.getBoundingClientRect();
      width = canvas!.width = rect.width;
      height = canvas!.height = rect.height;
    }

    function initNodes() {
      nodes.length = 0;
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * DEPTH,
          vx: (Math.random() - 0.5) * BASE_SPEED,
          vy: (Math.random() - 0.5) * BASE_SPEED,
          vz: (Math.random() - 0.5) * BASE_SPEED * 0.5,
          baseR: 1.2 + Math.random() * 1.3,
        });
      }
    }

    function project(n: Node) {
      const scale = DEPTH / (DEPTH + n.z);
      return {
        sx: width / 2 + (n.x - width / 2) * scale,
        sy: height / 2 + (n.y - height / 2) * scale,
        scale,
      };
    }

    function draw() {
      // Smoothly animate toward target ratio
      const target = ratioRef.current;
      currentRef.current += (target - currentRef.current) * 0.04;
      const t = currentRef.current;
      const p = lerpPalette(DAY, NIGHT, t);

      // Background
      const grad = ctx!.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, rgb(p.bg0));
      grad.addColorStop(0.5, rgb(p.bg1));
      grad.addColorStop(1, rgb(p.bg2));
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, width, height);

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        if (n.z < 0 || n.z > DEPTH) n.vz *= -1;
      }

      const projected = nodes.map((n) => ({ ...project(n), node: n }));

      // Lines
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i];
          const b = projected[j];
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const opacity =
              (1 - dist / CONNECT_DIST) * 0.3 * Math.min(a.scale, b.scale);
            const mx = (a.sx + b.sx) / 2;
            const my = (a.sy + b.sy) / 2;
            const mdist = Math.sqrt(
              (mx - mouse.x) ** 2 + (my - mouse.y) ** 2,
            );
            const glow = mdist < MOUSE_RADIUS ? 1 - mdist / MOUSE_RADIUS : 0;
            const c = lerpC(p.line, p.glow, glow);
            ctx!.strokeStyle = rgb(c, opacity + glow * 0.4);
            ctx!.lineWidth = 0.5 + glow * 1.5;
            ctx!.beginPath();
            ctx!.moveTo(a.sx, a.sy);
            ctx!.lineTo(b.sx, b.sy);
            ctx!.stroke();
          }
        }
      }

      // Nodes
      for (const pt of projected) {
        const mdist = Math.sqrt(
          (pt.sx - mouse.x) ** 2 + (pt.sy - mouse.y) ** 2,
        );
        const glow =
          mdist < MOUSE_RADIUS ? 1 - mdist / MOUSE_RADIUS : 0;
        const r = pt.node.baseR * pt.scale * (1 + glow * 1.5);
        const alpha = (0.4 + glow * 0.6) * pt.scale;

        if (glow > 0.1) {
          ctx!.beginPath();
          ctx!.arc(pt.sx, pt.sy, r * 3, 0, Math.PI * 2);
          ctx!.fillStyle = rgb(p.aura, glow * 0.12);
          ctx!.fill();
        }

        const c = lerpC(p.node, p.glow, glow);
        ctx!.beginPath();
        ctx!.arc(pt.sx, pt.sy, r, 0, Math.PI * 2);
        ctx!.fillStyle = rgb(c, alpha);
        ctx!.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    initNodes();
    animId = requestAnimationFrame(draw);

    const handleResize = () => {
      resize();
      initNodes();
    };
    window.addEventListener("resize", handleResize);

    const parent = canvas.parentElement!;
    const handleMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    parent.addEventListener("mousemove", handleMove);
    parent.addEventListener("mouseleave", handleLeave);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      parent.removeEventListener("mousemove", handleMove);
      parent.removeEventListener("mouseleave", handleLeave);
    };
  }, [nodeCount]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}
