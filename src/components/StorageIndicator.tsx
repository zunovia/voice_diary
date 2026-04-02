"use client";

import { useState, useEffect } from "react";

export default function StorageIndicator({ compact = false }: { compact?: boolean }) {
  const [usage, setUsage] = useState<{ used_mb: number; limit_mb: number } | null>(null);

  useEffect(() => {
    fetch("/api/storage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {});
  }, []);

  if (!usage) return null;

  const percent = (usage.used_mb / usage.limit_mb) * 100;
  const color =
    percent > 90
      ? "bg-red-500"
      : percent > 80
        ? "bg-yellow-500"
        : "bg-indigo-500";

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} rounded-full transition-all`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        <span>{usage.used_mb.toFixed(1)}MB</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400">Supabase 使用量</span>
        <span className="text-gray-300">
          {usage.used_mb.toFixed(1)} / {usage.limit_mb} MB
        </span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1">
        <p className="text-xs text-gray-500">{percent.toFixed(1)}% 使用中</p>
        <a href="/usage" className="text-xs text-indigo-400 hover:text-indigo-300">
          API使用量 &rarr;
        </a>
      </div>
    </div>
  );
}
