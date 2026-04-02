"use client";

import { useState, useEffect } from "react";

type Insight = {
  id: string;
  memo_ids: string[];
  insight: string;
  domain: string | null;
  created_at: string;
};

const DOMAIN_COLORS: Record<string, string> = {
  ビジネス: "border-blue-500/30 bg-blue-500/5",
  技術: "border-green-500/30 bg-green-500/5",
  思想: "border-purple-500/30 bg-purple-500/5",
  アクション: "border-orange-500/30 bg-orange-500/5",
};

const DOMAIN_ICONS: Record<string, string> = {
  ビジネス: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
  技術: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  思想: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  アクション: "M13 10V3L4 14h7v7l9-11h-7z",
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // Load existing insights from Supabase
    fetch("/api/memos")
      .then(() => setLoading(false))
      .catch(() => setLoading(false));

    // TODO: Create API endpoint to fetch insights
    setLoading(false);
  }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setInsights(
        data.insights.map(
          (
            ins: { memo_ids: string[]; insight: string; domain: string },
            i: number
          ) => ({
            id: `new-${i}`,
            ...ins,
            created_at: new Date().toISOString(),
          })
        )
      );
    } catch (error) {
      console.error(error);
      alert("分析に失敗しました。メモが2件以上必要です。");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">インサイト分析</h1>
          <p className="text-xs text-gray-500 mt-1">
            Claude AIがメモ間の接続を見つけ、アイデアの種を生成します
          </p>
        </div>
      </div>

      <button
        onClick={runAnalysis}
        disabled={analyzing}
        className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
          analyzing
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20"
        }`}
      >
        {analyzing ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Claude AIが分析中...
          </span>
        ) : (
          "メモを分析してインサイトを生成"
        )}
      </button>

      {loading ? (
        <div className="text-center text-gray-500 py-12">読み込み中...</div>
      ) : insights.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <svg
            className="w-16 h-16 mx-auto text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="text-gray-500 text-sm">
            まだインサイトがありません
          </p>
          <p className="text-gray-600 text-xs">
            上のボタンを押してメモの接続分析を実行してください
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`rounded-xl p-4 border ${DOMAIN_COLORS[insight.domain || ""] || "border-gray-700/50 bg-gray-800/30"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={
                      DOMAIN_ICONS[insight.domain || ""] ||
                      DOMAIN_ICONS["思想"]
                    }
                  />
                </svg>
                <span className="text-xs font-medium text-gray-400">
                  {insight.domain}
                </span>
                <span className="text-[10px] text-gray-600">
                  {insight.memo_ids.length}件のメモから
                </span>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">
                {insight.insight}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
