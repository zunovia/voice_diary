"use client";

import { useState, useEffect } from "react";

type MonthData = {
  year: number;
  month: number;
  count: number;
};

export default function ArchivePage() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memos")
      .then((r) => r.json())
      .then((data) => {
        const memos = data.memos || [];
        const monthMap = new Map<string, MonthData>();
        memos.forEach(
          (m: { created_at: string }) => {
            const date = new Date(m.created_at);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (!monthMap.has(key)) {
              monthMap.set(key, {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                count: 0,
              });
            }
            monthMap.get(key)!.count++;
          }
        );
        const sorted = [...monthMap.values()].sort(
          (a, b) => b.year * 100 + b.month - (a.year * 100 + a.month)
        );
        setMonths(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const monthNames = [
    "", "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-lg font-bold text-white">月別アーカイブ</h1>

      {loading ? (
        <div className="text-center text-gray-500 py-12">読み込み中...</div>
      ) : months.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">メモがありません</p>
          <a
            href="/record"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            最初のメモを録音する
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {months.map((m) => (
            <a
              key={`${m.year}-${m.month}`}
              href={`/archive/${m.year}/${m.month}`}
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-indigo-500/30 transition-colors group"
            >
              <div className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                {monthNames[m.month]}
              </div>
              <div className="text-xs text-gray-500">{m.year}年</div>
              <div className="mt-2 text-sm text-gray-400">
                <span className="text-indigo-400 font-medium">{m.count}</span>{" "}
                件のメモ
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
