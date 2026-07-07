import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get all memos with embeddings for the graph
    const { data: memos, error } = await supabase
      .from("memos")
      .select("id, title, summary, tags, category, created_at, embedding")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!memos || memos.length === 0) {
      return Response.json({ nodes: [], links: [], insightLinks: [] });
    }

    // Build nodes
    const nodes = memos.map((m) => ({
      id: m.id,
      title: m.title || "無題",
      summary: m.summary || "",
      category: m.category || "その他",
      tags: m.tags || [],
      created_at: m.created_at,
    }));

    // Compute cosine similarity between all pairs with embeddings
    const links: Array<{
      source: string;
      target: string;
      similarity: number;
    }> = [];

    // pgvector の embedding は supabase-js 経由だと文字列("[0.1,0.2,...]")で返るため、
    // number[] にパースしてから cosine を計算する（これが無いと類似リンクが0本になる）。
    const memosWithEmbedding = memos
      .map((m) => ({ id: m.id, vec: toVector(m.embedding) }))
      .filter((m): m is { id: string; vec: number[] } => m.vec !== null);

    for (let i = 0; i < memosWithEmbedding.length; i++) {
      for (let j = i + 1; j < memosWithEmbedding.length; j++) {
        const sim = cosineSimilarity(
          memosWithEmbedding[i].vec,
          memosWithEmbedding[j].vec
        );
        if (sim > 0.5) {
          links.push({
            source: memosWithEmbedding[i].id,
            target: memosWithEmbedding[j].id,
            similarity: Math.round(sim * 1000) / 1000,
          });
        }
      }
    }

    // Get insights and build insight links
    const { data: insights } = await supabase
      .from("insights")
      .select("id, memo_ids, insight, domain, created_at")
      .order("created_at", { ascending: false });

    const memoIdSet = new Set(memos.map((m) => m.id));
    const insightLinks: Array<{
      id: string;
      source: string;
      target: string;
      insight: string;
      domain: string;
      created_at: string;
    }> = [];

    if (insights) {
      for (const ins of insights) {
        if (!ins.memo_ids || ins.memo_ids.length < 2) continue;
        // Create links between all pairs of memos referenced by this insight
        const validIds = ins.memo_ids.filter((id: string) => memoIdSet.has(id));
        for (let i = 0; i < validIds.length; i++) {
          for (let j = i + 1; j < validIds.length; j++) {
            insightLinks.push({
              id: ins.id,
              source: validIds[i],
              target: validIds[j],
              insight: ins.insight,
              domain: ins.domain || "その他",
              created_at: ins.created_at,
            });
          }
        }
      }
    }

    // Fetch fusion nodes
    const { data: fusions } = await supabase
      .from("fusions")
      .select("id, title, insight, summary, tags, category, shape, parent_memo_ids, created_at, embedding")
      .order("created_at", { ascending: false })
      .limit(100);

    // Add fusion nodes to the graph
    const fusionNodes = (fusions || []).map((f) => ({
      id: f.id,
      title: f.title || "融合",
      summary: f.summary || f.insight || "",
      category: f.category || "その他",
      tags: f.tags || [],
      created_at: f.created_at,
      isFusion: true,
      shape: f.shape || "diamond",
      parentMemoIds: f.parent_memo_ids || [],
    }));

    // Add parent links (fusion -> parent memos)
    const fusionLinks: Array<{ source: string; target: string; similarity: number; isFusionLink?: boolean }> = [];
    for (const f of fusions || []) {
      for (const parentId of f.parent_memo_ids || []) {
        if (memoIdSet.has(parentId)) {
          fusionLinks.push({ source: f.id, target: parentId, similarity: 1.0, isFusionLink: true });
        }
      }
    }

    // Compute similarity links between fusions and memos
    const fusionsWithEmbedding = (fusions || [])
      .map((f) => ({ id: f.id, parent_memo_ids: f.parent_memo_ids, vec: toVector(f.embedding) }))
      .filter((f): f is { id: string; parent_memo_ids: string[] | null; vec: number[] } => f.vec !== null);
    for (const f of fusionsWithEmbedding) {
      for (const m of memosWithEmbedding) {
        if ((f.parent_memo_ids || []).includes(m.id)) continue; // skip parent links (already added)
        const sim = cosineSimilarity(f.vec, m.vec);
        if (sim > 0.5) {
          links.push({ source: f.id, target: m.id, similarity: Math.round(sim * 1000) / 1000 });
        }
      }
    }

    const allNodes = [...nodes, ...fusionNodes];
    const allLinks = [...links, ...fusionLinks];

    return Response.json({ nodes: allNodes, links: allLinks, insightLinks });
  } catch (error) {
    console.error("Similar memos error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

// pgvector の値は supabase-js だと文字列 "[0.1,0.2,...]" で返ることがあるため、
// number[] に正規化する。既に配列ならそのまま返す。
function toVector(v: unknown): number[] | null {
  if (!v) return null;
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

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
