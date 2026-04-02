import { createServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MemoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: memo, error } = await supabase
    .from("memos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !memo) return notFound();

  const categoryColors: Record<string, string> = {
    ビジネス: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    技術: "bg-green-500/20 text-green-300 border-green-500/30",
    思想: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    生活: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    学習: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    健康: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    人間関係: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    クリエイティブ: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <a href="/" className="text-gray-500 hover:text-gray-300 text-sm">
        &larr; グラフに戻る
      </a>

      <div className="space-y-4">
        <h1 className="text-xl font-bold text-white">
          {memo.title || "無題"}
        </h1>

        <div className="flex items-center gap-3">
          {memo.category && (
            <span
              className={`px-3 py-1 rounded-full text-xs border ${categoryColors[memo.category] || "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}
            >
              {memo.category}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {new Date(memo.created_at).toLocaleString("ja-JP")}
          </span>
        </div>

        {/* Summary */}
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
          <h2 className="text-xs font-medium text-indigo-400 mb-2">
            AI要約
          </h2>
          <p className="text-gray-300 text-sm">{memo.summary}</p>
        </div>

        {/* Tags */}
        {memo.tags && memo.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {memo.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-1 bg-indigo-500/10 text-indigo-300 rounded-lg text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Raw Text */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <h2 className="text-xs font-medium text-gray-500 mb-2">
            原文（文字起こし）
          </h2>
          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
            {memo.raw_text}
          </p>
        </div>
      </div>
    </div>
  );
}
