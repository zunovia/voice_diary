"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";

type ForcedData = {
  connections: Array<{
    memo_a: string;
    memo_b: string;
    bridge: string;
    idea: string;
    strength: number;
    domain: string;
  }>;
};

const DOMAIN_COLORS: Record<string, string> = {
  ビジネス: "#3b82f6",
  技術: "#22c55e",
  思想: "#a855f7",
  アクション: "#f97316",
};

export default function ForcedConnectionViz({ data }: { data: ForcedData }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [pulsingIndex, setPulsingIndex] = useState(-1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reveal connections one by one with lightning effect
  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      setPulsingIndex(count - 1);
      if (count >= data.connections.length) {
        clearInterval(interval);
        setTimeout(() => setPulsingIndex(-1), 1000);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [data]);

  // Lightning/particle effect on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }> = [];

    let animFrame: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Add new particles at connection points
      if (pulsingIndex >= 0 && pulsingIndex < data.connections.length) {
        const conn = data.connections[pulsingIndex];
        const color = DOMAIN_COLORS[conn.domain] || "#8b5cf6";
        for (let i = 0; i < 3; i++) {
          particles.push({
            x: canvas.offsetWidth / 2,
            y: 30 + pulsingIndex * 90,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1,
            color,
          });
        }
      }

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.life * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      animFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animFrame);
  }, [pulsingIndex, data]);

  return (
    <div className="relative space-y-3">
      {/* Particle canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ height: `${data.connections.length * 90 + 60}px` }}
      />

      {data.connections.map((conn, i) => {
        const color = DOMAIN_COLORS[conn.domain] || "#8b5cf6";
        return (
          <div
            key={i}
            className={`relative rounded-xl border p-4 transition-all duration-700 ${
              i < visibleCount
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-8"
            } ${pulsingIndex === i ? "ring-2 ring-offset-2 ring-offset-background" : ""}`}
            style={{
              borderColor: i < visibleCount ? `${color}40` : "transparent",
              ringColor: pulsingIndex === i ? color : undefined,
            }}
          >
            {/* Connection visualization */}
            <div className="flex items-center gap-2 mb-3">
              {/* Memo A */}
              <div className="flex-1 bg-card rounded-lg p-2 border border-border">
                <div className="text-xs font-medium truncate">{conn.memo_a}</div>
              </div>

              {/* Bridge with lightning */}
              <div className="flex flex-col items-center shrink-0">
                <svg className="w-16 h-8" viewBox="0 0 64 32">
                  {/* Lightning bolt path */}
                  <path
                    d={`M0,16 L20,16 L24,8 L28,24 L32,8 L36,24 L40,16 L64,16`}
                    stroke={color}
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={i < visibleCount ? "none" : "200"}
                    strokeDashoffset={i < visibleCount ? "0" : "200"}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {conn.bridge}
                </span>
              </div>

              {/* Memo B */}
              <div className="flex-1 bg-card rounded-lg p-2 border border-border">
                <div className="text-xs font-medium truncate">{conn.memo_b}</div>
              </div>
            </div>

            {/* Idea */}
            <p className="text-sm">{conn.idea}</p>

            {/* Strength meter */}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[8px]">{conn.domain}</Badge>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: i < visibleCount ? `${conn.strength * 100}%` : "0%",
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {Math.round(conn.strength * 100)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
