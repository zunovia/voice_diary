"use client";

import { useState, useEffect } from "react";
import StorageIndicator from "@/components/StorageIndicator";

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

export default function ListPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    fetch(`/api/memos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setMemos(data.memos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filterCategory]);

  const categories = [...new Set(memos.map((m) => m.category).filter(Boolean))];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">メモ一覧</h1>
        <span className="text-xs text-gray-500">{memos.length}件</span>
      </div>

      <StorageIndicator />

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterCategory("")}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
            !filterCategory
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400"
          }`}
        >
          すべて
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat || "")}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
              filterCategory === cat
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Memo List */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">読み込み中...</div>
      ) : memos.length === 0 ? (
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
        <div className="space-y-3">
          {memos.map((memo) => (
            <a
              key={memo.id}
              href={`/memo/${memo.id}`}
              className="block bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">
                    {memo.title || "無題"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {memo.summary}
                  </p>
                </div>
                {memo.category && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${CATEGORY_COLORS[memo.category] || "bg-gray-500/20 text-gray-300"}`}
                  >
                    {memo.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-gray-600">
                  {new Date(memo.created_at).toLocaleString("ja-JP")}
                </span>
                {memo.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] text-indigo-400/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
