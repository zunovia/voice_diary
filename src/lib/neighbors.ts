import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/gemini";

// ノウアスフィアの隣人: メモの埋め込みに最も近いPD古典（quotes）を返す。
// - 既存メモは embedding を保持しているので、それをそのまま match_quotes RPC に渡す（追加のLLM呼び出しゼロ）。
// - 万一 embedding が無いメモ（旧データ等）だけ、その場で埋め込みを生成してフォールバックする。

export type Neighbor = {
  id: string;
  text_ja: string;
  gloss: string | null;
  author: string;
  source: string;
  license: string;
  next_step: string | null;
  similarity: number;
};

type MemoLike = {
  id: string;
  embedding?: unknown;
  raw_text?: string | null;
  title?: string | null;
  summary?: string | null;
};

// pgvector の値は supabase-js 経由だと文字列 "[0.1,0.2,...]" で返ることがある。
// RPC には number[] を渡すのが Supabase の定石なので、文字列なら number[] にパースする。
function toVector(v: unknown): number[] | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string") {
    try {
      const arr = JSON.parse(v);
      return Array.isArray(arr) ? (arr as number[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getNeighbors(
  supabase: SupabaseClient,
  memo: MemoLike,
  { count = 3, floor = 0.35 }: { count?: number; floor?: number } = {}
): Promise<Neighbor[]> {
  let vec = toVector(memo.embedding);

  if (!vec) {
    const text =
      (memo.raw_text && memo.raw_text.trim()) ||
      [memo.title, memo.summary].filter(Boolean).join(" ").trim();
    if (!text) return [];
    vec = await generateEmbedding(text);
  }

  const { data, error } = await supabase.rpc("match_quotes", {
    query_embedding: vec,
    match_count: count,
  });

  if (error || !data) return [];
  return (data as Neighbor[]).filter((n) => n.similarity >= floor);
}
