"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

type DialecticData = {
  thesis: { title: string; content: string; source_memos: string[] };
  antithesis: { title: string; content: string; source_memos: string[] };
  synthesis: { title: string; content: string; action_items: string[] };
};

export default function DialecticViz({ data }: { data: DialecticData }) {
  const [phase, setPhase] = useState(0); // 0=hidden, 1=thesis, 2=antithesis, 3=synthesis

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [data]);

  return (
    <div className="relative min-h-[500px] flex flex-col items-center justify-center gap-8 py-8">
      {/* Animated connecting lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 500">
        {/* Thesis to Synthesis */}
        <path
          d="M120 120 L200 350"
          stroke={phase >= 3 ? "#8b5cf6" : "transparent"}
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
          className="transition-all duration-1000"
          opacity={phase >= 3 ? 0.5 : 0}
        />
        {/* Antithesis to Synthesis */}
        <path
          d="M280 120 L200 350"
          stroke={phase >= 3 ? "#8b5cf6" : "transparent"}
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
          className="transition-all duration-1000"
          opacity={phase >= 3 ? 0.5 : 0}
        />
      </svg>

      {/* Top row: Thesis & Antithesis */}
      <div className="flex gap-6 w-full max-w-2xl relative z-10">
        {/* Thesis */}
        <div
          className={`flex-1 rounded-xl border p-4 transition-all duration-700 ${
            phase >= 1
              ? "opacity-100 translate-y-0 border-blue-500/30 bg-blue-500/5"
              : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-400 text-xs font-bold">正</span>
            </div>
            <div>
              <div className="text-xs text-blue-400 font-medium">テーゼ（正）</div>
              <div className="text-sm font-bold">{data.thesis.title}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{data.thesis.content}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {data.thesis.source_memos.map((m) => (
              <Badge key={m} variant="outline" className="text-[8px]">{m}</Badge>
            ))}
          </div>
        </div>

        {/* VS indicator */}
        <div className={`flex items-center transition-all duration-500 ${phase >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-0"}`}>
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
            <span className="text-destructive text-xs font-bold">VS</span>
          </div>
        </div>

        {/* Antithesis */}
        <div
          className={`flex-1 rounded-xl border p-4 transition-all duration-700 ${
            phase >= 2
              ? "opacity-100 translate-y-0 border-red-500/30 bg-red-500/5"
              : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-red-400 text-xs font-bold">反</span>
            </div>
            <div>
              <div className="text-xs text-red-400 font-medium">アンチテーゼ（反）</div>
              <div className="text-sm font-bold">{data.antithesis.title}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{data.antithesis.content}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {data.antithesis.source_memos.map((m) => (
              <Badge key={m} variant="outline" className="text-[8px]">{m}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Arrow down */}
      <div className={`transition-all duration-700 ${phase >= 3 ? "opacity-100 scale-100" : "opacity-0 scale-0"}`}>
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30 animate-bounce">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
          {/* Orbiting particles */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
            <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-blue-400" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s", animationDirection: "reverse" }}>
            <div className="absolute -bottom-1 left-1/2 w-2 h-2 rounded-full bg-red-400" />
          </div>
        </div>
      </div>

      {/* Synthesis */}
      <div
        className={`w-full max-w-2xl rounded-xl border-2 p-6 transition-all duration-1000 ${
          phase >= 3
            ? "opacity-100 translate-y-0 border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 shadow-xl shadow-violet-500/10"
            : "opacity-0 translate-y-12"
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">合</span>
          </div>
          <div>
            <div className="text-xs text-violet-400 font-medium">ジンテーゼ（合）= 止揚</div>
            <div className="text-lg font-bold">{data.synthesis.title}</div>
          </div>
        </div>
        <p className="text-sm text-foreground/80 mb-4">{data.synthesis.content}</p>
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">アクションアイテム</div>
          {data.synthesis.action_items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                <span className="text-violet-400 text-[10px]">{i + 1}</span>
              </div>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
