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
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-flash" });

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
  // Use REST API directly to support outputDimensionality parameter
  // (SDK EmbedContentRequest type doesn't include it)
  const apiKey = process.env.GEMINI_API_KEY || "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: 768, // Match existing VECTOR(768) column in Supabase
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.embedding.values;
}
