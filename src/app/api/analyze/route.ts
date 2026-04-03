import { createServerClient } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { trackUsage, estimateTokens } from "@/lib/usage-tracker";

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
}

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("insights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ insights: data || [] });
  } catch (error) {
    console.error("Insights fetch error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = createServerClient();

    const { data: memos, error } = await supabase
      .from("memos")
      .select("id, title, summary, tags, category, raw_text")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !memos || memos.length < 2) {
      return Response.json(
        { error: `分析にはメモが2件以上必要です（現在: ${memos?.length || 0}件）` },
        { status: 400 }
      );
    }

    const memosContext = memos
      .map(
        (m) =>
          `[ID: ${m.id}] ${m.title}\nカテゴリ: ${m.category}\nタグ: ${m.tags?.join(", ")}\n要約: ${m.summary}\n原文: ${m.raw_text}\n---`
      )
      .join("\n");

    const prompt = `あなたは思考の接続を見つけるエキスパートです。以下の複数のメモを分析し、異なるメモ間の意外な接続、パターン、そこから生まれるアイデアの種を見つけてください。

特に以下の視点で分析してください:
1. ビジネスアイデア: 異なるメモの組み合わせから生まれる事業アイデア
2. 技術的接続: 技術メモと他分野のメモの接続
3. 思想的深化: 異なるテーマのメモが示す思考パターン
4. 実行可能なアクション: メモの接続から導かれる具体的な次のステップ

メモ一覧:
${memosContext}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "insights": [
    {
      "memo_ids": ["関連するメモのID（UUIDを2-4個）"],
      "insight": "接続から得られるインサイト（200文字以内）",
      "domain": "ビジネス/技術/思想/アクション のいずれか"
    }
  ]
}

最低3つ、最大10個のインサイトを見つけてください。`;

    const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });
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
      endpoint: "analyze",
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "AI応答の解析に失敗しました" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Save insights to Supabase
    const savedInsights = [];
    for (const insight of parsed.insights) {
      const { data: saved, error: saveError } = await supabase
        .from("insights")
        .insert({
          memo_ids: insight.memo_ids,
          insight: insight.insight,
          domain: insight.domain,
        })
        .select()
        .single();

      if (!saveError && saved) {
        savedInsights.push(saved);
      }
    }

    return Response.json({ insights: savedInsights });
  } catch (error) {
    console.error("Analyze error:", error);
    return Response.json(
      { error: `分析エラー: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
