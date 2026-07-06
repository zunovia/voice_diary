import { NextRequest } from "next/server";
import Groq from "groq-sdk";

const CLEANUP_PROMPT = `以下の音声書き起こしテキストを修正してください。

ルール:
- 句読点（。、）を正確に追加してください
- 引用や発言部分には「」を付けてください
- 補足説明や注釈には（）を付けてください
- 文の区切りや話題の変わり目で適切に改行を入れてください
- 長い文章は読みやすい段落に分けてください
- 「えー」「あの」「うーん」などのフィラーを除去してください
- 言い直しや繰り返しを除去してください
- 自然な書き言葉に整えてください
- 意味は変えないでください
- テキストのみを出力。説明や注釈は不要です

テキスト:
`;

async function groqTranscribe(audioBuffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const groq = new Groq({ apiKey });

  // Convert Buffer to File-like object for Groq SDK
  // Groqは拡張子でフォーマット判定するため、実際のコンテナ（webm/mp4）に合わせたファイル名を渡す
  const uint8 = new Uint8Array(audioBuffer);
  const file = new File([uint8], fileName, { type: mimeType });

  const result = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    language: "ja",
    response_format: "text",
    temperature: 0.0,
  });

  // Groq SDK returns string for response_format="text"
  const text = result as unknown as string;
  return text ? String(text).trim() : "";
}

async function geminiCleanup(text: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text) return text;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: CLEANUP_PROMPT + text }] }],
        generationConfig: { temperature: 0.0, maxOutputTokens: 2048 },
      }),
    }
  );

  if (!response.ok) {
    console.warn("Gemini cleanup failed:", response.status);
    return text;
  }

  const data = await response.json();
  const cleaned = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return cleaned || text;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      return Response.json({ error: "No audio file" }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || "audio/webm;codecs=opus";
    const fileName = audioFile.name || (mimeType.includes("mp4") ? "recording.mp4" : "recording.webm");

    console.log("Transcribe: audio size =", audioBuffer.length, "bytes, type =", mimeType, "name =", fileName);

    // Step 1: Groq Whisper transcription (fast & accurate)
    const t0 = Date.now();
    const rawText = await groqTranscribe(audioBuffer, mimeType, fileName);
    console.log(`Groq Whisper: ${Date.now() - t0}ms -> "${rawText.slice(0, 100)}..."`);

    if (!rawText) {
      return Response.json({ error: "音声を認識できませんでした" }, { status: 400 });
    }

    // Step 2: Gemini cleanup (punctuation, formatting, filler removal)
    const t1 = Date.now();
    const cleanedText = await geminiCleanup(rawText);
    console.log(`Gemini cleanup: ${Date.now() - t1}ms -> "${cleanedText.slice(0, 100)}..."`);

    return Response.json({ text: cleanedText, rawText });
  } catch (error) {
    console.error("Transcribe error:", error);

    // Fallback: if Groq fails, try Gemini direct transcription
    try {
      const formData = await request.clone().formData();
      const audioFile = formData.get("audio") as File;
      if (audioFile) {
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        const base64Audio = audioBuffer.toString("base64");
        const apiKey = process.env.GEMINI_API_KEY;

        if (apiKey) {
          console.log("Falling back to Gemini transcription...");
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { inlineData: { mimeType: audioFile.type || "audio/webm;codecs=opus", data: base64Audio } },
                    { text: "この音声を正確に日本語でテキストに書き起こしてください。音声の内容のみを出力し、それ以外の説明や注釈は一切付けないでください。" },
                  ],
                }],
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) return Response.json({ text, rawText: text });
          }
        }
      }
    } catch (fallbackErr) {
      console.error("Fallback also failed:", fallbackErr);
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "文字起こしに失敗しました" },
      { status: 500 }
    );
  }
}
