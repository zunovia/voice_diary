import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { trackUsage, estimateTokens } from "@/lib/usage-tracker";
import { GoogleGenerativeAI } from "@google/generative-ai";

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
}

export async function POST(request: NextRequest) {
  try {
    const { method, memoIds } = await request.json();
    const supabase = createServerClient();

    // Fetch selected memos
    const { data: memos, error } = await supabase
      .from("memos")
      .select("id, title, summary, tags, category, raw_text")
      .in("id", memoIds);

    if (error || !memos || memos.length === 0) {
      return Response.json({ error: "メモが見つかりません" }, { status: 400 });
    }

    const memosText = memos
      .map((m) => `【${m.title}】(${m.category}) ${m.summary}\n原文: ${m.raw_text}`)
      .join("\n---\n");

    let prompt = "";

    switch (method) {
      case "dialectic":
        prompt = `あなたは弁証法（ヘーゲル弁証法）の専門家です。以下のメモ群を分析し、弁証法的思考プロセスを実行してください。

メモ:
${memosText}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "thesis": {
    "title": "テーゼ（正）のタイトル",
    "content": "メモ群から導かれる主張・命題（100文字以内）",
    "source_memos": ["関連メモタイトル"]
  },
  "antithesis": {
    "title": "アンチテーゼ（反）のタイトル",
    "content": "テーゼの矛盾・対立する視点（100文字以内）",
    "source_memos": ["関連メモタイトル"]
  },
  "synthesis": {
    "title": "ジンテーゼ（合）のタイトル",
    "content": "正と反を止揚した新しい統合的アイデア（150文字以内）",
    "action_items": ["具体的アクション1", "具体的アクション2", "具体的アクション3"]
  }
}`;
        break;

      case "scamper":
        prompt = `あなたはSCAMPERメソッドの専門家です。以下のメモ群の核心アイデアに対して、SCAMPER各手法を適用してください。

メモ:
${memosText}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "core_idea": "メモ群の核心アイデア（50文字以内）",
  "scamper": [
    {"method": "Substitute（代替）", "question": "何を置き換えられるか？", "idea": "具体的アイデア（80文字以内）"},
    {"method": "Combine（結合）", "question": "何と組み合わせられるか？", "idea": "具体的アイデア"},
    {"method": "Adapt（適応）", "question": "他にどう応用できるか？", "idea": "具体的アイデア"},
    {"method": "Modify（変更）", "question": "何を拡大/縮小できるか？", "idea": "具体的アイデア"},
    {"method": "Put to other use（転用）", "question": "別の用途は？", "idea": "具体的アイデア"},
    {"method": "Eliminate（削除）", "question": "何を取り除けるか？", "idea": "具体的アイデア"},
    {"method": "Reverse（逆転）", "question": "逆にしたらどうなるか？", "idea": "具体的アイデア"}
  ]
}`;
        break;

      case "bisociation":
        prompt = `あなたはアーサー・ケストラーのBisociation（異分野接続）の専門家です。以下のメモ群から、通常は結びつかない2つの思考フレームを見つけ、その交差点から新しいアイデアを生み出してください。

メモ:
${memosText}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "frame_a": {
    "name": "思考フレームAの名前",
    "domain": "所属する分野",
    "concepts": ["概念1", "概念2", "概念3"],
    "source_memos": ["関連メモタイトル"]
  },
  "frame_b": {
    "name": "思考フレームBの名前",
    "domain": "所属する分野",
    "concepts": ["概念1", "概念2", "概念3"],
    "source_memos": ["関連メモタイトル"]
  },
  "intersections": [
    {
      "concept_a": "フレームAの概念",
      "concept_b": "フレームBの概念",
      "insight": "交差点から生まれるインサイト（100文字以内）",
      "potential": "ビジネス/技術/思想/アクション"
    }
  ]
}`;
        break;

      case "forced":
        prompt = `あなたは強制接続法（Forced Connections）の専門家です。以下のメモ群から、一見無関係な2つのメモを強制的に接続し、予想外のアイデアを生み出してください。

メモ:
${memosText}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "connections": [
    {
      "memo_a": "メモAのタイトル",
      "memo_b": "メモBのタイトル",
      "bridge": "接続の架け橋となる概念（30文字以内）",
      "idea": "強制接続から生まれたアイデア（100文字以内）",
      "strength": 0.8,
      "domain": "ビジネス/技術/思想/アクション"
    }
  ]
}

最低3つ、最大6つの強制接続を見つけてください。strengthは接続の強さ(0.1〜1.0)です。`;
        break;

      case "mandala":
        prompt = `あなたはマンダラート（曼荼羅チャート）の専門家です。以下のメモ群の核心テーマを中心に、9マスのマンダラートを作成してください。中心テーマから8つの関連テーマを導き、さらにそれぞれのテーマについて8つの具体的アイデアを展開してください。

メモ:
${memosText}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "center": "核心テーマ（10文字以内）",
  "themes": [
    {
      "theme": "関連テーマ1（8文字以内）",
      "ideas": ["アイデア1", "アイデア2", "アイデア3", "アイデア4", "アイデア5", "アイデア6", "アイデア7", "アイデア8"]
    }
  ]
}

themesは必ず8個にしてください。`;
        break;

      case "swot":
        prompt = `あなたはSWOT分析の専門家です。以下のメモ群からビジネスアイデアや課題を分析し、SWOT分析を実施してください。

メモ:
${memosText}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "subject": "分析対象（20文字以内）",
  "strengths": ["強み1", "強み2", "強み3"],
  "weaknesses": ["弱み1", "弱み2", "弱み3"],
  "opportunities": ["機会1", "機会2", "機会3"],
  "threats": ["脅威1", "脅威2", "脅威3"],
  "cross": {
    "so": "強み×機会の戦略（80文字以内）",
    "wo": "弱み×機会の戦略（80文字以内）",
    "st": "強み×脅威の戦略（80文字以内）",
    "wt": "弱み×脅威の戦略（80文字以内）"
  }
}`;
        break;

      case "bmc":
        prompt = `あなたはビジネスモデルキャンバスの専門家です。以下のメモ群からビジネスモデルキャンバスの9要素を作成してください。

メモ:
${memosText}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "title": "ビジネスモデル名（15文字以内）",
  "key_partners": ["パートナー1", "パートナー2"],
  "key_activities": ["主要活動1", "主要活動2"],
  "key_resources": ["リソース1", "リソース2"],
  "value_propositions": ["価値提案1", "価値提案2"],
  "customer_relationships": ["関係性1", "関係性2"],
  "channels": ["チャネル1", "チャネル2"],
  "customer_segments": ["顧客セグメント1", "顧客セグメント2"],
  "cost_structure": ["コスト1", "コスト2"],
  "revenue_streams": ["収益源1", "収益源2"]
}`;
        break;

      case "logic_tree":
        prompt = `あなたはロジックツリー分析の専門家です。以下のメモ群の核心課題をロジックツリーで分解してください。

メモ:
${memosText}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "root": "核心課題（20文字以内）",
  "branches": [
    {
      "label": "大分類1（15文字以内）",
      "children": [
        {
          "label": "中分類1-1（15文字以内）",
          "leaves": ["具体策1", "具体策2"]
        },
        {
          "label": "中分類1-2",
          "leaves": ["具体策3", "具体策4"]
        }
      ]
    }
  ]
}

branchesは3〜5個にしてください。`;
        break;

      case "lean":
        prompt = `あなたはリーンキャンバスの専門家です。以下のメモ群からリーンキャンバスを作成してください。

メモ:
${memosText}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "title": "プロダクト/サービス名（15文字以内）",
  "problem": ["課題1", "課題2", "課題3"],
  "solution": ["解決策1", "解決策2", "解決策3"],
  "unique_value": "独自の価値提案（50文字以内）",
  "unfair_advantage": "圧倒的な優位性（30文字以内）",
  "customer_segments": ["セグメント1", "セグメント2"],
  "key_metrics": ["指標1", "指標2", "指標3"],
  "channels": ["チャネル1", "チャネル2"],
  "cost_structure": ["コスト1", "コスト2"],
  "revenue_streams": ["収益1", "収益2"]
}`;
        break;

      default:
        return Response.json({ error: "Unknown method" }, { status: 400 });
    }

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
      endpoint: `thinking/${method}`,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "AI応答の解析に失敗" }, { status: 500 });
    }

    return Response.json({ method, result: JSON.parse(jsonMatch[0]) });
  } catch (error) {
    console.error("Thinking error:", error);
    return Response.json(
      { error: `エラー: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
