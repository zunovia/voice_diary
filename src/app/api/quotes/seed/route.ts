import { createServerClient } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/gemini";
import { QUOTES } from "@/lib/quotes-seed";

// PD古典コーパスを quotes テーブルへ冪等に投入する。text_ja をキーに既存分はスキップし、
// 新規分だけ gemini-embedding-001 で埋め込みを生成して挿入する。
// proxy.ts のアクセスキー保護下にあるため x-api-key ヘッダー付きで呼ぶこと。
export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = createServerClient();

    const { data: existing, error: exErr } = await supabase
      .from("quotes")
      .select("text_ja");
    if (exErr) {
      return Response.json({ error: exErr.message }, { status: 500 });
    }

    const have = new Set((existing || []).map((r) => r.text_ja));
    const todo = QUOTES.filter((q) => !have.has(q.text_ja));

    let inserted = 0;
    const failures: { text_ja: string; error: string }[] = [];

    for (const q of todo) {
      try {
        // gloss（現代語）を足して埋め込むことで、古典語とメモの口語の文体差を橋渡しする。
        const embedding = await generateEmbedding(`${q.text_ja}。${q.gloss}`);
        const { error } = await supabase.from("quotes").insert({
          text_ja: q.text_ja,
          gloss: q.gloss,
          author: q.author,
          source: q.source,
          license: q.license ?? "Public Domain",
          next_step: q.next_step,
          embedding,
        });
        if (error) {
          failures.push({ text_ja: q.text_ja, error: error.message });
          continue;
        }
        inserted++;
      } catch (err) {
        failures.push({
          text_ja: q.text_ja,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      // 埋め込みAPIへの控えめなレート制御
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const { count: total } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true });

    return Response.json({
      inserted,
      skipped: QUOTES.length - todo.length,
      failed: failures.length,
      failures,
      total: total ?? null,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
