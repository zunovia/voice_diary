import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { summarizeAndTag, generateEmbedding } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text || text.trim().length === 0) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    // Step 1: Gemini Flash for summary, title, tags, category
    const analysis = await summarizeAndTag(text);

    // Step 2: Generate embedding
    const embedding = await generateEmbedding(text);

    // Step 3: Save to Supabase
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("memos")
      .insert({
        raw_text: text,
        title: analysis.title,
        summary: analysis.summary,
        tags: analysis.tags,
        category: analysis.category,
        embedding: JSON.stringify(embedding),
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return Response.json({ error: "Failed to save memo" }, { status: 500 });
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
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
