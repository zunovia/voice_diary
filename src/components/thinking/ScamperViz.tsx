"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";

type ScamperData = {
  core_idea: string;
  scamper: Array<{ method: string; question: string; idea: string }>;
};

const SCAMPER_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6",
];

export default function ScamperViz({ data }: { data: ScamperData }) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [rotation, setRotation] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-rotation animation
  useEffect(() => {
    if (!autoRotate) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    let idx = 0;
    intervalRef.current = setInterval(() => {
      setActiveIndex(idx);
      setRotation(idx * (360 / 7));
      idx++;
      if (idx >= 7) {
        idx = 0;
        // Continue rotating
      }
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRotate]);

  const handleClick = (i: number) => {
    setAutoRotate(false);
    setActiveIndex(i);
    setRotation(i * (360 / 7));
  };

  return (
    <div className="space-y-6">
      {/* Core Idea */}
      <div className="text-center">
        <div className="text-xs text-muted-foreground mb-1">核心アイデア</div>
        <div className="text-lg font-bold">{data.core_idea}</div>
      </div>

      {/* Rotating Wheel */}
      <div className="relative w-full aspect-square max-w-[400px] mx-auto">
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center z-10">
          <span className="text-xs font-bold text-primary">SCAMPER</span>
        </div>

        {/* Rotating segments */}
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out"
          style={{ transform: `rotate(-${rotation}deg)` }}
        >
          {data.scamper.map((item, i) => {
            const angle = (i * 360) / 7 - 90;
            const rad = (angle * Math.PI) / 180;
            const radius = 42; // % from center
            const x = 50 + radius * Math.cos(rad);
            const y = 50 + radius * Math.sin(rad);

            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                className={`absolute w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                  activeIndex === i ? "scale-125 shadow-lg" : "scale-100"
                }`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  backgroundColor: `${SCAMPER_COLORS[i]}20`,
                  borderColor: activeIndex === i ? SCAMPER_COLORS[i] : `${SCAMPER_COLORS[i]}40`,
                  boxShadow: activeIndex === i ? `0 0 20px ${SCAMPER_COLORS[i]}40` : "none",
                }}
              >
                <span className="text-[10px] font-bold" style={{ color: SCAMPER_COLORS[i] }}>
                  {item.method.charAt(0)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Connection lines (pulsing) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {data.scamper.map((_, i) => {
            const angle = (i * 360) / 7 - 90 - rotation;
            const rad = (angle * Math.PI) / 180;
            const innerR = 12;
            const outerR = 38;
            return (
              <line
                key={i}
                x1={`${50 + innerR * Math.cos(rad)}%`}
                y1={`${50 + innerR * Math.sin(rad)}%`}
                x2={`${50 + outerR * Math.cos(rad)}%`}
                y2={`${50 + outerR * Math.sin(rad)}%`}
                stroke={activeIndex === i ? SCAMPER_COLORS[i] : "#374151"}
                strokeWidth={activeIndex === i ? 2 : 1}
                strokeDasharray="4,4"
                opacity={activeIndex === i ? 0.8 : 0.2}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
      </div>

      {/* Active Method Detail */}
      {activeIndex >= 0 && data.scamper[activeIndex] && (
        <Card
          className="transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
          style={{ borderColor: `${SCAMPER_COLORS[activeIndex]}40` }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${SCAMPER_COLORS[activeIndex]}20` }}
              >
                <span className="text-xs font-bold" style={{ color: SCAMPER_COLORS[activeIndex] }}>
                  {data.scamper[activeIndex].method.charAt(0)}
                </span>
              </div>
              <div className="text-sm font-bold">{data.scamper[activeIndex].method}</div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {data.scamper[activeIndex].question}
            </p>
            <p className="text-sm">{data.scamper[activeIndex].idea}</p>
          </CardContent>
        </Card>
      )}

      {/* Auto-rotate toggle */}
      <div className="text-center">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          {autoRotate ? "自動回転中 (クリックで停止)" : "自動回転オフ (クリックで開始)"}
        </button>
      </div>
    </div>
  );
}
