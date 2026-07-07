import { createServerClient } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/gemini";

// 埋め込み生成は1件ずつGeminiを叩くため、59件前後でも数十秒かかりうる。
// Vercelの関数タイムアウトに収まるよう上限を引き上げ、1回で捌けない場合は
// ?limit= と冪等性（embedding IS NULL のみ処理）で複数回に分けて呼べるようにする。
export const maxDuration = 60;

// POST /api/embeddings/backfill?limit=50
// embedding が未設定のメモを gemini-embedding-001 で埋める冪等ジョブ。
// proxy.ts のアクセスキー保護下にあるため x-api-key ヘッダー付きで呼ぶこと。
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1),
      200
    );

    const supabase = createServerClient();

    const { data: memos, error } = await supabase
      .from("memos")
      .select("id, raw_text, title, summary")
      .is("embedding", null)
      .limit(limit);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!memos || memos.length === 0) {
      return Response.json({
        updated: 0,
        failed: 0,
        remaining: 0,
        message: "全メモに embedding が設定済みです",
      });
    }

    let updated = 0;
    const failures: { id: string; error: string }[] = [];

    for (const m of memos) {
      // 埋め込み対象テキスト: 原文を優先、無ければ title + summary で代替。
      const text =
        (m.raw_text && m.raw_text.trim()) ||
        [m.title, m.summary].filter(Boolean).join(" ").trim();

      if (!text) {
        failures.push({ id: m.id, error: "埋め込み対象テキストが空" });
        continue;
      }

      try {
        const embedding = await generateEmbedding(text);
        const { error: upErr } = await supabase
          .from("memos")
          .update({ embedding })
          .eq("id", m.id);
        if (upErr) {
          failures.push({ id: m.id, error: upErr.message });
          continue;
        }
        updated++;
      } catch (err) {
        failures.push({
          id: m.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // 埋め込みAPIへの控えめなレート制御
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    // 残り件数を検証して返す（0になるまで繰り返し呼べる）
    const { count: remaining } = await supabase
      .from("memos")
      .select("id", { count: "exact", head: true })
      .is("embedding", null);

    return Response.json({
      updated,
      failed: failures.length,
      failures,
      remaining: remaining ?? null,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
