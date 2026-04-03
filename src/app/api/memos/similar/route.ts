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

    const memosWithEmbedding = memos.filter((m) => m.embedding);

    for (let i = 0; i < memosWithEmbedding.length; i++) {
      for (let j = i + 1; j < memosWithEmbedding.length; j++) {
        const sim = cosineSimilarity(
          memosWithEmbedding[i].embedding,
          memosWithEmbedding[j].embedding
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
    const fusionsWithEmbedding = (fusions || []).filter((f) => f.embedding);
    for (const f of fusionsWithEmbedding) {
      for (const m of memosWithEmbedding) {
        if ((f.parent_memo_ids || []).includes(m.id)) continue; // skip parent links (already added)
        const sim = cosineSimilarity(f.embedding, m.embedding);
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
