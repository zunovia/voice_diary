"use client";

import { useState, useEffect } from "react";

type BmcData = {
  title: string;
  key_partners: string[];
  key_activities: string[];
  key_resources: string[];
  value_propositions: string[];
  customer_relationships: string[];
  channels: string[];
  customer_segments: string[];
  cost_structure: string[];
  revenue_streams: string[];
};

const BMC_BLOCKS = [
  { key: "key_partners", label: "主要パートナー", color: "#8b5cf6", row: "1/3", col: "1/2" },
  { key: "key_activities", label: "主要活動", color: "#3b82f6", row: "1/2", col: "2/3" },
  { key: "key_resources", label: "主要リソース", color: "#06b6d4", row: "2/3", col: "2/3" },
  { key: "value_propositions", label: "価値提案", color: "#22c55e", row: "1/3", col: "3/4" },
  { key: "customer_relationships", label: "顧客との関係", color: "#f97316", row: "1/2", col: "4/5" },
  { key: "channels", label: "チャネル", color: "#eab308", row: "2/3", col: "4/5" },
  { key: "customer_segments", label: "顧客セグメント", color: "#ec4899", row: "1/3", col: "5/6" },
  { key: "cost_structure", label: "コスト構造", color: "#ef4444", row: "3/4", col: "1/4" },
  { key: "revenue_streams", label: "収益の流れ", color: "#22c55e", row: "3/4", col: "4/6" },
];

export default function BmcViz({ data }: { data: BmcData }) {
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
      <div className="text-center text-lg font-bold">{data.title}</div>

      {/* Canvas Grid */}
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: "repeat(5, 1fr)",
          gridTemplateRows: "1fr 1fr 0.8fr",
        }}
      >
        {BMC_BLOCKS.map((block, i) => {
          const items = (data as Record<string, string[]>)[block.key] || [];
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
              <div
                className="text-[9px] font-bold mb-1 uppercase tracking-wider"
                style={{ color: block.color }}
              >
                {block.label}
              </div>
              <ul className="space-y-0.5">
                {items.map((item, j) => (
                  <li key={j} className="text-[10px] text-foreground/80">
                    - {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
