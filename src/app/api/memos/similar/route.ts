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
      return Response.json({ nodes: [], links: [] });
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

    return Response.json({ nodes, links });
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
