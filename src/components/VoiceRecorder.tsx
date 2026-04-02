"use client";

import { useState, useRef, useCallback } from "react";

type RecorderState = "idle" | "recording" | "processing" | "done";

export default function VoiceRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState<{
    title: string;
    summary: string;
    tags: string[];
    category: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError("");
      setTranscription("");
      setSummary(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setState("processing");

        try {
          // Step 1: Transcribe
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          const transcribeRes = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });
          if (!transcribeRes.ok) throw new Error("文字起こしに失敗しました");
          const { text } = await transcribeRes.json();
          setTranscription(text);

          // Step 2: Summarize & Save
          const summarizeRes = await fetch("/api/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
          if (!summarizeRes.ok) throw new Error("要約・保存に失敗しました");
          const result = await summarizeRes.json();
          setSummary(result);
          setState("done");
        } catch (err) {
          setError(err instanceof Error ? err.message : "エラーが発生しました");
          setState("idle");
        }
      };

      mediaRecorder.start(1000);
      setState("recording");

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      setError("マイクへのアクセスが許可されませんでした");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const categoryColors: Record<string, string> = {
    ビジネス: "bg-blue-500/20 text-blue-300",
    技術: "bg-green-500/20 text-green-300",
    思想: "bg-purple-500/20 text-purple-300",
    生活: "bg-orange-500/20 text-orange-300",
    学習: "bg-cyan-500/20 text-cyan-300",
    健康: "bg-pink-500/20 text-pink-300",
    人間関係: "bg-yellow-500/20 text-yellow-300",
    クリエイティブ: "bg-rose-500/20 text-rose-300",
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* Recording Button */}
      <div className="relative">
        {state === "recording" && (
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
        )}
        <button
          onClick={state === "recording" ? stopRecording : startRecording}
          disabled={state === "processing"}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all ${
            state === "recording"
              ? "bg-red-500 scale-110 shadow-2xl shadow-red-500/50"
              : state === "processing"
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-500/30"
          }`}
        >
          {state === "recording" ? (
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : state === "processing" ? (
            <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Duration */}
      {state === "recording" && (
        <div className="text-3xl font-mono text-red-400">{formatTime(duration)}</div>
      )}

      {/* Status text */}
      <p className="text-gray-400 text-sm">
        {state === "idle" && "タップして録音開始"}
        {state === "recording" && "録音中... タップで停止"}
        {state === "processing" && "AIが分析中..."}
        {state === "done" && "保存完了!"}
      </p>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 w-full max-w-md">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Result */}
      {summary && (
        <div className="bg-gray-800/50 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-700/50">
          <h3 className="text-lg font-bold text-white">{summary.title}</h3>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${categoryColors[summary.category] || "bg-gray-500/20 text-gray-300"}`}
          >
            {summary.category}
          </span>
          <p className="text-gray-300 text-sm">{summary.summary}</p>
          <div className="flex flex-wrap gap-2">
            {summary.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-indigo-500/10 text-indigo-300 rounded text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
          <details className="text-gray-500 text-xs">
            <summary className="cursor-pointer hover:text-gray-300">原文を表示</summary>
            <p className="mt-2 whitespace-pre-wrap">{transcription}</p>
          </details>
          <a
            href="/"
            className="block text-center bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition-colors"
          >
            グラフに戻る
          </a>
        </div>
      )}
    </div>
  );
}
