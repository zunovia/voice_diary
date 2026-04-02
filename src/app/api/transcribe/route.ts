import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      return Response.json({ error: "No audio file" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const base64Audio = audioBuffer.toString("base64");

    console.log("Transcribe: audio size =", audioBuffer.length, "bytes, type =", audioFile.type);

    // Use Gemini REST API directly for audio (more reliable for file uploads)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: audioFile.type || "audio/webm;codecs=opus",
                    data: base64Audio,
                  },
                },
                {
                  text: "この音声を正確に日本語でテキストに書き起こしてください。音声の内容のみを出力し、それ以外の説明や注釈は一切付けないでください。",
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return Response.json(
        { error: `Gemini API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!text) {
      console.error("Gemini returned empty text:", JSON.stringify(data));
      return Response.json(
        { error: "音声を認識できませんでした" },
        { status: 400 }
      );
    }

    return Response.json({ text });
  } catch (error) {
    console.error("Transcribe error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
