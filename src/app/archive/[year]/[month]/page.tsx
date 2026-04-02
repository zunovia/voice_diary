"use client";

import { useState, useEffect, use } from "react";

type Memo = {
  id: string;
  title: string | null;
  summary: string | null;
  tags: string[] | null;
  category: string | null;
  created_at: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  ビジネス: "bg-blue-500/20 text-blue-300",
  技術: "bg-green-500/20 text-green-300",
  思想: "bg-purple-500/20 text-purple-300",
  生活: "bg-orange-500/20 text-orange-300",
  学習: "bg-cyan-500/20 text-cyan-300",
  健康: "bg-pink-500/20 text-pink-300",
  人間関係: "bg-yellow-500/20 text-yellow-300",
  クリエイティブ: "bg-rose-500/20 text-rose-300",
};

export default function MonthArchivePage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = use(params);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/memos?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        setMemos(data.memos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, month]);

  const monthNames = [
    "", "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ];

  // Group by day
  const groupedByDay = memos.reduce(
    (acc, memo) => {
      const day = new Date(memo.created_at).getDate();
      if (!acc[day]) acc[day] = [];
      acc[day].push(memo);
      return acc;
    },
    {} as Record<number, Memo[]>
  );

  const sortedDays = Object.keys(groupedByDay)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <a href="/archive" className="text-gray-500 hover:text-gray-300 text-sm">
        &larr; アーカイブに戻る
      </a>

      <h1 className="text-lg font-bold text-white">
        {year}年 {monthNames[parseInt(month)]}
      </h1>
      <p className="text-xs text-gray-500">{memos.length}件のメモ</p>

      {loading ? (
        <div className="text-center text-gray-500 py-12">読み込み中...</div>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((day) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-bold text-indigo-400">
                  {day}
                </span>
                <span className="text-xs text-gray-600">
                  {month}/{day}
                </span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
              <div className="space-y-2 ml-8">
                {groupedByDay[day].map((memo) => (
                  <a
                    key={memo.id}
                    href={`/memo/${memo.id}`}
                    className="block bg-gray-800/30 rounded-lg p-3 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600">
                        {new Date(memo.created_at).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {memo.category && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${CATEGORY_COLORS[memo.category] || "bg-gray-500/20 text-gray-300"}`}
                        >
                          {memo.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-white mt-1">
                      {memo.title || "無題"}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      {memo.summary}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
