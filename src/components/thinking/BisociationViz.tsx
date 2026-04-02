"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

type BisociationData = {
  frame_a: { name: string; domain: string; concepts: string[]; source_memos: string[] };
  frame_b: { name: string; domain: string; concepts: string[]; source_memos: string[] };
  intersections: Array<{
    concept_a: string;
    concept_b: string;
    insight: string;
    potential: string;
  }>;
};

export default function BisociationViz({ data }: { data: BisociationData }) {
  const [phase, setPhase] = useState(0);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [activeIntersection, setActiveIntersection] = useState(-1);

  useEffect(() => {
    // Phase 1: Show frames
    const t1 = setTimeout(() => setPhase(1), 300);
    // Phase 2: Start merging
    const t2 = setTimeout(() => setPhase(2), 1500);
    // Animate merge
    const t3 = setTimeout(() => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 2;
        setMergeProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setPhase(3);
          // Show intersections one by one
          data.intersections.forEach((_, i) => {
            setTimeout(() => setActiveIntersection(i), i * 600);
          });
        }
      }, 30);
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [data]);

  const frameAOffset = phase >= 2 ? Math.min(mergeProgress * 0.4, 40) : 0;
  const frameBOffset = phase >= 2 ? Math.min(mergeProgress * 0.4, 40) : 0;

  return (
    <div className="space-y-6 py-4">
      {/* Two Frames Animation */}
      <div className="relative h-[300px] overflow-hidden">
        {/* Frame A - comes from left */}
        <div
          className={`absolute top-4 w-[45%] h-[280px] rounded-2xl border-2 transition-all duration-700 ${
            phase >= 1 ? "opacity-100" : "opacity-0 -translate-x-20"
          }`}
          style={{
            left: `${frameAOffset}%`,
            borderColor: "#3b82f660",
            background: "radial-gradient(ellipse at 70% 50%, #3b82f610 0%, transparent 70%)",
          }}
        >
          <div className="p-4">
            <div className="text-xs text-blue-400 font-medium mb-1">フレームA</div>
            <div className="text-sm font-bold mb-1">{data.frame_a.name}</div>
            <Badge variant="outline" className="text-[8px] mb-3">{data.frame_a.domain}</Badge>
            <div className="space-y-2">
              {data.frame_a.concepts.map((c, i) => (
                <div
                  key={c}
                  className="flex items-center gap-2 text-xs transition-all"
                  style={{ transitionDelay: `${i * 200}ms` }}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Frame B - comes from right */}
        <div
          className={`absolute top-4 w-[45%] h-[280px] rounded-2xl border-2 transition-all duration-700 ${
            phase >= 1 ? "opacity-100" : "opacity-0 translate-x-20"
          }`}
          style={{
            right: `${frameBOffset}%`,
            borderColor: "#f9731660",
            background: "radial-gradient(ellipse at 30% 50%, #f9731610 0%, transparent 70%)",
          }}
        >
          <div className="p-4">
            <div className="text-xs text-orange-400 font-medium mb-1">フレームB</div>
            <div className="text-sm font-bold mb-1">{data.frame_b.name}</div>
            <Badge variant="outline" className="text-[8px] mb-3">{data.frame_b.domain}</Badge>
            <div className="space-y-2">
              {data.frame_b.concepts.map((c, i) => (
                <div
                  key={c}
                  className="flex items-center gap-2 text-xs transition-all"
                  style={{ transitionDelay: `${i * 200}ms` }}
                >
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Intersection Glow */}
        {phase >= 2 && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-1000"
            style={{
              width: `${mergeProgress * 1.5}px`,
              height: `${mergeProgress * 1.5}px`,
              background: "radial-gradient(circle, #a855f740 0%, #a855f710 50%, transparent 70%)",
              boxShadow: phase >= 3 ? "0 0 60px #a855f730" : "none",
            }}
          />
        )}

        {/* Intersection label */}
        {phase >= 3 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center animate-in fade-in zoom-in">
            <div className="w-14 h-14 rounded-full bg-violet-500/20 border-2 border-violet-500/50 flex items-center justify-center mx-auto mb-1">
              <span className="text-violet-400 text-lg font-bold">!</span>
            </div>
            <div className="text-[10px] text-violet-400">交差点</div>
          </div>
        )}
      </div>

      {/* Intersections */}
      <div className="space-y-3">
        {data.intersections.map((inter, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 transition-all duration-500 ${
              i <= activeIntersection
                ? "opacity-100 translate-y-0 border-violet-500/30 bg-violet-500/5"
                : "opacity-0 translate-y-4"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                {inter.concept_a}
              </span>
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-300">
                {inter.concept_b}
              </span>
              <Badge variant="outline" className="text-[8px] ml-auto">{inter.potential}</Badge>
            </div>
            <p className="text-sm">{inter.insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
