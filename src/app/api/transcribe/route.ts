import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      return Response.json({ error: "No audio file" }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const base64Audio = audioBuffer.toString("base64");

    // Google Cloud Speech-to-Text API
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            encoding: "WEBM_OPUS",
            sampleRateHertz: 48000,
            languageCode: "ja-JP",
            enableAutomaticPunctuation: true,
            model: "latest_long",
          },
          audio: { content: base64Audio },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Google STT error:", error);
      return Response.json(
        { error: "Transcription failed" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text =
      data.results
        ?.map(
          (r: { alternatives?: Array<{ transcript: string }> }) =>
            r.alternatives?.[0]?.transcript
        )
        .join("") || "";

    return Response.json({ text });
  } catch (error) {
    console.error("Transcribe error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
