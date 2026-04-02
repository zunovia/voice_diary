import { GoogleGenerativeAI } from "@google/generative-ai";

function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
}

export async function summarizeAndTag(rawText: string): Promise<{
  title: string;
  summary: string;
  tags: string[];
  category: string;
}> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `あなたは日記メモの分析アシスタントです。以下の音声メモのテキストを分析してください。

テキスト:
"""
${rawText}
"""

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "title": "内容を端的に表す短い見出し（15文字以内）",
  "summary": "要約（100文字以内）",
  "tags": ["関連タグ1", "関連タグ2", "関連タグ3"],
  "category": "以下のいずれか1つ: ビジネス, 技術, 思想, 生活, 学習, 健康, 人間関係, クリエイティブ"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response");
  }

  return JSON.parse(jsonMatch[0]);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}
