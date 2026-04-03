import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateEmbedding } from "@/lib/gemini";
import { trackUsage, estimateTokens } from "@/lib/usage-tracker";

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
}

export async function POST(request: Request) {
  try {
    const { memoIdA, memoIdB } = await request.json();

    if (!memoIdA || !memoIdB) {
      return NextResponse.json(
        { error: "memoIdA と memoIdB が必要です" },
        { status: 400 }
      );
    }

    if (memoIdA === memoIdB) {
      return NextResponse.json(
        { error: "異なる2つのメモを指定してください" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch both memos
    const { data: memoA, error: errorA } = await supabase
      .from("memos")
      .select("id, title, summary, category, tags, raw_text")
      .eq("id", memoIdA)
      .single();

    const { data: memoB, error: errorB } = await supabase
      .from("memos")
      .select("id, title, summary, category, tags, raw_text")
      .eq("id", memoIdB)
      .single();

    if (errorA || !memoA) {
      return NextResponse.json(
        { error: `メモA（${memoIdA}）が見つかりません` },
        { status: 404 }
      );
    }

    if (errorB || !memoB) {
      return NextResponse.json(
        { error: `メモB（${memoIdB}）が見つかりません` },
        { status: 404 }
      );
    }

    // Check for existing fusion with these two parent memos
    const { data: existingFusions } = await supabase
      .from("fusions")
      .select("*")
      .contains("parent_memo_ids", [memoIdA, memoIdB]);

    if (existingFusions && existingFusions.length > 0) {
      const existing = existingFusions[0];
      return NextResponse.json({
        fusion: {
          id: existing.id,
          title: existing.title,
          insight: existing.insight,
          summary: existing.summary,
          tags: existing.tags,
          category: existing.category,
          shape: existing.shape,
          parent_memo_ids: existing.parent_memo_ids,
          created_at: existing.created_at,
        },
      });
    }

    // Build prompt for Gemini
    const prompt = `あなたは異なるアイデアを融合させて新しい価値を生み出すエキスパートです。
以下の2つのメモの間に、意外な統合・アナロジー・化学反応を見つけてください。

【メモA】${memoA.title}
カテゴリ: ${memoA.category}
タグ: ${memoA.tags?.join(", ")}
要約: ${memoA.summary}
原文: ${memoA.raw_text}

【メモB】${memoB.title}
カテゴリ: ${memoB.category}
タグ: ${memoB.tags?.join(", ")}
要約: ${memoB.summary}
原文: ${memoB.raw_text}

2つのメモを融合し、どちらか一方だけでは生まれない新しい視点・アイデアを生成してください。

shapeの選択基準:
- "diamond" = 実用的・ビジネス寄りの融合
- "triangle" = 技術的・構造的な融合
- "star" = 創造的・哲学的な融合

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "title": "融合アイデアのタイトル（20文字以内）",
  "insight": "2つのメモの融合から得られる核心的な洞察（200文字以内）",
  "summary": "融合アイデアの要約（100文字以内）",
  "tags": ["タグ1", "タグ2", "タグ3"],
  "category": "融合後のカテゴリ（ビジネス/技術/思想/生活/学習/健康/人間関係/クリエイティブ）",
  "shape": "star または triangle または diamond"
}`;

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Track usage
    const inputTokens = estimateTokens(prompt);
    const outputTokens = estimateTokens(text);
    await trackUsage({
      apiName: "Gemini",
      model: "gemini-2.5-flash",
      inputTokens,
      outputTokens,
      endpoint: "fuse",
    });

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI応答の解析に失敗しました" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate shape
    const validShapes = ["star", "triangle", "diamond"];
    if (!validShapes.includes(parsed.shape)) {
      parsed.shape = "star";
    }

    // Generate embedding for the fusion text
    const embeddingText = `${parsed.title} ${parsed.insight} ${parsed.summary}`;
    const embedding = await generateEmbedding(embeddingText);

    // Insert into fusions table
    const { data: fusion, error: insertError } = await supabase
      .from("fusions")
      .insert({
        title: parsed.title,
        insight: parsed.insight,
        summary: parsed.summary,
        tags: parsed.tags,
        category: parsed.category,
        shape: parsed.shape,
        parent_memo_ids: [memoIdA, memoIdB],
        embedding,
      })
      .select()
      .single();

    if (insertError || !fusion) {
      console.error("Fusion insert error:", insertError);
      return NextResponse.json(
        { error: `融合の保存に失敗しました: ${insertError?.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      fusion: {
        id: fusion.id,
        title: fusion.title,
        insight: fusion.insight,
        summary: fusion.summary,
        tags: fusion.tags,
        category: fusion.category,
        shape: fusion.shape,
        parent_memo_ids: fusion.parent_memo_ids,
        created_at: fusion.created_at,
      },
    });
  } catch (error) {
    console.error("Fuse error:", error);
    return NextResponse.json(
      { error: `融合エラー: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "idが必要です" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from("fusions").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `削除エラー: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
