import { createServerClient } from "@/lib/supabase";
import { getNeighbors } from "@/lib/neighbors";

// GET /api/memos/:id/neighbors
// メモに最も近いPD古典（ノウアスフィアの隣人）を返す。メモ詳細ページはサーバー側で
// 直接 getNeighbors を呼ぶが、自動化やクライアント用途向けに薄いAPIも用意する。
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: memo, error } = await supabase
      .from("memos")
      .select("id, raw_text, title, summary, embedding")
      .eq("id", id)
      .single();

    if (error || !memo) {
      return Response.json({ error: "memo not found" }, { status: 404 });
    }

    const neighbors = await getNeighbors(supabase, memo);
    return Response.json({ neighbors });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
