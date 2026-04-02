import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { summarizeAndTag } from "@/lib/gemini";
import { trackUsage, estimateTokens } from "@/lib/usage-tracker";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text || text.trim().length === 0) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    // Step 1: Gemini Flash for summary, title, tags, category
    let analysis;
    try {
      analysis = await summarizeAndTag(text);
    } catch (err) {
      console.error("Gemini summarize error:", err);
      return Response.json(
        { error: `AI要約エラー: ${err instanceof Error ? err.message : String(err)}` },
        { status: 500 }
      );
    }

    // Track Gemini usage
    const inputTokens = estimateTokens(text) + 100; // text + prompt overhead
    const outputTokens = estimateTokens(JSON.stringify(analysis));
    await trackUsage({
      apiName: "Gemini",
      model: "gemini-2.5-flash",
      inputTokens,
      outputTokens,
      endpoint: "summarize",
    });

    // Step 2: Save to Supabase
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("memos")
      .insert({
        raw_text: text,
        title: analysis.title,
        summary: analysis.summary,
        tags: analysis.tags,
        category: analysis.category,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return Response.json(
        { error: `DB保存エラー: ${error.message}` },
        { status: 500 }
      );
    }

    return Response.json({
      id: data.id,
      title: analysis.title,
      summary: analysis.summary,
      tags: analysis.tags,
      category: analysis.category,
    });
  } catch (error) {
    console.error("Summarize error:", error);
    return Response.json(
      { error: `エラー: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
