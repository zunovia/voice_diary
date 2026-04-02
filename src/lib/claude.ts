import Anthropic from "@anthropic-ai/sdk";
import type { Memo } from "./supabase";

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
}

export async function analyzeConnections(memos: Memo[]): Promise<{
  insights: Array<{
    memo_ids: string[];
    insight: string;
    domain: string;
  }>;
}> {
  const memosContext = memos
    .map(
      (m) =>
        `[ID: ${m.id}] ${m.title}\nカテゴリ: ${m.category}\nタグ: ${m.tags?.join(", ")}\n要約: ${m.summary}\n原文: ${m.raw_text}\n---`
    )
    .join("\n");

  const message = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `あなたは思考の接続を見つけるエキスパートです。以下の複数のメモを分析し、異なるメモ間の意外な接続、パターン、そこから生まれるアイデアの種を見つけてください。

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
      "memo_ids": ["関連するメモのIDを2-4個"],
      "insight": "接続から得られるインサイト（200文字以内）",
      "domain": "ビジネス/技術/思想/アクション のいずれか"
    }
  ]
}

最低3つ、最大10個のインサイトを見つけてください。`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Claude response");
  }

  return JSON.parse(jsonMatch[0]);
}
