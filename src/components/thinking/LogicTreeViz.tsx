"use client";

import { useState, useEffect } from "react";

type LogicTreeData = {
  root: string;
  branches: Array<{
    label: string;
    children: Array<{
      label: string;
      leaves: string[];
    }>;
  }>;
};

const BRANCH_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899"];

export default function LogicTreeViz({ data }: { data: LogicTreeData }) {
  const [expandedBranch, setExpandedBranch] = useState<number | null>(null);
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setAnimPhase(1), 300),
      ...data.branches.map((_, i) => setTimeout(() => setAnimPhase(i + 2), 600 + i * 300)),
    ];
    return () => timers.forEach(clearTimeout);
  }, [data]);

  return (
    <div className="space-y-4 overflow-x-auto">
      {/* Root */}
      <div className="flex justify-center">
        <div
          className={`px-6 py-3 rounded-xl bg-primary/10 border-2 border-primary/50 transition-all duration-500 ${
            animPhase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-75"
          }`}
        >
          <span className="text-sm font-bold text-primary">{data.root}</span>
        </div>
      </div>

      {/* Connector line */}
      <div className={`flex justify-center transition-all duration-300 ${animPhase >= 2 ? "opacity-100" : "opacity-0"}`}>
        <div className="w-0.5 h-6 bg-border" />
      </div>

      {/* Branches */}
      <div className="flex gap-2 justify-center flex-wrap">
        {data.branches.map((branch, i) => {
          const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
          const isExpanded = expandedBranch === i;
          return (
            <div key={i} className="flex flex-col items-center">
              <button
                onClick={() => setExpandedBranch(isExpanded ? null : i)}
                className={`px-4 py-2 rounded-lg border transition-all duration-500 hover:scale-105 ${
                  animPhase >= i + 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                } ${isExpanded ? "ring-2 ring-offset-2 ring-offset-background" : ""}`}
                style={{
                  borderColor: `${color}40`,
                  backgroundColor: `${color}10`,
                  boxShadow: isExpanded ? `0 0 0 2px ${color}` : undefined,
                }}
              >
                <span className="text-xs font-medium" style={{ color }}>
                  {branch.label}
                </span>
              </button>

              {/* Children */}
              {isExpanded && (
                <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-2">
                  <div className="w-0.5 h-4 bg-border mx-auto" />
                  {branch.children.map((child, j) => (
                    <div key={j} className="ml-4">
                      <div
                        className="text-xs font-medium px-3 py-1.5 rounded border mb-1"
                        style={{ borderColor: `${color}30`, color }}
                      >
                        {child.label}
                      </div>
                      <div className="ml-4 space-y-0.5">
                        {child.leaves.map((leaf, k) => (
                          <div
                            key={k}
                            className="text-[10px] text-muted-foreground flex items-center gap-1"
                            style={{ animationDelay: `${k * 100}ms` }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                            {leaf}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        各ブランチをクリックして展開
      </p>
    </div>
  );
}
