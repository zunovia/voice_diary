import { createServerClient } from "@/lib/supabase";
import { analyzeConnections } from "@/lib/claude";

export async function POST() {
  try {
    const supabase = createServerClient();

    // Get recent memos for analysis
    const { data: memos, error } = await supabase
      .from("memos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !memos || memos.length < 2) {
      return Response.json(
        { error: "Not enough memos to analyze" },
        { status: 400 }
      );
    }

    // Claude API for deep analysis
    const result = await analyzeConnections(memos);

    // Save insights
    for (const insight of result.insights) {
      await supabase.from("insights").insert({
        memo_ids: insight.memo_ids,
        insight: insight.insight,
        domain: insight.domain,
      });
    }

    return Response.json({ insights: result.insights });
  } catch (error) {
    console.error("Analyze error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
