"use client";

import { useState, useEffect } from "react";

type MandalaData = {
  center: string;
  themes: Array<{ theme: string; ideas: string[] }>;
};

const THEME_COLORS = [
  "#3b82f6", "#22c55e", "#a855f7", "#f97316",
  "#06b6d4", "#ec4899", "#eab308", "#f43f5e",
];

export default function MandalaViz({ data }: { data: MandalaData }) {
  const [expandedTheme, setExpandedTheme] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= 9) clearInterval(interval);
    }, 150);
    return () => clearInterval(interval);
  }, [data]);

  // 3x3 grid positions for center + 8 themes
  const positions = [
    [1, 0], [2, 0], [2, 1], [2, 2],
    [1, 2], [0, 2], [0, 1], [0, 0],
  ];

  return (
    <div className="space-y-6">
      {/* Main 3x3 Grid */}
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
        {positions.slice(0, 3).map((_, i) => {
          const idx = i === 0 ? 7 : i === 1 ? 0 : 1;
          return (
            <ThemeCell
              key={`top-${i}`}
              theme={data.themes[idx]?.theme || ""}
              color={THEME_COLORS[idx]}
              visible={visibleCount > idx + 1}
              onClick={() => setExpandedTheme(expandedTheme === idx ? null : idx)}
              active={expandedTheme === idx}
            />
          );
        })}

        <ThemeCell
          theme={data.themes[6]?.theme || ""}
          color={THEME_COLORS[6]}
          visible={visibleCount > 7}
          onClick={() => setExpandedTheme(expandedTheme === 6 ? null : 6)}
          active={expandedTheme === 6}
        />

        {/* Center */}
        <div
          className={`aspect-square rounded-xl border-2 border-primary flex items-center justify-center bg-primary/10 transition-all duration-500 ${
            visibleCount > 0 ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
        >
          <span className="text-sm font-bold text-primary text-center px-2">{data.center}</span>
        </div>

        <ThemeCell
          theme={data.themes[2]?.theme || ""}
          color={THEME_COLORS[2]}
          visible={visibleCount > 3}
          onClick={() => setExpandedTheme(expandedTheme === 2 ? null : 2)}
          active={expandedTheme === 2}
        />

        {[5, 4, 3].map((idx, i) => (
          <ThemeCell
            key={`bottom-${i}`}
            theme={data.themes[idx]?.theme || ""}
            color={THEME_COLORS[idx]}
            visible={visibleCount > idx + 1}
            onClick={() => setExpandedTheme(expandedTheme === idx ? null : idx)}
            active={expandedTheme === idx}
          />
        ))}
      </div>

      {/* Expanded theme ideas */}
      {expandedTheme !== null && data.themes[expandedTheme] && (
        <div
          className="rounded-xl border p-4 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
          style={{ borderColor: `${THEME_COLORS[expandedTheme]}40` }}
        >
          <div className="text-sm font-bold mb-3" style={{ color: THEME_COLORS[expandedTheme] }}>
            {data.themes[expandedTheme].theme}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {data.themes[expandedTheme].ideas.map((idea, i) => (
              <div
                key={i}
                className="text-xs p-2 rounded-lg border transition-all duration-300"
                style={{
                  borderColor: `${THEME_COLORS[expandedTheme]}20`,
                  backgroundColor: `${THEME_COLORS[expandedTheme]}05`,
                  transitionDelay: `${i * 50}ms`,
                }}
              >
                {idea}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        各テーマをクリックして詳細アイデアを展開
      </p>
    </div>
  );
}

function ThemeCell({
  theme,
  color,
  visible,
  onClick,
  active,
}: {
  theme: string;
  color: string;
  visible: boolean;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`aspect-square rounded-xl border flex items-center justify-center cursor-pointer transition-all duration-500 hover:scale-105 ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-50"
      } ${active ? "ring-2 ring-offset-2 ring-offset-background" : ""}`}
      style={{
        borderColor: `${color}40`,
        backgroundColor: `${color}10`,
        boxShadow: active ? `0 0 0 2px ${color}` : undefined,
      }}
    >
      <span className="text-[11px] font-medium text-center px-1" style={{ color }}>
        {theme}
      </span>
    </button>
  );
}
