import { useEffect, useRef } from "react";

interface Props {
  nodeCount?: number;
  className?: string;
}

const DEPTH = 400;
const CONNECT_DIST = 100;
const BASE_SPEED = 0.2;

interface Node {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  baseR: number;
}

interface Palette {
  bg: [string, string, string];
  line: string;
  node: string;
}

const DARK_PALETTE: Palette = {
  bg: ["rgb(26, 16, 64)", "rgb(45, 27, 105)", "rgb(74, 32, 128)"],
  line: "140,120,220",
  node: "200,190,255",
};

const LIGHT_PALETTE: Palette = {
  bg: ["rgb(22, 58, 110)", "rgb(35, 90, 155)", "rgb(55, 125, 195)"],
  line: "90,155,215",
  node: "175,210,248",
};

export default function NetworkCanvas({ nodeCount = 15, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;
    const nodes: Node[] = [];

    function getTheme(): string {
      return document.documentElement.getAttribute("data-theme") || "dark";
    }

    let palette = getTheme() === "light" ? LIGHT_PALETTE : DARK_PALETTE;

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      palette = getTheme() === "light" ? LIGHT_PALETTE : DARK_PALETTE;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

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
          baseR: 1.5 + Math.random() * 1.5,
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
      const p = palette;
      const grad = ctx!.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, p.bg[0]);
      grad.addColorStop(0.5, p.bg[1]);
      grad.addColorStop(1, p.bg[2]);
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, width, height);

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy; n.z += n.vz;
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
            const opacity = (1 - dist / CONNECT_DIST) * 0.5 * Math.min(a.scale, b.scale);
            ctx!.strokeStyle = `rgba(${p.line},${opacity})`;
            ctx!.lineWidth = 0.8;
            ctx!.beginPath();
            ctx!.moveTo(a.sx, a.sy);
            ctx!.lineTo(b.sx, b.sy);
            ctx!.stroke();
          }
        }
      }

      // Nodes
      for (const pt of projected) {
        const r = pt.node.baseR * pt.scale;
        const alpha = 0.6 * pt.scale;
        ctx!.beginPath();
        ctx!.arc(pt.sx, pt.sy, r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.node},${alpha})`;
        ctx!.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    initNodes();
    animId = requestAnimationFrame(draw);

    const handleResize = () => { resize(); initNodes(); };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [nodeCount]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
