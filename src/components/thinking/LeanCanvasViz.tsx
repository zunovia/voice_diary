"use client";

import { useState, useEffect } from "react";

type LeanData = {
  title: string;
  problem: string[];
  solution: string[];
  unique_value: string;
  unfair_advantage: string;
  customer_segments: string[];
  key_metrics: string[];
  channels: string[];
  cost_structure: string[];
  revenue_streams: string[];
};

const BLOCKS = [
  { key: "problem", label: "課題", color: "#ef4444", row: "1/3", col: "1/2" },
  { key: "solution", label: "解決策", color: "#22c55e", row: "1/2", col: "2/3" },
  { key: "key_metrics", label: "主要指標", color: "#06b6d4", row: "2/3", col: "2/3" },
  { key: "unique_value", label: "独自の価値提案", color: "#8b5cf6", row: "1/3", col: "3/4", single: true },
  { key: "unfair_advantage", label: "圧倒的な優位性", color: "#eab308", row: "1/2", col: "4/5", single: true },
  { key: "channels", label: "チャネル", color: "#f97316", row: "2/3", col: "4/5" },
  { key: "customer_segments", label: "顧客セグメント", color: "#ec4899", row: "1/3", col: "5/6" },
  { key: "cost_structure", label: "コスト構造", color: "#ef4444", row: "3/4", col: "1/4" },
  { key: "revenue_streams", label: "収益の流れ", color: "#22c55e", row: "3/4", col: "4/6" },
];

export default function LeanCanvasViz({ data }: { data: LeanData }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= 9) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-xs text-muted-foreground">Lean Canvas</div>
        <div className="text-lg font-bold">{data.title}</div>
      </div>

      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: "repeat(5, 1fr)",
          gridTemplateRows: "1fr 1fr 0.8fr",
        }}
      >
        {BLOCKS.map((block, i) => {
          const value = (data as Record<string, unknown>)[block.key];
          const items = Array.isArray(value) ? value as string[] : [];
          const singleValue = typeof value === "string" ? value : "";
          const isSingle = "single" in block && block.single;

          return (
            <div
              key={block.key}
              className={`rounded-lg border p-2 transition-all duration-500 ${
                i < visibleCount ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              style={{
                gridRow: block.row,
                gridColumn: block.col,
                borderColor: `${block.color}30`,
                backgroundColor: `${block.color}08`,
                transitionDelay: `${i * 100}ms`,
              }}
            >
              <div className="text-[9px] font-bold mb-1 uppercase tracking-wider" style={{ color: block.color }}>
                {block.label}
              </div>
              {isSingle ? (
                <p className="text-[10px] text-foreground/80">{singleValue}</p>
              ) : (
                <ul className="space-y-0.5">
                  {items.map((item, j) => (
                    <li key={j} className="text-[10px] text-foreground/80">- {item}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
