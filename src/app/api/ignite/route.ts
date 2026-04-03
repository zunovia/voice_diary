import { createServerClient } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { trackUsage, estimateTokens } from "@/lib/usage-tracker";

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
}

// GET: Detect collision points and generate ignition questions
export async function GET() {
  try {
    const supabase = createServerClient();

    // Get memos and insights
    const { data: memos } = await supabase
      .from("memos")
      .select("id, title, summary, tags, category, raw_text")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: insights } = await supabase
      .from("insights")
      .select("id, memo_ids, insight, domain")
      .order("created_at", { ascending: false });

    if (!memos || memos.length < 3 || !insights || insights.length === 0) {
      return Response.json({ ignitions: [] });
    }

    // Find collision points: memos that appear in multiple insights
    const memoInsightCount: Record<string, { count: number; insightIds: string[]; insightTexts: string[] }> = {};
    for (const ins of insights) {
      if (!ins.memo_ids) continue;
      for (const memoId of ins.memo_ids) {
        if (!memoInsightCount[memoId]) {
          memoInsightCount[memoId] = { count: 0, insightIds: [], insightTexts: [] };
        }
        memoInsightCount[memoId].count++;
        memoInsightCount[memoId].insightIds.push(ins.id);
        memoInsightCount[memoId].insightTexts.push(ins.insight);
      }
    }

    // Find intersection clusters: groups of memos connected by multiple insights
    const clusters: Array<{
      memoIds: string[];
      memos: typeof memos;
      insightTexts: string[];
      density: number;
    }> = [];

    // Build adjacency from insights
    const adjacency: Record<string, Set<string>> = {};
    for (const ins of insights) {
      if (!ins.memo_ids || ins.memo_ids.length < 2) continue;
      for (let i = 0; i < ins.memo_ids.length; i++) {
        for (let j = i + 1; j < ins.memo_ids.length; j++) {
          const a = ins.memo_ids[i];
          const b = ins.memo_ids[j];
          if (!adjacency[a]) adjacency[a] = new Set();
          if (!adjacency[b]) adjacency[b] = new Set();
          adjacency[a].add(b);
          adjacency[b].add(a);
        }
      }
    }

    // Find dense subgraphs (memos with 2+ insight connections)
    const memoMap = new Map(memos.map((m) => [m.id, m]));
    const visited = new Set<string>();

    for (const [memoId, neighbors] of Object.entries(adjacency)) {
      if (visited.has(memoId) || neighbors.size < 2) continue;
      // Find cluster: this memo + its most connected neighbors
      const clusterIds = [memoId, ...Array.from(neighbors).slice(0, 3)];
      clusterIds.forEach((id) => visited.add(id));

      const clusterMemos = clusterIds
        .map((id) => memoMap.get(id))
        .filter(Boolean) as typeof memos;

      const relatedInsights = insights.filter(
        (ins) => ins.memo_ids?.some((id: string) => clusterIds.includes(id))
      );

      if (clusterMemos.length >= 2) {
        clusters.push({
          memoIds: clusterIds,
          memos: clusterMemos,
          insightTexts: relatedInsights.map((i) => i.insight),
          density: neighbors.size,
        });
      }
    }

    // Sort by density (most connected first)
    clusters.sort((a, b) => b.density - a.density);

    // Generate ignition questions for top clusters
    const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
    const ignitions = [];

    for (const cluster of clusters.slice(0, 3)) {
      const context = cluster.memos
        .map((m) => `【${m.title}】(${m.category}) ${m.summary}`)
        .join("\n");
      const insightContext = cluster.insightTexts.slice(0, 3).join("\n");

      const prompt = `あなたは「意味の自己増殖」を促進する思考触媒です。

以下のメモ群とそこから生まれたインサイトが、ベクトル空間上で衝突しています。
この衝突点から、まだ誰も考えていない「問い」を1つ生成してください。

その「問い」は:
- 既存のメモの延長線上にない、新しい方向を指す
- 答えることで新しいメモ（思考）が生まれる種になる
- 抽象的すぎず、具体的すぎず、思考を刺激する

メモ:
${context}

既存インサイト:
${insightContext}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "question": "衝突から生まれた問い（50文字以内）",
  "spark": "なぜこの問いが生まれたかの説明（80文字以内）",
  "direction": "この問いが向かう方向性（30文字以内）",
  "temperature": 0.8
}

temperatureは問いの革新性（0.1=安全, 1.0=破壊的）を0.1〜1.0で自己評価してください。`;

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          ignitions.push({
            id: `ignite-${cluster.memoIds.join("-").slice(0, 20)}`,
            memoIds: cluster.memoIds,
            memoTitles: cluster.memos.map((m) => m.title),
            density: cluster.density,
            ...parsed,
          });
        }

        // Track usage
        await trackUsage({
          apiName: "Gemini",
          model: "gemini-2.5-flash",
          inputTokens: estimateTokens(prompt),
          outputTokens: estimateTokens(text),
          endpoint: "ignite",
        });
      } catch {
        // Skip this cluster on error
      }
    }

    return Response.json({ ignitions });
  } catch (error) {
    console.error("Ignite error:", error);
    return Response.json(
      { error: `発火エラー: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
