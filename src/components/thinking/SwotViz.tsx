"use client";

import { useState, useEffect } from "react";

type SwotData = {
  subject: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  cross: { so: string; wo: string; st: string; wt: string };
};

export default function SwotViz({ data }: { data: SwotData }) {
  const [phase, setPhase] = useState(0);
  const [showCross, setShowCross] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [data]);

  const quadrants = [
    { key: "S", label: "強み (Strengths)", items: data.strengths, color: "#22c55e", bg: "#22c55e10", phase: 1 },
    { key: "W", label: "弱み (Weaknesses)", items: data.weaknesses, color: "#f97316", bg: "#f9731610", phase: 2 },
    { key: "O", label: "機会 (Opportunities)", items: data.opportunities, color: "#3b82f6", bg: "#3b82f610", phase: 3 },
    { key: "T", label: "脅威 (Threats)", items: data.threats, color: "#ef4444", bg: "#ef444410", phase: 4 },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-xs text-muted-foreground">分析対象</div>
        <div className="text-lg font-bold">{data.subject}</div>
      </div>

      {/* SWOT 2x2 Matrix */}
      <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
        {/* Labels */}
        <div className="col-span-2 grid grid-cols-3 text-center text-[10px] text-muted-foreground">
          <div />
          <div className="col-span-1">内部要因</div>
          <div />
        </div>

        {quadrants.map((q) => (
          <div
            key={q.key}
            className={`rounded-xl border p-3 transition-all duration-700 ${
              phase >= q.phase ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ borderColor: `${q.color}30`, backgroundColor: q.bg }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: `${q.color}20`, color: q.color }}
              >
                {q.key}
              </div>
              <span className="text-[10px] font-medium" style={{ color: q.color }}>
                {q.label}
              </span>
            </div>
            <ul className="space-y-1">
              {q.items.map((item, i) => (
                <li
                  key={i}
                  className="text-xs flex items-start gap-1.5"
                  style={{ transitionDelay: `${i * 100 + q.phase * 200}ms` }}
                >
                  <span style={{ color: q.color }}>-</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Cross SWOT Button */}
      <div className="text-center">
        <button
          onClick={() => setShowCross(!showCross)}
          className="text-xs text-primary hover:underline"
        >
          {showCross ? "クロスSWOTを閉じる" : "クロスSWOT戦略を表示 →"}
        </button>
      </div>

      {/* Cross SWOT */}
      {showCross && (
        <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4">
          {[
            { label: "SO戦略（強み×機会）", text: data.cross.so, colors: ["#22c55e", "#3b82f6"] },
            { label: "WO戦略（弱み×機会）", text: data.cross.wo, colors: ["#f97316", "#3b82f6"] },
            { label: "ST戦略（強み×脅威）", text: data.cross.st, colors: ["#22c55e", "#ef4444"] },
            { label: "WT戦略（弱み×脅威）", text: data.cross.wt, colors: ["#f97316", "#ef4444"] },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-border p-3"
              style={{
                background: `linear-gradient(135deg, ${s.colors[0]}08, ${s.colors[1]}08)`,
              }}
            >
              <div className="text-[10px] font-medium text-muted-foreground mb-1">{s.label}</div>
              <p className="text-xs">{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
